import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { site } from '../data/site';
import { useCatalog } from '../lib/catalog';
import { books } from '../data/books';
import { blogCategories } from '../data/blog';
import { faqGroups, faqs } from '../data/faqs';
import { testimonials } from '../data/testimonials';
import { initials, useAuth } from '../lib/auth';
import AppearanceToggle from './AppearanceToggle';
import { Icon } from './icons';

/* A preview line has to stay inside one panel row, so quotes are cut at the
   last whole word and the trailing punctuation goes with them. */
const clip = (text, max = 150) =>
  text.length <= max ? text : `${text.slice(0, text.lastIndexOf(' ', max)).replace(/[,.;:—-]\s*$/, '')}…`;

/* One shape for all seven panels: a title, at most one line of context, the
   destinations and one action that opens the page itself. They were full-bleed
   mega menus carrying photographs and course tiles, which hid the page the
   visitor was reading, so the extra fields are gone. */
function MenuPanel({ title, note, noteBy, links, cta, twoUp }) {
  return (
    <div className="mm-compact">
      <p className="mm-title">{title}</p>
      {note ? (
        <p className="mm-note">
          {note}
          {noteBy ? <span className="mm-note-by">{noteBy}</span> : null}
        </p>
      ) : null}
      <div className={`mm-list${twoUp ? ' mm-list-two' : ''}`}>
        {links.map((l) =>
          l.href ? (
            <a key={l.label} href={l.href} target={l.external ? '_blank' : undefined} rel="noreferrer" className="mm-item">
              {l.label}
              <span className="mm-item-arrow" aria-hidden="true">
                →
              </span>
            </a>
          ) : (
            <Link key={l.label} to={l.to} className="mm-item">
              {l.label}
              <span className="mm-item-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          ),
        )}
      </div>
      <Link to={cta.to} className="mm-all">
        {cta.label}
        <Icon name="arrow" size={13} />
      </Link>
    </div>
  );
}

function MenuAbout() {
  return (
    <MenuPanel
      title={site.name}
      note={clip(site.mission, 118)}
      links={[
        { to: '/testimonials', label: 'Testimonials' },
        { to: '/faq', label: 'FAQs' },
        { to: '/connect', label: 'Connect Us' },
      ]}
      cta={{ to: '/about#story', label: 'Read our story' }}
    />
  );
}

function MenuCourses() {
  const { offerings } = useCatalog();
  return (
    <MenuPanel
      twoUp
      title="The teachings"
      links={offerings.filter((c) => c.listed !== false).map((c) => ({ to: `/course/${c.id}`, label: c.name }))}
      cta={{ to: '/courses', label: 'All programs' }}
    />
  );
}

function MenuBooks() {
  return (
    <MenuPanel
      title="The books"
      links={books.map((b) => ({ to: `/books/${b.slug}`, label: b.title }))}
      cta={{ to: '/books', label: 'Browse all books' }}
    />
  );
}

function MenuBlog() {
  return (
    <MenuPanel
      twoUp
      title="The blog"
      links={blogCategories.map((c) => ({ to: c.key === 'all' ? '/blog' : `/blog?cat=${c.key}`, label: c.label }))}
      cta={{ to: '/blog', label: 'Read the latest' }}
    />
  );
}

function MenuTestimonials() {
  const [first] = testimonials;
  return (
    <MenuPanel
      title="What students say"
      note={`\u201C${clip(first.lead, 108)}\u201D`}
      noteBy={first.name}
      links={[
        { to: '/testimonials#t-stories', label: 'Stories from the community' },
        { to: '/connect', label: 'Share your own story' },
      ]}
      cta={{ to: '/testimonials', label: 'Read every story' }}
    />
  );
}

function MenuFaqs() {
  return (
    <MenuPanel
      twoUp
      title="Questions"
      links={faqGroups.map((g) => ({ to: `/faq#fq-${g.key}`, label: g.title }))}
      cta={{ to: '/faq', label: `All ${faqs.length} questions` }}
    />
  );
}

function MenuConnect() {
  return (
    <MenuPanel
      title="Talk with us"
      links={[
        { to: '/connect#cn-form', label: 'Send us a message' },
        { to: '/connect#cn-wisdom', label: 'Join the Wednesday Wisdom Class' },
        { href: site.calendly, external: true, label: 'Book a call' },
        { href: `mailto:${site.email}`, label: site.email },
        { href: `tel:${site.phone.replace(/[^\d+]/g, '')}`, label: site.phone },
      ]}
      cta={{ to: '/connect', label: 'See all ways to connect' }}
    />
  );
}

const MENUS = {
  '/about': 'about',
  '/courses': 'courses',
  '/books': 'books',
  '/blog': 'blog',
  '/testimonials': 'testimonials',
  '/faq': 'faq',
  '/connect': 'connect',
};
const MENU_CONTENT = {
  about: <MenuAbout />,
  courses: <MenuCourses />,
  books: <MenuBooks />,
  blog: <MenuBlog />,
  testimonials: <MenuTestimonials />,
  faq: <MenuFaqs />,
  connect: <MenuConnect />,
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
          <img className="brand-crest" src={site.crest} alt="" aria-hidden="true" width="720" height="720" />
          <img className="brand-logo" src={site.logo} alt={site.name} width="320" height="110" />
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
          <AppearanceToggle />
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
          {MENU_CONTENT[menu]}
        </div>
      )}
    </header>
  );
}
