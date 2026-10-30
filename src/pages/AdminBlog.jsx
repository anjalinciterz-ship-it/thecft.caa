import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { EmptyState, PageHeading, RequestState, safeImage, useDashboardResource } from '../components/DashboardUI';
import '../styles/cms.css';

const API_ARTICLES = '/admin/articles';
const articlePath = (id) => `${API_ARTICLES}/${encodeURIComponent(id)}`;
const editorPath = (id) => `/admin/blog/${encodeURIComponent(id)}`;
const isStaff = (user) => ['admin', 'content_manager'].includes(user?.role);

// The five locked sections are the only library filters the public site offers,
// so the editor cannot invent a sixth. Labels match the public chips in data/blog.
const SECTIONS = [
  ['consciousness', 'Consciousness'],
  ['inner-peace', 'Inner Peace'],
  ['mindfulness', 'Mindfulness'],
  ['personal-growth', 'Personal Growth'],
  ['relationships', 'Life & Relationships'],
];
const SECTION_KEYS = SECTIONS.map(([key]) => key);
const STATUSES = [['draft', 'Draft'], ['published', 'Published'], ['unpublished', 'Unpublished'], ['archived', 'Archived']];
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const WORDS_PER_MINUTE = 220;
const LIMITS = { title: 160, slug: 140, series: 80, dek: 400, body: 200000, authorName: 80, tag: 40, tags: 20, changeNote: 300, seoTitle: 70, seoDescription: 170, alt: 200 };
// Mirrors the server's Cloudinary policy: an oversized or unsupported file is
// rejected before the browser wastes an upload attempt.
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

const date = (value) => (value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString() : 'Not recorded');
const toSlug = (value) => String(value || '')
  .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, LIMITS.slug);
const splitTags = (value) => String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
const minutesFor = (body) => {
  const words = String(body || '').trim().split(/\s+/).filter(Boolean).length;
  return words ? Math.max(1, Math.ceil(words / WORDS_PER_MINUTE)) : 0;
};

/** The editor's working copy. Server field names only — nothing extra is ever sent. */
function fieldsOf(article = {}) {
  const cover = article.cover || {};
  const seo = article.seo || {};
  return {
    title: article.title || '',
    slug: article.slug || '',
    section: SECTION_KEYS.includes(article.section) ? article.section : SECTIONS[0][0],
    series: article.series || '',
    part: article.part === null || article.part === undefined ? '' : String(article.part),
    dek: article.dek || '',
    body: article.body || '',
    authorName: article.authorName || '',
    tagsText: (article.tags || []).join(', '),
    cover: { url: cover.url || '', alt: cover.alt || '', publicId: cover.publicId || '' },
    // The keys here are exactly the keys patchFor() sends, so an untouched
    // editor never reports itself dirty; the server merges the rest of `seo`.
    seo: { title: seo.title || '', description: seo.description || '', canonicalUrl: seo.canonicalUrl || '' },
  };
}

function Field({ label, value, onChange, hint, multiline = false, type = 'text', ...props }) {
  const id = useId();
  const Control = multiline ? 'textarea' : 'input';
  return <div className="db-field"><label htmlFor={id}>{label}{props.required ? ' *' : ''}</label><Control id={id} {...(!multiline ? { type } : {})} {...props} value={value ?? ''} aria-describedby={hint ? `${id}-hint` : undefined} onChange={(event) => onChange(event.target.value)} />{hint && <small id={`${id}-hint`} className="db-muted">{hint}</small>}</div>;
}
function Select({ label, value, options, onChange, hint, ...props }) {
  const id = useId();
  return <div className="db-field"><label htmlFor={id}>{label}</label><select id={id} value={value ?? ''} onChange={(event) => onChange(event.target.value)} aria-describedby={hint ? `${id}-hint` : undefined} {...props}>{options.map(([key, title]) => <option key={key || 'none'} value={key}>{title}</option>)}</select>{hint && <small id={`${id}-hint`} className="db-muted">{hint}</small>}</div>;
}

function useAction() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');
  const run = async (task, message) => {
    if (lock.current) return false;
    lock.current = true; setBusy(true); setError(null); setNotice('');
    let succeeded = false;
    try { await task(); setNotice(typeof message === 'function' ? message() : (message || '')); succeeded = true; }
    catch (failure) { setError(failure); }
    finally { lock.current = false; setBusy(false); }
    return succeeded;
  };
  return { run, busy, error, notice, lock, setError };
}

/**
 * Every server message is surfaced verbatim: “Add a cover image before
 * publishing.” is actionable, a generic failure is not. A stale revision gets
 * its own panel because the only safe next move is to reload, never to retry.
 */
