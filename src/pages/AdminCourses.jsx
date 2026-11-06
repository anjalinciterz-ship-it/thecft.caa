import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { DashIcon, EmptyState, PageHeading, RequestState, money, safeImage, useDashboardResource } from '../components/DashboardUI';
import '../styles/admin-courses.css';

const noop = () => {};
const statuses = [['draft', 'Draft'], ['published', 'Published'], ['archived', 'Archived']];
const resourceKinds = ['pdf', 'audio', 'link', 'image', 'worksheet', 'other'];
const coursePath = (id) => `/admin/courses/${encodeURIComponent(id)}`;
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
const staff = (user) => ['admin', 'content_manager'].includes(user?.role);

function Field({ label, hint, multiline = false, type = 'text', value, onChange, ...props }) {
  const id = useId();
  const Control = multiline ? 'textarea' : 'input';
  return <div className="db-field">
    <label htmlFor={id}>{label}{props.required ? ' *' : ''}</label>
    <Control id={id} {...(!multiline ? { type } : {})} {...props} value={value ?? ''}
      aria-describedby={hint ? `${id}-hint` : undefined}
      onChange={(event) => onChange(type === 'number' && event.target.value !== '' ? Number(event.target.value) : event.target.value)} />
    {hint && <small id={`${id}-hint`} className="db-muted">{hint}</small>}
  </div>;
}

function Select({ label, value, onChange, options, hint, ...props }) {
  const id = useId();
  return <div className="db-field"><label htmlFor={id}>{label}</label>
    <select id={id} value={value} onChange={(event) => onChange(event.target.value)} aria-describedby={hint ? `${id}-hint` : undefined} {...props}>
      {options.map((option) => { const [key, text] = Array.isArray(option) ? option : [option, option]; return <option key={key} value={key}>{text}</option>; })}
    </select>{hint && <small id={`${id}-hint`} className="db-muted">{hint}</small>}
  </div>;
}

function Check({ label, checked, onChange, ...props }) {
  return <label className="db-ac-check"><input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} {...props} /><span>{label}</span></label>;
}

function useMutation(onBusyChange = noop) {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');
  useEffect(() => { onBusyChange(busy); return () => onBusyChange(false); }, [busy, onBusyChange]);
  const run = async (task, message = '') => {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true); setError(null); setNotice('');
    try { await task(); setNotice(message); return true; }
    catch (failure) { setError(failure); return false; }
    finally { lock.current = false; setBusy(false); }
  };
  const notify = (message) => { setError(null); setNotice(message); };
  return { busy, error, notice, run, notify };
}

function ActionMessage({ action }) {
  const ref = useRef(null);
  useEffect(() => { if (action.error) ref.current?.focus(); }, [action.error]);
  const details = Array.isArray(action.error?.details) ? action.error.details : action.error?.details?.details || action.error?.details?.issues;
  return <>
    {action.error && <div className="db-error" role="alert" tabIndex={-1} ref={ref}>
      <strong>{action.error.message || 'The request could not be completed.'}</strong>
      {Array.isArray(details) && <ul>{details.map((issue, index) => <li key={index}>{issue.field || issue.path?.join('.') || 'Form'}: {issue.message}</li>)}</ul>}
      {action.error.status === 401 && <Link className="db-text-link" to="/login">Sign in again</Link>}
    </div>}
    {action.notice && <p className="db-ac-notice" role="status">{action.notice}</p>}
  </>;
}

function useDraft(initial, onDirtyChange = noop) {
  const [state, setState] = useState(() => ({ form: initial, original: initial, changed: {} }));
  const dirty = Object.keys(state.changed).length > 0;
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  const put = (key, value) => setState((current) => ({ ...current, form: { ...current.form, [key]: value }, changed: { ...current.changed, [key]: true } }));
  const reset = (next) => setState({ form: next, original: next, changed: {} });
  const revert = (key) => setState((current) => {
    const changed = { ...current.changed }; delete changed[key];
    return { ...current, form: { ...current.form, [key]: current.original[key] }, changed };
  });
  const payload = (isNew) => Object.fromEntries(Object.entries(state.form).filter(([key]) => isNew || state.changed[key]));
  return { ...state, dirty, put, reset, revert, payload };
}

function useUnsavedWarning(dirty) {
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
}

function Pagination({ page, setPage, resource, count, limit, label = 'results' }) {
  const pages = Number(resource.meta?.pages);
  const more = Number.isFinite(pages) && pages > 0 ? page < pages : count === limit;
  return <nav className="db-ac-pagination" aria-label={`${label} pages`}>
    <span className="db-muted">Page {page}{pages > 0 ? ` of ${pages}` : ''}{typeof resource.meta?.total === 'number' ? ` · ${resource.meta.total} ${label}` : ''}</span>
    <div className="db-actions">
      <button type="button" className="db-button-secondary" disabled={resource.loading || page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
      <button type="button" className="db-button-secondary" disabled={resource.loading || Boolean(resource.error) || !more} onClick={() => setPage(page + 1)}>Next</button>
    </div>
  </nav>;
}

function MediaPicker({ onSelect, onClose }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const resource = useDashboardResource(`/admin/media?page=${page}&limit=12${query ? `&search=${encodeURIComponent(query)}` : ''}`);
  const media = resource.data?.media || [];
  return <div className="db-ac-lookup db-stack" aria-label="Existing image library">
    <div className="db-ac-section-heading"><h3>Existing image library</h3><button type="button" className="db-button-secondary" onClick={onClose}>Close library</button></div>
    <p className="db-muted">Stored media only. No upload or provider verification is performed here.</p>
    <div className="db-ac-filter-row"><Field label="Search media public ID" value={search} maxLength={120} onChange={setSearch} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); setQuery(search.trim()); setPage(1); } }} />
      <button type="button" className="db-button-secondary" onClick={() => { setQuery(search.trim()); setPage(1); }}>Search media</button></div>
    <RequestState resource={resource}>
      {media.length ? <ul className="db-ac-media-list">{media.map((asset) => <li key={asset.id}>
        <div><strong>{asset.alt || asset.publicId}</strong><small className="db-muted">{asset.resourceType} · {asset.namespace}</small></div>
        <button type="button" className="db-button-secondary" disabled={asset.resourceType !== 'image' || !safeImage(asset.url)} onClick={() => onSelect(asset)}>Use image</button>
      </li>)}</ul> : <EmptyState title="No media found">Try another public ID or enter an existing image URL.</EmptyState>}
    </RequestState>
    <Pagination page={page} setPage={setPage} resource={resource} count={media.length} limit={12} label="media records" />
  </div>;
}

