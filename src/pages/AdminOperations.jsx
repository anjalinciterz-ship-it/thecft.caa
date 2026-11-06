import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiRequest, apiUrl } from '../lib/api';
import { useAuth } from '../lib/auth';
import { EmptyState, PageHeading, RequestState, dateTime, money, useDashboardResource } from '../components/DashboardUI';

const label = (value) => String(value ?? 'Not recorded').replaceAll('_', ' ');
const date = (value) => (value ? dateTime(value) : 'Not recorded');
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 20 };
const STAFF_ROLES = ['admin', 'content_manager'];

function Badge({ value }) {
  return <span className="db-badge">{label(value)}</span>;
}

function Table({ title, columns, children }) {
  return <div role="region" aria-label={title} tabIndex={0} className="ad-table" style={{ overflowX: 'auto' }}>
    <table><caption style={{ textAlign: 'left', paddingBottom: 10 }}>{title}</caption><thead><tr>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead><tbody>{children}</tbody></table>
  </div>;
}

function StaffOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="db-loading" role="status">Checking your session…</p>;
  if (!STAFF_ROLES.includes(user?.role)) return <div className="db-error" role="alert">Staff access is required.</div>;
  return children;
}

function ReadOnlyNotice({ children }) {
  return <p className="db-muted">{children}</p>;
}

function Pagination({ page, meta, disabled, onPage, name }) {
  const pages = Number.isInteger(meta?.pages) ? meta.pages : null;
  return <nav className="db-actions" aria-label={`${name} pagination`}>
    <button type="button" className="db-button-secondary" disabled={disabled || page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
    <span className="db-muted" aria-live="polite">Page {page}{pages !== null ? ` of ${Math.max(1, pages)}` : ''}{Number.isInteger(meta?.total) ? ` · ${meta.total} results` : ''}</span>
    <button type="button" className="db-button-secondary" disabled={disabled || pages === null || page >= pages} onClick={() => onPage(page + 1)}>Next</button>
  </nav>;
}

// One synchronous guard per screen, matching the AdminPeople useAction pattern.
function useAction(reload) {
  const pending = useRef(false);
  const mounted = useRef(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const run = async ({ path, method = 'POST', body, confirm, message, keepNotice }) => {
    if (pending.current) return false;
    pending.current = true;
    if (confirm && !window.confirm(confirm)) { pending.current = false; return false; }
    setBusy(true); setError(''); setNotice('');
    let succeeded = false;
    try {
      await apiRequest(path, { method, body });
      succeeded = true;
      if (mounted.current) { setNotice(keepNotice ? keepNotice() : message); reload(); }
    } catch (failure) {
      if (mounted.current) setError(failure.message || 'The change could not be confirmed. Refresh the record before retrying.');
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
    return succeeded;
  };
  const clear = () => { setError(''); setNotice(''); };
  return { run, busy, error, notice, clear, setError };
}

function ActionState({ action, adminOnly }) {
  return <>
    {action.error && <div className="db-error" role="alert"><p>{action.error}</p><p>Refresh the record before resubmitting; a connection failure does not prove the change failed.</p></div>}
    {action.notice && <p className="db-panel" role="status">{action.notice}</p>}
    {adminOnly === false && <ReadOnlyNotice>Read-only access. Only administrators can perform these actions.</ReadOnlyNotice>}
  </>;
}

function FilterSelect({ name, value, options, onChange, legend }) {
  return <label className="db-field">{legend}<select aria-label={legend} name={name} value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([key, text]) => <option key={key || 'none'} value={key}>{text}</option>)}</select></label>;
}

// =============================================================== PROGRAMS

const programKinds = ['program', 'bundle', 'journey'];
const publicationStatuses = ['draft', 'published', 'archived'];

function ProgramEditor({ program, action, onDone }) {
  const [form, setForm] = useState(() => ({
    title: program.title || '',
    slug: program.slug || '',
    kind: programKinds.includes(program.kind) ? program.kind : 'program',
    shortDescription: program.shortDescription || '',
    priceMinor: program.priceMinor ? String(program.priceMinor) : '',
    currency: program.currency || 'CAD',
    isFree: Boolean(program.isFree),
    orderIndex: String(program.orderIndex ?? 0),
  }));
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value });
  const put = (key) => (value) => setForm({ ...form, [key]: value });
  const body = () => ({
    title: form.title.trim(),
    slug: form.slug.trim() || undefined,
    kind: form.kind,
    shortDescription: form.shortDescription.trim() || undefined,
    priceMinor: form.isFree ? 0 : (form.priceMinor ? Number(form.priceMinor) : undefined),
    currency: form.currency.trim().toUpperCase() || undefined,
    isFree: form.isFree,
    orderIndex: Number.isFinite(Number(form.orderIndex)) ? Math.max(0, Math.min(9999, Math.trunc(Number(form.orderIndex)))) : undefined,
  });
  return <form className="db-form" aria-label={`Edit program ${program.title}`} aria-busy={action.busy} onSubmit={(event) => {
    event.preventDefault();
    if (form.title.trim().length < 2) { action.setError('Program title must be at least 2 characters.'); return; }
    action.run({ path: `/admin/programs/${encodeURIComponent(program.id)}`, method: 'PATCH', body: body(), message: `Program “${form.title.trim()}” saved.` }).then((ok) => { if (ok) onDone(); });
  }}>
    <fieldset className="db-form" disabled={action.busy}><legend>Program details</legend>
      <div style={gridStyle}>
        <label className="db-field">Program title<input aria-label={`Program title for ${program.id}`} required minLength={2} maxLength={160} value={form.title} onChange={set('title')} /></label>
        <label className="db-field">Slug<input aria-label={`Program slug for ${program.id}`} maxLength={140} value={form.slug} onChange={set('slug')} /></label>
        <FilterSelect legend="Program kind" name="kind" value={form.kind} options={programKinds.map((item) => [item, label(item)])} onChange={put('kind')} />
        <label className="db-field">Order position<input aria-label={`Program order position for ${program.id}`} type="number" min={0} max={9999} step={1} value={form.orderIndex} onChange={set('orderIndex')} /></label>
      </div>
      <label className="db-field">Short description<input aria-label={`Program short description for ${program.id}`} maxLength={320} value={form.shortDescription} onChange={set('shortDescription')} /></label>
      <div style={gridStyle}>
        <label className="db-field">Price in minor units<input aria-label={`Program price in minor units for ${program.id}`} type="number" min={0} step={1} value={form.priceMinor} disabled={form.isFree} onChange={set('priceMinor')} /></label>
        <label className="db-field">Currency<input aria-label={`Program currency for ${program.id}`} maxLength={3} value={form.currency} disabled={form.isFree} onChange={set('currency')} /></label>
        <label className="db-field"><input aria-label={`Mark program ${program.id} free`} type="checkbox" checked={form.isFree} onChange={set('isFree')} /> This program is free</label>
      </div>
      <div className="db-actions"><button className="db-button" disabled={action.busy}>{action.busy ? 'Saving…' : 'Save program'}</button><button type="button" className="db-button-secondary" disabled={action.busy} onClick={onDone}>Cancel edit</button></div>
    </fieldset>
  </form>;
}

function ProgramRow({ program, action, admin }) {
  const [editing, setEditing] = useState(false);
  const publish = (status) => action.run({
    path: `/admin/programs/${encodeURIComponent(program.id)}`, method: 'PATCH', body: { publicationStatus: status },
    confirm: `Set “${program.title}” to ${label(status)}? Publishing requires at least one course and is refused by the server otherwise.`,
    message: `Program publication set to ${label(status)}.`,
  });
  return <tr>
    <td><strong>{program.title}</strong><div className="db-muted">/{program.slug}{program.legacyId ? ` · ${program.legacyId}` : ''}</div>{program.shortDescription ? <p>{program.shortDescription}</p> : null}</td>
    <td>{label(program.kind)}</td>
    <td>{program.priceMinor != null && program.currency ? money(program.priceMinor, program.currency) : 'Not recorded'}</td>
    <td><Badge value={program.publicationStatus} /><div className="db-muted">Order {program.orderIndex ?? 0}</div></td>
    <td>{program.courses?.length ?? 0} course(s)</td>
    <td>
      <div className="db-actions">
        <button type="button" className="db-button-secondary" aria-expanded={editing} aria-label={editing ? `Close editor for ${program.title}` : `Edit ${program.title}`} disabled={action.busy} onClick={() => { action.clear(); setEditing(!editing); }}>{editing ? 'Close editor' : 'Edit'}</button>
        {admin && program.publicationStatus !== 'published' && <button type="button" className="db-button-secondary" aria-label={`Publish ${program.title}`} disabled={action.busy} onClick={() => publish('published')}>Publish</button>}
        {admin && program.publicationStatus !== 'draft' && <button type="button" className="db-button-secondary" aria-label={`Move ${program.title} to draft`} disabled={action.busy} onClick={() => publish('draft')}>Move to draft</button>}
        {admin && program.publicationStatus !== 'archived' && <button type="button" className="db-button-secondary" aria-label={`Archive ${program.title}`} disabled={action.busy} onClick={() => publish('archived')}>Archive</button>}
      </div>
      {editing && <ProgramEditor program={program} action={action} onDone={() => setEditing(false)} />}
    </td>
  </tr>;
}