function ActionState({ action, onReload, reloadLabel = 'Reload the saved article' }) {
  const ref = useRef(null);
  useEffect(() => { if (action.error) ref.current?.focus(); }, [action.error]);
  // Only the revision guard means “someone else wrote to this article”. A 409
  // from the slug uniqueness check is a different problem and says so itself.
  const stale = action.error?.code === 'stale_revision';
  const issues = Array.isArray(action.error?.details) ? action.error.details : action.error?.details?.issues || action.error?.details?.details;
  const hasIssues = Array.isArray(issues) && issues.length > 0;
  return <>
    {action.error && <div className="db-error" role="alert" ref={ref} tabIndex={-1}>
      <strong>{stale ? 'This article changed elsewhere since you loaded it.' : (hasIssues ? 'Check the fields listed below.' : (action.error.message || 'The request failed.'))}</strong>
      {stale && <p>Your local copy is out of date, so saving would overwrite someone else’s work. Nothing has been written and your unsaved draft is still here. Reload the article, then re-apply your edits.</p>}
      {!stale && hasIssues && <ul>{issues.map((issue, index) => <li key={index}>{issue.field || (Array.isArray(issue.path) ? issue.path.join('.') : issue.path) || 'Form'}: {issue.message}</li>)}</ul>}
      {(stale || action.error.status === 409) && onReload && <div className="db-actions"><button type="button" className="db-button-secondary" onClick={onReload}>{reloadLabel}</button></div>}
      {action.error.status === 401 && !stale && <Link to="/login" className="db-text-link">Sign in again</Link>}
    </div>}
    {action.notice && <p className="cms-admin-notice" role="status">{action.notice}</p>}
  </>;
}

function useUnsavedWarning(dirty) {
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
}

