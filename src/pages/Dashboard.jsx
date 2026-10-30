import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { usePageMeta } from '../lib/seo';
import { site } from '../data/site';
import { CourseTile, DashIcon, EmptyState, PageHeading, RequestState, dateTime, money, safeImage, useDashboardResource } from '../components/DashboardUI';
import { MyCourses, ExplorePrograms, DashboardCourse } from './DashboardLearning';
import { Orders, Certificates, Wishlist, Settings, Community, Notifications } from './DashboardAccount';
import { LiveClasses, Bookings, CallsAndBookings } from './DashboardSchedule';
import { FreeBooks } from './DashboardLibrary';
import '../styles/dashboard.css';

// The four sections a learner actually uses. Everything else (orders, receipts,
// certificates, wishlist, community, settings) stays reachable from the account
// menu — the routes are unchanged, only the sidebar got honest about priority.
const navigation = [
  ['', 'home', 'Home'],
  ['courses', 'book', 'My Courses'],
  ['library', 'lotus', 'Free Books'],
  ['calls', 'calendar', 'Calls & Bookings'],
];
const accountLinks = [
  ['orders', 'card', 'Orders & receipts'],
  ['certificates', 'award', 'Certificates'],
  ['wishlist', 'heart', 'Wishlist'],
  ['community', 'users', 'Community'],
  ['explore', 'grid', 'All programs'],
  ['settings', 'settings', 'Account settings'],
];

function SectionTitle({ title, to, link = 'View all' }) {
  return <div className="db-section-title"><h2>{title}</h2>{to && <Link to={to}>{link}<DashIcon name="arrow" size={15} /></Link>}</div>;
}

function DateCard({ value, timeZone }) {
  const date = new Date(value);
  return <span className="db-date-card"><span>{new Intl.DateTimeFormat('en-US', { month: 'short', timeZone }).format(date)}</span><b>{new Intl.DateTimeFormat('en-US', { day: '2-digit', timeZone }).format(date)}</b></span>;
}

function CheckoutBanner({ requestedCourse, checkoutReturn, enrolled, reload }) {
  const [waited, setWaited] = useState(0);
  const confirmed = Boolean(checkoutReturn) && enrolled > 0;

  useEffect(() => {
    if (checkoutReturn !== 'success' || enrolled > 0) return undefined;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - startedAt >= 20000) { clearInterval(timer); return; }
      setWaited(Math.round((Date.now() - startedAt) / 1000));
      reload();
    }, 2500);
    return () => clearInterval(timer);
  }, [checkoutReturn, enrolled, reload]);

  if (requestedCourse) {
    return <div className="db-panel db-actions"><span>Your account is ready. Review the course, its price and what is included before you pay.</span><Link className="db-text-link" to={`/checkout?course=${encodeURIComponent(requestedCourse)}`}>Review enrolment<DashIcon name="arrow" size={16} /></Link></div>;
  }
  if (checkoutReturn === 'cancelled') {
    return <div className="db-panel db-actions" role="status"><span>Payment was cancelled. Nothing was charged and no access was granted.</span><Link className="db-text-link" to="/dashboard/explore">Explore courses<DashIcon name="arrow" size={16} /></Link></div>;
  }
  if (checkoutReturn !== 'success') return null;
  if (confirmed) {
    return <div className="db-panel db-actions" role="status"><span>Payment confirmed — your lessons are unlocked.</span><Link className="db-text-link" to="/dashboard/courses">My courses<DashIcon name="arrow" size={16} /></Link></div>;
  }
  return <div className="db-panel db-actions" role="status"><span>We have your payment but the confirmation from the payment provider is still on its way. Access appears here automatically once it is verified.</span><Link className="db-text-link" to="/dashboard/orders">My orders</Link></div>;
}