function CreateProgram({ action }) {
  const [form, setForm] = useState({ title: '', slug: '', kind: 'program', shortDescription: '', priceMinor: '', currency: 'CAD', isFree: false });
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value });
  const put = (key) => (value) => setForm({ ...form, [key]: value });
  return <form className="db-panel db-form" aria-label="Create program" aria-busy={action.busy} onSubmit={(event) => {
    event.preventDefault();
    if (form.title.trim().length < 2) { action.setError('Program title must be at least 2 characters.'); return; }
    const body = {
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      kind: form.kind,
      shortDescription: form.shortDescription.trim() || undefined,
      priceMinor: form.isFree ? 0 : (form.priceMinor ? Number(form.priceMinor) : undefined),
      currency: form.isFree ? undefined : (form.currency.trim().toUpperCase() || undefined),
      isFree: form.isFree,
    };
    action.run({ path: '/admin/programs', method: 'POST', body, message: `Program “${form.title.trim()}” created as a draft.` }).then((ok) => { if (ok) setForm({ title: '', slug: '', kind: 'program', shortDescription: '', priceMinor: '', currency: 'CAD', isFree: false }); });
  }}>
    <h2>Create a program</h2>
    <p className="db-muted">Programs bundle existing courses. New programs start as drafts; publishing is refused until at least one course is attached.</p>
    <fieldset className="db-form" disabled={action.busy}><legend>New program</legend>
      <div style={gridStyle}>
        <label className="db-field">Title (required)<input aria-label="New program title" required minLength={2} maxLength={160} value={form.title} onChange={set('title')} /></label>
        <label className="db-field">Slug (optional)<input aria-label="New program slug" maxLength={140} value={form.slug} onChange={set('slug')} /></label>
        <FilterSelect legend="New program kind" name="kind" value={form.kind} options={programKinds.map((item) => [item, label(item)])} onChange={put('kind')} />
      </div>
      <label className="db-field">Short description<input aria-label="New program short description" maxLength={320} value={form.shortDescription} onChange={set('shortDescription')} /></label>
      <div style={gridStyle}>
        <label className="db-field">Price in minor units<input aria-label="New program price in minor units" type="number" min={0} step={1} value={form.priceMinor} disabled={form.isFree} onChange={set('priceMinor')} /></label>
        <label className="db-field">Currency<input aria-label="New program currency" maxLength={3} value={form.currency} disabled={form.isFree} onChange={set('currency')} /></label>
        <label className="db-field"><input aria-label="Mark new program free" type="checkbox" checked={form.isFree} onChange={set('isFree')} /> This program is free</label>
      </div>
      <button className="db-button" disabled={action.busy}>{action.busy ? 'Creating…' : 'Create draft program'}</button>
    </fieldset>
  </form>;
}

export function AdminPrograms() {
  const { user } = useAuth();
  const admin = user?.role === 'admin';
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number.parseInt(params.get('page'), 10) || 1);
  const status = publicationStatuses.includes(params.get('status')) ? params.get('status') : '';
  const query = new URLSearchParams({ page: String(page), limit: '25' });
  if (status) query.set('status', status);
  const resource = useDashboardResource(`/admin/programs?${query}`);
  const action = useAction(resource.reload);
  const programs = resource.data?.programs || [];
  return <StaffOnly><div className="db-stack">
    <PageHeading eyebrow="Catalog operations" title="Programs" action={<button type="button" className="db-button-secondary" disabled={resource.loading || action.busy} onClick={resource.reload}>Refresh programs</button>}>Programs bundle courses and sell as one product. Create, edit, order and publish against the live catalog.</PageHeading>
    <ActionState action={action} adminOnly={admin} />
    <div className="db-actions">
      <FilterSelect legend="Filter program publication status" name="status" value={status} options={[['', 'All statuses'], ...publicationStatuses.map((item) => [item, label(item)])]} onChange={(next) => { const p = new URLSearchParams(); if (next) p.set('status', next); p.set('page', '1'); setParams(p); }} />
      <button type="button" className="db-button-secondary" onClick={() => setParams({})}>Clear filter</button>
    </div>
    {admin && <CreateProgram action={action} />}
    <RequestState resource={resource}>
      <div className="db-panel">
        {programs.length ? <Table title="Programs" columns={['Program', 'Kind', 'Price', 'Publication / order', 'Courses', 'Manage']}>
          {programs.map((program) => <ProgramRow key={program.id} program={program} action={action} admin={admin} />)}
        </Table> : <EmptyState icon="book" title="No programs in this view">Adjust the status filter or create a program.</EmptyState>}
      </div>
    </RequestState>
    <Pagination page={page} meta={resource.meta} disabled={resource.loading || action.busy} name="Programs" onPage={(next) => { const p = new URLSearchParams(query); p.delete('limit'); p.set('page', String(next)); setParams(p); }} />
  </div></StaffOnly>;
}

// ============================================================ CERTIFICATES