function ImageFields({ value = {}, onChange, label = 'Cover image' }) {
  const [browse, setBrowse] = useState(false);
  return <div className="db-stack">
    <div className="db-ac-form-grid">
      <Field label={`${label} URL`} value={value.url} maxLength={600} hint="An existing HTTPS URL or local /images/ path. Leave empty to use a gradient." onChange={(url) => onChange({ provider: 'url', url, alt: value.alt || '' })} />
      <Field label={`${label} alternative text`} value={value.alt} maxLength={200} onChange={(alt) => onChange({ ...value, alt })} />
    </div>
    <div className="db-actions"><button type="button" className="db-button-secondary" aria-expanded={browse} onClick={() => setBrowse(!browse)}><DashIcon name="grid" size={17} />Choose existing image</button>
      {value.url && <button type="button" className="db-button-secondary" onClick={() => onChange({ provider: 'url', url: '', alt: '' })}>Remove image</button>}
    </div>
    {browse && <MediaPicker onClose={() => setBrowse(false)} onSelect={(asset) => {
      const image = { provider: asset.provider === 'cloudinary' ? 'cloudinary' : 'url', publicId: asset.publicId, url: asset.url, alt: asset.alt || '' };
      for (const key of ['width', 'height', 'version']) if (Number.isInteger(asset[key]) && asset[key] >= 0) image[key] = asset[key];
      onChange(image); setBrowse(false);
    }} />}
  </div>;
}

function courseDefaults(course = {}) {
  return {
    title: course.title || '', slug: course.slug || '', shortDescription: course.shortDescription || '', description: course.description || '',
    outcomeSummary: course.outcomeSummary || '', categories: (course.categories || []).join('\n'), level: course.level || '',
    badge: course.badge || '', lengthLabel: course.lengthLabel || '', priceMinor: course.priceMinor ?? 0, currency: course.currency || 'CAD',
    isFree: Boolean(course.isFree), coverImage: course.coverImage || {}, gradient: course.gradient || '',
    accessPolicy: { kind: 'lifetime', revokeOnFullRefund: true, revokeOnPartialRefund: false, ...course.accessPolicy },
    preview: { enabled: true, maxFreeLessons: 0, allowCurriculumPreview: true, ...course.preview },
    completion: { requireAllLessons: true, minimumPercent: 100, certificateEligible: true, ...course.completion },
  };
}

function coursePayload(draft, isNew) {
  const body = draft.payload(isNew);
  if (hasOwn(body, 'categories')) body.categories = body.categories.split('\n').map((value) => value.trim()).filter(Boolean);
  if (hasOwn(body, 'currency')) body.currency = body.currency.trim().toUpperCase();
  if (body.accessPolicy) {
    body.accessPolicy = { ...body.accessPolicy };
    if (body.accessPolicy.durationDays === '') delete body.accessPolicy.durationDays;
  }
  return body;
}