function DashboardHome() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const requestedCourse = params.get('course');
  const summary = useDashboardResource('/student/dashboard');
  const library = useDashboardResource('/student/courses?limit=60');
  const sessions = useDashboardResource('/session-types');
  const catalog = useDashboardResource('/courses?limit=3');
  const data = summary.data;
  const learning = data?.continueLearning?.[0];
  const upcoming = data?.upcomingLiveClasses?.[0];
  const scheduled = [
    ...(data?.upcomingBookings || []).map((item) => ({ ...item, title: item.sessionType?.name || 'Personal call', to: '/dashboard/calls?tab=bookings' })),
    ...(data?.upcomingLiveClasses || []).filter((item) => item.isRegistered).map((item) => ({ ...item, to: '/dashboard/calls?tab=classes' })),
  ].sort((a, b) => new Date(a.startAt) - new Date(b.startAt)).slice(0, 3);
  const enrolled = (library.data?.courses || []).filter((course) => course.accessActive);
  return <div className="db-home db-stack">
    <CheckoutBanner requestedCourse={requestedCourse} checkoutReturn={params.get('checkout')} enrolled={enrolled.length} reload={library.reload} />
    <section className="db-welcome">
      <img className="db-welcome-art" src="/images/site/auth-arch.webp" alt="Meditation beneath a temple arch at sunset" />
      <div className="db-welcome-copy"><span className="db-eyebrow">Welcome back</span><h1>Hi, <span>{user.name}</span></h1><p>Continue your journey towards a calmer,<br className="db-desktop-break" /> clearer and more meaningful life.</p><blockquote><span aria-hidden="true">“</span><div><p>{site.quote.text}</p><cite>— {site.quote.by}</cite></div></blockquote></div>
    </section>
    <div className="db-learning-layout">
      <div className="db-stack">
        <section><SectionTitle title="Continue Learning" to="/dashboard/courses" link="View my courses" /><div className="db-panel db-continue"><RequestState resource={summary}>{learning ? <><div className="db-continue-art">{safeImage(learning.coverImage) ? <img src={safeImage(learning.coverImage)} alt="" /> : <img src="/images/journeys/consciousness-760.webp" alt="" />}<span className="db-play-decoration"><DashIcon name="play" size={25} /></span><div className="db-progress-row"><progress max="100" value={learning.percent} aria-label={`${learning.title} progress`} /><span>{learning.percent}% complete</span></div></div><div className="db-continue-copy"><span className="db-badge">In progress</span><h3>{learning.title}</h3><p>{learning.lastLessonTitle ? `Up next: ${learning.lastLessonTitle}` : learning.shortDescription}</p><Link className="db-button" to={`/dashboard/courses/${encodeURIComponent(learning.slug)}`}>Continue learning<DashIcon name="arrow" size={16} /></Link></div></> : <div className="db-start-learning"><img src="/images/journeys/consciousness-760.webp" alt="" /><div><span className="db-eyebrow">One step at a time</span><h3>Your next chapter starts here</h3><p>{enrolled.length ? 'Choose a course from your library to begin. Your progress will appear here.' : 'Make a little space for yourself. Discover a course and begin at your own pace.'}</p><Link className="db-button" to={enrolled.length ? '/dashboard/courses' : '/dashboard/explore'}>{enrolled.length ? 'Open my courses' : 'Find your first course'}<DashIcon name="arrow" size={16} /></Link></div></div>}</RequestState></div></section>
        <section><SectionTitle title="My Purchased Courses" to="/dashboard/courses" /><RequestState resource={library}>{enrolled.length ? <div className="db-grid db-home-courses">{enrolled.slice(0, 3).map((course) => <CourseTile key={course.id} course={course} owned />)}</div> : <div className="db-panel"><EmptyState icon="book" title="Your learning library is waiting" action={<Link className="db-text-link" to="/dashboard/explore">Explore courses<DashIcon name="arrow" size={16} /></Link>}>Your enrolled courses and real progress will appear here.</EmptyState></div>}</RequestState></section>
        {!library.loading && !library.error && !enrolled.length && <section><SectionTitle title="Discover Your Next Step" to="/dashboard/explore" link="Explore all" /><RequestState resource={catalog}>{catalog.data?.courses?.length ? <div className="db-grid db-home-courses">{catalog.data.courses.map((course) => <CourseTile key={course.id} course={course} />)}</div> : <div className="db-panel"><EmptyState icon="lotus" title="New learning is on its way">Published courses will appear here as they become available.</EmptyState></div>}</RequestState></section>}
      </div>
      <aside className="db-home-aside db-stack" aria-label="Your upcoming activities">
        <section className="db-panel db-upcoming"><SectionTitle title="Upcoming Live Class" to="/dashboard/calls?tab=classes" /><RequestState resource={summary}>{upcoming ? <><div className="db-schedule-item"><DateCard value={upcoming.startAt} timeZone={upcoming.timeZone} /><div><h3>{upcoming.title}</h3><p>{dateTime(upcoming.startAt, upcoming.timeZone)}</p></div></div><Link className="db-button" to="/dashboard/calls?tab=classes">{upcoming.isRegistered ? 'View live class' : 'Explore live class'}<DashIcon name="arrow" size={16} /></Link></> : <EmptyState icon="calendar" title="A little room to look forward">No upcoming classes have been published yet. Check back for the next gathering.</EmptyState>}</RequestState></section>
        <section className="db-panel db-schedule"><SectionTitle title="My Schedule" to="/dashboard/calls?tab=bookings" /><RequestState resource={summary}>{scheduled.length ? scheduled.map((item) => <Link className="db-schedule-item" to={item.to} key={`${item.to}-${item.id}`}><DateCard value={item.startAt} timeZone={item.timeZone} /><div><h3>{item.title}</h3><p>{dateTime(item.startAt, item.timeZone)}</p>{item.status && item.status !== 'confirmed' && <span className="db-badge">{item.status.replaceAll('_', ' ')}</span>}</div><DashIcon name="chevron" size={16} /></Link>) : <EmptyState icon="clock" title="Time for what matters">Your booked calls and registered live classes will appear here.</EmptyState>}</RequestState></section>
      </aside>
    </div>
    <div className="db-bottom-layout">
      <section><SectionTitle title="Book a Personal Call with Zalah" to="/dashboard/calls?tab=bookings" link="View all options" /><RequestState resource={sessions}>{sessions.data?.sessionTypes?.length ? <div className="db-grid db-session-grid">{sessions.data.sessionTypes.slice(0, 3).map((session) => <article className="db-panel db-session-card" key={session.id}><span className="db-icon-ring"><DashIcon name={session.allowCustomDuration ? 'calendar' : 'video'} size={24} /></span><h3>{session.name}</h3><span className="db-muted">{session.durationMinutes} minutes{session.allowCustomDuration ? ' · Flexible duration' : ''}</span><p>{session.description || 'Personal space for your questions, clarity and growth.'}</p><p className="db-price">{session.isFree ? 'Free' : money(session.priceMinor, session.currency)}</p><Link className="db-button-secondary" to={`/dashboard/calls?tab=bookings&sessionType=${encodeURIComponent(session.id)}`}>View availability<DashIcon name="arrow" size={14} /></Link></article>)}</div> : <div className="db-panel"><EmptyState icon="video" title="Personal guidance, at your pace" action={<a className="db-button-secondary" href={`mailto:${site.email}?subject=Personal%20call%20availability`}>Ask about a personal call<DashIcon name="arrow" size={16} /></a>}>Session options and bookable times have not been published yet.</EmptyState></div>}</RequestState></section>
      <section><SectionTitle title="Recent Orders" to="/dashboard/orders" /><div className="db-panel db-recent-orders"><RequestState resource={summary}>{data?.recentOrders?.length ? data.recentOrders.map((order) => <Link className="db-order-summary" to={`/dashboard/orders?order=${encodeURIComponent(order.orderNumber)}`} key={order.id}><span className="db-small-icon"><DashIcon name="card" size={21} /></span><div><h3>{order.items?.map((item) => item.title).join(', ') || order.orderNumber}</h3><p>{money(order.totalMinor, order.currency)} · {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p></div><span className="db-badge">{order.paymentStatus.replaceAll('_', ' ')}</span></Link>) : <EmptyState icon="card" title="Everything in one place">Once you make a purchase, your orders and payment status will appear here.</EmptyState>}</RequestState></div></section>
    </div>
  </div>;
}