function CertificateControls({ certificate, action }) {
  const [open, setOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [correctName, setCorrectName] = useState('');
  const [correctTitle, setCorrectTitle] = useState('');
  const [correctReason, setCorrectReason] = useState('');
  const tail = certificate.certificateId || certificate.id.slice(-6);
  if (certificate.status !== 'valid') return null;
  return <div className="db-stack">
    <button type="button" className="db-button-secondary" aria-expanded={open} aria-label={`${open ? 'Close' : 'Open'} certificate actions for ${tail}`} disabled={action.busy} onClick={() => { action.clear(); setOpen(!open); }}>{open ? 'Close actions' : 'Revoke or correct'}</button>
    {open && <div style={gridStyle}>
      <form className="db-form" aria-label={`Revoke certificate ${tail}`} onSubmit={(event) => {
        event.preventDefault();
        if (revokeReason.trim().length < 3) { action.setError('A reason of at least 3 characters is required to revoke.'); return; }
        action.run({ path: `/admin/certificates/${encodeURIComponent(certificate.id)}/revoke`, method: 'POST', body: { reason: revokeReason.trim() },
          confirm: `Revoke certificate ${tail} for ${certificate.studentName || 'Student'}? The public verification will report it as no longer valid and the PDF becomes unavailable.`,
          message: `Certificate ${tail} revoked.` }).then((ok) => { if (ok) { setOpen(false); setRevokeReason(''); } });
      }}>
        <fieldset disabled={action.busy}><legend>Revoke certificate</legend>
          <label className="db-field">Revocation reason (required)<textarea aria-label={`Revocation reason for certificate ${tail}`} required minLength={3} maxLength={500} value={revokeReason} onChange={(event) => setRevokeReason(event.target.value)} /></label>
          <button className="db-button-secondary" disabled={action.busy || revokeReason.trim().length < 3}>{action.busy ? 'Working…' : 'Review revocation'}</button>
        </fieldset>
      </form>
      <form className="db-form" aria-label={`Correct certificate ${tail}`} onSubmit={(event) => {
        event.preventDefault();
        if (correctReason.trim().length < 3) { action.setError('A reason of at least 3 characters is required to correct.'); return; }
        action.run({ path: `/admin/certificates/${encodeURIComponent(certificate.id)}/correct`, method: 'POST',
          body: { reason: correctReason.trim(), studentName: correctName.trim() || undefined, courseTitle: correctTitle.trim() || undefined },
          confirm: `Issue a corrected replacement for certificate ${tail}? The original becomes superseded and the student is notified.`,
          message: `Correction issued for certificate ${tail}.` }).then((ok) => { if (ok) { setOpen(false); setCorrectName(''); setCorrectTitle(''); setCorrectReason(''); } });
      }}>
        <fieldset disabled={action.busy}><legend>Correct certificate (issues a replacement)</legend>
          <label className="db-field">Corrected student name<input aria-label={`Corrected student name for certificate ${tail}`} maxLength={120} value={correctName} onChange={(event) => setCorrectName(event.target.value)} placeholder="Leave blank to keep current" /></label>
          <label className="db-field">Corrected course title<input aria-label={`Corrected course title for certificate ${tail}`} maxLength={200} value={correctTitle} onChange={(event) => setCorrectTitle(event.target.value)} placeholder="Leave blank to keep current" /></label>
          <label className="db-field">Correction reason (required)<textarea aria-label={`Correction reason for certificate ${tail}`} required minLength={3} maxLength={500} value={correctReason} onChange={(event) => setCorrectReason(event.target.value)} /></label>
          <button className="db-button-secondary" disabled={action.busy || correctReason.trim().length < 3}>{action.busy ? 'Working…' : 'Review correction'}</button>
        </fieldset>
      </form>
    </div>}
  </div>;
}

function CertificateRow({ certificate, action }) {
  const canDownload = certificate.status === 'valid';
  return <tr>
    <td><strong>{certificate.studentName || 'Student name unavailable'}</strong><div className="db-muted">{certificate.studentEmail || 'Email unavailable'}</div></td>
    <td>{certificate.courseTitle}<div className="db-muted">{certificate.certificateId}</div></td>
    <td><Badge value={certificate.status} />{certificate.revocationReason && <p className="db-muted">{certificate.revocationReason}</p>}</td>
    <td>{date(certificate.issuedAt)}</td>
    <td><div className="db-actions">
      {canDownload && <a className="db-button-secondary" href={apiUrl(`/admin/certificates/${encodeURIComponent(certificate.id)}/pdf`)} target="_blank" rel="noopener noreferrer">Download PDF</a>}
      {certificate.verifyUrl && <a className="db-text-link" href={certificate.verifyUrl} target="_blank" rel="noopener noreferrer">Verify</a>}
    </div>
    <CertificateControls certificate={certificate} action={action} /></td>
  </tr>;
}

export function AdminCertificates() {
  const { user } = useAuth();
  const admin = user?.role === 'admin';
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number.parseInt(params.get('page'), 10) || 1);
  const search = (params.get('search') || '').slice(0, 120);
  const status = ['valid', 'revoked', 'corrected'].includes(params.get('status')) ? params.get('status') : '';
  const query = new URLSearchParams({ page: String(page), limit: '25' });
  if (search) query.set('search', search);
  if (status) query.set('status', status);
  const resource = useDashboardResource(`/admin/certificates?${query}`);
  const action = useAction(resource.reload);
  const certificates = resource.data?.certificates || [];
  return <StaffOnly><div className="db-stack">
    <PageHeading eyebrow="Credentials" title="Certificates" action={<button type="button" className="db-button-secondary" disabled={resource.loading || action.busy} onClick={resource.reload}>Refresh certificates</button>}>Issued certificates are permanent records. Revoking or correcting requires a written reason and is audited. A PDF download is offered only when the certificate is valid.</PageHeading>
    <ActionState action={action} adminOnly={admin} />
    <form className="db-panel db-stack" key={`${search}:${status}`} aria-label="Filter certificates" onSubmit={(event) => {
      event.preventDefault();
      const values = new FormData(event.currentTarget);
      const next = new URLSearchParams({ page: '1' });
      ['search', 'status'].forEach((key) => { const value = String(values.get(key) || '').trim(); if (value) next.set(key, value); });
      setParams(next);
    }}>
      <div style={gridStyle}>
        <label className="db-field">Search certificate id, student or course<input type="search" name="search" aria-label="Search certificates" maxLength={120} defaultValue={search} /></label>
        <label className="db-field">Status<select name="status" aria-label="Filter certificate status" defaultValue={status}><option value="">All statuses</option><option value="valid">Valid</option><option value="revoked">Revoked</option><option value="corrected">Corrected</option></select></label>
      </div>
      <div className="db-actions"><button className="db-button" disabled={resource.loading}>Apply filters</button><button type="button" className="db-button-secondary" onClick={() => setParams({})}>Clear filters</button></div>
    </form>
    {!admin && <ReadOnlyNotice>Certificates are read-only for content managers. Only administrators can revoke or correct them.</ReadOnlyNotice>}
    <RequestState resource={resource}>
      <div className="db-panel">
        {certificates.length ? <Table title="Issued certificates" columns={['Student', 'Course / id', 'Status', 'Issued', 'Manage']}>
          {certificates.map((certificate) => <CertificateRow key={certificate.id} certificate={certificate} action={action} />)}
        </Table> : <EmptyState icon="award" title="No certificates in this view">Certificates are issued automatically when a student completes an eligible course.</EmptyState>}
      </div>
    </RequestState>
    <Pagination page={page} meta={resource.meta} disabled={resource.loading || action.busy} name="Certificates" onPage={(next) => { const p = new URLSearchParams(query); p.delete('limit'); p.set('page', String(next)); setParams(p); }} />
  </div></StaffOnly>;
}

// ============================================================= MODERATION

const moderationActions = ['visible', 'pending_review', 'hidden', 'removed'];

function ReportCard({ report, action }) {
  const [open, setOpen] = useState(false);
  const [resolution, setResolution] = useState('actioned');
  const [note, setNote] = useState('');
  const [moderateAction, setModerateAction] = useState('hidden');
  const tail = report.id.slice(-6);
  return <article className="db-panel db-stack">
    <div className="db-actions"><Badge value={report.targetKind} /><Badge value={report.status} /><Badge value={report.reason} /><span className="db-muted">{date(report.createdAt)}</span></div>
    <p><strong>{report.target?.title || 'Content no longer available'}</strong></p>
    {report.target?.excerpt && <p className="ad-message">{report.target.excerpt}</p>}
    <p className="db-muted">Author: {report.target?.author?.name || 'Unavailable'} · Reporter: {report.reporter?.name || report.reporter?.email || 'Anonymous'} · Current visibility: {label(report.target?.moderationStatus)}</p>
    {report.detail && <p>Report detail: {report.detail}</p>}
    {report.resolutionNote && <p className="db-muted">Resolution note: {report.resolutionNote}</p>}
    <div className="db-actions">
      <button type="button" className="db-button-secondary" aria-expanded={open} aria-label={`${open ? 'Close' : 'Open'} review actions for report ${tail}`} disabled={action.busy} onClick={() => { action.clear(); setOpen(!open); }}>{open ? 'Close review' : 'Review report'}</button>
    </div>
    {open && <div style={gridStyle}>
      <form className="db-form" aria-label={`Resolve report ${tail}`} onSubmit={(event) => {
        event.preventDefault();
        action.run({ path: `/admin/reports/${encodeURIComponent(report.id)}/resolve`, method: 'POST', body: { resolution, note: note.trim() || undefined },
          confirm: `Mark report ${tail} as ${resolution}? The report leaves the open queue and an audit row is written.`,
          message: `Report ${tail} ${resolution}.` }).then((ok) => { if (ok) setOpen(false); });
      }}>
        <fieldset disabled={action.busy}><legend>Resolution</legend>
          <FilterSelect legend={`Resolution for report ${tail}`} name="resolution" value={resolution} options={[['actioned', 'Actioned'], ['dismissed', 'Dismissed']]} onChange={setResolution} />
          <label className="db-field">Note (optional)<textarea aria-label={`Resolution note for report ${tail}`} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} /></label>
          <button className="db-button-secondary" disabled={action.busy}>{action.busy ? 'Working…' : 'Resolve report'}</button>
        </fieldset>
      </form>
      {report.target?.id && <form className="db-form" aria-label={`Moderate content for report ${tail}`} onSubmit={(event) => {
        event.preventDefault();
        action.run({ path: '/admin/moderate', method: 'POST', body: { targetKind: report.targetKind, targetId: report.target.id, action: moderateAction, note: note.trim() || undefined },
          confirm: `Set this ${report.targetKind} to ${moderateAction}? Removal blanks the stored body but keeps the row and audit trail.`,
          message: `Content set to ${moderateAction}.` });
      }}>
        <fieldset disabled={action.busy}><legend>Content visibility</legend>
          <FilterSelect legend={`Visibility for report ${tail}`} name="action" value={moderateAction} options={moderationActions.map((item) => [item, label(item)])} onChange={setModerateAction} />
          <button className="db-button-secondary" disabled={action.busy}>{action.busy ? 'Working…' : 'Apply visibility'}</button>
        </fieldset>
      </form>}
    </div>}
  </article>;
}

