import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { EmptyState, PageHeading, RequestState, dateTime, money, useDashboardResource } from '../components/DashboardUI';

const roles = ['student', 'admin', 'content_manager'];
const statuses = ['active', 'suspended', 'pending_deletion', 'deleted'];
const label = (value) => String(value || 'Not recorded').replaceAll('_', ' ');
const date = (value) => value ? dateTime(value) : 'Not recorded';
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 20 };

function Badge({ value }) {
  return <span className="db-badge">{label(value)}</span>;
}

function Pagination({ page, meta, disabled, onPage, name = 'Students' }) {
  const pages = Number.isInteger(meta?.pages) ? meta.pages : null;
  return <nav className="db-actions" aria-label={`${name} pagination`}>
    <button type="button" className="db-button-secondary" disabled={disabled || page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
    <span className="db-muted" aria-live="polite">Page {page}{pages !== null ? ` of ${Math.max(1, pages)}` : ''}{Number.isInteger(meta?.total) ? ` · ${meta.total} results` : ''}</span>
    <button type="button" className="db-button-secondary" disabled={disabled || pages === null || page >= pages} onClick={() => onPage(page + 1)}>Next</button>
  </nav>;
}

function Table({ title, columns, children }) {
  return <div role="region" aria-label={title} tabIndex={0} style={{ overflowX: 'auto' }}>
    <table><caption style={{ textAlign: 'left', paddingBottom: 10 }}>{title}</caption><thead><tr>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead><tbody>{children}</tbody></table>
  </div>;
}

function StaffOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="db-loading" role="status">Checking your session…</p>;
  if (!roles.slice(1).includes(user?.role)) return <div className="db-error" role="alert">Staff access is required.</div>;
  return children;
}

export function AdminPeople() {
  return <StaffOnly><StudentList /></StaffOnly>;
}