function CourseForm({ course, onSaved, onCancel, onDirtyChange = noop, onBusyChange = noop, locked = false }) {
  const isNew = !course?.id;
  const draft = useDraft(courseDefaults(course), onDirtyChange);
  const action = useMutation(onBusyChange);
  const f = draft.form;
  const nested = (group, key, value) => draft.put(group, { ...f[group], [key]: value });
  return <form className="db-ac-form db-stack" onSubmit={(event) => {
    event.preventDefault();
    if (locked) return;
    action.run(async () => {
      const body = coursePayload(draft, isNew);
      const response = await apiRequest(isNew ? '/admin/courses' : coursePath(course.id), { method: isNew ? 'POST' : 'PATCH', body });
      const saved = { ...course, ...body, ...response.course };
      draft.reset(courseDefaults(saved)); onDirtyChange(false); onSaved(saved);
    }, isNew ? '' : 'Course details saved. Publication status was not changed.');
  }}>
    <ActionMessage action={action} />
    <fieldset className="db-ac-form-body" disabled={action.busy || locked}>
      <legend className="db-ac-sr-only">{isNew ? 'Create draft course' : 'Edit course details'}</legend>
      <section className="db-panel db-stack" aria-label="Course details">
        <div><h2>{isNew ? 'Create a draft' : 'Course details'}</h2><p className="db-muted">Required fields are marked *. Saving does not publish this course.</p></div>
        {!isNew && course.publicationStatus === 'published' && <p className="db-ac-warning">This course is published. Saved changes to its content and settings take effect immediately; there is no separate draft revision.</p>}
        <div className="db-ac-form-grid">
          <Field label="Course title" required minLength={2} maxLength={160} value={f.title} onChange={(value) => draft.put('title', value)} />
          <Field label="Course slug" maxLength={140} value={f.slug} onChange={(value) => draft.put('slug', value)} hint="The server normalizes the slug and resolves duplicates. Leave blank to generate it from the title when creating." />
        </div>
        <Field label="Short description" multiline rows={3} maxLength={320} value={f.shortDescription} onChange={(value) => draft.put('shortDescription', value)} />
        <Field label="Full description" multiline rows={7} maxLength={60000} value={f.description} onChange={(value) => draft.put('description', value)} />
        <Field label="Outcome summary" multiline rows={3} maxLength={400} value={f.outcomeSummary} onChange={(value) => draft.put('outcomeSummary', value)} />
        <div className="db-ac-form-grid">
          <Field label="Categories" multiline rows={3} value={f.categories} onChange={(value) => draft.put('categories', value)} hint="One category per line; up to 20 categories, 60 characters each." />
          <div className="db-stack"><Field label="Level" maxLength={60} value={f.level} onChange={(value) => draft.put('level', value)} /><Field label="Length label" maxLength={60} value={f.lengthLabel} onChange={(value) => draft.put('lengthLabel', value)} /></div>
          <Field label="Badge" maxLength={40} value={f.badge} onChange={(value) => draft.put('badge', value)} />
        </div>
      </section>
      <section className="db-panel db-stack" aria-label="Course pricing">
        <h2>Price & access</h2>
        <Check label="This is a free course" checked={f.isFree} onChange={(value) => draft.put('isFree', value)} />
        <div className="db-ac-form-grid">
          <Field label="Price in minor units" type="number" required min={0} max={100000000} step={1} value={f.priceMinor} onChange={(value) => draft.put('priceMinor', value)} hint="Whole minor units only: 2500 means 25.00 for CAD or USD. A paid course needs a positive price before publication." />
          <Field label="Currency" required minLength={3} maxLength={3} pattern="[A-Za-z]{3}" value={f.currency} onChange={(value) => draft.put('currency', value.toUpperCase())} hint="Three-letter currency code." />
          <Select label="Access duration" value={f.accessPolicy.kind} options={[["lifetime", 'Lifetime'], ['fixed_duration', 'Fixed duration'], ['subscription', 'Subscription policy']]} onChange={(value) => nested('accessPolicy', 'kind', value)} />
          {f.accessPolicy.kind === 'fixed_duration' && <Field label="Access duration in days" type="number" required min={1} max={36500} step={1} value={f.accessPolicy.durationDays} onChange={(value) => nested('accessPolicy', 'durationDays', value)} />}
        </div>
        {f.accessPolicy.kind === 'subscription' && <p className="db-ac-warning">This saves the access policy only. It does not create a recurring billing subscription.</p>}
        <Check label="Revoke access after a full refund" checked={f.accessPolicy.revokeOnFullRefund} onChange={(value) => nested('accessPolicy', 'revokeOnFullRefund', value)} />
        <Check label="Revoke access after a partial refund" checked={f.accessPolicy.revokeOnPartialRefund} onChange={(value) => nested('accessPolicy', 'revokeOnPartialRefund', value)} />
      </section>
      <section className="db-panel db-stack" aria-label="Course artwork">
        <h2>Cover & presentation</h2>
        <ImageFields value={f.coverImage} onChange={(value) => draft.put('coverImage', value)} />
        <Field label="Cover gradient" maxLength={200} value={f.gradient} onChange={(value) => draft.put('gradient', value)} hint="CSS gradient value, such as linear-gradient(135deg, #301e48, #805c49). Publication requires an image URL or a gradient." />
      </section>
      <div className="db-ac-form-grid">
        <section className="db-panel db-stack" aria-label="Course previews"><h2>Preview policy</h2>
          <Check label="Enable free lesson previews" checked={f.preview.enabled} onChange={(value) => nested('preview', 'enabled', value)} />
          <Check label="Allow curriculum preview" checked={f.preview.allowCurriculumPreview} onChange={(value) => nested('preview', 'allowCurriculumPreview', value)} />
          <Field label="Maximum free lessons" type="number" required min={0} max={100} step={1} value={f.preview.maxFreeLessons} onChange={(value) => nested('preview', 'maxFreeLessons', value)} />
          <p className="db-muted">Individual lessons also have a preview setting.</p>
        </section>
        <section className="db-panel db-stack" aria-label="Course completion"><h2>Completion policy</h2>
          <Check label="Require all lessons" checked={f.completion.requireAllLessons} onChange={(value) => nested('completion', 'requireAllLessons', value)} />
          <Field label="Minimum completion percent" type="number" required min={0} max={100} step={1} value={f.completion.minimumPercent} onChange={(value) => nested('completion', 'minimumPercent', value)} />
          <Check label="Eligible for a completion certificate" checked={f.completion.certificateEligible} onChange={(value) => nested('completion', 'certificateEligible', value)} />
        </section>
      </div>
      <div className="db-ac-save-bar"><span className="db-muted">{draft.dirty ? 'Unsaved changes' : isNew ? 'New courses start as drafts' : 'No unsaved changes'}</span><div className="db-actions">
        {onCancel && <button type="button" className="db-button-secondary" onClick={() => { if (!draft.dirty || window.confirm('Discard these unsaved course changes?')) { onDirtyChange(false); onCancel(); } }}>Cancel</button>}
        {!isNew && <button type="button" className="db-button-secondary" disabled={!draft.dirty} onClick={() => { if (window.confirm('Discard these unsaved course changes?')) { draft.reset(courseDefaults(course)); onDirtyChange(false); } }}>Discard changes</button>}
        <button className="db-button" disabled={action.busy || (!isNew && !draft.dirty)}>{action.busy ? 'Saving…' : isNew ? 'Create draft course' : 'Save course details'}</button>
      </div></div>
    </fieldset>
  </form>;
}