function ContentRow({ content, kind, action }) {
  const [selected, setSelected] = useState(content.moderationStatus || 'visible');
  const [note, setNote] = useState('');
  const tail = content.id.slice(-6);
  return <tr>
    <td>{content.title || <span className="db-muted">(no title)</span>}<div className="db-muted">{content.excerpt || 'Body unavailable'}</div></td>
    <td>{content.author?.name || 'Unavailable'}</td>
    <td><Badge value={content.moderationStatus} /><div className="db-muted">{content.reportCount ?? 0} reports · {content.commentCount ?? 0} comments</div></td>
    <td>
      <form className="db-form" aria-label={`Moderate ${kind} ${tail}`} onSubmit={(event) => {
        event.preventDefault();
        action.run({ path: '/admin/moderate', method: 'POST', body: { targetKind: kind, targetId: content.id, action: selected, note: note.trim() || undefined },
          confirm: `Set this ${kind} to ${selected}? Removal blanks the stored body but keeps the row and audit trail.`,
          message: `${label(kind)} ${tail} set to ${label(selected)}.`, keepNotice: () => `${label(kind)} ${tail} set to ${label(selected)}.` });
      }}>
        <div className="db-actions">
          <label className="db-field">Visibility<select aria-label={`Visibility for ${kind} ${tail}`} value={selected} onChange={(event) => setSelected(event.target.value)}>{moderationActions.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
          <label className="db-field">Note<input aria-label={`Moderation note for ${kind} ${tail}`} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} /></label>
          <button className="db-button-secondary" disabled={action.busy || selected === content.moderationStatus}>{action.busy ? 'Saving…' : 'Apply visibility'}</button>
        </div>
      </form>
    </td>
  </tr>;
}

export function AdminModeration() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number.parseInt(params.get('page'), 10) || 1);
  const reportStatus = ['open', 'actioned', 'dismissed'].includes(params.get('reportStatus')) ? params.get('reportStatus') : 'open';
  const contentKind = ['post', 'comment'].includes(params.get('contentKind')) ? params.get('contentKind') : 'post';
  const contentStatus = moderationActions.includes(params.get('contentStatus')) ? params.get('contentStatus') : '';
  const reportsResource = useDashboardResource(`/admin/reports?status=${reportStatus}&page=${page}&limit=25`);
  const contentQuery = new URLSearchParams({ targetKind: contentKind, page: '1', limit: '25' });
  if (contentStatus) contentQuery.set('moderationStatus', contentStatus);
  const contentResource = useDashboardResource(`/admin/content?${contentQuery}`);
  const action = useAction(() => { reportsResource.reload(); contentResource.reload(); });
  const reports = reportsResource.data?.reports || [];
  const content = contentResource.data?.content || [];
  return <StaffOnly><div className="db-stack">
    <PageHeading eyebrow="Community" title="Community moderation" action={<button type="button" className="db-button-secondary" disabled={reportsResource.loading || action.busy} onClick={() => { reportsResource.reload(); contentResource.reload(); }}>Refresh queue</button>}>Reports and content visibility are handled through the live moderation API. Every action writes an audit trail.</PageHeading>
    <ActionState action={action} />
    <section className="db-stack">
      <div className="db-actions">
        <FilterSelect legend="Filter report status" name="reportStatus" value={reportStatus} options={[['open', 'Open queue'], ['actioned', 'Actioned'], ['dismissed', 'Dismissed']]} onChange={(next) => { const p = new URLSearchParams(); p.set('reportStatus', next); p.set('page', '1'); setParams(p); }} />
        <span className="db-muted">{reports.length} report(s) shown</span>
      </div>
      <RequestState resource={reportsResource}>
        {reports.length ? reports.map((report) => <ReportCard key={report.id} report={report} action={action} />) : <div className="db-panel"><EmptyState icon="chat" title="No reports in this queue">Resolved reports leave the open queue. Nothing is deleted, the audit trail remains.</EmptyState></div>}
      </RequestState>
      <Pagination page={page} meta={reportsResource.meta} disabled={reportsResource.loading || action.busy} name="Reports" onPage={(next) => { const p = new URLSearchParams(params); p.set('reportStatus', reportStatus); p.set('page', String(next)); setParams(p); }} />
    </section>
    <section className="db-panel db-stack" aria-label="Content visibility">
      <div className="db-actions">
        <FilterSelect legend="Content type" name="contentKind" value={contentKind} options={[['post', 'Posts'], ['comment', 'Comments']]} onChange={(next) => { const p = new URLSearchParams(params); p.set('contentKind', next); setParams(p); }} />
        <FilterSelect legend="Content moderation status" name="contentStatus" value={contentStatus} options={[['', 'All visibility states'], ...moderationActions.map((item) => [item, label(item)])]} onChange={(next) => { const p = new URLSearchParams(params); if (next) p.set('contentStatus', next); else p.delete('contentStatus'); setParams(p); }} />
      </div>
      <RequestState resource={contentResource}>
        {content.length ? <Table title={`Community ${contentKind}s`} columns={['Content', 'Author', 'Status / counts', 'Visibility']}>
          {content.map((item) => <ContentRow key={item.id} content={item} kind={contentKind} action={action} />)}
        </Table> : <EmptyState icon="chat" title="No matching content">Adjust the content type or visibility filter.</EmptyState>}
      </RequestState>
    </section>
  </div></StaffOnly>;
}

// =================================================================== MEDIA

const mediaNamespaces = ['course', 'cms', 'instructor', 'testimonial', 'brand', 'resource'];
const resourceTypes = ['image', 'video', 'raw'];

function UploadSignatureForm({ action }) {
  const [form, setForm] = useState({ namespace: 'cms', folder: '', mimeType: 'image/jpeg', sizeBytes: '', fileName: '', alt: '' });
  const [result, setResult] = useState(null);
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const put = (key) => (value) => setForm({ ...form, [key]: value });
  return <form className="db-form" aria-label="Request media upload signature" onSubmit={async (event) => {
    event.preventDefault();
    setResult(null);
    const sizeBytes = Number(form.sizeBytes);
    if (!Number.isInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > 40 * 1024 * 1024) { action.setError('Enter a file size in bytes between 1 and 41943040.'); return; }
    action.clear();
    try {
      const data = await apiRequest('/admin/media/upload-signature', { method: 'POST', body: { namespace: form.namespace, folder: form.folder.trim() || undefined, mimeType: form.mimeType.trim(), sizeBytes, fileName: form.fileName.trim() || undefined, alt: form.alt.trim() || undefined } });
      setResult(data?.upload || null);
    } catch (failure) {
      action.setError(failure.code === 'cloudinary_not_configured' ? `Cloudinary is not configured on this server: ${failure.message}` : failure.message);
    }
  }}>
    <fieldset className="db-form" disabled={action.busy}><legend>Direct-to-Cloudinary upload signature</legend>
      <p className="db-muted">The browser would post the file directly to Cloudinary with this signature; the API secret never leaves the server. Requesting a signature does not upload or register anything.</p>
      <div style={gridStyle}>
        <FilterSelect legend="Upload namespace" name="namespace" value={form.namespace} options={mediaNamespaces.map((item) => [item, label(item)])} onChange={put('namespace')} />
        <label className="db-field">Folder (optional)<input aria-label="Upload folder" maxLength={80} value={form.folder} onChange={set('folder')} placeholder="lowercase-dashes-only" /></label>
        <label className="db-field">MIME type<input aria-label="Upload MIME type" required maxLength={80} value={form.mimeType} onChange={set('mimeType')} /></label>
        <label className="db-field">File size in bytes<input aria-label="Upload file size in bytes" required type="number" min={1} max={41943040} step={1} value={form.sizeBytes} onChange={set('sizeBytes')} /></label>
        <label className="db-field">File name (optional)<input aria-label="Upload file name" maxLength={180} value={form.fileName} onChange={set('fileName')} /></label>
        <label className="db-field">Alt text (optional)<input aria-label="Upload alt text" maxLength={200} value={form.alt} onChange={set('alt')} /></label>
      </div>
      <button className="db-button-secondary" disabled={action.busy}>{action.busy ? 'Requesting…' : 'Request upload signature'}</button>
    </fieldset>
    {result && <div className="db-panel" role="status"><p>Signature issued for Cloudinary account <strong>{result.cloudName}</strong>.</p><p className="db-muted">Endpoint: {result.uploadEndpoint} · Folder: {result.folder}</p></div>}
  </form>;
}