function DashboardSearch() {
  const [params] = useSearchParams();
  const term = (params.get('q') || '').trim();
  const resource = useDashboardResource(term.length >= 2 ? `/student/search?q=${encodeURIComponent(term)}&limit=20` : null);
  const groups = [['courses', 'Courses', 'book'], ['lessons', 'Lessons', 'play'], ['liveClasses', 'Live classes', 'calendar']];
  const found = groups.some(([key]) => resource.data?.[key]?.length);
  return <div className="db-stack"><PageHeading eyebrow="Your learning space" title="Search results">{term ? `Results for “${term}”` : 'Use the search above to find your courses, lessons and live classes.'}</PageHeading>{term.length < 2 ? <div className="db-panel"><EmptyState icon="search" title="What would you like to find?">Enter at least two characters in the search field.</EmptyState></div> : <RequestState resource={resource}>{found ? groups.map(([key, title, icon]) => resource.data?.[key]?.length ? <section key={key}><SectionTitle title={title} /><div className="db-panel db-search-list">{resource.data[key].map((item) => <Link key={item.id} to={key === 'courses' ? `/dashboard/courses/${encodeURIComponent(item.slug)}` : key === 'lessons' && /^\/dashboard\/courses\/[^/]+\/lesson\/[^/]+$/.test(item.link || '') ? item.link : '/dashboard/live-classes'}><span className="db-small-icon"><DashIcon name={icon} /></span><div><h3>{item.title}</h3><p>{item.courseTitle || (item.startAt ? dateTime(item.startAt, item.timeZone) : 'In your learning library')}</p></div><DashIcon name="arrow" size={18} /></Link>)}</div></section> : null) : <div className="db-panel"><EmptyState icon="search" title="No matches just yet" action={<Link className="db-button-secondary" to="/dashboard/explore">Explore all programs</Link>}>Try a different title or a shorter search. Search only shows content available to your account.</EmptyState></div>}</RequestState>}</div>;
}