export function AdminCourses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number.parseInt(params.get('page'), 10) || 1);
  const status = statuses.some(([value]) => value === params.get('status')) ? params.get('status') : '';
  const sort = ['updated', 'title', 'published', 'price_asc', 'price_desc'].includes(params.get('sort')) ? params.get('sort') : 'updated';
  const search = params.get('search') || '';
  const category = params.get('category') || '';
  const [filters, setFilters] = useState({ search, category, status, sort });
  useEffect(() => { setFilters({ search, category, status, sort }); }, [search, category, status, sort]);
  const query = new URLSearchParams({ page: String(page), limit: '20', sort });
  if (search) query.set('search', search);
  if (category) query.set('category', category);
  if (status) query.set('status', status);
  const resource = useDashboardResource(staff(user) ? `/admin/courses?${query}` : null);
  const [creating, setCreating] = useState(false);
  const [dirty, setDirty] = useState(false);
  useUnsavedWarning(dirty);
  const courses = resource.data?.courses || [];
  const setPage = (next) => { const nextParams = new URLSearchParams(params); nextParams.set('page', String(next)); setParams(nextParams); };
  if (!staff(user)) return <div className="db-admin-courses"><EmptyState title="Staff access required">Sign in with an administrator or content manager account.</EmptyState></div>;
  return <div className="db-admin-courses db-stack">
    <PageHeading eyebrow="Course authoring" title="Courses" action={!creating && <button type="button" className="db-button" onClick={() => setCreating(true)}>Create course</button>}>Shape the curriculum, refine the details, and publish when you’re ready.</PageHeading>
    {creating ? <CourseForm onDirtyChange={setDirty} onCancel={() => setCreating(false)} onSaved={(course) => { setDirty(false); navigate(coursePath(course.id)); }} /> : <>
      <form className="db-panel db-ac-filters" onSubmit={(event) => {
        event.preventDefault();
        const next = new URLSearchParams();
        for (const [key, value] of Object.entries(filters)) if (value.trim()) next.set(key, value.trim());
        next.set('page', '1'); setParams(next);
      }}>
        <Field label="Search courses" type="search" maxLength={140} value={filters.search} onChange={(value) => setFilters({ ...filters, search: value })} hint="Title, slug or legacy ID" />
        <Select label="Publication status" value={filters.status} options={[["", 'All statuses'], ...statuses]} onChange={(value) => setFilters({ ...filters, status: value })} />
        <Field label="Category" maxLength={60} value={filters.category} onChange={(value) => setFilters({ ...filters, category: value })} hint="Exact category name" />
        <Select label="Sort courses" value={filters.sort} options={[["updated", 'Recently updated'], ['title', 'Title A–Z'], ['published', 'Recently published'], ['price_asc', 'Price: low to high'], ['price_desc', 'Price: high to low']]} onChange={(value) => setFilters({ ...filters, sort: value })} />
        <div className="db-actions"><button className="db-button">Apply filters</button><button type="button" className="db-button-secondary" onClick={() => { setFilters({ search: '', category: '', status: '', sort: 'updated' }); setParams({}); }}>Reset</button></div>
      </form>
      <RequestState resource={resource}>
        {courses.length ? <div className="db-panel db-ac-table-wrap"><table className="db-ac-course-table">
          <caption className="db-ac-sr-only">Courses matching the current filters</caption>
          <thead><tr><th scope="col">Course</th><th scope="col">Status</th><th scope="col">Price</th><th scope="col">Published lessons</th><th scope="col">Active enrollments</th><th scope="col">Action</th></tr></thead>
          <tbody>{courses.map((course) => <tr key={course.id}>
            <th scope="row"><Link className="db-ac-course-title" to={coursePath(course.id)}>{course.title}</Link><small className="db-muted">/{course.slug}</small>{course.needsContent && <span className="db-ac-inline-warning">Published without a published lesson</span>}</th>
            <td><span className={`db-badge db-ac-status-${course.publicationStatus}`}>{course.publicationStatus}</span></td>
            <td>{course.isFree ? 'Free' : money(course.priceMinor, course.currency)}</td>
            <td>{course.lessons?.published ?? 0} / {course.lessons?.total ?? 0}</td>
            <td>{course.activeEnrollments ?? 0}</td>
            <td><Link className="db-button-secondary" to={coursePath(course.id)} aria-label={`Edit ${course.title}`}>Edit course<DashIcon name="arrow" size={15} /></Link></td>
          </tr>)}</tbody>
        </table></div> : <div className="db-panel"><EmptyState icon="grid" title={search || category || status ? 'No matching courses' : 'Your curriculum starts here'} action={<button type="button" className="db-button" onClick={() => setCreating(true)}>Create a draft course</button>}>{search || category || status ? 'Adjust the filters or create a new draft.' : 'Create a draft, add modules and lessons, then publish after reviewing the content.'}</EmptyState></div>}
      </RequestState>
      <Pagination page={page} setPage={setPage} resource={resource} count={courses.length} limit={20} label="courses" />
    </>}
  </div>;
}

function ModuleForm({ module, courseId, onSaved, onCancel, onDirtyChange, onBusyChange, locked = false }) {
  const draft = useDraft({ title: module?.title || '', description: module?.description || '', publicationStatus: module?.publicationStatus || 'draft', image: module?.image || {} }, onDirtyChange);
  const action = useMutation(onBusyChange);
  const f = draft.form;
  return <form className="db-panel db-ac-form db-stack" onSubmit={(event) => {
    event.preventDefault();
    if (locked) return;
    action.run(async () => {
      const body = draft.payload(!module?.id);
      const response = await apiRequest(module?.id ? `/admin/modules/${encodeURIComponent(module.id)}` : `${coursePath(courseId)}/modules`, { method: module?.id ? 'PATCH' : 'POST', body });
      onDirtyChange(false); onSaved({ ...module, ...body, ...response.module, lessons: module?.lessons || [] });
    });
  }}>
    <h2>{module?.id ? `Edit module: ${module.title}` : 'Add a module'}</h2><ActionMessage action={action} />
    <fieldset className="db-ac-form-body db-stack" disabled={action.busy || locked}><legend className="db-ac-sr-only">Module settings</legend>
      <Field label="Module title" required maxLength={160} value={f.title} onChange={(value) => draft.put('title', value)} autoFocus />
      <Field label="Module description" multiline rows={4} maxLength={1000} value={f.description} onChange={(value) => draft.put('description', value)} />
      <Select label="Module publication status" value={f.publicationStatus} options={statuses} onChange={(value) => draft.put('publicationStatus', value)} hint="Students need a published course, module and lesson to access published curriculum." />
      <ImageFields label="Module image" value={f.image} onChange={(value) => draft.put('image', value)} />
      <div className="db-actions"><button className="db-button" disabled={action.busy || (module?.id && !draft.dirty)}>{action.busy ? 'Saving…' : module?.id ? 'Save module' : 'Create module'}</button><button type="button" className="db-button-secondary" onClick={() => { if (!draft.dirty || window.confirm('Discard these unsaved module changes?')) { onDirtyChange(false); onCancel(); } }}>Cancel</button></div>
    </fieldset>
  </form>;
}