export function AdminMedia() {
  const { user } = useAuth();
  const admin = user?.role === 'admin';
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number.parseInt(params.get('page'), 10) || 1);
  const namespace = mediaNamespaces.includes(params.get('namespace')) ? params.get('namespace') : '';
  const search = (params.get('search') || '').slice(0, 120);
  const query = new URLSearchParams({ page: String(page), limit: '40' });
  if (namespace) query.set('namespace', namespace);
  if (search) query.set('search', search);
  const resource = useDashboardResource(`/admin/media?${query}`);
  const action = useAction(resource.reload);
  const [deletePublicId, setDeletePublicId] = useState('');
  const [deleteType, setDeleteType] = useState('image');
  const media = resource.data?.media || [];
  return <StaffOnly><div className="db-stack">
    <PageHeading eyebrow="Assets" title="Media assets" action={<button type="button" className="db-button-secondary" disabled={resource.loading || action.busy} onClick={resource.reload}>Refresh media</button>}>Media assets registered on this platform. Uploads go directly to Cloudinary; deletion soft-removes the row and asks the provider to destroy the object.</PageHeading>
    <ActionState action={action} adminOnly={admin} />
    <form className="db-panel db-stack" key={`${namespace}:${search}`} aria-label="Filter media" onSubmit={(event) => {
      event.preventDefault();
      const values = new FormData(event.currentTarget);
      const next = new URLSearchParams({ page: '1' });
      ['namespace', 'search'].forEach((key) => { const value = String(values.get(key) || '').trim(); if (value) next.set(key, value); });
      setParams(next);
    }}>
      <div style={gridStyle}>
        <label className="db-field">Namespace<select name="namespace" aria-label="Filter media namespace" defaultValue={namespace}><option value="">All namespaces</option>{mediaNamespaces.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
        <label className="db-field">Search public id<input type="search" name="search" aria-label="Search media public id" maxLength={120} defaultValue={search} /></label>
      </div>
      <div className="db-actions"><button className="db-button" disabled={resource.loading}>Apply filters</button><button type="button" className="db-button-secondary" onClick={() => setParams({})}>Clear filters</button></div>
    </form>
    <UploadSignatureForm action={action} />
    {admin && <form className="db-panel db-form" aria-label="Delete media asset" onSubmit={(event) => {
      event.preventDefault();
      if (!deletePublicId.trim()) { action.setError('Enter the public id of the asset to delete.'); return; }
      action.run({ path: '/admin/media', method: 'DELETE', body: { publicId: deletePublicId.trim(), resourceType: deleteType },
        confirm: `Delete media asset “${deletePublicId.trim()}”? The Cloudinary object is destroyed and the row is marked deleted. This cannot be undone from this screen.`,
        message: `Media asset ${deletePublicId.trim()} deleted.` }).then((ok) => { if (ok) setDeletePublicId(''); });
    }}>
      <h2>Delete an asset</h2>
      <fieldset className="db-form" disabled={action.busy}><legend>Destroy media</legend>
        <div style={gridStyle}>
          <label className="db-field">Public id<input aria-label="Media public id to delete" required maxLength={240} value={deletePublicId} onChange={(event) => setDeletePublicId(event.target.value)} /></label>
          <FilterSelect legend="Resource type to delete" name="resourceType" value={deleteType} options={resourceTypes.map((item) => [item, item])} onChange={setDeleteType} />
        </div>
        <button className="db-button-secondary" disabled={action.busy || !deletePublicId.trim()}>{action.busy ? 'Deleting…' : 'Review deletion'}</button>
      </fieldset>
    </form>}
    <RequestState resource={resource}>
      <div className="db-panel">
        {media.length ? <Table title="Media assets" columns={['Asset', 'Namespace', 'Type / format', 'Size', 'Uploaded']}>
          {media.map((asset) => <tr key={asset.id}>
            <td><span style={{ overflowWrap: 'anywhere' }}>{asset.publicId}</span><div className="db-muted">{asset.alt || 'No alt text'}</div></td>
            <td>{label(asset.namespace)}</td>
            <td>{label(asset.resourceType)}{asset.format ? ` · ${asset.format}` : ''}</td>
            <td>{asset.bytes ? `${Math.round(asset.bytes / 1024)} KB` : 'Unknown'}</td>
            <td>{date(asset.createdAt)}</td>
          </tr>)}
        </Table> : <EmptyState icon="grid" title="No media in this view">Uploads appear here once the browser registers them with the platform.</EmptyState>}
      </div>
    </RequestState>
    <Pagination page={page} meta={resource.meta} disabled={resource.loading || action.busy} name="Media" onPage={(next) => { const p = new URLSearchParams(query); p.delete('limit'); p.set('page', String(next)); setParams(p); }} />
  </div></StaffOnly>;
}

// =============================================================== PLATFORM

const knownJobs = ['reminders', 'booking-holds', 'sync-retries', 'email-retries', 'checkout-reconcile', 'video-status-sync', 'wisdom-call-generate', 'publish-scheduler', 'entitlement-expiry'];
const webhookStatuses = ['received', 'processing', 'processed', 'failed', 'ignored'];
const emailStatuses = ['queued', 'in_flight', 'sent', 'failed', 'skipped'];

function ProviderStatus() {
  const resource = useDashboardResource('/health/integrations');
  const videoResource = useDashboardResource('/admin/video/provider');
  const data = resource.data;
  const video = videoResource.data;
  return <div className="ad-columns">
    <section className="db-panel db-stack" aria-label="Integration status"><h2>Integration status</h2>
      <RequestState resource={resource}>
        {data ? <>
          <p className="db-muted">Environment: {label(data.env)} · Scheduler {data.jobsEnabled ? 'enabled' : 'not enabled'} · Reporting started {date(data.startedAt)}.</p>
          <ul style={{ listStyle: 'none', padding: 0 }}>{(data.integrations || []).map((integration) => <li key={integration.name} className="db-actions"><strong>{label(integration.name)}</strong><Badge value={integration.configured ? 'configured' : 'not configured'} /><span className="db-muted">{integration.mode}</span></li>)}</ul>
          <p className="db-muted">A “configured” flag means credentials are present. It is not proof that any provider delivered a message, payment or asset.</p>
          <p className="db-muted">Video provider: {label(data.videoProvider)} · DRM flag {data.drmEnabled ? 'on' : 'off'}.</p>
        </> : null}
      </RequestState>
    </section>
    <section className="db-panel db-stack" aria-label="Video provider capability"><h2>Video provider capability</h2>
      <RequestState resource={videoResource}>
        {video ? <>
          <div className="db-actions"><strong>{label(video.provider)}</strong><Badge value={video.configured ? 'configured' : 'not configured'} /></div>
          {video.configured ? <p className="db-muted">Capabilities reported: {Object.entries(video.capabilities || {}).map(([key, value]) => `${key}=${value}`).join(', ') || 'none listed'}.</p>
            : <p className="db-muted">Video provider unavailable: no provider is configured, so playback, DRM and upload capability cannot be exercised on this server.</p>}
          <p className="db-muted">Capability flags reflect what the provider layer reports; DRM protection is only claimed when the provider API confirms it.</p>
        </> : null}
      </RequestState>
    </section>
  </div>;
}

