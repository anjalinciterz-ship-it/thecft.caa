import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';
import { site } from '../data/site';
import { DashIcon, EmptyState, PageHeading, RequestState, dateTime, money, useDashboardResource } from '../components/DashboardUI';
import { AdminCourses, AdminCourseEditor } from './AdminCourses';
import { AdminPeople, AdminStudentDetail } from './AdminPeople';
import { AdminOrders, AdminOrderDetail } from './AdminOrders';
import { AdminCMS, AdminCMSEditor } from './AdminCMS';
import { AdminBlog, AdminBlogEditor } from './AdminBlog';
import { AdminPrograms, AdminCertificates, AdminModeration, AdminMedia, AdminPlatform, AdminDiscounts } from './AdminOperations';
import { AdminSchedule, AdminBookings, AdminLiveClasses } from './AdminScheduling';
import { AdminSettings } from './AdminSettings';
import '../styles/dashboard.css';
import '../styles/admin.css';

// `adminOnly` mirrors the backend, where these screens read endpoints that
// requireStaff allows but their mutating endpoints restrict to requireAdmin.
// Grouping them is presentation only: every entry keeps its own flag, and no
// route is removed, so a screen a role can reach is still reachable.
const navigation = [
  { group: 'Overview', items: [['', 'home', 'Overview']] },
  { group: 'Content', items: [
    ['courses', 'book', 'Courses'],
    ['programs', 'grid', 'Programs'],
    ['cms', 'pencil', 'Pages & content'],
    ['blog', 'leaf', 'Blog'],
    ['media', 'film', 'Media library'],
    ['certificates', 'award', 'Certificates'],
  ] },
  { group: 'Schedule', items: [
    ['schedule', 'clock', 'Schedule & availability'],
    ['bookings', 'calendar', 'Bookings'],
    ['live-classes', 'video', 'Live classes'],
  ] },
  { group: 'Students & Orders', items: [
    ['students', 'users', 'Students'],
    ['orders', 'card', 'Orders & payments'],
    ['discounts', 'gift', 'Discount codes'],
  ] },
  { group: 'Appearance', items: [['settings', 'settings', 'Site settings']] },
  { group: 'Advanced', items: [
    ['moderation', 'eye', 'Community moderation'],
    ['contact', 'chat', 'Support inbox', true],
    ['audit', 'lock', 'Audit log'],
    ['platform', 'globe', 'Platform status'],
  ] },
];

