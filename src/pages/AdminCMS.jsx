import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { EmptyState, PageHeading, RequestState, useDashboardResource } from '../components/DashboardUI';
import CMSBlocks, { CMS_BLOCK_TYPES, safeCMSUrl } from '../components/CMSBlocks';
import '../styles/cms.css';

const API_PAGES = '/admin/pages';
const editorPath = (id) => `/admin/cms/${encodeURIComponent(id)}`;
const apiPage = (id) => `${API_PAGES}/${encodeURIComponent(id)}`;
const publicPath = (page) => page.isHomepage ? '/' : `/pages/${encodeURIComponent(page.slug)}`;
const isStaff = (user) => ['admin', 'content_manager'].includes(user?.role);
const clone = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const labelFor = (name = '') => ({ titleLead: 'Title lead', titleAccent: 'Title accent', body: 'Body', bio: 'Biography', to: 'Link destination', src: 'Image URL', cloudinaryPublicId: 'Cloudinary public ID', courseId: 'Course ID', courseIds: 'Course IDs', programId: 'Program ID', q: 'Question', a: 'Answer', sub: 'Supporting text', cssClass: 'CSS class (not applied by the safe renderer)' }[name] || name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/^./, (letter) => letter.toUpperCase()));
const date = (value) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString() : 'Not recorded';

function Field({ label, value, onChange, hint, multiline = false, type = 'text', ...props }) {
  const id = useId();
  const Control = multiline ? 'textarea' : 'input';
  return <div className="db-field"><label htmlFor={id}>{label}{props.required ? ' *' : ''}</label><Control id={id} {...(!multiline ? { type } : {})} {...props} value={value ?? ''} aria-describedby={hint ? `${id}-hint` : undefined} onChange={(event) => onChange(type === 'number' && event.target.value !== '' ? Number(event.target.value) : event.target.value)} />{hint && <small id={`${id}-hint`} className="db-muted">{hint}</small>}</div>;
}
function Select({ label, value, options, onChange, hint, ...props }) {
  const id = useId();
  return <div className="db-field"><label htmlFor={id}>{label}</label><select id={id} value={value ?? ''} onChange={(event) => onChange(event.target.value)} aria-describedby={hint ? `${id}-hint` : undefined} {...props}>{options.map((option) => { const [key, title] = Array.isArray(option) ? option : [option, labelFor(option)]; return <option key={key} value={key}>{title}</option>; })}</select>{hint && <small id={`${id}-hint`} className="db-muted">{hint}</small>}</div>;
}
function Check({ label, checked, onChange, ...props }) {
  return <label className="cms-admin-check"><input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} {...props} /><span>{label}</span></label>;
}
function useAction() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');
  const run = async (task, message) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null); setNotice('');
    try { await task(); setNotice(message || ''); }
    catch (failure) { setError(failure); }
    finally { lock.current = false; setBusy(false); }
  };
  return { run, busy, error, notice, lock };
}
function ActionState({ action }) {
  const ref = useRef(null);
  useEffect(() => { if (action.error) ref.current?.focus(); }, [action.error]);
  const issues = Array.isArray(action.error?.details) ? action.error.details : action.error?.details?.issues || action.error?.details?.details;
  const hasIssues = Array.isArray(issues) && issues.length > 0;
  return <>{action.error && <div className="db-error" role="alert" ref={ref} tabIndex={-1}><strong>{hasIssues ? 'Check the fields listed below.' : (action.error.message || 'The request failed.')}</strong>{hasIssues && <ul>{issues.map((issue, index) => <li key={index}>{issue.field || (Array.isArray(issue.path) ? issue.path.join('.') : issue.path) || 'Form'}: {issue.message}</li>)}</ul>}{action.error.status === 409 && <p>The server refused a conflicting change. Your local draft is retained. Copy any changes you need, then use “Reload saved page”; no automatic overwrite or retry is performed.</p>}{action.error.status === 401 && <Link to="/login" className="db-text-link">Sign in again</Link>}</div>}{action.notice && <p className="cms-admin-notice" role="status">{action.notice}</p>}</>;
}
function useUnsavedWarning(dirty) {
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
}
function metadata(page = {}) {
  return {
    title: page.title || '', slug: page.slug || '', template: page.template || 'blocks', isHomepage: Boolean(page.isHomepage),
    seo: { title: '', description: '', ogImage: '', canonicalUrl: '', noIndex: false, ...page.seo },
    navigation: { showInHeader: false, headerLabel: '', headerGroup: 'primary', orderIndex: 0, showInFooter: false, ...page.navigation },
    blocks: clone(page.blocks || []).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0)),
  };
}
function MetadataFields({ value, onChange, creating = false }) {
  const put = (key, next) => onChange({ ...value, [key]: next });
  const nested = (key, name, next) => put(key, { ...value[key], [name]: next });
  return <div className="db-stack"><section className="db-panel db-stack"><div><h2>Page details</h2><p className="db-muted">Required fields are marked *. Title, URL, SEO and navigation remain private until you publish.</p></div><div className="cms-admin-grid">
    <Field label="Page title" required minLength={2} maxLength={160} value={value.title} onChange={(next) => put('title', next)} />
    <Field label="Page slug" required={!creating} maxLength={140} value={value.slug} onChange={(next) => put('slug', next)} hint={creating ? 'Leave blank to generate from the title. Slugs must be unique.' : 'The server normalizes the slug. The current public URL stays unchanged until publication.'} />
    <Select label="Page template" value={value.template} options={['blocks', 'landing', 'legal']} onChange={(next) => put('template', next)} />
  </div><Check label="Use this page as the homepage" checked={value.isHomepage} onChange={(next) => put('isHomepage', next)} /><p className="db-muted">Only one homepage can exist. The server prevents conflicting assignments and unpublishing the homepage.</p></section>
  <section className="db-panel db-stack"><h2>Search & social sharing</h2><div className="cms-admin-grid"><Field label="SEO title" maxLength={70} value={value.seo.title} onChange={(next) => nested('seo', 'title', next)} hint="Up to 70 characters. Falls back to the page title." /><Field label="Canonical URL" maxLength={600} value={value.seo.canonicalUrl} onChange={(next) => nested('seo', 'canonicalUrl', next)} hint="An HTTP(S) URL or /path. Blank uses this page’s published URL." /></div><Field label="SEO description" multiline rows={3} maxLength={170} value={value.seo.description} onChange={(next) => nested('seo', 'description', next)} hint={`${value.seo.description.length} / 170 characters`} /><Field label="Social sharing image URL" maxLength={600} value={value.seo.ogImage} onChange={(next) => nested('seo', 'ogImage', next)} hint="An existing image URL. No upload or provider request is made by this editor." /><Check label="Ask search engines not to index this page" checked={value.seo.noIndex} onChange={(next) => nested('seo', 'noIndex', next)} /></section>
  <section className="db-panel db-stack"><h2>Navigation</h2><div className="cms-admin-checks"><Check label="Show in header navigation" checked={value.navigation.showInHeader} onChange={(next) => nested('navigation', 'showInHeader', next)} /><Check label="Show in footer navigation" checked={value.navigation.showInFooter} onChange={(next) => nested('navigation', 'showInFooter', next)} /></div><div className="cms-admin-grid"><Field label="Navigation label" maxLength={40} value={value.navigation.headerLabel} onChange={(next) => nested('navigation', 'headerLabel', next)} hint="Blank uses the page title." /><Select label="Navigation group" value={value.navigation.headerGroup} options={['primary', 'about', 'courses', 'books', 'footer']} onChange={(next) => nested('navigation', 'headerGroup', next)} /><Field label="Navigation order" type="number" required min={0} max={9999} step={1} value={value.navigation.orderIndex} onChange={(next) => nested('navigation', 'orderIndex', next)} /></div></section></div>;
}