function JobRunner({ action, admin }) {
  const [job, setJob] = useState(knownJobs[0]);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  return <section className="db-panel db-stack" aria-label="Job runner">
    <h2>Job runner</h2>
    <p className="db-muted">Each job is idempotent and writes to providers when configured. Running a job here triggers the real scheduler endpoint; it is available to administrators only.</p>
    {admin ? <form onSubmit={async (event) => {
      event.preventDefault();
      if (pending.current) return;
      if (!window.confirm(`Run the “${job}” job now? It processes due items and may contact external providers.`)) return;
      pending.current = true; setBusy(true); setResult(null); action.clear();
      try {
        const data = await apiRequest(`/admin/jobs/${encodeURIComponent(job)}/run`, { method: 'POST' });
        setResult(data?.result ?? data);
      } catch (failure) {
        action.setError(failure.message || 'The job run could not be confirmed.');
      } finally {
        pending.current = false; setBusy(false);
      }
    }}>
      <fieldset className="db-form" disabled={busy}><legend>Run a scheduled job</legend>
        <div className="db-actions">
          <label className="db-field">Job<select aria-label="Job to run" value={job} onChange={(event) => setJob(event.target.value)}>{knownJobs.map((name) => <option key={name} value={name}>{label(name)}</option>)}</select></label>
          <button className="db-button-secondary" disabled={busy}>{busy ? 'Running…' : 'Run due items'}</button>
        </div>
      </fieldset>
    </form> : <ReadOnlyNotice>Only administrators can trigger job runs.</ReadOnlyNotice>}
    {result !== null && <p className="db-muted" role="status">Last run result: <span style={{ overflowWrap: 'anywhere' }}>{JSON.stringify(result)}</span></p>}
  </section>;
}

export function AdminPlatform() {
  const { user } = useAuth();
  const admin = user?.role === 'admin';
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number.parseInt(params.get('page'), 10) || 1);
  const action = useAction(() => { webhooks.reload(); emails.reload(); videos.reload(); });

  const webhookProvider = (params.get('provider') || '').slice(0, 40);
  const webhookStatus = webhookStatuses.includes(params.get('webhookStatus')) ? params.get('webhookStatus') : '';
  const webhookQuery = new URLSearchParams({ page: String(page), limit: '25' });
  if (webhookProvider) webhookQuery.set('provider', webhookProvider);
  if (webhookStatus) webhookQuery.set('status', webhookStatus);
  const webhooks = useDashboardResource(`/admin/webhooks?${webhookQuery}`);

  const emailStatus = emailStatuses.includes(params.get('emailStatus')) ? params.get('emailStatus') : '';
  const emailTemplate = (params.get('template') || '').slice(0, 80);
  const emailQuery = new URLSearchParams({ page: String(page), limit: '25' });
  if (emailStatus) emailQuery.set('status', emailStatus);
  if (emailTemplate) emailQuery.set('template', emailTemplate);
  const emails = useDashboardResource(`/admin/emails?${emailQuery}`);

  const videoProviderFilter = (params.get('videoProvider') || '').slice(0, 40);
  const videoQuery = new URLSearchParams({ page: String(page), limit: '25' });
  if (videoProviderFilter) videoQuery.set('provider', videoProviderFilter);
  const videos = useDashboardResource(`/admin/video-assets?${videoQuery}`);

  const setParam = (key, value, keepKeys = []) => {
    const next = new URLSearchParams();
    next.set('page', '1');
    if (value) next.set(key, value);
    keepKeys.forEach(([k, v]) => { if (v) next.set(k, v); });
    params.forEach((v, k) => { if (k !== key && k !== 'page' && !next.has(k) && v) next.set(k, v); });
    setParams(next);
  };

  const webhookRows = webhooks.data?.events || [];
  const emailRows = emails.data?.emails || [];
  const videoRows = videos.data?.assets || [];
  const emailHasProvider = emailRows.some((row) => row.provider);

  return <StaffOnly><div className="db-stack">
    <PageHeading eyebrow="Operations" title="Platform integrations" action={<button type="button" className="db-button-secondary" disabled={webhooks.loading || emails.loading || videos.loading || action.busy} onClick={() => { webhooks.reload(); emails.reload(); videos.reload(); }}>Refresh ledgers</button>}>Provider configuration, the job runner and the webhook, email and video delivery ledgers. Nothing here proves that a provider reached a customer, only that the platform recorded an event.</PageHeading>
    <ActionState action={action} />
    <ProviderStatus />
    <JobRunner action={action} admin={admin} />

    <section className="db-panel db-stack" aria-label="Webhook event ledger">
      <div className="db-actions">
        <label className="db-field">Provider filter<input aria-label="Webhook provider filter" type="search" maxLength={40} value={webhookProvider} onChange={(event) => setParam('provider', event.target.value.trim(), [['webhookStatus', webhookStatus], ['emailStatus', emailStatus], ['template', emailTemplate], ['videoProvider', videoProviderFilter]])} placeholder="mock, stripe, zoom…" /></label>
        <FilterSelect legend="Webhook status filter" name="webhookStatus" value={webhookStatus} options={[['', 'Any status'], ...webhookStatuses.map((item) => [item, label(item)])]} onChange={(next) => setParam('webhookStatus', next, [['provider', webhookProvider], ['emailStatus', emailStatus], ['template', emailTemplate], ['videoProvider', videoProviderFilter]])} />
      </div>
      <RequestState resource={webhooks}>
        {webhookRows.length ? <Table title="Webhook events" columns={['Provider / event', 'Type', 'Status', 'Attempts', 'Received', 'Error']}>
          {webhookRows.map((event) => <tr key={event.id}><td>{label(event.provider)}<div className="db-muted" style={{ overflowWrap: 'anywhere' }}>{event.eventId}</div></td><td style={{ overflowWrap: 'anywhere' }}>{event.eventType}</td><td><Badge value={event.status} /></td><td>{event.attempts ?? 0}</td><td>{date(event.receivedAt)}</td><td>{event.lastError || '—'}</td></tr>)}
        </Table> : <EmptyState title="No webhook events match" >Inbound provider deliveries are recorded here as they arrive.</EmptyState>}
      </RequestState>
    </section>

    <section className="db-panel db-stack" aria-label="Email delivery ledger">
      <div className="db-actions">
        <FilterSelect legend="Email status filter" name="emailStatus" value={emailStatus} options={[['', 'Any status'], ...emailStatuses.map((item) => [item, label(item)])]} onChange={(next) => setParam('emailStatus', next, [['provider', webhookProvider], ['webhookStatus', webhookStatus], ['template', emailTemplate], ['videoProvider', videoProviderFilter]])} />
        <label className="db-field">Template filter<input aria-label="Email template filter" type="search" maxLength={80} value={emailTemplate} onChange={(event) => setParam('template', event.target.value.trim(), [['provider', webhookProvider], ['webhookStatus', webhookStatus], ['emailStatus', emailStatus], ['videoProvider', videoProviderFilter]])} placeholder="order_paid" /></label>
      </div>
      <p className="db-muted">A “sent” row means the platform handed the message to its configured transport. When the transport is a log/capture mode, nothing reached a real mailbox.</p>
      <RequestState resource={emails}>
        {emailRows.length ? <Table title="Email deliveries" columns={['Recipient', 'Template / subject', 'Status', 'Provider', 'Suppressed', 'Created']}>
          {emailRows.map((row) => <tr key={row.id}>
            <td style={{ overflowWrap: 'anywhere' }}>{row.to}<div className="db-muted">{row.student?.name || ''}</div></td>
            <td>{row.template}<div className="db-muted">{row.subject}</div></td>
            <td><Badge value={row.status} /><div className="db-muted">{row.attempts ?? 0} attempt(s)</div></td>
            <td>{row.provider ? label(row.provider) : <span className="db-muted">Not surfaced by the ledger API</span>}</td>
            <td>{row.suppressed ? <span className="db-badge">{label(row.suppressionReason || 'suppressed')}</span> : 'No'}</td>
            <td>{date(row.sentAt || row.createdAt)}</td>
          </tr>)}
        </Table> : <EmptyState title="No email records match">Queued, sent, failed and suppressed messages all appear here.</EmptyState>}
      </RequestState>
      {!emailHasProvider && emailRows.length > 0 && <p className="db-muted">Note: the admin email ledger response does not currently include the delivery provider name, so provider identity cannot be shown per row.</p>}
    </section>

    <section className="db-panel db-stack" aria-label="Video assets">
      <div className="db-actions">
        <label className="db-field">Video provider filter<input aria-label="Video provider filter" type="search" maxLength={40} value={videoProviderFilter} onChange={(event) => setParam('videoProvider', event.target.value.trim(), [['provider', webhookProvider], ['webhookStatus', webhookStatus], ['emailStatus', emailStatus], ['template', emailTemplate]])} placeholder="bunny, local…" /></label>
      </div>
      <RequestState resource={videos}>
        {videoRows.length ? <Table title="Video assets" columns={['Asset', 'Provider / id', 'Processing', 'Duration', 'DRM', 'Course']}>
          {videoRows.map((asset) => <tr key={asset.id}>
            <td>{asset.title}<div className="db-muted">{asset.lesson?.title || 'No lesson linked'}</div></td>
            <td>{label(asset.provider)}<div className="db-muted" style={{ overflowWrap: 'anywhere' }}>{asset.providerAssetId || 'No provider id'}</div></td>
            <td><Badge value={asset.processingStatus} />{asset.providerStatusMessage && <div className="db-muted">{asset.providerStatusMessage}</div>}</td>
            <td>{asset.durationSeconds ? `${asset.durationSeconds}s` : 'Unknown'}</td>
            <td>{asset.drm?.capabilityVerified ? 'Verified' : 'Not verified'}<div className="db-muted">{label(asset.drm?.capabilitySource || 'unknown')}</div></td>
            <td>{asset.course?.title || '—'}</td>
          </tr>)}
        </Table> : <EmptyState title="No video assets recorded">Video assets appear here once uploaded and synced with the provider.</EmptyState>}
      </RequestState>
    </section>
  </div></StaffOnly>;
}