function Pagination({ page, setPage, resource }) {
  return <nav className="db-actions" aria-label="Results pagination"><button className="db-button-secondary" disabled={resource.loading || page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {Math.max(1, resource.meta?.pages || 1)} · {resource.meta?.total ?? 0} results</span><button className="db-button-secondary" disabled={resource.loading || !!resource.error || page >= (resource.meta?.pages || 1)} onClick={() => setPage(page + 1)}>Next</button></nav>;
}

function AdminOverview() {
  const [range, setRange] = useState({ from: '', to: '' });
  const [query, setQuery] = useState('');
  const resource = useDashboardResource(`/admin/overview${query ? `?${query}` : ''}`);
  const data = resource.data;
  return <div className="db-stack"><PageHeading eyebrow="CFT administration" title="Overview">Live records from your platform. External integration configuration does not prove delivery or payment success.</PageHeading>
    <form className="db-panel db-actions" aria-label="Reporting period" onSubmit={(event) => { event.preventDefault(); const params = new URLSearchParams(); if (range.from) params.set('from', `${range.from}T00:00:00.000Z`); if (range.to) params.set('to', `${range.to}T23:59:59.999Z`); setQuery(params.toString()); }}>
      <label className="db-field">From (UTC)<input type="date" value={range.from} max={range.to || undefined} onChange={(event) => setRange({ ...range, from: event.target.value })} /></label><label className="db-field">To (UTC)<input type="date" value={range.to} min={range.from || undefined} onChange={(event) => setRange({ ...range, to: event.target.value })} /></label><button className="db-button">Apply period</button><button type="button" className="db-button-secondary" onClick={() => { setRange({ from: '', to: '' }); setQuery(''); resource.reload(); }}>Last 30 days</button>
    </form>
    <RequestState resource={resource}>{data && <>
      <div className="ad-stats">{[['Students', data.students.total, 'Non-deleted student accounts'], ['Active students', data.students.active, 'Active account status'], ['Published courses', data.courses.published, `${data.courses.draft} drafts`], ['Course completions', data.learning.completionsInPeriod, 'Completed during this period']].map(([label, value, note]) => <article className="db-panel" key={label}><h2>{label}</h2><strong>{value}</strong><p className="db-muted">{note}</p></article>)}</div>
      <section className="db-panel db-stack"><h2>Payments during this period</h2><p className="db-muted">Gross payments use the paid date; refunds use their processing date. No currency conversion is performed.</p><div className="ad-stats">{[['Gross', data.revenue.grossMinor], ['Refunded', data.revenue.refundedMinor], ['Net', data.revenue.netMinor]].map(([label, value]) => <div key={label}><h3>{label}</h3><p className="db-price">{money(value, data.period.reportingCurrency)}</p></div>)}</div><p>{data.revenue.completedPurchases} completed purchases · {data.revenue.pendingPayments} pending payments</p>{data.revenue.unconvertedCurrencies?.length > 0 && <p className="db-error">Not included in the reporting-currency total: {data.revenue.unconvertedCurrencies.join(', ')}. Review individual orders for these amounts.</p>}<Link to="/admin/orders" className="db-text-link">Review orders</Link></section>
      <div className="ad-columns"><section className="db-panel db-stack"><h2>Upcoming activities</h2><p>{data.schedule.upcomingLiveClasses} published live classes</p><p>{data.schedule.upcomingBookings} confirmed bookings</p></section><section className="db-panel db-stack"><h2>Recent activity</h2>{data.recentActivity.length ? data.recentActivity.map((item) => <article key={item.id}><strong>{item.title}</strong><p className="db-muted">{item.student || 'Account unavailable'} · {dateTime(item.createdAt)}</p></article>) : <EmptyState title="No recent activity" />}</section></div>
      <section className="db-panel db-stack"><h2>Recent orders</h2>{data.recentOrders.length ? data.recentOrders.map((order) => <Link className="db-order-summary" key={order.id} to={`/admin/orders/${encodeURIComponent(order.id)}`}><div><h3>{order.orderNumber} · {order.student?.name || 'Account unavailable'}</h3><p>{money(order.totalMinor, order.currency)} · {dateTime(order.createdAt)}</p></div><span className="db-badge">{order.paymentStatus}</span></Link>) : <EmptyState title="No orders recorded" />}</section>
    </>}</RequestState>
  </div>;
}

function AdminAudit() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');
  const resource = useDashboardResource(`/admin/audit?page=${page}&limit=25${filter ? `&action=${encodeURIComponent(filter)}` : ''}`);
  return <div className="db-stack"><PageHeading eyebrow="Accountability" title="Audit log">Persisted administrative actions, including their actor, outcome and reason.</PageHeading><form className="db-panel db-actions" onSubmit={(event) => { event.preventDefault(); setFilter(new FormData(event.currentTarget).get('action').trim()); setPage(1); }}><label className="db-field">Exact action<input name="action" maxLength={80} placeholder="For example: contact.status" /></label><button className="db-button">Filter audit log</button><button type="reset" className="db-button-secondary" onClick={() => { setFilter(''); setPage(1); }}>Clear filter</button></form><RequestState resource={resource}><div className="db-panel ad-table" role="region" aria-label="Audit entries" tabIndex={0}>{resource.data?.entries.length ? <table><caption>Administrative actions</caption><thead><tr>{['Action', 'Actor', 'Outcome', 'Reason', 'Time'].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{resource.data.entries.map((entry) => <tr key={entry.id}><td>{entry.action}<div className="db-muted">{entry.targetKind || entry.category}</div></td><td>{entry.actor?.name || 'System'}<div className="db-muted">{entry.actor?.role}</div></td><td>{entry.outcome}</td><td>{entry.reason || 'No reason recorded'}</td><td>{dateTime(entry.createdAt)}</td></tr>)}</tbody></table> : <EmptyState title="No matching audit entries" />}</div></RequestState><Pagination page={page} setPage={setPage} resource={resource} /></div>;
}

function ContactCard({ message, reload }) {
  const [status, setStatus] = useState(message.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  return <article className="db-panel db-stack"><div><h2>{message.subject}</h2><p>{message.name} · {message.email}</p><p className="db-muted">{dateTime(message.createdAt)} · <span className="db-badge">{message.status.replaceAll('_', ' ')}</span></p></div><p className="ad-message">{message.message}</p><form className="db-actions" onSubmit={async (event) => {
    event.preventDefault(); if (pending.current || status === message.status) return;
    pending.current = true; setBusy(true); setError('');
    try { await apiRequest(`/admin/contact/${encodeURIComponent(message.id)}`, { method: 'PATCH', body: { status } }); reload(); }
    catch (failure) { setError(failure.message); }
    finally { pending.current = false; setBusy(false); }
  }}><label className="db-field">Message status<select aria-label={`Status for ${message.subject}`} value={status} disabled={busy} onChange={(event) => setStatus(event.target.value)}><option value="new">New</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select></label><button className="db-button-secondary" disabled={busy || status === message.status}>{busy ? 'Saving…' : 'Save message status'}</button><a className="db-text-link" href={`mailto:${encodeURIComponent(message.email)}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`}>Reply in email app</a></form>{error && <p className="db-error" role="alert">{error}</p>}{message.resolvedAt && <p className="db-muted">Resolved {dateTime(message.resolvedAt)}</p>}</article>;
}

function AdminContact() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('new');
  const resource = useDashboardResource(user.role === 'admin' ? `/admin/contact?page=${page}&limit=20${status ? `&status=${status}` : ''}` : null);
  if (user.role !== 'admin') return <EmptyState title="Administrator access required">Support messages are restricted to administrators.</EmptyState>;
  return <div className="db-stack"><PageHeading eyebrow="Public contact requests" title="Support inbox">Messages submitted through the website. Reply opens your email app; this does not confirm email delivery.</PageHeading><div className="db-actions"><label className="db-field">Filter message status<select aria-label="Filter message status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">All messages</option><option value="new">New</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select></label><button className="db-button-secondary" onClick={resource.reload} disabled={resource.loading}>Refresh inbox</button></div><RequestState resource={resource}>{resource.data?.requests.length ? resource.data.requests.map((message) => <ContactCard key={`${message.id}:${message.status}`} message={message} reload={resource.reload} />) : <div className="db-panel"><EmptyState icon="chat" title="No messages in this view" /></div>}</RequestState><Pagination page={page} setPage={setPage} resource={resource} /></div>;
}

export default function Admin() {
  const { user, loading, authError, refreshSession, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sidebar = useRef(null);
  const trigger = useRef(null);
  useEffect(() => { setDrawer(false); }, [location.pathname, location.search]);
  useEffect(() => {
    if (!drawer) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const items = () => [...sidebar.current.querySelectorAll('button,a[href]')].filter((node) => node.getClientRects().length);
    // Everything outside the drawer is inert, so focus that lands on <body> or on
    // the panel itself has nowhere to tab to; the panel is the fallback target.
    const focusFirst = () => { (items()[0] || sidebar.current).focus(); };
    focusFirst();
    const keydown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); setDrawer(false); return; }
      if (event.key !== 'Tab') return;
      const nodes = items();
      if (!nodes.includes(document.activeElement)) { event.preventDefault(); (nodes[event.shiftKey ? nodes.length - 1 : 0] || sidebar.current)?.focus(); return; }
      if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === nodes.at(-1)) { event.preventDefault(); nodes[0].focus(); }
    };
    const resize = () => { if (innerWidth > 900) setDrawer(false); };
    document.addEventListener('keydown', keydown); window.addEventListener('resize', resize);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', keydown); window.removeEventListener('resize', resize); trigger.current?.focus(); };
  }, [drawer]);
  if (loading && !user) return <div className="db-app db-auth-gate" role="status">Checking staff access…</div>;
  if (!user && authError) return <div className="db-app db-auth-gate"><p role="alert">{authError.message}</p><button className="db-button" onClick={() => refreshSession().catch(() => {})}>Retry session</button></div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (!['admin', 'content_manager'].includes(user.role)) return <div className="db-app db-auth-gate"><EmptyState title="Staff access required" action={<Link className="db-button" to="/dashboard">Return to dashboard</Link>}>Your account does not have administrative access.</EmptyState></div>;
  const signOut = async () => { if (busy) return; setBusy(true); setError(''); try { await logout(); navigate('/login', { replace: true }); } catch (failure) { setError(failure.message); } finally { setBusy(false); } };
  return <div className="db-app ad-app"><a className="db-skip" href="#admin-content">Skip to administration content</a><header className="db-topbar" {...(drawer ? { inert: '' } : {})}><div className="db-brand"><button ref={trigger} className="db-icon-button db-menu-toggle" aria-label="Open admin navigation" aria-expanded={drawer} aria-controls="admin-navigation" onClick={() => setDrawer(true)}><DashIcon name="menu" /></button><Link to="/admin" aria-label="CFT administration"><img src={site.logo} alt={site.name} /></Link></div><span className="ad-header-label">Administration</span><div className="db-topbar-actions"><span className="ad-user">{user.name}</span><Link className="db-text-link" to="/dashboard">Student view</Link><button className="db-button-secondary" disabled={busy} onClick={signOut}>{busy ? 'Signing out…' : 'Sign out'}</button></div></header>{drawer && <div className="db-drawer-backdrop" onClick={() => setDrawer(false)} aria-hidden="true" />}<aside ref={sidebar} id="admin-navigation" tabIndex={-1} className={`db-sidebar${drawer ? ' is-open' : ''}`} {...(drawer ? { role: 'dialog', 'aria-modal': true, 'aria-label': 'Admin navigation' } : { 'aria-label': 'Admin navigation' })}><div className="db-drawer-heading"><strong>Administration</strong><button className="db-icon-button" aria-label="Close admin navigation" onClick={() => setDrawer(false)}><DashIcon name="close" /></button></div><nav aria-label="Staff navigation">{navigation.flatMap(({ group, items }) => {
  const visible = items.filter(([, , , adminOnly]) => !adminOnly || user.role === 'admin');
  if (!visible.length) return [];
  // The label is a sibling of the links, not a wrapper, so the sidebar link
  // styling that expects `nav > a` keeps working unchanged.
  return [<p className="ad-nav-group" key={group}>{group}</p>, ...visible.map(([path, icon, label]) => <NavLink key={path} end={!path} to={`/admin${path ? `/${path}` : ''}`}><DashIcon name={icon} /><span>{label}</span></NavLink>)];
})}</nav><Link className="db-sidebar-visit" to="/"><DashIcon name="external" />Visit website</Link></aside><div className="db-main" {...(drawer ? { inert: '' } : {})}><div className="db-content" id="admin-content" tabIndex={-1}>{error && <p className="db-error" role="alert">{error}</p>}<Routes><Route index element={<AdminOverview />} /><Route path="students" element={<AdminPeople />} /><Route path="students/:id" element={<AdminStudentDetail />} /><Route path="courses" element={<AdminCourses />} /><Route path="courses/:id" element={<AdminCourseEditor />} /><Route path="programs" element={<AdminPrograms />} /><Route path="certificates" element={<AdminCertificates />} /><Route path="moderation" element={<AdminModeration />} /><Route path="media" element={<AdminMedia />} /><Route path="platform" element={<AdminPlatform />} /><Route path="schedule" element={<AdminSchedule />} /><Route path="bookings" element={<AdminBookings />} /><Route path="live-classes" element={<AdminLiveClasses />} /><Route path="cms" element={<AdminCMS />} /><Route path="cms/:id" element={<AdminCMSEditor />} /><Route path="blog" element={<AdminBlog />} /><Route path="blog/:id" element={<AdminBlogEditor />} /><Route path="orders" element={<AdminOrders />} /><Route path="orders/:id" element={<AdminOrderDetail />} /><Route path="discounts" element={<AdminDiscounts />} /><Route path="settings" element={<AdminSettings />} /><Route path="audit" element={<AdminAudit />} /><Route path="contact" element={<AdminContact />} /><Route path="*" element={<EmptyState title="Administration page not found" action={<Link className="db-button" to="/admin">Back to overview</Link>} />} /></Routes></div></div></div>;
}