export default function Dashboard() {
  const { user, loading, authError, refreshSession, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const [account, setAccount] = useState(false);
  const [search, setSearch] = useState('');
  const [logoutError, setLogoutError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const sidebar = useRef(null);
  const menuButton = useRef(null);
  const profile = useRef(null);
  const notifications = useDashboardResource(user ? '/student/notifications?limit=1' : null);
  usePageMeta({ title: 'Your Dashboard · The Centre for Transformation', description: 'Your personal space to learn, connect and grow.', path: '/dashboard' });

  useEffect(() => { setDrawer(false); setAccount(false); }, [location.pathname, location.search]);
  useEffect(() => {
    window.addEventListener('cft:notifications-changed', notifications.reload);
    return () => window.removeEventListener('cft:notifications-changed', notifications.reload);
  }, [notifications.reload]);
  useEffect(() => {
    if (!account) return undefined;
    const close = (event) => { if (event.key === 'Escape' || (event.type === 'pointerdown' && !profile.current?.contains(event.target))) setAccount(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close); };
  }, [account]);
  useEffect(() => {
    if (!drawer) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const items = () => [...sidebar.current.querySelectorAll('button, a[href]')].filter((element) => element.getClientRects().length);
    // Everything outside the drawer is inert, so focus that lands on <body> or on
    // the panel itself has nowhere to tab to; the panel is the fallback target.
    (items()[0] || sidebar.current).focus();
    const trap = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); setDrawer(false); }
      if (event.key === 'Tab') {
        const nodes = items();
        if (!nodes.includes(document.activeElement)) { event.preventDefault(); (nodes[event.shiftKey ? nodes.length - 1 : 0] || sidebar.current).focus(); return; }
        if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes.at(-1)?.focus(); }
        else if (!event.shiftKey && document.activeElement === nodes.at(-1)) { event.preventDefault(); nodes[0]?.focus(); }
      }
    };
    const resize = () => { if (window.innerWidth > 900) setDrawer(false); };
    document.addEventListener('keydown', trap);
    window.addEventListener('resize', resize);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', trap); window.removeEventListener('resize', resize); menuButton.current?.focus(); };
  }, [drawer]);

  const signInPath = `/login?next=${encodeURIComponent(location.pathname + location.search)}`;
  if (!user && loading) return <div className="db-app db-auth-gate"><span className="db-spinner" /><p role="status">Opening your dashboard…</p></div>;
  if (!user && authError) return <div className="db-app db-auth-gate"><div className="db-panel"><EmptyState title="We couldn’t open your session" action={<button className="db-button" onClick={() => refreshSession().catch(() => {})}>Try again</button>}>{authError.message}</EmptyState><Link className="db-text-link" to={signInPath}>Back to sign in</Link></div></div>;
  if (!user) return <Navigate to={signInPath} replace />;

  const signOut = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError('');
    try { await logout(); navigate('/login', { replace: true }); }
    catch (error) { setLogoutError(error.message); }
    finally { setLoggingOut(false); }
  };
  const avatar = safeImage(user.avatarUrl);
  const submitSearch = (event) => { event.preventDefault(); navigate(`/dashboard/search?q=${encodeURIComponent(search.trim())}`); };
  return <div className="db-app">
    <a className="db-skip" href="#dashboard-content">Skip to dashboard content</a>
    <header className="db-topbar" {...(drawer ? { inert: '' } : {})}>
      <div className="db-brand"><button ref={menuButton} className="db-icon-button db-menu-toggle" aria-label="Open navigation" aria-expanded={drawer} aria-controls="dashboard-navigation" onClick={() => setDrawer(true)}><DashIcon name="menu" /></button><Link to="/dashboard" aria-label="CFT dashboard"><img src={site.logo} alt={site.name} /></Link></div>
      <form className="db-search" onSubmit={submitSearch} role="search"><DashIcon name="search" size={20} /><input aria-label="Search courses, lessons and live classes" placeholder="Search courses, live classes, resources…" value={search} onChange={(event) => setSearch(event.target.value)} maxLength={120} /><button type="submit" aria-label="Search dashboard"><DashIcon name="arrow" size={17} /></button></form>
      <div className="db-topbar-actions"><Link className="db-visit" to="/"><DashIcon name="external" size={16} /><span>Visit website</span></Link><Link className="db-icon-button db-notification" to="/dashboard/notifications" aria-label={`Notifications${notifications.data?.unread ? `, ${notifications.data.unread} unread` : ''}`}><DashIcon name="bell" size={23} />{notifications.data?.unread > 0 && <span className="db-notification-dot" />}</Link><div className="db-profile" ref={profile}><button className="db-profile-trigger" onClick={() => setAccount(!account)} aria-expanded={account} aria-controls="dashboard-account">{avatar ? <img src={avatar} alt="" /> : <span className="db-avatar"><DashIcon name="seeker" size={22} /></span>}<span>{user.name}</span><DashIcon name="chevron" size={14} /></button>{account && <div className="db-account-menu db-panel" id="dashboard-account"><strong>{user.name}</strong><span>{user.email}</span>{accountLinks.map(([path, icon, label]) => <Link key={path} to={`/dashboard/${path}`}><DashIcon name={icon} size={17} />{label}</Link>)}{['admin', 'content_manager'].includes(user.role) && <Link to="/admin"><DashIcon name="grid" size={17} />Administration</Link>}<Link to="/"><DashIcon name="external" size={17} />Visit website</Link><button disabled={loggingOut} onClick={signOut}><DashIcon name="logout" size={17} />{loggingOut ? 'Signing out…' : 'Sign out'}</button>{logoutError && <p role="alert" className="db-error">{logoutError}</p>}</div>}</div></div>
    </header>
    {drawer && <div className="db-drawer-backdrop" onClick={() => setDrawer(false)} aria-hidden="true" />}
    <aside ref={sidebar} tabIndex={-1} className={`db-sidebar${drawer ? ' is-open' : ''}`} id="dashboard-navigation" {...(drawer ? { role: 'dialog', 'aria-modal': true, 'aria-label': 'Dashboard navigation' } : { 'aria-label': 'Dashboard navigation' })}><div className="db-drawer-heading"><img src={site.logo} alt="CFT" /><button className="db-icon-button" aria-label="Close navigation" onClick={() => setDrawer(false)}><DashIcon name="close" /></button></div><nav aria-label="Student navigation">{navigation.map(([path, icon, label]) => <NavLink key={path} end={!path} to={`/dashboard${path ? `/${path}` : ''}`}><DashIcon name={icon} size={23} /><span>{label}</span></NavLink>)}</nav><div className="db-support db-panel"><span className="db-icon-ring"><DashIcon name="lotus" size={29} /></span><h2>Need Support?</h2><p>We’re here for you.</p><a className="db-button-secondary" href={`mailto:${site.email}?subject=CFT%20member%20support`}>Contact support<DashIcon name="arrow" size={15} /></a></div><Link className="db-sidebar-visit" to="/"><DashIcon name="external" size={17} />Visit website</Link></aside>
    <div className="db-main" {...(drawer ? { inert: '' } : {})}><div id="dashboard-content" tabIndex={-1} className="db-content"><Routes><Route index element={<DashboardHome />} /><Route path="courses" element={<MyCourses />} /><Route path="courses/:slug" element={<DashboardCourse />} /><Route path="courses/:slug/lesson/:lessonId" element={<DashboardCourse />} /><Route path="library" element={<FreeBooks />} /><Route path="calls" element={<CallsAndBookings />} /><Route path="explore" element={<ExplorePrograms />} /><Route path="explore/:slug" element={<DashboardCourse />} /><Route path="live-classes" element={<LiveClasses />} /><Route path="bookings" element={<Bookings />} /><Route path="orders" element={<Orders />} /><Route path="certificates" element={<Certificates />} /><Route path="community/*" element={<Community />} /><Route path="wishlist" element={<Wishlist />} /><Route path="settings" element={<Settings />} /><Route path="notifications" element={<Notifications />} /><Route path="search" element={<DashboardSearch />} /><Route path="*" element={<div className="db-panel"><EmptyState title="This page isn’t in your dashboard" action={<Link className="db-button" to="/dashboard">Back to dashboard</Link>}>Use the navigation to find your learning space.</EmptyState></div>} /></Routes></div><footer className="db-footer"><Link to="/dashboard"><img src={site.logo} alt="The Centre for Transformation" /></Link><div><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><a href={`mailto:${site.email}`}>Support</a></div><p>Transform <span>·</span> Learn <span>·</span> Grow <span>·</span> Belong</p></footer></div>
  </div>;
}