function validate(draft) {
  const issues = [];
  const push = (field, message) => issues.push({ field, message });
  const title = draft.title.trim();
  if (title.length < 2 || title.length > LIMITS.title) push('Title', `Use 2–${LIMITS.title} characters.`);
  if (draft.slug.trim() && !SLUG_PATTERN.test(draft.slug.trim())) push('Slug', 'Use lowercase letters, numbers and single dashes between words.');
  if (draft.slug.trim().length > LIMITS.slug) push('Slug', `Use at most ${LIMITS.slug} characters.`);
  if (!SECTION_KEYS.includes(draft.section)) push('Section', 'Choose one of the five library sections.');
  if (draft.series.length > LIMITS.series) push('Series', `Use at most ${LIMITS.series} characters.`);
  if (draft.part !== '') {
    const part = Number(draft.part);
    if (!Number.isInteger(part) || part < 1 || part > 99) push('Part', 'Part must be a whole number from 1 to 99.');
  }
  if (draft.dek.length > LIMITS.dek) push('Dek', `Use at most ${LIMITS.dek} characters.`);
  if (draft.body.length > LIMITS.body) push('Body', `Use at most ${LIMITS.body.toLocaleString()} characters.`);
  if (draft.authorName.length > LIMITS.authorName) push('Author name', `Use at most ${LIMITS.authorName} characters.`);
  const tags = splitTags(draft.tagsText);
  if (tags.length > LIMITS.tags) push('Tags', `Use at most ${LIMITS.tags} tags.`);
  tags.forEach((tag, index) => { if (tag.length > LIMITS.tag) push(`Tag ${index + 1}`, `Use at most ${LIMITS.tag} characters.`); });
  if (draft.cover.url.trim() && !/^https?:\/\//i.test(draft.cover.url.trim()) && !/^\/(?!\/)/.test(draft.cover.url.trim())) push('Cover image', 'Use an http(s) URL or a path starting with a single slash.');
  if (draft.cover.alt.length > LIMITS.alt) push('Cover alt text', `Use at most ${LIMITS.alt} characters.`);
  if (draft.seo.title.length > LIMITS.seoTitle) push('SEO title', `Use at most ${LIMITS.seoTitle} characters.`);
  if (draft.seo.description.length > LIMITS.seoDescription) push('SEO description', `Use at most ${LIMITS.seoDescription} characters.`);
  const canonical = draft.seo.canonicalUrl.trim();
  if (canonical && !/^https?:\/\//i.test(canonical) && !/^\/(?!\/)/.test(canonical)) push('Canonical URL', 'Use an http(s) URL or a path starting with a single slash.');
  if (issues.length) {
    const error = new Error('Your draft has not been discarded. Fix these fields and save again.');
    error.details = issues;
    throw error;
  }
  return { tags, title };
}

/** The exact PATCH/POST body: only fields the strict validators accept. */
function patchFor(draft, { changeNote, expectedRevision } = {}) {
  const tags = splitTags(draft.tagsText);
  return {
    title: draft.title.trim(),
    ...(draft.slug.trim() ? { slug: draft.slug.trim() } : {}),
    section: draft.section,
    series: draft.series.trim(),
    ...(draft.part === '' ? {} : { part: Number(draft.part) }),
    dek: draft.dek.trim(),
    body: draft.body,
    cover: {
      url: draft.cover.url.trim(),
      alt: draft.cover.alt.trim(),
      ...(draft.cover.publicId.trim() ? { publicId: draft.cover.publicId.trim() } : {}),
    },
    authorName: draft.authorName.trim(),
    tags,
    seo: { title: draft.seo.title.trim(), description: draft.seo.description.trim(), canonicalUrl: draft.seo.canonicalUrl.trim() },
    ...(changeNote === undefined ? {} : { changeNote }),
    ...(expectedRevision === undefined ? {} : { expectedRevision }),
  };
}

// ============================================================== COVER UPLOAD

/**
 * The real signed-upload chain: this server issues a single-use Cloudinary
 * signature, the browser posts the file straight to the endpoint the server
 * named, then the result is registered so the URL is re-derived server-side.
 * No key, cloud name or signature is ever hardcoded: every value on the wire
 * comes from a server response.
 */
function CoverField({ articleId, value, onChange, disabled }) {
  const fileRef = useRef(null);
  const [step, setStep] = useState('');
  const [failure, setFailure] = useState('');
  const [done, setDone] = useState('');
  const set = (key) => (next) => onChange({ ...value, [key]: next });

  const upload = async (file) => {
    if (!file) return;
    setFailure(''); setDone('');
    if (!IMAGE_TYPES.includes(file.type)) {
      setFailure(`${file.name || 'That file'} is “${file.type || 'an unknown type'}”. The server only accepts ${IMAGE_TYPES.join(', ')}.`);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setFailure(`${file.name} is ${(file.size / 1048576).toFixed(1)} MB. The limit is ${Math.round(MAX_IMAGE_BYTES / 1048576)} MB.`);
      return;
    }
    let stage = 'signature';
    try {
      setStep('Step 1 of 3 · asking this server for an upload signature…');
      const signed = await apiRequest('/admin/media/upload-signature', { method: 'POST', body: { namespace: 'blog', mimeType: file.type, sizeBytes: file.size, fileName: file.name || undefined, alt: value.alt.trim() || undefined } });
      const signature = signed?.upload;
      if (!signature?.uploadEndpoint || !signature.signature || !signature.apiKey || !signature.folder) {
        throw new Error('The signature response was incomplete, so no file was uploaded.');
      }
      stage = 'upload';
      setStep(`Step 2 of 3 · uploading ${file.name} directly to Cloudinary (folder ${signature.folder})…`);
      const form = new FormData();
      form.set('file', file);
      form.set('api_key', signature.apiKey);
      form.set('timestamp', String(signature.timestamp));
      form.set('signature', signature.signature);
      form.set('folder', signature.folder);
      if (signature.publicId) form.set('public_id', signature.publicId);
      // Cloudinary re-signs what arrives, so every parameter the server folded
      // into its signature has to travel with the file — nothing here is invented.
      if (signature.transformation) form.set('transformation', signature.transformation);
      const response = await fetch(signature.uploadEndpoint, { method: 'POST', body: form });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.public_id || !result?.secure_url) {
        throw new Error(`Cloudinary rejected the upload (HTTP ${response.status})${result?.error?.message ? `: ${result.error.message}` : '. No asset was registered.'}`);
      }
      stage = 'registration';
      setStep('Step 3 of 3 · registering the asset with this server…');
      const registered = await apiRequest('/admin/media', { method: 'POST', body: {
        publicId: result.public_id,
        secureUrl: result.secure_url,
        resourceType: result.resource_type || 'image',
        folder: result.folder || undefined,
        format: result.format || undefined,
        mimeType: file.type || undefined,
        bytes: Number.isFinite(result.bytes) ? result.bytes : undefined,
        width: Number.isFinite(result.width) ? result.width : undefined,
        height: Number.isFinite(result.height) ? result.height : undefined,
        version: Number.isFinite(result.version) ? result.version : undefined,
        etag: typeof result.etag === 'string' ? result.etag : undefined,
        alt: value.alt.trim() || undefined,
        namespace: 'blog',
        usage: { kind: 'article_cover', ...(articleId ? { referenceId: articleId } : {}) },
      } });
      const media = registered?.media;
      if (!media?.url) throw new Error('The server did not return the registered asset, so the cover was not applied.');
      onChange({ url: media.url, publicId: media.publicId || result.public_id, alt: value.alt });
      setDone(`Uploaded ${file.name} · ${media.publicId}. Save the draft to attach it to this article.`);
    } catch (error) {
      const stepNumber = { signature: 1, upload: 2, registration: 3 }[stage];
      const stepName = { signature: 'the upload signature', upload: 'the upload to Cloudinary', registration: 'registering the asset' }[stage];
      if (error?.code === 'cloudinary_not_configured') {
        setFailure(`Step 1 (${stepName}) failed: Cloudinary is not configured on this server — ${error.message}. Nothing was uploaded. You can still paste an image URL above and the editor works normally offline.`);
      } else {
        setFailure(`Step ${stepNumber} (${stepName}) failed: ${error?.message || 'The upload could not be completed.'} Nothing was registered, and the cover fields above are unchanged. Paste an image URL instead if this server has no Cloudinary access.`);
      }
    } finally {
      setStep('');
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const preview = safeImage(value.url);
  return <div className="cms-admin-cover db-stack">
    <div className="cms-admin-row"><div><h3>Cover image</h3><p className="db-muted">Required to publish. Uploads go from your browser straight to Cloudinary; this server only signs and registers them.</p></div></div>
    {preview && <div className="cms-admin-cover-art"><img src={preview} alt={value.alt || 'Cover preview'} loading="lazy" /></div>}
    <div className="cms-admin-grid">
      <Field label="Cover URL" value={value.url} onChange={set('url')} disabled={disabled} maxLength={600} placeholder="https://res.cloudinary.com/… or /images/…" hint="Filled in automatically by an upload, or paste any web or /-rooted image URL." />
      <Field label="Alt text" value={value.alt} onChange={set('alt')} disabled={disabled} maxLength={LIMITS.alt} hint={`${value.alt.length} / ${LIMITS.alt} characters. Describe the image for screen readers.`} />
    </div>
    <p className="db-muted">Cloudinary public ID: {value.publicId || 'none — set automatically when you upload'}</p>
    <div className="db-actions">
      <label className="db-button-secondary cms-admin-upload">
        <input ref={fileRef} type="file" accept={IMAGE_TYPES.join(',')} disabled={disabled || Boolean(step)} onChange={(event) => upload(event.target.files?.[0])} />
        <span>Choose an image to upload</span>
      </label>
      {value.url && <button type="button" className="db-button-secondary" disabled={disabled} onClick={() => onChange({ url: '', alt: value.alt, publicId: '' })}>Remove cover</button>}
    </div>
    {step && <p className="cms-admin-upload-state" role="status">{step}</p>}
    {failure && <p className="cms-admin-warning" role="alert">{failure}</p>}
    {done && <p className="cms-admin-notice" role="status">{done}</p>}
  </div>;
}

// ====================================================================== LIST

function NewArticle({ onCancel, onCreated }) {
  const [form, setForm] = useState({ title: '', slug: '', slugEdited: false, section: SECTIONS[0][0] });
  const action = useAction();
  return <form className="db-stack" onSubmit={(event) => {
    event.preventDefault();
    action.run(async () => {
      const body = { title: form.title.trim(), section: form.section, ...(form.slug.trim() ? { slug: form.slug.trim() } : {}) };
      if (body.title.length < 2) { const error = new Error('Add a title before creating the article.'); error.details = [{ field: 'Title', message: 'Use 2–160 characters.' }]; throw error; }
      const created = await apiRequest(API_ARTICLES, { method: 'POST', body });
      if (!created?.article?.id) throw new Error('The server did not return the created article. Reload the library before trying again.');
      onCreated(created.article);
    });
  }}>
    <ActionState action={action} />
    <fieldset className="cms-admin-form-body db-stack" disabled={action.busy}>
      <legend className="cms-sr-only">Create an article</legend>
      <div className="cms-admin-grid">
        <Field label="Title" required value={form.title} onChange={(next) => setForm({ ...form, title: next, slug: form.slugEdited ? form.slug : toSlug(next) })} maxLength={LIMITS.title} />
        <Field label="Slug" value={form.slug} onChange={(next) => setForm({ ...form, slug: toSlug(next), slugEdited: true })} maxLength={LIMITS.slug} hint="Leave blank to generate from the title. Must be lowercase words separated by dashes, and unique." />
        <Select label="Section" value={form.section} options={SECTIONS} onChange={(next) => setForm({ ...form, section: next })} hint="The library only shows these five sections." />
      </div>
      <div className="db-actions">
        <button className="db-button" disabled={action.busy}>{action.busy ? 'Creating…' : 'Create article'}</button>
        <button type="button" className="db-button-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </fieldset>
  </form>;
}

export function AdminBlog() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState(false);
  const page = Math.max(1, Number.parseInt(params.get('page'), 10) || 1);
  const status = STATUSES.some(([key]) => key === params.get('status')) ? params.get('status') : '';
  const section = SECTION_KEYS.includes(params.get('section')) ? params.get('section') : '';
  const search = (params.get('search') || '').slice(0, 160);
  const query = new URLSearchParams({ page: String(page), limit: '25' });
  if (status) query.set('status', status);
  if (section) query.set('section', section);
  if (search) query.set('search', search);
  const resource = useDashboardResource(isStaff(user) ? `${API_ARTICLES}?${query}` : null);
  const articles = resource.data?.articles || [];
  // The box keeps what the admin typed while they tune the two selects; it only
  // snaps back to the applied search when the URL itself changes.
  const [searchDraft, setSearchDraft] = useState(search);
  useEffect(() => { setSearchDraft(search); }, [search]);
  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.set('page', '1');
    setParams(next);
  };
  if (!isStaff(user)) return <EmptyState title="Staff access required">Sign in as an administrator or content manager to write in the blog.</EmptyState>;

  return <div className="cms-admin db-stack">
    <PageHeading eyebrow="Insights & Wisdom" title="Articles" action={!creating && <button type="button" className="db-button" onClick={() => setCreating(true)}>New article</button>}>
      Write in the library. Saving keeps a working copy; publishing freezes a snapshot that draft edits can never touch.
    </PageHeading>
    {creating ? <NewArticle onCancel={() => setCreating(false)} onCreated={(article) => navigate(editorPath(article.id))} /> : <>
      <form className="db-panel db-stack" aria-label="Filter articles" onSubmit={(event) => {
        event.preventDefault();
        const next = new URLSearchParams();
        const text = searchDraft.trim();
        if (text) next.set('search', text.slice(0, 160));
        if (status) next.set('status', status);
        if (section) next.set('section', section);
        setParams(next);
      }}>
        <div className="cms-admin-grid">
          <Select label="Publication status" value={status} options={[['', 'All statuses'], ...STATUSES]} onChange={(next) => setParam('status', next)} />
          <Select label="Section" value={section} options={[['', 'All sections'], ...SECTIONS]} onChange={(next) => setParam('section', next)} />
        </div>
        <Field label="Search titles" type="search" value={searchDraft} onChange={setSearchDraft} maxLength={160} hint="Matches the beginning of a title. Filters apply to the library list only, never to what visitors see." />
        <div className="db-actions"><button className="db-button" disabled={resource.loading}>Apply filters</button><button type="button" className="db-button-secondary" onClick={() => { setSearchDraft(''); setParams({}); }}>Clear filters</button></div>
      </form>
      <RequestState resource={resource}>
        {articles.length ? <div className="db-panel cms-admin-table-wrap"><table><caption className="cms-sr-only">Articles and publication status</caption><thead><tr>{['Article', 'Section', 'Publication', 'Published', 'Revisions', 'Action'].map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead><tbody>
          {articles.map((item) => <tr key={item.id || item._id}>
            <th scope="row"><Link to={editorPath(item.id || item._id)} className="cms-admin-page-link">{item.title}</Link><small className="db-muted">/{item.slug}{item.series ? ` · ${item.series}${item.part ? ` part ${item.part}` : ''}` : ''}</small></th>
            <td>{SECTIONS.find(([key]) => key === item.section)?.[1] || item.section}</td>
            <td><span className="db-badge">{item.status}</span>{item.hasUnpublishedChanges && <small className="cms-admin-unsaved">Unpublished changes</small>}</td>
            <td>{date(item.publishedAt)}</td>
            <td>{item.revisionCount ?? 0}</td>
            <td><Link to={editorPath(item.id || item._id)} className="db-button-secondary" aria-label={`Edit ${item.title}`}>Edit</Link></td>
          </tr>)}
        </tbody></table></div> : <div className="db-panel"><EmptyState icon="book" title="No articles in this view" action={<button type="button" className="db-button" onClick={() => setCreating(true)}>Write a new article</button>}>Every article starts as a draft. Only published snapshots reach the reading room.</EmptyState></div>}
      </RequestState>
      <Pagination page={page} setPage={(next) => setParam('page', String(next))} resource={resource} />
    </>}
  </div>;
}

function Pagination({ page, setPage, resource }) {
  const pages = Number.isFinite(resource.meta?.pages) ? resource.meta.pages : 1;
  return <nav className="cms-admin-row" aria-label="Result pages">
    <span className="db-muted">Page {page} of {Math.max(1, pages)} · {resource.meta?.total ?? 0} articles</span>
    <div className="db-actions">
      <button type="button" className="db-button-secondary" disabled={resource.loading || page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
      <button type="button" className="db-button-secondary" disabled={resource.loading || Boolean(resource.error) || page >= pages} onClick={() => setPage(page + 1)}>Next</button>
    </div>
  </nav>;
}

// =================================================================== EDITOR

function RevisionList({ article, busy, dirty, resource, onRestore }) {
  const revisions = resource.data?.revisions || [];
  return <section className="db-panel db-stack" aria-label="Revision history">
    <div className="cms-admin-row"><div><h2>Revision history</h2><p className="db-muted">Every save, publish and restore is recorded. Restoring copies an old revision into the working draft — it never changes the live article until you publish again.</p></div><button type="button" className="db-button-secondary" disabled={busy || resource.loading} onClick={resource.reload}>Refresh history</button></div>
    <RequestState resource={resource}>{revisions.length ? <ol className="cms-revisions">{revisions.map((revision) => <li key={revision.revisionNumber}>
      <div><strong>Revision {revision.revisionNumber}</strong><span>{revision.changeNote || 'Saved draft'}</span><small className="db-muted">{date(revision.createdAt)}</small></div>
      <button type="button" className="db-button-secondary" disabled={busy || revision.revisionNumber === article.revisionCount} onClick={() => {
        if (window.confirm(`Restore revision ${revision.revisionNumber} into the editable draft?${dirty ? ' Your unsaved local edits will be discarded.' : ''} The published article stays as it is until you publish again.`)) onRestore(revision.revisionNumber);
      }}>Restore this revision</button>
    </li>)}</ol> : <p className="db-muted">No revisions were returned.</p>}</RequestState>
  </section>;
}

function ArticleWorkspace({ initial }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(() => fieldsOf(initial));
  const [slugEdited, setSlugEdited] = useState(Boolean(initial.slug));
  const [tab, setTab] = useState('content');
  const [changeNote, setChangeNote] = useState('');
  const action = useAction();
  const revisionResource = useDashboardResource(`${articlePath(initial.id)}/revisions?limit=50`);
  const dirty = JSON.stringify(draft) !== JSON.stringify(fieldsOf(saved));
  const set = (key) => (next) => setDraft((current) => ({ ...current, [key]: next }));
  const minutes = minutesFor(draft.body);
  useUnsavedWarning(dirty || action.busy);

  const accept = (article) => {
    if (!article?.id || !Number.isInteger(article.revisionCount)) throw new Error('The server returned an incomplete article. Your local draft is retained; reload before retrying.');
    setSaved(article);
    return article;
  };

  const save = async () => {
    validate(draft);
    const result = await apiRequest(articlePath(saved.id), { method: 'PATCH', body: patchFor(draft, { changeNote: changeNote.trim(), expectedRevision: saved.revisionCount }) });
    accept(result.article);
    return result.article;
  };

  const publish = () => {
    if (action.lock.current) return;
    if (!window.confirm('Save this draft and publish it now? Visitors will immediately see this snapshot.')) return;
    action.run(async () => {
      // No local guess about readiness: the working copy is saved, then the
      // server decides. Its own message (“Add a cover image before publishing.”)
      // is what the admin reads, so the fix is always the real one.
      const justSaved = await save();
      try { accept((await apiRequest(`${articlePath(saved.id)}/publish`, { method: 'POST', body: { expectedRevision: justSaved.revisionCount } })).article); }
      catch (error) {
        error.message = `Your draft was saved, but publication was refused: ${error.message} Reload the saved article to check its status before retrying.`;
        throw error;
      }
    }, 'Published. The reading room now shows this snapshot.');
  };

  const unpublish = () => {
    if (action.lock.current) return;
    if (!window.confirm('Unpublish this article? Visitors can no longer open it. Your working copy and revision history are kept.')) return;
    action.run(async () => { accept((await apiRequest(`${articlePath(saved.id)}/unpublish`, { method: 'POST', body: { expectedRevision: saved.revisionCount } })).article); revisionResource.reload(); }, 'Unpublished. The working copy is still here for editing.');
  };

  const setStatus = (status) => {
    if (action.lock.current) return;
    const confirmText = status === 'archived'
      ? 'Archive this article? Visitors cannot see it, and it keeps its working copy and revision history. Find it again with the Archived status filter, then move it back to draft to work on it.'
      : 'Move this article back to draft? Nothing changes for visitors — it is already not published.';
    if (!window.confirm(confirmText)) return;
    action.run(async () => { accept((await apiRequest(`${articlePath(saved.id)}/status`, { method: 'PATCH', body: { status, expectedRevision: saved.revisionCount } })).article); revisionResource.reload(); }, status === 'archived' ? 'Article archived. Move it back to draft to edit it toward a publication.' : 'Article moved back to draft.');
  };

  const reload = () => {
    if (action.lock.current || (dirty && !window.confirm('Discard unsaved local changes and load the latest saved article?'))) return;
    action.run(async () => { const response = await apiRequest(articlePath(saved.id)); accept(response.article); setDraft(fieldsOf(response.article)); setSlugEdited(Boolean(response.article.slug)); setChangeNote(''); revisionResource.reload(); }, 'Latest saved article loaded.');
  };

  const remove = () => {
    if (action.lock.current) return;
    if (!window.confirm(`Delete “${saved.title}” and its whole revision history? This cannot be undone from this screen.`)) return;
    // The server refuses a published article, and only an admin may delete at all.
    action.run(async () => { await apiRequest(articlePath(saved.id), { method: 'DELETE' }); }, 'Article deleted.').then((deleted) => { if (deleted) navigate('/admin/blog'); });
  };

  const published = saved.status === 'published';
  const liveUrl = saved.publishedSnapshot?.slug || saved.slug;

  return <div className="cms-admin db-stack">
    <Link className="db-text-link" to="/admin/blog" onClick={(event) => { if (action.lock.current || (dirty && !window.confirm('Discard unsaved local changes and return to the library?'))) event.preventDefault(); }}>← All articles</Link>
    <PageHeading eyebrow="Article editor" title={saved.title} action={<span className="db-badge">{saved.status}</span>}>
      Revision {saved.revisionCount} · {saved.hasUnpublishedChanges ? 'Saved changes are not yet published' : 'Published snapshot is up to date'}{dirty ? ' · Unsaved local edits' : ''} · about {minutes} min read
    </PageHeading>
    <ActionState action={action} onReload={reload} />
    <div className="cms-admin-savebar"><span>{dirty ? 'Unsaved local changes' : 'Working copy is saved'}</span><div className="db-actions">
      <button type="button" className="db-button" disabled={action.busy || (!dirty && !changeNote.trim())} onClick={() => action.run(save, 'Draft saved. The published article is unchanged.')}>{action.busy ? 'Saving…' : 'Save draft'}</button>
    </div></div>
    <section className="db-panel db-stack" aria-label="Publication controls">
      <div className="cms-admin-row"><div><h2>Publication</h2><p className="db-muted">Saving never changes the public article. Publish always saves the working copy first, then freezes it.</p>
        {published && <p>Live URL: <Link className="db-text-link" to={`/blog/${encodeURIComponent(liveUrl)}`} target="_blank" rel="noopener noreferrer">/blog/{liveUrl} (opens new tab)</Link></p>}
        <p className="db-muted">Published {date(saved.publishedAt)} · last saved {date(saved.updatedAt)} · {saved.revisionCount} revision(s)</p>
      </div><div className="db-actions">
        <button type="button" className="db-button" disabled={action.busy} onClick={publish}>{action.busy ? 'Working…' : published ? 'Republish' : 'Publish'}</button>
        <button type="button" className="db-button-secondary" disabled={action.busy || !published} onClick={unpublish}>Unpublish</button>
        <button type="button" className="db-button-secondary" disabled={action.busy || published || saved.status === 'archived'} onClick={() => setStatus('archived')}>Archive</button>
        <button type="button" className="db-button-secondary" disabled={action.busy || saved.status !== 'archived'} onClick={() => setStatus('draft')}>Restore to draft</button>
        <button type="button" className="db-button-secondary" disabled={action.busy} onClick={reload}>Reload saved article</button>
        {user?.role === 'admin' && <button type="button" className="db-button-secondary" disabled={action.busy || published} onClick={remove}>Delete article</button>}
      </div></div>
      {published && <p className="db-muted">Deleting is blocked while an article is published: unpublish it first, then delete if it should be gone for good.</p>}
      {user?.role !== 'admin' && <p className="db-muted">Deleting an article is restricted to administrators.</p>}
    </section>
    <div className="cms-admin-tabs" role="group" aria-label="Article editor views">{[['content', 'Writing'], ['revisions', 'Revisions']].map(([key, title]) => <button type="button" key={key} aria-pressed={tab === key} disabled={action.busy} onClick={() => setTab(key)}>{title}</button>)}</div>
    {tab === 'revisions'
      ? <RevisionList article={saved} busy={action.busy} dirty={dirty} resource={revisionResource} onRestore={(revisionNumber) => action.run(async () => {
        const response = await apiRequest(`${articlePath(saved.id)}/restore`, { method: 'POST', body: { revisionNumber, expectedRevision: saved.revisionCount } });
        accept(response.article); setDraft(fieldsOf(response.article)); setSlugEdited(Boolean(response.article.slug));
        revisionResource.reload();
      }, `Revision ${revisionNumber} is now the editable draft. The published article is unchanged; publish when ready.`)} />
      : <form noValidate onSubmit={(event) => { event.preventDefault(); action.run(save, 'Draft saved. The published article is unchanged.'); }}>
        <fieldset className="cms-admin-form-body db-stack" disabled={action.busy}>
          <legend className="cms-sr-only">Article content</legend>
          <section className="db-panel db-stack" aria-label="Article details">
            <div><h2>Details</h2><p className="db-muted">These fields are what a reader sees around the article, plus the address it lives at.</p></div>
            <div className="cms-admin-grid">
              <Field label="Title" required value={draft.title} maxLength={LIMITS.title} onChange={(next) => { set('title')(next); if (!slugEdited) set('slug')(toSlug(next)); }} />
              <Field label="Slug" value={draft.slug} maxLength={LIMITS.slug} onChange={(next) => { setSlugEdited(true); set('slug')(toSlug(next)); }} hint={slugEdited ? 'The public address is /blog/your-slug. Lowercase words, dashes only, unique across the library.' : 'Generated from the title. Edit it to take control.'} />
              <Select label="Section" value={draft.section} options={SECTIONS} onChange={set('section')} hint="One of the five locked library sections." />
              <Field label="Series" value={draft.series} maxLength={LIMITS.series} onChange={set('series')} hint="Optional series title shown above the article." />
              <Field label="Part" type="number" min={1} max={99} step={1} value={draft.part} onChange={set('part')} hint="Position within the series, 1–99. Blank means no part number." />
              <Field label="Author name" value={draft.authorName} maxLength={LIMITS.authorName} onChange={set('authorName')} hint="Free text, shown as the byline. Not a user account." />
            </div>
            <Field label="Dek (standfirst)" multiline rows={2} value={draft.dek} maxLength={LIMITS.dek} onChange={set('dek')} hint={`${draft.dek.length} / ${LIMITS.dek} characters. The one-line summary shown on the library card.`} />
          </section>
          <section className="db-panel db-stack" aria-label="Article body">
            <div><h2>Body</h2><p className="db-muted">Markdown, rendered as React nodes on the public page. About {minutes} min read · {draft.body.length.toLocaleString()} / {LIMITS.body.toLocaleString()} characters. The server recounts reading time when you publish.</p></div>
            <textarea className="cms-admin-body" aria-label="Article body in markdown" value={draft.body} onChange={(event) => set('body')(event.target.value)} rows={24} maxLength={LIMITS.body} placeholder={'## A heading\n\nParagraphs separated by a blank line. [Links](https://example.com) keep their label if the target is unsafe.'} />
          </section>
          <section className="db-panel db-stack" aria-label="Cover image"><CoverField articleId={saved.id} value={draft.cover} onChange={set('cover')} disabled={action.busy} /></section>
          <section className="db-panel db-stack" aria-label="Tags and search">
            <div><h2>Tags &amp; search</h2><p className="db-muted">{splitTags(draft.tagsText).length} / {LIMITS.tags} tags.</p></div>
            <Field label="Tags, comma separated" value={draft.tagsText} onChange={set('tagsText')} hint={`Up to ${LIMITS.tags} tags, ${LIMITS.tag} characters each. Shown on the article and used by library search.`} />
            <div className="cms-admin-grid">
              <Field label="SEO title" value={draft.seo.title} maxLength={LIMITS.seoTitle} onChange={(next) => set('seo')({ ...draft.seo, title: next })} hint={`${draft.seo.title.length} / ${LIMITS.seoTitle} characters. Blank falls back to the article title.`} />
              <Field label="Canonical URL" value={draft.seo.canonicalUrl} onChange={(next) => set('seo')({ ...draft.seo, canonicalUrl: next })} hint="Only used if you must point search engines at another copy." />
            </div>
            <Field label="SEO description" multiline rows={3} value={draft.seo.description} maxLength={LIMITS.seoDescription} onChange={(next) => set('seo')({ ...draft.seo, description: next })} hint={`${draft.seo.description.length} / ${LIMITS.seoDescription} characters.`} />
          </section>
          <section className="db-panel"><Field label="Revision note" value={changeNote} maxLength={LIMITS.changeNote} onChange={setChangeNote} hint={`Optional, at most ${LIMITS.changeNote} characters. Recorded in the revision history with this save.`} /></section>
          <div className="cms-admin-savebar"><span>{dirty ? 'Unsaved local changes' : 'No unsaved local changes'}</span><div className="db-actions">
            <button type="button" className="db-button-secondary" disabled={!dirty || action.busy} onClick={() => { if (window.confirm('Discard unsaved local changes and return to the last saved copy?')) { setDraft(fieldsOf(saved)); setSlugEdited(Boolean(saved.slug)); } }}>Discard local changes</button>
            <button className="db-button" disabled={action.busy || (!dirty && !changeNote.trim())}>{action.busy ? 'Saving…' : 'Save draft'}</button>
          </div></div>
        </fieldset>
      </form>}
  </div>;
}

export function AdminBlogEditor() {
  const { id } = useParams();
  const { user } = useAuth();
  const resource = useDashboardResource(isStaff(user) && id ? articlePath(id) : null);
  if (!isStaff(user)) return <EmptyState title="Staff access required">Sign in as an administrator or content manager to edit articles.</EmptyState>;
  return <RequestState resource={resource}>{resource.data?.article
    ? <ArticleWorkspace key={resource.data.article.id} initial={resource.data.article} />
    : !resource.loading && !resource.error ? <EmptyState title="Article unavailable" action={<Link to="/admin/blog" className="db-button-secondary">Back to articles</Link>}>No article was returned for this editor.</EmptyState> : null}</RequestState>;
}

export default AdminBlog;