function StudentList() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number.parseInt(params.get('page'), 10) || 1);
  const search = (params.get('search') || '').slice(0, 160);
  const role = roles.includes(params.get('role')) ? params.get('role') : '';
  const status = statuses.includes(params.get('status')) ? params.get('status') : '';
  const query = new URLSearchParams({ page: String(page), limit: '25' });
  if (search) query.set('search', search);
  if (role) query.set('role', role);
  if (status) query.set('status', status);
  const resource = useDashboardResource(`/admin/students?${query}`);
  const students = resource.data?.students || [];
  const onPage = (next) => { const nextParams = new URLSearchParams(query); nextParams.delete('limit'); nextParams.set('page', String(next)); setParams(nextParams); };
  return <div className="db-stack">
    <PageHeading eyebrow="People & access" title="Students" action={<button type="button" className="db-button-secondary" disabled={resource.loading} onClick={resource.reload}>Refresh students</button>}>Find accounts, review learning activity and manage access.</PageHeading>
    <form className="db-panel db-stack" key={`${search}:${role}:${status}`} aria-label="Filter students" onSubmit={(event) => {
      event.preventDefault();
      const values = new FormData(event.currentTarget);
      const next = new URLSearchParams({ page: '1' });
      ['search', 'role', 'status'].forEach((key) => { const value = String(values.get(key) || '').trim(); if (value) next.set(key, value); });
      setParams(next);
    }}>
      <div style={gridStyle}>
        <label className="db-field">Search name or email<input type="search" name="search" maxLength={160} defaultValue={search} placeholder="Name or email address" /></label>
        <label className="db-field">Account status<select name="status" defaultValue={status}><option value="">All non-deleted accounts</option>{statuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
        <label className="db-field">Role<select name="role" defaultValue={role}><option value="">All roles</option>{roles.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
      </div>
      <div className="db-actions"><button className="db-button" disabled={resource.loading}>Apply filters</button><button type="button" className="db-button-secondary" onClick={() => setParams({})}>Clear filters</button></div>
    </form>
    <RequestState resource={resource}>
      <div className="db-panel">{students.length ? <Table title="Student accounts" columns={['Student', 'Role / status', 'Learning', 'Paid orders', 'Joined']}>
        {students.map((student) => <tr key={student.id}>
          <td><Link className="db-text-link" to={`/admin/students/${encodeURIComponent(student.id)}`}>{student.name || student.email}</Link><div className="db-muted" style={{ overflowWrap: 'anywhere' }}>{student.email}</div></td>
          <td><Badge value={student.role} /> <Badge value={student.status} /></td>
          <td>{student.stats?.activeCourses ?? 0} active courses<br />{student.stats?.completedCourses ?? 0} completed</td>
          <td>{student.stats?.orders ?? 0}</td><td>{date(student.createdAt)}</td>
        </tr>)}
      </Table> : <EmptyState icon="users" title="No matching students">Try a different name, status or role.</EmptyState>}</div>
    </RequestState>
    <Pagination page={page} meta={resource.meta} disabled={resource.loading} onPage={onPage} />
  </div>;
}

// One synchronous guard covers all access mutations on this student screen.
function useStudentAction(reload) {
  const pending = useRef(false);
  const mounted = useRef(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const run = async ({ path, method, body, confirm, message }) => {
    if (pending.current) return;
    pending.current = true;
    if (confirm && !window.confirm(confirm)) { pending.current = false; return; }
    setBusy(true); setError(''); setNotice('');
    try {
      await apiRequest(path, { method, body });
      if (mounted.current) { setNotice(message); reload(); }
    } catch (failure) {
      if (mounted.current) setError(failure.message || 'The change could not be confirmed. Refresh the record before retrying.');
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  return { run, busy, error, notice };
}

function AccountControls({ student, action, self }) {
  const [status, setStatus] = useState(student.status === 'deleted' ? '' : student.status);
  const [statusReason, setStatusReason] = useState('');
  const [role, setRole] = useState(student.role);
  const [roleReason, setRoleReason] = useState('');
  return <div style={gridStyle}>
    <form className="db-panel db-form" aria-label="Change account status" aria-busy={action.busy} onSubmit={(event) => {
      event.preventDefault();
      if (self || !status || status === student.status || (status !== 'active' && !statusReason.trim())) return;
      action.run({ path: `/admin/students/${encodeURIComponent(student.id)}/status`, method: 'PATCH', body: { status, reason: statusReason.trim() },
        confirm: `Change ${student.name || student.email} to ${label(status)}?${status === 'suspended' ? ' Their sessions will end on the next request.' : status === 'pending_deletion' ? ' This requests account deletion; it does not immediately purge the account.' : ''}`,
        message: `Account status updated to ${label(status)}.` });
    }}>
      <h2>Account status</h2>
      <fieldset disabled={action.busy || self} className="db-form"><legend>Update status</legend>
        <label className="db-field">New status<select required value={status} onChange={(event) => setStatus(event.target.value)}><option value="" disabled>Select a status</option>{statuses.filter((item) => item !== 'deleted').map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
        <label className="db-field">Reason {status === 'active' ? '(optional)' : '(required)'}<textarea required={status !== 'active'} maxLength={500} value={statusReason} onChange={(event) => setStatusReason(event.target.value)} /></label>
        <button className="db-button-secondary" disabled={!status || status === student.status || (status !== 'active' && !statusReason.trim())}>{action.busy ? 'Saving…' : 'Review status change'}</button>
      </fieldset>
      {self && <p className="db-muted">You cannot change your own account status.</p>}
    </form>
    <form className="db-panel db-form" aria-label="Change account role" aria-busy={action.busy} onSubmit={(event) => {
      event.preventDefault();
      if (roleReason.trim().length < 3 || role === student.role || (self && role !== 'admin')) return;
      action.run({ path: `/admin/students/${encodeURIComponent(student.id)}/role`, method: 'POST', body: { role, reason: roleReason.trim() },
        confirm: `Change ${student.name || student.email} from ${label(student.role)} to ${label(role)}? ${role === 'admin' ? 'This grants administrator access, including refunds and account management.' : role === 'content_manager' ? 'This grants staff access to content and administrative records.' : 'This removes staff privileges.'}`,
        message: `Role updated to ${label(role)}.` });
    }}>
      <h2>Account role</h2>
      <fieldset disabled={action.busy || self} className="db-form"><legend>Update permissions</legend>
        <label className="db-field">New role<select value={role} onChange={(event) => setRole(event.target.value)}>{roles.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
        <label className="db-field">Reason (required)<textarea required minLength={3} maxLength={500} value={roleReason} onChange={(event) => setRoleReason(event.target.value)} /></label>
        <button className="db-button-secondary" disabled={role === student.role || roleReason.trim().length < 3}>{action.busy ? 'Saving…' : 'Review role change'}</button>
      </fieldset>
      {self && <p className="db-muted">Self-demotion is not permitted.</p>}
    </form>
  </div>;
}

function GrantAccess({ student, entitlements, action }) {
  const [kind, setKind] = useState('course');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [productId, setProductId] = useState('');
  const [reason, setReason] = useState('');
  // Programs do not accept a search query. Both pickers expose real server pages.
  const query = new URLSearchParams({ page: String(page), limit: '25' });
  if (kind === 'course') { query.set('sort', 'title'); if (search.trim()) query.set('search', search.trim()); }
  const resource = useDashboardResource(`/admin/${kind === 'course' ? 'courses' : 'programs'}?${query}`);
  const products = resource.data?.[kind === 'course' ? 'courses' : 'programs'] || [];
  const selected = products.find((item) => item.id === productId);
  const alreadyActive = (item) => entitlements.some((entry) => entry.productKind === kind && entry.product?.id === item.id && entry.status === 'active' && (!entry.expiresAt || new Date(entry.expiresAt).getTime() > Date.now()));
  return <form className="db-panel db-form" aria-label="Grant student access" aria-busy={action.busy} onSubmit={(event) => {
    event.preventDefault();
    if (!selected || alreadyActive(selected) || reason.trim().length < 3 || resource.loading || resource.error) return;
    action.run({ path: `/admin/students/${encodeURIComponent(student.id)}/entitlements`, method: 'POST', body: { productKind: kind, productId, reason: reason.trim() },
      confirm: `Grant ${student.name || student.email} access to “${selected.title}”?${kind === 'program' ? ' Included courses will also be granted.' : ''} This is an audited manual grant, not a purchase.`, message: `Access granted to ${selected.title}.` });
  }}>
    <h2>Grant access</h2><p className="db-muted">Manual grants are exceptions and require a written reason. Choose an existing catalog product.</p>
    <fieldset className="db-form" disabled={action.busy}><legend>Product and reason</legend>
      <label className="db-field">Product kind<select value={kind} onChange={(event) => { setKind(event.target.value); setPage(1); setSearch(''); setProductId(''); }}><option value="course">Course</option><option value="program">Program</option></select></label>
      {kind === 'course' && <label className="db-field">Find a course<input type="search" maxLength={140} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); setProductId(''); }} placeholder="Search course title or slug" /></label>}
      <RequestState resource={resource}>
        <label className="db-field">{kind === 'course' ? 'Course' : 'Program'}<select required value={productId} disabled={!products.length} onChange={(event) => setProductId(event.target.value)}><option value="">Choose a {kind}</option>{products.map((item) => <option key={item.id} value={item.id} disabled={alreadyActive(item)}>{item.title} · {item.slug || item.id.slice(-6)} · {label(item.publicationStatus)}{alreadyActive(item) ? ' · already active' : ''}</option>)}</select></label>
        {!products.length && <p className="db-muted">No products on this page. Change the search or browse another page.</p>}
      </RequestState>
      <Pagination page={page} meta={resource.meta} disabled={resource.loading || action.busy} name="Catalog options" onPage={(next) => { setPage(next); setProductId(''); }} />
      <label className="db-field">Grant reason (required)<textarea required minLength={3} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      <button className="db-button" disabled={resource.loading || !!resource.error || !selected || (selected && alreadyActive(selected)) || reason.trim().length < 3}>{action.busy ? 'Saving…' : 'Review access grant'}</button>
    </fieldset>
  </form>;
}

function RevokeAccess({ entitlement, student, action }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  if (entitlement.status === 'revoked') return null;
  return <div className="db-stack">
    <button type="button" className="db-button-secondary" disabled={action.busy} aria-expanded={open} aria-controls={`revoke-${entitlement.id}`} onClick={() => setOpen(!open)}>{open ? 'Cancel revocation' : 'Revoke access'}</button>
    {open && <form id={`revoke-${entitlement.id}`} className="db-form" aria-label={`Revoke ${entitlement.product?.title || entitlement.productKind} access`} aria-busy={action.busy} onSubmit={(event) => {
      event.preventDefault();
      if (reason.trim().length < 3) return;
      action.run({ path: `/admin/entitlements/${encodeURIComponent(entitlement.id)}`, method: 'DELETE', body: { reason: reason.trim() },
        confirm: `Revoke ${student.name || student.email}’s access to “${entitlement.product?.title || entitlement.productKind}”?${entitlement.productKind === 'program' ? ' Active course access granted by this program will also be revoked.' : ''} No money will be refunded.`, message: 'Access revocation recorded.' });
    }}>
      <label className="db-field">Revocation reason<textarea required minLength={3} maxLength={300} disabled={action.busy} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      <button className="db-button-secondary" disabled={action.busy || reason.trim().length < 3}>{action.busy ? 'Saving…' : 'Confirm access revocation'}</button>
    </form>}
  </div>;
}

export function AdminStudentDetail() {
  const { id } = useParams();
  return <StaffOnly><StudentDetail key={id} id={id} /></StaffOnly>;
}

function StudentDetail({ id }) {
  const { user } = useAuth();
  const resource = useDashboardResource(`/admin/students/${encodeURIComponent(id)}`);
  // GET /students/:id -> data.student -> { student, entitlements, ... }.
  const record = resource.data?.student;
  const student = record?.student;
  const action = useStudentAction(resource.reload);
  const admin = user?.role === 'admin';
  const self = String(user?.id || user?._id) === String(id);
  return <div className="db-stack" style={{ overflowWrap: 'anywhere' }}>
    <PageHeading eyebrow="People & access" title={student?.name || 'Student detail'} action={<Link className="db-button-secondary" to="/admin/students">All students</Link>}>{student?.email || 'Account, access and learning history.'}</PageHeading>
    <div className="db-actions"><button type="button" className="db-button-secondary" disabled={resource.loading || action.busy} onClick={resource.reload}>Refresh student</button>{!admin && <p className="db-muted">Read-only access. Only administrators can change status, roles or entitlements.</p>}</div>
    {action.error && <div className="db-error" role="alert"><p>{action.error}</p><p>Review the current record before resubmitting the form. A connection failure does not prove the change failed.</p><button type="button" className="db-button-secondary" disabled={resource.loading || action.busy} onClick={resource.reload}>Refresh before retrying</button></div>}
    {action.notice && <p className="db-panel" role="status">{action.notice}</p>}
    <RequestState resource={resource}>
      {student ? <>
        <div className="db-panel db-stack"><div className="db-actions"><Badge value={student.status} /><Badge value={student.role} /><span className="db-muted">Email {student.emailVerified ? 'verified' : 'not verified'}</span></div>
          <dl style={gridStyle}><div><dt className="db-muted">Joined</dt><dd>{date(student.createdAt)}</dd></div><div><dt className="db-muted">Last sign-in</dt><dd>{date(student.lastLoginAt)}</dd></div><div><dt className="db-muted">Time zone</dt><dd>{student.timeZone || 'Not recorded'}</dd></div>{student.deletionRequestedAt && <div><dt className="db-muted">Deletion requested</dt><dd>{date(student.deletionRequestedAt)}</dd></div>}</dl>
          {student.statusReason && <p><strong>Status reason:</strong> {student.statusReason}</p>}
        </div>
        {admin && <AccountControls student={student} action={action} self={self} />}
        <div className="db-panel db-stack"><h2>Access history</h2>
          {record.entitlements?.length ? <Table title="Current and past entitlements" columns={['Product', 'Status / source', 'Access dates', ...(admin ? ['Manage'] : [])]}>
            {record.entitlements.map((entry) => <tr key={entry.id}><td><strong>{entry.product?.title || 'Product no longer available'}</strong><div className="db-muted">{label(entry.productKind)}</div></td><td><Badge value={entry.status} /><div className="db-muted">{label(entry.sourceKind)}</div>{entry.revocationReason && <p>{entry.revocationReason}</p>}</td><td>Enrolled: {date(entry.enrolledAt)}<br />Expires: {entry.expiresAt ? date(entry.expiresAt) : 'No expiry recorded'}{entry.revokedAt && <><br />Revoked: {date(entry.revokedAt)}</>}</td>{admin && <td><RevokeAccess entitlement={entry} student={student} action={action} /></td>}</tr>)}
          </Table> : <EmptyState title="No access grants">No entitlements have been recorded for this account.</EmptyState>}
        </div>
        {admin && <GrantAccess student={student} entitlements={record.entitlements || []} action={action} />}
        <div className="db-panel db-stack"><h2>Learning progress</h2>{record.progress?.length ? <div style={gridStyle}>{record.progress.map((entry, index) => <article className="db-panel" key={entry.course?.id || index}><h3>{entry.course?.title || 'Course no longer available'}</h3><Badge value={entry.status} /><div className="db-progress-row"><progress max={100} value={Math.max(0, Math.min(100, Number(entry.percent) || 0))} aria-label={`${entry.course?.title || 'Course'} completion`} /><span>{entry.percent ?? 0}%</span></div><p>{entry.lessonsCompleted ?? 0} of {entry.lessonsTotal ?? 0} lessons completed</p><p className="db-muted">Last accessed: {date(entry.lastAccessedAt)}</p></article>)}</div> : <EmptyState title="No learning activity">Progress will appear when the student starts learning.</EmptyState>}</div>
        <div className="db-panel db-stack"><h2>Order history</h2><p className="db-muted">Up to 50 most recent orders. Each amount retains its order currency; no mixed-currency lifetime total is shown.</p>{record.orders?.length ? <Table title="Recent student orders" columns={['Order', 'Payment / fulfillment', 'Total', 'Created']}>
          {record.orders.map((order) => <tr key={order.id}><td><Link className="db-text-link" to={`/admin/orders/${encodeURIComponent(order.id)}`}>{order.orderNumber}</Link><div className="db-muted">{order.items?.map((item) => item.title).join(', ')}</div></td><td><Badge value={order.paymentStatus} /><div className="db-muted">{label(order.fulfillmentStatus)}</div></td><td>{money(order.totalMinor, order.currency)}</td><td>{date(order.createdAt)}</td></tr>)}
        </Table> : <EmptyState icon="card" title="No orders recorded" />}</div>
        <div className="db-panel db-stack"><h2>Certificates</h2>{record.certificates?.length ? <Table title="Issued certificates" columns={['Course', 'Certificate', 'Status', 'Issued']}>
          {record.certificates.map((certificate) => <tr key={certificate.id}><td>{certificate.courseTitle}</td><td>{certificate.certificateId}</td><td><Badge value={certificate.status} /></td><td>{date(certificate.issuedAt)}</td></tr>)}
        </Table> : <EmptyState icon="award" title="No certificates issued" />}</div>
        <div className="db-panel db-stack"><h2>Booking history</h2><p className="db-muted">Up to 50 most recent bookings. Prices are omitted because this student-detail response does not include booking currencies.</p>{record.bookings?.length ? <Table title="Recent bookings" columns={['Session', 'Starts', 'Status']}>
          {record.bookings.map((booking) => <tr key={booking.id}><td>{booking.sessionType || 'Session no longer available'}</td><td>{date(booking.startAt)}</td><td><Badge value={booking.status} /></td></tr>)}
        </Table> : <EmptyState icon="clock" title="No bookings recorded" />}</div>
      </> : !resource.loading && !resource.error && <div className="db-error" role="alert">The server did not return a student record. <button type="button" className="db-button-secondary" onClick={resource.reload}>Try again</button></div>}
    </RequestState>
  </div>;
}