function VideoPicker({ courseId, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const resource = useDashboardResource(open ? `/admin/video-assets?page=${page}&limit=12` : null);
  const assets = resource.data?.assets || [];
  return <div className="db-stack">
    <p className="db-muted">{value ? `Selected video asset: ${value}` : 'No video asset selected.'}</p>
    <div className="db-actions"><button type="button" className="db-button-secondary" aria-expanded={open} onClick={() => setOpen(!open)}><DashIcon name="video" size={18} />{open ? 'Close video library' : 'Choose existing video'}</button>
      {value && <button type="button" className="db-button-secondary" onClick={() => onChange(null)}>Detach video</button>}
    </div>
    <p className="db-muted">The library reports stored provider status, not a playback test. This editor does not upload, sync, or verify external videos.</p>
    {open && <div className="db-ac-lookup db-stack"><RequestState resource={resource}>
      {assets.length ? <ul className="db-ac-media-list">{assets.map((asset) => {
        const otherCourse = Boolean(asset.course?.id && asset.course.id !== courseId);
        return <li key={asset.id}><div><strong>{asset.title || asset.id}</strong><small>{asset.provider} · Server status: {asset.processingStatus || 'Not reported'}</small>
          {asset.course && <small className="db-muted">Course: {asset.course.title}</small>}
          {(asset.providerStatusMessage || asset.syncError) && <small className="db-ac-inline-warning">{asset.providerStatusMessage}{asset.providerStatusMessage && asset.syncError ? ' · ' : ''}{asset.syncError}</small>}
          {otherCourse && <small className="db-muted">Cannot attach a video from a different course.</small>}
        </div><button type="button" className="db-button-secondary" disabled={otherCourse || asset.id === value} onClick={() => { onChange(asset.id); setOpen(false); }}>{asset.id === value ? 'Selected' : 'Use video'}</button></li>;
      })}</ul> : <EmptyState icon="video" title="No stored videos">Use an existing video once it is available in the media system, or author a text lesson.</EmptyState>}
    </RequestState><Pagination page={page} setPage={setPage} resource={resource} count={assets.length} limit={12} label="video assets" /></div>}
  </div>;
}

function ResourceFields({ resources, onChange }) {
  const update = (index, key, value) => onChange(resources.map((resource, position) => position === index ? { ...resource, [key]: value } : resource));
  return <div className="db-stack">
    {resources.length === 0 && <p className="db-muted">No resources in this editable list.</p>}
    {resources.map((resource, index) => <fieldset key={index} className="db-stack"><legend>Resource {index + 1}</legend>
      <div className="db-ac-form-grid">
        <Field label={`Resource ${index + 1} label`} required maxLength={120} value={resource.label} onChange={(value) => update(index, 'label', value)} />
        <Select label={`Resource ${index + 1} type`} value={resource.kind || 'link'} options={resourceKinds} onChange={(value) => update(index, 'kind', value)} />
        <Field label={`Resource ${index + 1} URL`} maxLength={600} value={resource.url} onChange={(value) => update(index, 'url', value)} hint="Existing HTTPS URL or local path. Supply this or a Cloudinary public ID." />
        <Field label={`Resource ${index + 1} Cloudinary public ID`} maxLength={240} value={resource.cloudinaryPublicId} onChange={(value) => update(index, 'cloudinaryPublicId', value)} />
        <Select label={`Resource ${index + 1} access`} value={resource.accessPolicy || 'enrolled'} options={[["enrolled", 'Enrolled learners'], ['public', 'Public'], ['admin', 'Administrators']]} onChange={(value) => update(index, 'accessPolicy', value)} />
        <Field label={`Resource ${index + 1} MIME type`} maxLength={80} value={resource.mimeType} onChange={(value) => update(index, 'mimeType', value)} />
      </div>
      <div className="db-actions"><button type="button" className="db-button-secondary db-ac-danger" onClick={() => { if (window.confirm(`Remove resource ${index + 1} from this lesson? The change is applied when you save.`)) onChange(resources.filter((_, position) => position !== index)); }}>Remove resource {index + 1}</button></div>
    </fieldset>)}
    <div className="db-actions"><button type="button" className="db-button-secondary" disabled={resources.length >= 30} onClick={() => onChange([...resources, { label: '', kind: 'link', accessPolicy: 'enrolled', url: '', cloudinaryPublicId: '', mimeType: '' }])}>Add resource</button><span className="db-muted">{resources.length} / 30 resources</span></div>
    <p className="db-muted">An access setting does not make a publicly hosted file private. Protected delivery depends on the existing server and storage configuration.</p>
  </div>;
}

function lessonDefaults(lesson = {}) {
  return {
    title: lesson.title || '', slug: lesson.slug || '', description: lesson.description || '', lessonType: lesson.lessonType || 'text',
    publicationStatus: lesson.publicationStatus || 'draft', durationSeconds: lesson.durationSeconds ?? 0, videoAssetId: lesson.videoAssetId || null,
    textContent: typeof lesson.textContent === 'string' ? lesson.textContent : '', resources: Array.isArray(lesson.resources) ? lesson.resources : [],
    isPreview: Boolean(lesson.isPreview), allowNotes: lesson.allowNotes !== false, discussionsEnabled: lesson.discussionsEnabled !== false,
    completion: { rule: 'manual', watchPercent: 90, minimumSeconds: 0, ...lesson.completion },
  };
}

function lessonPayload(draft, isNew) {
  const body = draft.payload(isNew);
  // Summary-only GET responses must never become empty PATCH replacements.
  if (!draft.changed.textContent) delete body.textContent;
  if (!draft.changed.resources) delete body.resources;
  if (body.resources) for (const [index, resource] of body.resources.entries()) {
    if (!resource.label?.trim()) throw new Error(`Resource ${index + 1} needs a label.`);
    if (!resource.url?.trim() && !resource.cloudinaryPublicId?.trim()) throw new Error(`Resource ${index + 1} needs an existing URL or Cloudinary public ID.`);
    if (resource.url && !safeImage(resource.url)) throw new Error(`Resource ${index + 1} needs an HTTP(S) URL or a local /path.`);
  }
  return body;
}

function LessonForm({ lesson, module, courseId, onSaved, onCancel, onDirtyChange, onBusyChange, locked = false }) {
  const isNew = !lesson?.id;
  const textUnavailable = !isNew && !hasOwn(lesson, 'textContent');
  const resourcesUnavailable = !isNew && !Array.isArray(lesson.resources);
  const [replaceText, setReplaceText] = useState(false);
  const [replaceResources, setReplaceResources] = useState(false);
  const draft = useDraft(lessonDefaults(lesson), onDirtyChange);
  const action = useMutation(onBusyChange);
  const f = draft.form;
  const completion = (key, value) => draft.put('completion', { ...f.completion, [key]: value });
  return <form className="db-ac-form db-stack" onSubmit={(event) => {
    event.preventDefault();
    if (locked) return;
    action.run(async () => {
      const body = lessonPayload(draft, isNew);
      const overwrites = [];
      if (textUnavailable && hasOwn(body, 'textContent')) overwrites.push('replace the saved text body');
      if (resourcesUnavailable && hasOwn(body, 'resources')) overwrites.push(`replace the saved resource list (${lesson.resourceCount ?? 'unknown'} resources)`);
      if (overwrites.length && !window.confirm(`The server did not return the original content. Saving will ${overwrites.join(' and ')}. Continue?`)) return;
      const response = await apiRequest(isNew ? `/admin/modules/${encodeURIComponent(module.id)}/lessons` : `/admin/lessons/${encodeURIComponent(lesson.id)}`, { method: isNew ? 'POST' : 'PATCH', body });
      onDirtyChange(false); onSaved({ ...lesson, ...body, ...response.lesson });
    });
  }}>
    <div className="db-ac-section-heading"><div><h2>{isNew ? 'Add a lesson' : `Edit lesson: ${lesson.title}`}</h2><p className="db-muted">In {module.title}. Only explicitly edited fields are updated.</p></div></div>
    <ActionMessage action={action} />
    <fieldset className="db-ac-form-body" disabled={action.busy || locked}><legend className="db-ac-sr-only">Lesson editor</legend>
      <section className="db-panel db-stack" aria-label="Lesson details"><h3>Lesson details</h3>
        <div className="db-ac-form-grid">
          <Field label="Lesson title" required maxLength={200} value={f.title} onChange={(value) => draft.put('title', value)} autoFocus />
          <Field label="Lesson slug" maxLength={180} value={f.slug} onChange={(value) => draft.put('slug', value)} hint="Leave blank to generate from the title." />
          <Select label="Lesson type" value={f.lessonType} options={[["text", 'Text'], ['video', 'Video'], ['resource', 'Resource'], ['audio', 'Audio'], ['quiz', 'Quiz'], ['live', 'Live']]} onChange={(value) => draft.put('lessonType', value)} />
          <Select label="Lesson publication status" value={f.publicationStatus} options={statuses} onChange={(value) => draft.put('publicationStatus', value)} />
        </div>
        <Field label="Lesson description" multiline rows={4} maxLength={4000} value={f.description} onChange={(value) => draft.put('description', value)} />
        <Field label="Duration in seconds" type="number" required min={0} max={86400} step={1} value={f.durationSeconds} onChange={(value) => draft.put('durationSeconds', value)} />
        <div className="db-ac-check-grid"><Check label="Allow this lesson as a free preview" checked={f.isPreview} onChange={(value) => draft.put('isPreview', value)} /><Check label="Allow learner notes" checked={f.allowNotes} onChange={(value) => draft.put('allowNotes', value)} /><Check label="Enable discussions" checked={f.discussionsEnabled} onChange={(value) => draft.put('discussionsEnabled', value)} /></div>
        <p className="db-muted">A lesson is visible to learners only when its course and module are also published and access checks pass.</p>
        {['quiz', 'live'].includes(f.lessonType) && <p className="db-ac-warning">The catalog API stores this lesson type, but has no quiz-question or live-session authoring fields. Setting the type alone does not create an activity.</p>}
        {(f.lessonType === 'audio' || lesson?.audioTrackCount > 0) && <p className="db-ac-warning">Audio tracks are preserved. This admin response exposes only the track count ({lesson?.audioTrackCount ?? 0}), not editable track sources; audio editing requires an expanded backend read contract.</p>}
      </section>
      <section className="db-panel db-stack" aria-label="Lesson text editor"><h3>Text content</h3>
        {textUnavailable && <div className="db-ac-warning"><p>{lesson.hasText ? 'This lesson has a saved text body, but the admin API does not return its source.' : 'The admin API does not return the text source; it reports no saved text body.'} Unchanged text will be preserved.</p>
          <Check label="Write a replacement text body" checked={replaceText} onChange={(value) => { setReplaceText(value); if (!value) draft.revert('textContent'); }} />
        </div>}
        {(!textUnavailable || replaceText) && <>
          <Field label={textUnavailable ? 'Replacement lesson text' : 'Lesson text'} multiline rows={12} maxLength={200000} value={f.textContent} onChange={(value) => draft.put('textContent', value)} hint="Source text or HTML, up to 200,000 characters. This editor does not execute or render the source." />
          <div className="db-actions"><button type="button" className="db-button-secondary db-ac-danger" onClick={() => { if (window.confirm('Clear the saved text body when this lesson is saved?')) draft.put('textContent', ''); }}>Clear text on save</button></div>
        </>}
      </section>
      <section className="db-panel db-stack" aria-label="Lesson video"><h3>Video attachment</h3><VideoPicker courseId={courseId} value={f.videoAssetId} onChange={(value) => draft.put('videoAssetId', value)} /></section>
      <section className="db-panel db-stack" aria-label="Lesson completion"><h3>Completion rule</h3>
        <div className="db-ac-form-grid">
          <Select label="Completion rule" value={f.completion.rule} options={[["manual", 'Learner marks complete'], ['watch_threshold', 'Watch threshold'], ['viewed', 'Viewed']]} onChange={(value) => completion('rule', value)} />
          <Field label="Watch threshold percent" type="number" required min={1} max={100} step={1} value={f.completion.watchPercent} onChange={(value) => completion('watchPercent', value)} />
          <Field label="Minimum watched seconds" type="number" required min={0} max={86400} step={1} value={f.completion.minimumSeconds} onChange={(value) => completion('minimumSeconds', value)} />
        </div><p className="db-muted">Completion is evaluated by the learning service. Watch thresholds are relevant to media lessons.</p>
      </section>
      <section className="db-panel db-stack" aria-label="Lesson resources"><h3>Resources</h3>
        {resourcesUnavailable && <div className="db-ac-warning"><p>The admin API reports {lesson.resourceCount ?? 'an unknown number of'} saved resources but does not return their editable fields. The saved list is preserved unless you explicitly replace it.</p>
          <Check label="Replace the entire saved resource list" checked={replaceResources} onChange={(value) => { setReplaceResources(value); if (value) draft.put('resources', []); else draft.revert('resources'); }} />
        </div>}
        {(!resourcesUnavailable || replaceResources) && <ResourceFields resources={f.resources} onChange={(value) => draft.put('resources', value)} />}
      </section>
      <div className="db-ac-save-bar"><span className="db-muted">{draft.dirty ? 'Unsaved lesson changes' : isNew ? 'New lesson' : 'No unsaved changes'}</span><div className="db-actions">
        <button type="button" className="db-button-secondary" onClick={() => { if (!draft.dirty || window.confirm('Discard these unsaved lesson changes?')) { onDirtyChange(false); onCancel(); } }}>Cancel</button>
        <button className="db-button" disabled={action.busy || (!isNew && !draft.dirty)}>{action.busy ? 'Saving…' : isNew ? 'Create lesson' : 'Save lesson'}</button>
      </div></div>
    </fieldset>
  </form>;
}

function OrderButtons({ title, index, total, disabled, onMove }) {
  return <div className="db-ac-order-buttons" role="group" aria-label={`Reorder ${title}`}>
    <button type="button" className="db-button-secondary" disabled={disabled || index === 0} aria-label={`Move ${title} up`} onClick={() => onMove(-1)}>↑<span className="db-ac-sr-only"> Up</span></button>
    <button type="button" className="db-button-secondary" disabled={disabled || index === total - 1} aria-label={`Move ${title} down`} onClick={() => onMove(1)}>↓<span className="db-ac-sr-only"> Down</span></button>
  </div>;
}

function CourseWorkspace({ initial }) {
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState(initial);
  const [tab, setTab] = useState('details');
  const [editor, setEditor] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [formBusy, setFormBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const action = useMutation();
  const busy = action.busy || formBusy;
  useUnsavedWarning(dirty || busy);
  const { course, modules = [], activeEnrollments = 0, readiness } = snapshot;
  const lessons = modules.flatMap((module) => module.lessons || []);
  const published = lessons.filter((lesson) => lesson.publicationStatus === 'published').length;
  const curriculumHeading = useRef(null);
  useEffect(() => { if (tab === 'curriculum' && !editor) curriculumHeading.current?.focus(); }, [tab, editor]);
  const changeView = (next) => {
    if (next === tab && !editor) return;
    if (busy || (dirty && !window.confirm('Discard unsaved changes before switching sections?'))) return;
    setDirty(false); setEditor(null); setTab(next);
  };
  const closeEditor = () => { setEditor(null); setDirty(false); };
  const publish = (status) => {
    const explanation = status === 'published'
      ? 'Publish this course? The server refuses until it has a title, a price decision, artwork and at least one published lesson that has something to open.'
      : status === 'archived'
        ? `Archive this course and hide it from the storefront? Existing entitlements are preserved. Active enrollments: ${activeEnrollments}.`
        : 'Return this course to draft? This removes it from published course listings and can prevent learners from opening its lessons.';
    if (!window.confirm(explanation)) return;
    action.run(async () => {
      const result = await apiRequest(`${coursePath(course.id)}/publication`, { method: 'PATCH', body: { status } });
      setSnapshot((current) => ({ ...current, ...result, course: { ...current.course, ...result.course } }));
    }, `Course is now ${status}.`);
  };
  const move = (kind, items, index, delta, moduleId) => {
    const ordered = [...items];
    [ordered[index], ordered[index + delta]] = [ordered[index + delta], ordered[index]];
    action.run(async () => {
      await apiRequest(`/admin/reorder/${kind}`, { method: 'POST', body: { orderedIds: ordered.map((item) => item.id) } });
      const saved = ordered.map((item, orderIndex) => ({ ...item, orderIndex }));
      setSnapshot((current) => ({ ...current, modules: kind === 'modules' ? saved : current.modules.map((module) => module.id === moduleId ? { ...module, lessons: saved } : module) }));
    }, `${kind === 'modules' ? 'Module' : 'Lesson'} order saved.`);
  };
  const removeModule = (module) => {
    if (!window.confirm(`Permanently delete the empty module “${module.title}”? This cannot be undone.`)) return;
    action.run(async () => {
      await apiRequest(`/admin/modules/${encodeURIComponent(module.id)}`, { method: 'DELETE' });
      setSnapshot((current) => ({ ...current, modules: current.modules.filter((item) => item.id !== module.id) }));
    }, 'Module deleted.');
  };
  const removeLesson = (module, lesson) => {
    if (!window.confirm(`Permanently delete “${lesson.title}”? Learner progress and notes for this lesson will also be deleted. This cannot be undone.`)) return;
    action.run(async () => {
      await apiRequest(`/admin/lessons/${encodeURIComponent(lesson.id)}`, { method: 'DELETE' });
      setSnapshot((current) => ({ ...current, modules: current.modules.map((item) => item.id === module.id ? { ...item, lessons: item.lessons.filter((row) => row.id !== lesson.id) } : item) }));
    }, 'Lesson deleted.');
  };
  return <div className="db-admin-courses db-stack">
    <Link className="db-text-link db-ac-back" to="/admin/courses" onClick={(event) => { if (busy || (dirty && !window.confirm('Discard unsaved changes and return to courses?'))) event.preventDefault(); }}>← All courses</Link>
    <PageHeading eyebrow="Course authoring" title={course.title} action={<span className={`db-badge db-ac-status-${course.publicationStatus}`}>{course.publicationStatus}</span>}>/{course.slug} · {activeEnrollments} active enrollments · {modules.length} modules · {lessons.length} lessons</PageHeading>
    <ActionMessage action={action} />
    <section className="db-panel db-ac-publication" aria-label="Publication controls">
      <div><h2>Publication</h2><p className="db-muted">{readiness ? `${readiness.publishedModuleCount} published ${readiness.publishedModuleCount === 1 ? 'module' : 'modules'} · ${readiness.deliverableLessonCount} of ${readiness.publishedLessonCount} published ${readiness.publishedLessonCount === 1 ? 'lesson' : 'lessons'} have something to open` : `${published} published ${published === 1 ? 'lesson' : 'lessons'}. Check module visibility before publishing.`}</p>
        {readiness && !readiness.contentReady && <p className="db-ac-inline-warning">{readiness.blocked.length ? `${readiness.blocked.length} published ${readiness.blocked.length === 1 ? 'lesson cannot' : 'lessons cannot'} be opened yet, the server will refuse publication until each one has a ready video, an uploaded audio file or written text:` : 'Publish at least one module and one lesson before this course can be published.'}</p>}
        {readiness?.blocked?.length ? <ul className="db-ac-blocked">{readiness.blocked.map((item) => <li key={item.id}><strong>{item.title}</strong>, {item.reason}</li>)}</ul> : null}
        {readiness?.contentReady && <p className="db-muted">{readiness.availableForPurchase ? 'Ready to sell: every published lesson opens for a learner.' : 'Content is ready, but the price still has to be set (or the course marked free) before it can be sold.'}</p>}
        {dirty && <p className="db-ac-inline-warning">Save or discard changes before publication, duplication or refresh.</p>}
      </div>
      <div className="db-actions">
        {course.publicationStatus !== 'published' && <button type="button" className="db-button" disabled={busy || dirty} onClick={() => publish('published')}>Publish course</button>}
        {course.publicationStatus !== 'draft' && <button type="button" className="db-button-secondary" disabled={busy || dirty} onClick={() => publish('draft')}>{course.publicationStatus === 'published' ? 'Unpublish' : 'Return to draft'}</button>}
        {course.publicationStatus !== 'archived' && <button type="button" className="db-button-secondary" disabled={busy || dirty} onClick={() => publish('archived')}>Archive</button>}
        <button type="button" className="db-button-secondary" disabled={busy || dirty} onClick={() => {
          if (window.confirm(`Duplicate “${course.title}” and its curriculum as drafts? The copy will not be published.`)) action.run(async () => {
            const result = await apiRequest(`${coursePath(course.id)}/duplicate`, { method: 'POST' }); navigate(coursePath(result.course.id));
          });
        }}>Duplicate</button>
        <button type="button" className="db-button-secondary" disabled={busy || dirty} onClick={() => action.run(async () => {
          const result = await apiRequest(coursePath(course.id)); setSnapshot(result); setEditor(null); setVersion((current) => current + 1);
        }, 'Latest saved course loaded.')}>Refresh</button>
      </div>
    </section>
    <div className="db-ac-tabs" role="group" aria-label="Editor sections">
      <button type="button" aria-pressed={tab === 'details'} disabled={busy} onClick={() => changeView('details')}>Course details</button>
      <button type="button" aria-pressed={tab === 'curriculum'} disabled={busy} onClick={() => changeView('curriculum')}>Curriculum <span>{lessons.length}</span></button>
    </div>
    {tab === 'details' ? <CourseForm key={`${course.id}-${version}`} course={course} onDirtyChange={setDirty} onBusyChange={setFormBusy} locked={action.busy} onSaved={(saved) => setSnapshot((current) => ({ ...current, course: saved }))} /> : editor ? <>
      {editor.kind === 'module' ? <ModuleForm key={editor.module?.id || 'new-module'} module={editor.module} courseId={course.id} onDirtyChange={setDirty} onBusyChange={setFormBusy} locked={action.busy} onCancel={closeEditor} onSaved={(saved) => {
        setSnapshot((current) => ({ ...current, modules: editor.module ? current.modules.map((module) => module.id === saved.id ? saved : module) : [...current.modules, saved] })); action.notify('Module saved.'); closeEditor();
      }} /> : <LessonForm key={editor.lesson?.id || `new-${editor.module.id}`} lesson={editor.lesson} module={editor.module} courseId={course.id} onDirtyChange={setDirty} onBusyChange={setFormBusy} locked={action.busy} onCancel={closeEditor} onSaved={(saved) => {
        setSnapshot((current) => ({ ...current, modules: current.modules.map((module) => module.id === editor.module.id ? { ...module, lessons: editor.lesson ? module.lessons.map((lesson) => lesson.id === saved.id ? saved : lesson) : [...module.lessons, saved] } : module) })); action.notify('Lesson saved.'); closeEditor();
        // The readiness summary is server-derived, so it is re-read after a lesson
        // changes rather than guessed at here.
        apiRequest(coursePath(course.id)).then(setSnapshot).catch(() => {});
      }} />}
    </> : <div className="db-stack">
      <div className="db-ac-section-heading"><div><h2 ref={curriculumHeading} tabIndex={-1}>Curriculum</h2><p className="db-muted">Move controls save order immediately. Lessons can be reordered within their module.</p></div><button type="button" className="db-button" disabled={action.busy} onClick={() => setEditor({ kind: 'module' })}>Add module</button></div>
      {!modules.length && <div className="db-panel"><EmptyState icon="grid" title="Build your first module">Group your lessons into a module, then add text, video attachments and resources.</EmptyState></div>}
      {modules.map((module, index) => <article className="db-panel db-ac-module db-stack" key={module.id}>
        <div className="db-ac-module-heading"><span className="db-ac-position" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><div className="db-ac-module-copy"><h3>{module.title}</h3><span className={`db-badge db-ac-status-${module.publicationStatus}`}>{module.publicationStatus}</span>{module.description && <p className="db-muted">{module.description}</p>}</div>
          <OrderButtons title={`module ${module.title}`} index={index} total={modules.length} disabled={action.busy || modules.length > 500} onMove={(delta) => move('modules', modules, index, delta)} />
        </div>
        <div className="db-actions"><button type="button" className="db-button-secondary" disabled={action.busy} onClick={() => setEditor({ kind: 'module', module })}>Edit module</button><button type="button" className="db-button-secondary" disabled={action.busy} onClick={() => setEditor({ kind: 'lesson', module })}>Add lesson</button><button type="button" className="db-button-secondary db-ac-danger" disabled={action.busy || module.lessons.length > 0} onClick={() => removeModule(module)}>Delete module</button>{module.lessons.length > 0 && <small className="db-muted">Delete its lessons before deleting this module.</small>}</div>
        {module.lessons.length ? <ol className="db-ac-lessons">{module.lessons.map((lesson, lessonIndex) => <li key={lesson.id}>
          <DashIcon name={lesson.lessonType === 'video' ? 'video' : 'grid'} size={20} />
          <div className="db-ac-lesson-copy"><strong>{lesson.title}</strong><small className="db-muted">{lesson.lessonType} · {lesson.durationSeconds} seconds{lesson.isPreview ? ' · Preview' : ''}</small><span className={`db-badge db-ac-status-${lesson.publicationStatus}`}>{lesson.publicationStatus}</span>{lesson.deliverable === false && <span className="db-badge db-ac-blocked" title={lesson.blockedReason || ''}>{lesson.blockedReason || 'Nothing to open yet'}</span>}</div>
          <div className="db-actions"><OrderButtons title={`lesson ${lesson.title}`} index={lessonIndex} total={module.lessons.length} disabled={action.busy || module.lessons.length > 500} onMove={(delta) => move('lessons', module.lessons, lessonIndex, delta, module.id)} /><button type="button" className="db-button-secondary" disabled={action.busy} aria-label={`Edit lesson ${lesson.title}`} onClick={() => setEditor({ kind: 'lesson', module, lesson })}>Edit</button><button type="button" className="db-button-secondary db-ac-danger" disabled={action.busy} aria-label={`Delete lesson ${lesson.title}`} onClick={() => removeLesson(module, lesson)}>Delete</button></div>
        </li>)}</ol> : <p className="db-muted">No lessons yet. Add a lesson to this module.</p>}
        {module.lessons.length > 500 && <p className="db-ac-warning">The reorder API accepts at most 500 lesson IDs. Ordering this module requires a backend extension.</p>}
      </article>)}
      {modules.length > 500 && <p className="db-ac-warning">The reorder API accepts at most 500 module IDs. Ordering this course requires a backend extension.</p>}
    </div>}
  </div>;
}

export function AdminCourseEditor() {
  const { id } = useParams();
  const { user } = useAuth();
  const resource = useDashboardResource(staff(user) && id ? coursePath(id) : null);
  if (!staff(user)) return <div className="db-admin-courses"><EmptyState title="Staff access required">Sign in with an administrator or content manager account.</EmptyState></div>;
  return <RequestState resource={resource}>{resource.data?.course ? <CourseWorkspace key={resource.data.course.id} initial={resource.data} /> : !resource.loading && !resource.error ? <div className="db-admin-courses"><EmptyState title="Course unavailable" action={<Link className="db-button-secondary" to="/admin/courses">Back to courses</Link>}>The server did not return a course to edit.</EmptyState></div> : null}</RequestState>;
}