function defaultField(field, force = false) {
  if (field.default !== undefined) return clone(field.default);
  if (!field.required && !force) return undefined;
  if (field.kind === 'object') return Object.fromEntries((field.fields || []).map((child) => [child.name, defaultField(child)]).filter(([, value]) => value !== undefined));
  if (field.kind === 'list') return Array.from({ length: field.minItems || 0 }, () => defaultField(field.item, true));
  if (field.kind === 'toggle') return false;
  if (field.kind === 'number') return field.min ?? 0;
  if (field.kind === 'select') return field.options?.[0] || '';
  return '';
}
function makeBlock(definition) {
  const uuid = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return { key: `block-${uuid}`, type: definition.type, visible: true, settings: defaultField(definition.settings, true), data: Object.fromEntries(definition.fields.map((field) => [field.name, defaultField(field)]).filter(([, value]) => value !== undefined)) };
}
function OrderButtons({ index, total, label, onMove, disabled = false }) {
  return <div className="cms-order-buttons" role="group" aria-label={`Reorder ${label}`}><button type="button" className="db-button-secondary" aria-label={`Move ${label} up`} disabled={disabled || index === 0} onClick={() => onMove(-1)}>↑</button><button type="button" className="db-button-secondary" aria-label={`Move ${label} down`} disabled={disabled || index === total - 1} onClick={() => onMove(1)}>↓</button></div>;
}
function moved(items, index, direction) {
  const next = [...items];
  if (index + direction < 0 || index + direction >= next.length) return next;
  [next[index], next[index + direction]] = [next[index + direction], next[index]];
  return next;
}
function ReferencePicker({ kind, onPick, onClose }) {
  const [page, setPage] = useState(1);
  const resource = useDashboardResource(`/admin/${kind}?status=published&page=${page}&limit=20`);
  const rows = resource.data?.[kind] || [];
  return <div className="cms-admin-lookup db-stack"><div className="cms-admin-row"><h4>Published {kind}</h4><button type="button" className="db-button-secondary" onClick={onClose}>Close picker</button></div><RequestState resource={resource}>{rows.length ? <ul>{rows.map((row) => <li key={row.id || row._id}><span>{row.title}</span><button type="button" className="db-button-secondary" onClick={() => onPick(row.id || row._id)}>Use {kind === 'courses' ? 'course' : 'program'}</button></li>)}</ul> : <p>No published {kind} found.</p>}</RequestState><Pagination page={page} setPage={setPage} resource={resource} count={rows.length} /></div>;
}
function localDate(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return '';
  const instant = new Date(value);
  return new Date(instant.getTime() - instant.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function SchemaField({ field, value, onChange, context = '' }) {
  const [picking, setPicking] = useState(false);
  const name = labelFor(field.name);
  const label = field.name === 'item' ? context : name;
  const clearable = !field.required;
  const reference = field.name === 'programId' ? 'programs' : field.name === 'courseId' || (field.name === 'item' && context.startsWith('Course IDs')) ? 'courses' : null;
  if (field.kind === 'object') {
    const enabled = value !== undefined && value !== null;
    return <fieldset className="cms-schema-object db-stack"><legend>{label}{field.required ? ' *' : ''}</legend>{clearable && <Check label={`Include ${label.toLowerCase()}`} checked={enabled} onChange={(checked) => onChange(checked ? defaultField(field, true) : undefined)} />}{(enabled || field.required) && (field.fields || []).map((child) => <SchemaField key={child.name} field={child} value={value?.[child.name]} context={`${context} ${label}`} onChange={(next) => onChange({ ...value, [child.name]: next })} />)}</fieldset>;
  }
  if (field.kind === 'list') {
    const entries = Array.isArray(value) ? value : [];
    const maximum = field.maxItems ?? 200;
    return <fieldset className="cms-schema-list db-stack"><legend>{label}{field.required ? ' *' : ''}</legend><p className="db-muted">{entries.length} / {maximum} items{field.minItems ? ` · At least ${field.minItems} required` : ''}</p>{entries.map((entry, index) => <div key={index} className="cms-schema-item db-stack"><div className="cms-admin-row"><strong>{label} · {index + 1}</strong><div className="db-actions"><OrderButtons index={index} total={entries.length} label={`${label} item ${index + 1}`} onMove={(direction) => onChange(moved(entries, index, direction))} /><button type="button" className="db-button-secondary" aria-label={`Remove ${label} item ${index + 1}`} onClick={() => { if (window.confirm(`Remove ${label.toLowerCase()} item ${index + 1}? This is applied when you save the draft.`)) onChange(entries.filter((_, position) => position !== index)); }}>Remove</button></div></div><SchemaField field={field.item} value={entry} context={`${label} item ${index + 1}`} onChange={(next) => onChange(entries.map((item, position) => position === index ? next : item))} /></div>)}<div className="db-actions"><button type="button" className="db-button-secondary" disabled={entries.length >= maximum} onClick={() => onChange([...entries, defaultField(field.item, true)])}>Add {label.toLowerCase()} item</button></div></fieldset>;
  }
  if (field.kind === 'toggle') return <Check label={label} checked={value ?? field.default} onChange={onChange} />;
  if (field.kind === 'select') return <Select label={label} value={value ?? field.default ?? ''} options={clearable && field.default === undefined ? [['', 'Not set'], ...(field.options || [])] : field.options || []} onChange={(next) => onChange(next === '' && clearable ? undefined : next)} required={field.required} />;
  const multiline = field.kind === 'richtext' || (field.maxLength >= 300 && !['src', 'to', 'embedUrl', 'purchaseUrl', 'url', 'cloudinaryPublicId'].includes(field.name));
  const hints = [];
  if (field.kind === 'richtext') hints.push('Plain text or basic HTML accepted. The backend sanitizes on save; preview and public pages display safe text with paragraph breaks, not executable HTML.');
  if (reference) hints.push('Use a 24-character database ID, not a slug. Or choose a published item below.');
  if (['src', 'url', 'to', 'purchaseUrl'].includes(field.name)) hints.push('Use an existing HTTP(S) URL or /path. Links may also use mailto: or tel:. Product links must remain on this site.');
  if (field.name === 'embedUrl') hints.push('HTTPS embed URL only: youtube.com/embed/ID, player.vimeo.com/video/ID or iframe.mediadelivery.net/embed/LIBRARY/ID.');
  if (field.name === 'cssClass') hints.push('Stored for compatibility only; arbitrary CSS classes are never applied.');
  if (field.format === 'datetime') hints.push('Your local date and time; saved as UTC. Leave blank for no schedule boundary.');
  if (field.maxLength) hints.push(`Maximum ${field.maxLength.toLocaleString()} characters.`);
  const type = field.kind === 'number' ? 'number' : field.format === 'datetime' ? 'datetime-local' : field.format === 'email' ? 'email' : 'text';
  return <div className="db-stack cms-schema-control"><Field label={label} value={type === 'datetime-local' ? localDate(value) : value ?? field.default} onChange={(next) => {
    if (next === '' && clearable && !field.allowEmpty) onChange(undefined);
    else if (type === 'datetime-local') onChange(next && Number.isFinite(Date.parse(next)) ? new Date(next).toISOString() : undefined);
    else onChange(next);
  }} type={type} multiline={multiline} rows={field.kind === 'richtext' ? 7 : 3} required={field.required} min={field.min} max={field.max} minLength={field.minLength} maxLength={field.maxLength} step={field.kind === 'number' ? field.integer ? 1 : 'any' : undefined} pattern={field.pattern} hint={hints.join(' ')} />{reference && <><div className="db-actions"><button type="button" className="db-button-secondary" aria-expanded={picking} onClick={() => setPicking(!picking)}>Choose published {reference === 'courses' ? 'course' : 'program'}</button></div>{picking && <ReferencePicker kind={reference} onClose={() => setPicking(false)} onPick={(id) => { onChange(id); setPicking(false); }} />}</>}</div>;
}
function validateField(field, value, path, issues) {
  if (value === undefined || value === null || value === '') {
    if (field.required && field.default === undefined && !(field.allowEmpty && value === '')) issues.push({ field: path, message: 'This field is required.' });
    return;
  }
  if (field.kind === 'object') { for (const child of field.fields || []) validateField(child, value[child.name], `${path} / ${labelFor(child.name)}`, issues); return; }
  if (field.kind === 'list') {
    if (!Array.isArray(value)) { issues.push({ field: path, message: 'Expected a list.' }); return; }
    if (value.length < (field.minItems || 0) || value.length > (field.maxItems ?? 200)) issues.push({ field: path, message: `Use ${field.minItems || 0}–${field.maxItems ?? 200} items.` });
    value.forEach((entry, index) => validateField(field.item, entry, `${path} item ${index + 1}`, issues)); return;
  }
  if (field.kind === 'number' && (!Number.isFinite(value) || (field.integer && !Number.isInteger(value)) || value < (field.min ?? -Infinity) || value > (field.max ?? Infinity))) issues.push({ field: path, message: 'Enter a number within the specified limits.' });
  if (field.kind === 'select' && !field.options?.includes(value)) issues.push({ field: path, message: 'Choose one of the available options.' });
  if (typeof value === 'string') {
    if (value.length > (field.maxLength ?? Infinity) || value.length < (field.minLength || 0)) issues.push({ field: path, message: 'Text length is outside the specified limits.' });
    if (field.pattern) { try { if (!new RegExp(field.pattern, 'i').test(value)) issues.push({ field: path, message: 'The value does not match the required format.' }); } catch { /* Backend remains authoritative for future patterns. */ } }
    if (field.format === 'datetime' && !Number.isFinite(Date.parse(value))) issues.push({ field: path, message: 'Choose a valid date and time.' });
    if (['src', 'to', 'url', 'purchaseUrl'].includes(field.name) && !safeCMSUrl(value, { asset: ['src', 'url'].includes(field.name) })) issues.push({ field: path, message: 'Enter a safe URL or /path.' });
  }
}
function validateDraft(draft, catalog) {
  const issues = [];
  if (draft.title.trim().length < 2 || draft.title.length > 160) issues.push({ field: 'Page title', message: 'Use 2–160 characters.' });
  if (!draft.slug.trim()) issues.push({ field: 'Page slug', message: 'A slug is required.' });
  if (!Number.isInteger(draft.navigation.orderIndex) || draft.navigation.orderIndex < 0 || draft.navigation.orderIndex > 9999) issues.push({ field: 'Navigation order', message: 'Use a whole number from 0 to 9999.' });
  for (const name of ['ogImage', 'canonicalUrl']) if (draft.seo[name] && !safeCMSUrl(draft.seo[name], { asset: true })) issues.push({ field: `SEO ${name}`, message: 'Use a safe HTTP(S) URL or /path.' });
  draft.blocks.forEach((block, index) => {
    const definition = catalog.find((item) => item.type === block.type);
    if (!definition) return;
    const path = `Block ${index + 1}: ${definition.label}`;
    for (const field of definition.fields) validateField(field, block.data?.[field.name], `${path} / ${labelFor(field.name)}`, issues);
    // The catalog describes the settings object; the block envelope makes it optional.
    if (definition.settings && block.settings != null) validateField(definition.settings, block.settings, `${path} / Settings`, issues);
    if (block.type === 'course_grid' && block.data.source === 'category' && !block.data.category?.trim()) issues.push({ field: path, message: 'Category is required for a category grid.' });
    if (block.type === 'announcement' && block.data.startsAt && block.data.endsAt && Date.parse(block.data.endsAt) <= Date.parse(block.data.startsAt)) issues.push({ field: path, message: 'End time must follow start time.' });
  });
  if (issues.length) { const error = new Error('Check the marked field names below. Your draft has not been discarded.'); error.details = issues; throw error; }
}
function Pagination({ page, setPage, resource, count }) {
  const totalPages = Number(resource.meta?.pages);
  const more = totalPages > 0 ? page < totalPages : count === 20;
  return <nav className="cms-admin-row" aria-label="Result pages"><span className="db-muted">Page {page}{totalPages > 0 ? ` of ${totalPages}` : ''}{typeof resource.meta?.total === 'number' ? ` · ${resource.meta.total} results` : ''}</span><div className="db-actions"><button type="button" className="db-button-secondary" disabled={resource.loading || page <= 1} onClick={() => setPage(page - 1)}>Previous</button><button type="button" className="db-button-secondary" disabled={resource.loading || Boolean(resource.error) || !more} onClick={() => setPage(page + 1)}>Next</button></div></nav>;
}
function CreatePage({ onCancel, onCreated }) {
  const [form, setForm] = useState(() => metadata());
  const action = useAction();
  const dirty = JSON.stringify(form) !== JSON.stringify(metadata());
  useUnsavedWarning(dirty || action.busy);
  return <form className="db-stack" onSubmit={(event) => { event.preventDefault(); action.run(async () => {
    for (const key of ['ogImage', 'canonicalUrl']) if (form.seo[key] && !safeCMSUrl(form.seo[key], { asset: true })) throw new Error('SEO URLs must be safe HTTP(S) URLs or /paths.');
    const response = await apiRequest(API_PAGES, { method: 'POST', body: form });
    if (!response?.page?.id) throw new Error('The server did not return the created page. Reload the list before trying again.');
    onCreated(response.page);
  }); }}><ActionState action={action} /><fieldset className="cms-admin-form-body db-stack" disabled={action.busy}><legend className="cms-sr-only">Create a draft page</legend><MetadataFields value={form} onChange={setForm} creating /><div className="db-actions"><button className="db-button" disabled={action.busy}>{action.busy ? 'Creating…' : 'Create draft page'}</button><button type="button" className="db-button-secondary" onClick={() => { if (!dirty || window.confirm('Discard this new page form?')) onCancel(); }}>Cancel</button></div></fieldset></form>;
}

export function AdminCMS() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState(false);
  const page = Math.max(1, Number.parseInt(params.get('page'), 10) || 1);
  const status = ['draft', 'published', 'unpublished', 'archived'].includes(params.get('status')) ? params.get('status') : '';
  const resource = useDashboardResource(isStaff(user) ? `${API_PAGES}?page=${page}&limit=20${status ? `&status=${status}` : ''}` : null);
  const pages = resource.data?.pages || [];
  if (!isStaff(user)) return <EmptyState title="Staff access required">Sign in as an administrator or content manager to manage pages.</EmptyState>;
  return <div className="cms-admin db-stack"><PageHeading eyebrow="Website content" title="Pages & content" action={!creating && <button type="button" className="db-button" onClick={() => setCreating(true)}>Create page</button>}>Compose your next chapter. Draft safely, review the details, then publish.</PageHeading>{creating ? <CreatePage onCancel={() => setCreating(false)} onCreated={(created) => navigate(editorPath(created.id))} /> : <><div className="db-panel cms-admin-row"><Select label="Publication status" value={status} options={[["", 'All statuses'], ['draft', 'Draft'], ['published', 'Published'], ['unpublished', 'Unpublished'], ['archived', 'Archived']]} onChange={(next) => setParams(next ? { status: next, page: '1' } : {})} /><button type="button" className="db-button-secondary" disabled={resource.loading} onClick={resource.reload}>Refresh pages</button></div><RequestState resource={resource}>{pages.length ? <div className="db-panel cms-admin-table-wrap"><table><caption className="cms-sr-only">CMS pages and publication status</caption><thead><tr><th scope="col">Page</th><th scope="col">Publication</th><th scope="col">Updated</th><th scope="col">Action</th></tr></thead><tbody>{pages.map((item) => <tr key={item.id || item._id}><th scope="row"><Link to={editorPath(item.id || item._id)} className="cms-admin-page-link">{item.title}</Link><small className="db-muted">/{item.slug}{item.isHomepage ? ' · Homepage' : ''}</small></th><td><span className="db-badge">{item.status}</span>{item.hasUnpublishedChanges && <small className="cms-admin-unsaved">Unpublished draft changes</small>}</td><td>{date(item.updatedAt)}</td><td><Link to={editorPath(item.id || item._id)} className="db-button-secondary" aria-label={`Edit ${item.title}`}>Edit page</Link></td></tr>)}</tbody></table></div> : <div className="db-panel"><EmptyState title="No pages found" action={<button type="button" className="db-button" onClick={() => setCreating(true)}>Create your first page</button>}>New pages start as drafts. Published pages are the only pages visitors can see.</EmptyState></div>}</RequestState><Pagination page={page} setPage={(next) => setParams({ ...(status ? { status } : {}), page: String(next) })} resource={resource} count={pages.length} /></>}</div>;
}

function RevisionList({ page, busy, dirty, onRestore, resource }) {
  const revisions = resource.data?.revisions || [];
  return <section className="db-panel db-stack" aria-label="Revision history"><div className="cms-admin-row"><div><h2>Revision history</h2><p className="db-muted">Latest 100 snapshots. Restoring creates a new draft revision; it does not change the live page.</p></div><button type="button" className="db-button-secondary" disabled={busy || resource.loading} onClick={resource.reload}>Refresh revisions</button></div><RequestState resource={resource}>{revisions.length ? <ol className="cms-revisions">{revisions.map((revision) => <li key={revision.revisionNumber}><div><strong>Revision {revision.revisionNumber}</strong><span>{revision.changeNote || 'Saved draft'}</span><small className="db-muted">{date(revision.createdAt)}</small></div><button type="button" className="db-button-secondary" disabled={busy || revision.revisionNumber === page.revisionCount} onClick={() => {
    if (window.confirm(`Restore revision ${revision.revisionNumber} as the editable draft?${dirty ? ' This will discard your unsaved local edits.' : ''} The live publication will not change until you publish.`)) onRestore(revision.revisionNumber);
  }}>Restore revision {revision.revisionNumber}</button></li>)}</ol> : <p className="db-muted">No revisions were returned.</p>}</RequestState></section>;
}
function EditorWorkspace({ initial }) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(() => metadata(initial));
  const [tab, setTab] = useState('content');
  const [selected, setSelected] = useState(initial.blocks?.[0]?.key || null);
  const [blockType, setBlockType] = useState('');
  const [changeNote, setChangeNote] = useState('');
  const [blockNotice, setBlockNotice] = useState('');
  const action = useAction();
  const catalogResource = useDashboardResource(`${API_PAGES}/block-catalog`);
  const revisionResource = useDashboardResource(`${apiPage(initial.id)}/revisions?limit=100`);
  const catalog = catalogResource.data?.blocks || [];
  const dirty = JSON.stringify(draft) !== JSON.stringify(metadata(saved));
  const fieldsDisabled = action.busy;
  const selectedBlock = draft.blocks.find((block) => block.key === selected);
  const selectedDefinition = catalog.find((item) => item.type === selectedBlock?.type);
  const publication = saved.publishedMetadata;
  useUnsavedWarning(dirty || action.busy);
  const setBlocks = (blocks) => setDraft((current) => ({ ...current, blocks: blocks.map((block, orderIndex) => ({ ...block, orderIndex })) }));
  const updateBlock = (next) => setBlocks(draft.blocks.map((block) => block.key === next.key ? next : block));
  const accept = (page, { keepDraft = false } = {}) => {
    if (!page?.id || !Number.isInteger(page.revisionCount)) throw new Error('The server returned an incomplete page. Your local draft is retained; reload before retrying.');
    setSaved(page);
    if (!keepDraft) { setDraft(metadata(page)); setChangeNote(''); }
    revisionResource.reload();
    return page;
  };
  const save = async () => {
    if (!catalog.length) throw new Error('Load the block catalog before saving. Your local draft is retained.');
    validateDraft(draft, catalog);
    const result = await apiRequest(apiPage(saved.id), { method: 'PATCH', body: { ...draft, blocks: draft.blocks.map((block, orderIndex) => ({ ...block, orderIndex })), expectedRevision: saved.revisionCount, ...(changeNote.trim() ? { changeNote: changeNote.trim() } : {}) } });
    setBlockNotice('');
    return accept(result.page);
  };
  const publish = () => {
    if (action.lock.current) return;
    if (!window.confirm('Save this draft and publish it now? Its content, URL, SEO and navigation will replace the current public snapshot.')) return;
    action.run(async () => {
      if (!draft.blocks.some((block) => block.visible !== false)) throw new Error('Add at least one visible block before publishing.');
      const justSaved = await save();
      try { const response = await apiRequest(`${apiPage(saved.id)}/publish`, { method: 'POST', body: { expectedRevision: justSaved.revisionCount } }); accept(response.page); }
      catch (error) { error.message = `Your draft was saved, but publication was not confirmed. ${error.message} Reload the saved page to check publication status before retrying.`; throw error; }
    }, 'Page published. Visitors now see this saved snapshot, including its metadata and navigation.');
  };
  const reload = () => {
    if (action.lock.current || (dirty && !window.confirm('Discard unsaved local changes and load the latest saved page?'))) return;
    action.run(async () => { const response = await apiRequest(apiPage(saved.id)); accept(response.page); }, 'Latest saved page loaded.');
  };
  return <div className="cms-admin db-stack"><Link className="db-text-link" to="/admin/cms" onClick={(event) => { if (action.lock.current || (dirty && !window.confirm('Discard unsaved local changes and return to pages?'))) event.preventDefault(); }}>← All pages</Link><PageHeading eyebrow="Page editor" title={saved.title} action={<span className="db-badge">{saved.status}</span>}>Revision {saved.revisionCount} · {saved.hasUnpublishedChanges ? 'Saved changes are not yet published' : 'Saved publication is up to date'}{dirty ? ' · Unsaved local edits' : ''}</PageHeading><ActionState action={action} />
  <section className="db-panel db-stack" aria-label="Publication controls"><div className="cms-admin-row"><div><h2>Publication</h2><p className="db-muted">Saving a draft never changes the public page. Publish always saves first.</p>{saved.status === 'published' && publication && <p>Live URL: <Link className="db-text-link" to={publicPath(publication)} target="_blank" rel="noopener noreferrer">{publicPath(publication)} (opens new tab)</Link></p>}</div><div className="db-actions"><button type="button" className="db-button" disabled={action.busy || catalogResource.loading || !catalog.length} onClick={publish}>{action.busy ? 'Working…' : 'Publish page'}</button><button type="button" className="db-button-secondary" disabled={action.busy || saved.status !== 'published' || saved.isHomepage || publication?.isHomepage} onClick={() => {
    if (!window.confirm('Unpublish this page? Visitors will no longer be able to open it. Your editable draft and local unsaved changes will be retained.')) return;
    action.run(async () => { const response = await apiRequest(`${apiPage(saved.id)}/unpublish`, { method: 'POST', body: { expectedRevision: saved.revisionCount } }); accept(response.page, { keepDraft: dirty }); }, 'Page unpublished. The draft is retained.');
  }}>Unpublish</button><button type="button" className="db-button-secondary" disabled={action.busy} onClick={reload}>Reload saved page</button></div></div>{(saved.isHomepage || publication?.isHomepage) && <p className="db-muted">The homepage cannot be unpublished.</p>}</section>
  <div className="cms-admin-tabs" role="group" aria-label="Page editor views">{[['content', 'Content & settings'], ['preview', 'Preview draft'], ['revisions', 'Revisions']].map(([key, title]) => <button type="button" key={key} aria-pressed={tab === key} disabled={action.busy} onClick={() => setTab(key)}>{title}</button>)}</div>
  {tab === 'preview' ? <section className="cms-preview-shell" aria-label="Local draft preview"><div className="cms-preview-label"><strong>LOCAL DRAFT PREVIEW, NOT PUBLISHED</strong><p>Includes unsaved local changes. No public snapshot is read or modified. Rich text is displayed as safe text; catalog references resolve on publication; video playback is disabled here.</p></div><div className="cms-public-page"><header className="cms-preview-title"><p className="cms-eyebrow">Draft page · /{draft.slug}</p><h2>{draft.title}</h2></header><CMSBlocks blocks={draft.blocks} preview heroHeading="h2" /></div></section> : tab === 'revisions' ? <RevisionList page={saved} busy={action.busy} dirty={dirty} resource={revisionResource} onRestore={(revisionNumber) => action.run(async () => { const response = await apiRequest(`${apiPage(saved.id)}/restore`, { method: 'POST', body: { revisionNumber, expectedRevision: saved.revisionCount } }); const page = accept(response.page); setSelected(page.blocks?.[0]?.key || null); }, `Revision restored as a draft. The live page is unchanged; review and publish when ready.`)} /> : <form className="db-stack" noValidate onSubmit={(event) => { event.preventDefault(); action.run(save, 'Draft saved. The public page, URL, SEO and navigation are unchanged.'); }}><fieldset className="cms-admin-form-body db-stack" disabled={fieldsDisabled}><legend className="cms-sr-only">Page content and metadata</legend><MetadataFields value={draft} onChange={setDraft} />
    <section className="db-panel db-stack" aria-label="Page blocks"><div><h2>Page blocks</h2><p className="db-muted">{draft.blocks.length} / 200 blocks. Edit, hide or reorder locally; save when ready.</p></div><RequestState resource={catalogResource}><div className="cms-admin-row cms-block-picker"><Select label="Block type" value={blockType || catalog[0]?.type || ''} options={catalog.map((definition) => [definition.type, `${definition.label} · ${definition.category}`])} onChange={setBlockType} /><button type="button" className="db-button-secondary" disabled={fieldsDisabled || draft.blocks.length >= 200 || !catalog.length} onClick={() => {
      const definition = catalog.find((item) => item.type === (blockType || catalog[0]?.type));
      if (!definition) return;
      const block = makeBlock(definition); setBlocks([...draft.blocks, block]); setSelected(block.key); setBlockNotice(`${definition.label} added. Complete its fields below, then save the draft.`);
    }}>Add block</button></div></RequestState>{blockNotice && <p role="status" className="cms-admin-unsaved">{blockNotice}</p>}
    {draft.blocks.length ? <ol className="cms-block-list">{draft.blocks.map((block, index) => {
      const definition = catalog.find((item) => item.type === block.type);
      const title = definition?.label || block.type;
      return <li key={block.key} className={selected === block.key ? 'is-selected' : ''}><div className="cms-block-summary"><span className="cms-block-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><div><strong>{title}</strong><small className="db-muted">{block.data?.heading || block.data?.title || block.data?.titleLead || 'Content block'}{block.visible === false ? ' · Hidden' : ''}</small></div></div><div className="db-actions"><OrderButtons index={index} total={draft.blocks.length} label={`block ${index + 1}: ${title}`} onMove={(direction) => { setBlocks(moved(draft.blocks, index, direction)); setBlockNotice(`${title} moved ${direction < 0 ? 'up' : 'down'}. Save to keep the new order.`); }} /><button type="button" className="db-button-secondary" aria-pressed={selected === block.key} aria-controls="cms-selected-block" onClick={() => setSelected(block.key)}>Edit block {index + 1}</button><button type="button" className="db-button-secondary" aria-label={`Remove block ${index + 1}: ${title}`} onClick={() => {
        if (!window.confirm(`Remove block ${index + 1}: ${title}? This takes effect when the draft is saved; published content stays unchanged.`)) return;
        const remaining = draft.blocks.filter((item) => item.key !== block.key); setBlocks(remaining); if (selected === block.key) setSelected(remaining[0]?.key || null); setBlockNotice(`${title} removed from the local draft.`);
      }}>Remove</button></div></li>;
    })}</ol> : <EmptyState title="Start with a block">Choose a block type above. Every field is defined by the backend block catalog.</EmptyState>}
    {selectedBlock && <div className="cms-block-editor db-stack" id="cms-selected-block" key={selectedBlock.key}><h3>Edit: {selectedDefinition?.label || selectedBlock.type}</h3><Check label="Show this block on the page" checked={selectedBlock.visible !== false} onChange={(visible) => updateBlock({ ...selectedBlock, visible })} />{selectedDefinition ? <>{!CMS_BLOCK_TYPES.includes(selectedBlock.type) && <p className="cms-admin-warning">This newly registered block has no public renderer yet. Its data is preserved, but it will not appear publicly.</p>}{selectedDefinition.fields.map((field) => <SchemaField key={field.name} field={field} value={selectedBlock.data?.[field.name]} onChange={(next) => updateBlock({ ...selectedBlock, data: { ...selectedBlock.data, [field.name]: next } })} />)}{selectedDefinition.settings && <details className="cms-block-settings"><summary>Block appearance settings</summary><SchemaField field={selectedDefinition.settings} value={selectedBlock.settings} onChange={(settings) => updateBlock({ ...selectedBlock, settings })} /></details>}</> : <p className="cms-admin-warning">Load this block’s schema to edit its fields. Existing data is preserved unchanged.</p>}</div>}
    </section><section className="db-panel"><Field label="Revision note" value={changeNote} maxLength={300} onChange={setChangeNote} hint="Optional description of this save, visible in revision history." /></section><div className="cms-admin-savebar"><span>{dirty ? 'Unsaved local changes' : 'No unsaved local changes'}</span><div className="db-actions"><button type="button" className="db-button-secondary" disabled={!dirty || action.busy} onClick={() => { if (window.confirm('Discard unsaved local changes and return to the last loaded draft?')) { setDraft(metadata(saved)); setChangeNote(''); setBlockNotice('Unsaved local changes discarded.'); } }}>Discard local changes</button><button className="db-button" disabled={action.busy || !catalog.length || (!dirty && !changeNote.trim())}>{action.busy ? 'Saving…' : 'Save draft'}</button></div></div>
  </fieldset></form>}
  {tab !== 'content' && <div className="cms-admin-savebar"><span>{dirty ? 'Unsaved local changes' : 'Draft is saved'}</span><button type="button" className="db-button" disabled={action.busy || !catalog.length || (!dirty && !changeNote.trim())} onClick={() => action.run(save, 'Draft saved. Public content is unchanged.')}>{action.busy ? 'Saving…' : 'Save draft'}</button></div>}
  </div>;
}
export function AdminCMSEditor() {
  const { id } = useParams();
  const { user } = useAuth();
  const resource = useDashboardResource(isStaff(user) && id ? apiPage(id) : null);
  if (!isStaff(user)) return <EmptyState title="Staff access required">Sign in as an administrator or content manager to edit pages.</EmptyState>;
  return <RequestState resource={resource}>{resource.data?.page ? <EditorWorkspace key={resource.data.page.id} initial={resource.data.page} /> : !resource.loading && !resource.error ? <EmptyState title="Page unavailable" action={<Link to="/admin/cms" className="db-button-secondary">Back to pages</Link>}>No page was returned for this editor.</EmptyState> : null}</RequestState>;
}
export default AdminCMS;
