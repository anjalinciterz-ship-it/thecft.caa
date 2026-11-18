import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { site } from '../data/site';
import { initials, useAuth } from '../lib/auth';
import { Icon } from './icons';

const HeaderMenus = lazy(() => import('./HeaderMenus'));

/* The navbar panels are the heaviest data the landing page carries and only
   ever appear on a hover, so they live in their own chunk. Fetching it in the
   first lull after load means the chunk never competes with the hero and the
   first intentional hover still finds it ready. */
function prefetchAfterLoad() {
  const go = () => import('./HeaderMenus').catch(() => {});
  /* Safari only grew requestIdleCallback in 16.4, and a missing one here would
     throw inside the load handler for no reason. */
  const when = (fn) => (window.requestIdleCallback ? window.requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 1200));
  if (document.readyState === 'complete') when(go);
  else window.addEventListener('load', () => when(go), { once: true });
}

/* Which nav word owns which panel: */
const MENUS = {
  '/about': 'about',
  '/courses': 'courses',
  '/books': 'books',
  '/blog': 'blog',
  '/testimonials': 'testimonials',
  '/faq': 'faq',
  '/connect': 'connect',
};

export default function Header() {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(null);
  const [menuX, setMenuX] = useState(0);
  const [exiting, setExiting] = useState(false);
  const t1 = useRef(null);
  const t2 = useRef(null);
  const { user, isAuthed, logout, loading } = useAuth();
  const [logoutError, setLogoutError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const logoutPending = useRef(false);
  const mounted = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    mounted.current = true;
    prefetchAfterLoad();
    return () => { mounted.current = false; };
  }, []);

  const handleLogout = async () => {
    if (logoutPending.current || loading) return;
    logoutPending.current = true;
    setLoggingOut(true);
    setLogoutError('');
    try {
      await logout();
      if (mounted.current) navigate('/');
    } catch (error) {
      if (mounted.current) setLogoutError(error.message || 'Log out failed. Please try again.');
    } finally {
      logoutPending.current = false;
      if (mounted.current) setLoggingOut(false);
    }
  };

  useEffect(() => {
    setOpen(false);
    setMenu(null);
    setExiting(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMenu(null);
        setExiting(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // The panel hangs under whichever word opened it, so it remembers that word's
  // left edge; CSS clamps the value back inside the viewport.
  const openMenu = (key, trigger) => {
    clearTimeout(t1.current);
    clearTimeout(t2.current);
    setExiting(false);
    if (trigger) setMenuX(Math.round(trigger.getBoundingClientRect().left));
    setMenu(key);
  };

  const closeMenu = () => {
    clearTimeout(t1.current);
    clearTimeout(t2.current);
    t1.current = setTimeout(() => {
      setExiting(true);
      t2.current = setTimeout(() => {
        setExiting(false);
        setMenu(null);
      }, 240);
    }, 120);
  };

  return (
    <header className="site-header" onMouseLeave={closeMenu}>
      <div className="nav-wrap">
        <Link to="/" className="brand" aria-label={`${site.name} home`} onMouseEnter={closeMenu}>
          <img className="brand-crest" src={site.crest} alt="" aria-hidden="true" width="288" height="288" />
          {/* These are the files' own numbers, not the box's. 320x110 reserved a
              wordmark nineteen pixels wider than the one that arrives, so the
              header moved sideways as the image loaded. */}
          <img className="brand-logo" src={site.logo} alt={site.name} width="249" height="98" />
        </Link>

        <nav className={`nav-links${open ? ' open' : ''}`} id="navLinks" aria-label="Primary">
          {site.nav.map((item) => {
            const key = MENUS[item.to];
            return key ? (
              <NavLink
                key={item.to}
                to={item.to}
                className={`mm-trigger${menu === key && !exiting ? ' is-open' : ''}`}
                onMouseEnter={(event) => openMenu(key, event.currentTarget)}
                onFocus={(event) => openMenu(key, event.currentTarget)}
              >
                {item.label}
              </NavLink>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onMouseEnter={closeMenu}
                onFocus={closeMenu}
              >
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="nav-actions">
          {isAuthed ? (
            <>
              <Link to="/dashboard" className="user-pill">
                <span className="av">{initials(user.name)}</span> Dashboard
              </Link>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleLogout}
                disabled={loggingOut || loading}
              >
                {loggingOut ? 'Logging Out…' : 'Log Out'}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm btn-ghost-desktop">
                Login
              </Link>
              <Link to="/signup" className="btn btn-gold btn-sm">
                Get Started
              </Link>
            </>
          )}
          <button
            type="button"
            className="nav-toggle"
            aria-expanded={open}
            aria-controls="navLinks"
            aria-label="Toggle navigation"
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name="menu" size={20} />
          </button>
        </div>
      </div>

      {logoutError ? <p className="au-err header-auth-error" role="alert">{logoutError}</p> : null}

      {menu && (
        <div
          key={menu}
          className={`mm-panel${exiting ? ' is-exiting' : ''}`}
          style={{ '--mm-x': `${menuX}px` }}
          onMouseEnter={() => openMenu(menu)}
        >
          <Suspense fallback={null}>
            <HeaderMenus menu={menu} />
          </Suspense>
        </div>
      )}
    </header>
  );
}
