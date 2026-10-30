import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { Icon } from './icons';

const dashboardIcons = {
  home: <><path d="m3 10 9-7 9 7v10H3Z" /><path d="M9 20v-7h6v7" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  card: <><rect x="2" y="4" width="20" height="16" rx="3" /><path d="M2 9h20M6 15h4" /></>,
  award: <><circle cx="12" cy="8" r="5" /><path d="m8 12-2 9 6-3 6 3-2-9" /></>,
  settings: <><path d="m9 3-1 3-3 1v4l-2 1 2 2v3l3 1 1 3h6l1-3 3-1v-3l2-2-2-1V7l-3-1-1-3Z" /><circle cx="12" cy="12" r="3" /></>,
  bell: <><path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5ZM10 21h4M12 2v2" /></>,
  logout: <><path d="M10 3H4v18h6M9 12h12m-4-4 4 4-4 4" /></>,
  external: <><path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7" /></>,
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  video: <><rect x="2" y="5" width="14" height="14" rx="2" /><path d="m16 10 6-4v12l-6-4M7 9l4 3-4 3Z" /></>,
  play: <path d="m8 4 12 8-12 8Z" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 6v6l4 2" /></>,
};

export function DashIcon({ name, size = 22, ...props }) {
  if (!dashboardIcons[name]) return <Icon name={name} size={size} {...props} />;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>{dashboardIcons[name]}</svg>;
}

export function useDashboardResource(path) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState({ path: null, data: null, error: null, loading: false });
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    if (!path) return undefined;
    const controller = new AbortController();
    setResult({ path, data: null, error: null, loading: true });
    apiRequest(path, { signal: controller.signal, includeMeta: true })
      .then(({ data, meta }) => { if (!controller.signal.aborted) setResult({ path, data, meta, error: null, loading: false }); })
      .catch((error) => { if (!controller.signal.aborted) setResult({ path, data: null, meta: null, error, loading: false }); });
    return () => controller.abort();
  }, [path, revision]);
  if (!path) return { data: null, error: null, loading: false, reload };
  return { ...(result.path === path ? result : { data: null, error: null, loading: true }), reload };
}

export function RequestState({ resource, children }) {
  if (resource.loading) return <div className="db-loading" role="status"><span className="db-spinner" />Loading your space…</div>;
  if (resource.error) return <div className="db-error" role="alert"><p>{resource.error.message || 'This information could not be loaded.'}</p><button type="button" className="db-button-secondary" onClick={resource.reload}>Try again</button>{resource.error.status === 401 && <Link className="db-text-link" to="/login">Sign in again</Link>}</div>;
  return children;
}

export function EmptyState({ icon = 'lotus', title, children, action }) {
  return <div className="db-empty"><span className="db-icon-ring"><DashIcon name={icon} size={27} /></span><h3>{title}</h3>{children && <div className="db-muted">{children}</div>}{action && <div className="db-empty-action">{action}</div>}</div>;
}

export function PageHeading({ eyebrow, title, children, action }) {
  return <div className="db-page-heading"><div>{eyebrow && <span className="db-eyebrow">{eyebrow}</span>}<h1>{title}</h1>{children && <div className="db-muted">{children}</div>}</div>{action}</div>;
}

export function money(minor, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, currencyDisplay: 'code' }).format(Number(minor || 0) / 100);
}

export function dateTime(value, timeZone) {
  if (!value) return 'Date to be confirmed';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short', ...(timeZone ? { timeZone } : {}) }).format(new Date(value));
}

export function safeImage(value) {
  const url = typeof value === 'string' ? value : value?.url;
  return typeof url === 'string' && (/^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url)) && !url.includes('\\') ? url : null;
}

export function CourseTile({ course, owned = false }) {
  const item = course.course && typeof course.course === 'object' ? { ...course, ...course.course } : course;
  const image = safeImage(item.coverImage);
  const progress = Math.max(0, Math.min(100, Number(item.percent || item.progress?.percent || 0)));
  const active = owned && item.accessActive !== false;
  const to = `/dashboard/${active ? 'courses' : 'explore'}/${encodeURIComponent(item.slug || item.id)}`;
  return <article className="db-course-tile db-panel">
    <Link to={to} className={`db-course-art${image ? '' : ' db-course-art-fallback'}`} tabIndex={-1} aria-hidden="true">{image ? <img src={image} alt="" loading="lazy" /> : <DashIcon name="lotus" size={64} />}</Link>
    <h3><Link to={to}>{item.title}</Link></h3>
    <p className="db-course-meta">{owned ? `${item.lessonsCompleted || 0} of ${item.lessonsTotal || 0} lessons complete` : item.level || 'Self-paced learning'}</p>
    {owned ? <div className="db-progress-row"><progress max="100" value={progress} aria-label={`${item.title} progress`} /><span>{progress}%</span></div> : <p className="db-price">{item.isFree ? 'Free' : money(item.priceMinor, item.currency)}</p>}
    <Link to={to} className="db-button-secondary">{owned ? active ? progress > 0 ? 'Continue learning' : 'Start learning' : 'Review access' : 'Explore course'}<DashIcon name="arrow" size={15} /></Link>
  </article>;
}