// ========================================================== DISCOUNT CODES

const discountKinds = ['percentage', 'fixed'];

// datetime-local values carry no zone, so the browser's local time is what an
// administrator typed; converting to ISO keeps the stored instant correct.
const toLocalInput = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
const fromLocalInput = (value) => (value ? new Date(value).toISOString() : undefined);

function DiscountEditor({ discount, action, onDone }) {
  const [form, setForm] = useState(() => ({
    label: discount.label || '',
    kind: discountKinds.includes(discount.kind) ? discount.kind : 'percentage',
    value: String(discount.value ?? ''),
    currency: discount.currency || 'CAD',
    maxDiscountMinor: discount.maxDiscountMinor ? String(discount.maxDiscountMinor) : '',
    redemptionLimit: discount.redemptionLimit ? String(discount.redemptionLimit) : '',
    perUserLimit: discount.perUserLimit ? String(discount.perUserLimit) : '',
    startsAt: toLocalInput(discount.startsAt),
    endsAt: toLocalInput(discount.endsAt),
    active: discount.active !== false,
  }));
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value });
  const put = (key) => (value) => setForm({ ...form, [key]: value });
  const positiveInt = (value) => (value === '' ? undefined : Math.max(0, Math.trunc(Number(value))));
  const body = () => ({
    label: form.label.trim() || undefined,
    kind: form.kind,
    value: Number(form.value),
    currency: form.kind === 'fixed' ? form.currency.trim().toUpperCase() : undefined,
    maxDiscountMinor: positiveInt(form.maxDiscountMinor),
    redemptionLimit: form.redemptionLimit === '' ? undefined : Math.max(1, Math.trunc(Number(form.redemptionLimit))),
    perUserLimit: positiveInt(form.perUserLimit),
    startsAt: fromLocalInput(form.startsAt),
    endsAt: fromLocalInput(form.endsAt),
    active: form.active,
  });
  const invalid = () => {
    if (!Number.isFinite(Number(form.value)) || Number(form.value) < 0) return 'Discount value must be zero or more.';
    if (form.kind === 'percentage' && Number(form.value) > 100) return 'A percentage discount cannot exceed 100.';
    if (form.kind === 'fixed' && form.currency.trim().toUpperCase().length !== 3) return 'A fixed discount needs a three-letter currency.';
    if (form.startsAt && form.endsAt && new Date(form.endsAt) <= new Date(form.startsAt)) return 'The end of the window must be after its start.';
    return '';
  };
  return <form className="db-form" aria-label={`Edit discount ${discount.code}`} aria-busy={action.busy} onSubmit={(event) => {
    event.preventDefault();
    const problem = invalid();
    if (problem) { action.setError(problem); return; }
    action.run({ path: `/admin/discounts/${encodeURIComponent(discount.id)}`, method: 'PATCH', body: body(), message: `Discount “${discount.code}” saved.` }).then((ok) => { if (ok) onDone(); });
  }}>
    <fieldset className="db-form" disabled={action.busy}><legend>Discount terms for {discount.code}</legend>
      <p className="db-muted">Once a code has been redeemed, its kind and value are locked by the server so the redemption history stays readable. Issue a new code instead.</p>
      <div style={gridStyle}>
        <label className="db-field">Internal label<input aria-label={`Internal label for ${discount.code}`} maxLength={120} value={form.label} onChange={set('label')} /></label>
        <FilterSelect legend={`Kind for ${discount.code}`} name="kind" value={form.kind} options={discountKinds.map((item) => [item, item === 'percentage' ? 'Percentage' : 'Fixed amount'])} onChange={put('kind')} />
        <label className="db-field">{form.kind === 'percentage' ? 'Percentage off' : 'Amount off (minor units)'}<input aria-label={`Discount value for ${discount.code}`} required type="number" min={0} step={form.kind === 'percentage' ? '0.01' : 1} value={form.value} onChange={set('value')} /></label>
        {form.kind === 'fixed' && <label className="db-field">Currency<input aria-label={`Currency for ${discount.code}`} required maxLength={3} value={form.currency} onChange={set('currency')} /></label>}
        <label className="db-field">Maximum discount (minor units)<input aria-label={`Maximum discount in minor units for ${discount.code}`} type="number" min={0} step={1} value={form.maxDiscountMinor} onChange={set('maxDiscountMinor')} /></label>
      </div>
      <div style={gridStyle}>
        <label className="db-field">Redemption limit<input aria-label={`Redemption limit for ${discount.code}`} type="number" min={1} step={1} value={form.redemptionLimit} placeholder="No limit" onChange={set('redemptionLimit')} /></label>
        <label className="db-field">Uses per student<input aria-label={`Uses per student for ${discount.code}`} type="number" min={0} step={1} value={form.perUserLimit} placeholder="No limit" onChange={set('perUserLimit')} /></label>
        <label className="db-field">Window starts<input aria-label={`Window start for ${discount.code}`} type="datetime-local" value={form.startsAt} onChange={set('startsAt')} /></label>
        <label className="db-field">Window ends<input aria-label={`Window end for ${discount.code}`} type="datetime-local" value={form.endsAt} onChange={set('endsAt')} /></label>
        <label className="db-field"><input aria-label={`Mark ${discount.code} active`} type="checkbox" checked={form.active} onChange={set('active')} /> Code is active</label>
      </div>
      <div className="db-actions"><button className="db-button" disabled={action.busy}>{action.busy ? 'Saving…' : 'Save discount'}</button><button type="button" className="db-button-secondary" disabled={action.busy} onClick={onDone}>Cancel</button></div>
    </fieldset>
  </form>;
}

function DiscountRow({ discount, action, admin }) {
  const [open, setOpen] = useState(false);
  const restricted = (discount.eligibleCourses?.length || 0) + (discount.eligiblePrograms?.length || 0);
  return <tr>
    <td>{discount.code}<div className="db-muted">{discount.label || 'No label'}</div></td>
    <td>{discount.kind === 'percentage' ? `${discount.value}% off` : `${money(discount.value, discount.currency)} off`}{discount.maxDiscountMinor ? <div className="db-muted">Capped at {money(discount.maxDiscountMinor, discount.currency)}</div> : null}</td>
    <td>{discount.startsAt ? date(discount.startsAt) : 'Any time'}<div className="db-muted">{discount.endsAt ? `Until ${date(discount.endsAt)}` : 'No end date'}</div></td>
    <td>{discount.redemptionCount}{discount.redemptionLimit ? ` of ${discount.redemptionLimit}` : ''} used<div className="db-muted">{discount.perUserLimit ? `${discount.perUserLimit} per student` : 'Unlimited per student'}</div>{discount.overLimitCount > 0 && <p className="db-error">{discount.overLimitCount} redemption past the limit, review this code</p>}</td>
    <td><Badge value={discount.active ? 'active' : 'inactive'} />{restricted > 0 && <div className="db-muted">Restricted to {restricted} product(s)</div>}</td>
    <td className="db-actions">{admin ? <>
      <button type="button" className="db-button-secondary" aria-expanded={open} aria-label={`${open ? 'Close' : 'Edit'} discount ${discount.code}`} disabled={action.busy} onClick={() => { action.clear(); setOpen(!open); }}>{open ? 'Close editor' : 'Edit terms'}</button>
      <button type="button" className="db-button-secondary" disabled={action.busy} aria-label={`${discount.active ? 'Deactivate' : 'Activate'} discount ${discount.code}`} onClick={() => action.run({
        path: `/admin/discounts/${encodeURIComponent(discount.id)}`, method: 'PATCH', body: { active: !discount.active },
        confirm: discount.active ? `Deactivate ${discount.code}? Students can no longer apply it at checkout.` : `Reactivate ${discount.code}? It becomes usable immediately.`,
        message: `Discount “${discount.code}” ${discount.active ? 'deactivated' : 'activated'}.`,
      })}>{discount.active ? 'Deactivate' : 'Activate'}</button>
    </> : <span className="db-muted">Administrator only</span>}</td>
    {open && <td colSpan={6}><DiscountEditor discount={discount} action={action} onDone={() => setOpen(false)} /></td>}
  </tr>;
}

function CreateDiscount({ action }) {
  const [form, setForm] = useState({ code: '', label: '', kind: 'percentage', value: '', currency: 'CAD', maxDiscountMinor: '', redemptionLimit: '', perUserLimit: '', startsAt: '', endsAt: '' });
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const put = (key) => (value) => setForm({ ...form, [key]: value });
  const positiveInt = (value) => (value === '' ? undefined : Math.max(0, Math.trunc(Number(value))));
  const reset = () => setForm({ ...form, code: '', label: '', value: '', maxDiscountMinor: '', redemptionLimit: '', perUserLimit: '', startsAt: '', endsAt: '' });
  const invalid = () => {
    if (!/^[A-Za-z0-9_-]{3,40}$/.test(form.code.trim())) return 'The code is 3–40 letters, numbers, dash or underscore.';
    if (!Number.isFinite(Number(form.value)) || Number(form.value) < 0) return 'Discount value must be zero or more.';
    if (form.kind === 'percentage' && Number(form.value) > 100) return 'A percentage discount cannot exceed 100.';
    if (form.kind === 'fixed' && form.currency.trim().toUpperCase().length !== 3) return 'A fixed discount needs a three-letter currency.';
    if (form.startsAt && form.endsAt && new Date(form.endsAt) <= new Date(form.startsAt)) return 'The end of the window must be after its start.';
    return '';
  };
  return <form className="db-panel db-form" aria-label="Create discount code" aria-busy={action.busy} onSubmit={(event) => {
    event.preventDefault();
    const problem = invalid();
    if (problem) { action.setError(problem); return; }
    action.run({ path: '/admin/discounts', method: 'POST', body: {
      code: form.code.trim().toUpperCase(),
      label: form.label.trim() || undefined,
      kind: form.kind,
      value: Number(form.value),
      currency: form.kind === 'fixed' ? form.currency.trim().toUpperCase() : undefined,
      maxDiscountMinor: positiveInt(form.maxDiscountMinor),
      redemptionLimit: form.redemptionLimit === '' ? undefined : Math.max(1, Math.trunc(Number(form.redemptionLimit))),
      perUserLimit: positiveInt(form.perUserLimit),
      startsAt: fromLocalInput(form.startsAt),
      endsAt: fromLocalInput(form.endsAt),
    }, message: `Discount “${form.code.trim().toUpperCase()}” created.` }).then((ok) => { if (ok) reset(); });
  }}>
    <h2>Create a discount code</h2>
    <p className="db-muted">Codes are applied by the server at checkout; a student-entered code never changes a price on its own. Product restrictions are managed with the catalog API.</p>
    <fieldset className="db-form" disabled={action.busy}><legend>New discount code</legend>
      <div style={gridStyle}>
        <label className="db-field">Code (required)<input aria-label="New discount code" required minLength={3} maxLength={40} pattern="[A-Za-z0-9_-]{3,40}" value={form.code} onChange={set('code')} /></label>
        <label className="db-field">Internal label<input aria-label="New discount label" maxLength={120} value={form.label} onChange={set('label')} /></label>
        <FilterSelect legend="New discount kind" name="kind" value={form.kind} options={discountKinds.map((item) => [item, item === 'percentage' ? 'Percentage' : 'Fixed amount'])} onChange={put('kind')} />
        <label className="db-field">{form.kind === 'percentage' ? 'Percentage off' : 'Amount off (minor units)'}<input aria-label="New discount value" required type="number" min={0} step={form.kind === 'percentage' ? '0.01' : 1} value={form.value} onChange={set('value')} /></label>
        {form.kind === 'fixed' && <label className="db-field">Currency<input aria-label="New discount currency" required maxLength={3} value={form.currency} onChange={set('currency')} /></label>}
        <label className="db-field">Maximum discount (minor units)<input aria-label="New discount maximum in minor units" type="number" min={0} step={1} value={form.maxDiscountMinor} onChange={set('maxDiscountMinor')} /></label>
      </div>
      <div style={gridStyle}>
        <label className="db-field">Redemption limit<input aria-label="New discount redemption limit" type="number" min={1} step={1} value={form.redemptionLimit} placeholder="No limit" onChange={set('redemptionLimit')} /></label>
        <label className="db-field">Uses per student<input aria-label="New discount uses per student" type="number" min={0} step={1} value={form.perUserLimit} placeholder="No limit" onChange={set('perUserLimit')} /></label>
        <label className="db-field">Window starts<input aria-label="New discount window start" type="datetime-local" value={form.startsAt} onChange={set('startsAt')} /></label>
        <label className="db-field">Window ends<input aria-label="New discount window end" type="datetime-local" value={form.endsAt} onChange={set('endsAt')} /></label>
      </div>
      <button className="db-button" disabled={action.busy}>{action.busy ? 'Creating…' : 'Create discount code'}</button>
    </fieldset>
  </form>;
}

export function AdminDiscounts() {
  const { user } = useAuth();
  const admin = user?.role === 'admin';
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number.parseInt(params.get('page'), 10) || 1);
  const active = ['true', 'false'].includes(params.get('active')) ? params.get('active') : '';
  const query = new URLSearchParams({ page: String(page), limit: '25' });
  if (active) query.set('active', active);
  const resource = useDashboardResource(`/admin/discounts?${query}`);
  const action = useAction(resource.reload);
  const discounts = resource.data?.discounts || [];
  return <StaffOnly><div className="db-stack">
    <PageHeading eyebrow="Commerce operations" title="Discount codes" action={<button type="button" className="db-button-secondary" disabled={resource.loading || action.busy} onClick={resource.reload}>Refresh codes</button>}>Codes, windows and redemption counts read from live orders. Usage counts only move when a payment is verified.</PageHeading>
    <ActionState action={action} adminOnly={admin} />
    <div className="db-actions">
      <FilterSelect legend="Filter discount codes by state" name="active" value={active} options={[['', 'All codes'], ['true', 'Active'], ['false', 'Inactive']]} onChange={(next) => { const p = new URLSearchParams(); if (next) p.set('active', next); p.set('page', '1'); setParams(p); }} />
      <button type="button" className="db-button-secondary" onClick={() => setParams({})}>Clear filter</button>
    </div>
    {admin && <CreateDiscount action={action} />}
    <RequestState resource={resource}>
      <div className="db-panel">
        {discounts.length ? <Table title="Discount codes" columns={['Code', 'Terms', 'Window', 'Usage', 'State', 'Manage']}>
          {discounts.map((discount) => <DiscountRow key={discount.id} discount={discount} action={action} admin={admin} />)}
        </Table> : <EmptyState icon="card" title="No discount codes in this view">Adjust the state filter or create a code.</EmptyState>}
      </div>
    </RequestState>
    <Pagination page={page} meta={resource.meta} disabled={resource.loading || action.busy} name="Discount codes" onPage={(next) => { const p = new URLSearchParams(query); p.delete('limit'); p.set('page', String(next)); setParams(p); }} />
  </div></StaffOnly>;
}
