import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { site } from '../data/site';
import { useCatalog } from '../lib/catalog';
import { books } from '../data/books';
import { blogCategories, postMeta } from '../data/blog';
import { faqGroups, faqs } from '../data/faqs';
import { testimonials } from '../data/testimonials';
import { useBlog } from '../lib/blog';
import { initials, useAuth } from '../lib/auth';
import AppearanceToggle from './AppearanceToggle';
import { Icon } from './icons';

/* A preview line has to stay inside one panel row, so quotes are cut at the
   last whole word and the trailing punctuation goes with them. */
const clip = (text, max = 150) =>
  text.length <= max ? text : `${text.slice(0, text.lastIndexOf(' ', max)).replace(/[,.;:—-]\s*$/, '')}…`;

function MenuAbout() {
  return (
    <div className="mm-grid mm-about">
      <div className="mm-statement">
        <h3>
          {site.tagline.split(' · ').map((line) => (
            <span key={line}>
              {line}.
              <br />
            </span>
          ))}
        </h3>
        <p>{site.mission}</p>
        <p className="mm-dim">{site.facilitator.paras[0]}</p>
        <div className="mm-rule" />
        <div className="mm-sublinks">
          {[
            { to: '/testimonials', label: 'Testimonials' },
            { to: '/faq', label: 'FAQs' },
            { to: '/connect', label: 'Connect Us' },
          ].map((l) => (
            <Link key={l.to} to={l.to} className="mm-item mm-item-sm">
              {l.label}
              <span className="mm-item-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          ))}
        </div>
      </div>
      <div className="mm-photo">
        <img src={site.portrait} alt="Zalah, facilitator at The Centre for Transformation" loading="lazy" />
      </div>
    </div>
  );
}

function MenuCourses() {
  const { offerings } = useCatalog();
  return (
    <div className="mm-courses">
      <div className="mm-tiles">
        {offerings.filter((c) => c.listed !== false).map((c) => (
          <Link key={c.id} to={`/course/${c.id}`} className="mm-tile">
            <span className="mm-tile-art">
              {c.banner ? <img src={c.banner} alt="" loading="lazy" /> : null}
            </span>
            <span className="mm-tile-body">
              <span className="mm-tile-top">{c.name}</span>
              <span className="mm-cta">
                Explore
                <span className="mm-arrow">
                  <Icon name="arrow" size={12} />
                </span>
              </span>
            </span>
          </Link>
        ))}
      </div>
      <Link to="/connect" className="mm-strip">
        <span>
          <h4>Not sure where to begin?</h4>
          <p>Tell us where you are on your path and we will point you to the right first step.</p>
        </span>
        <span className="mm-cta">Explore</span>
      </Link>
    </div>
  );
}

function MenuBooks() {
  return (
    <div className="mm-grid mm-books">
      <div className="mm-list">
        {books.map((b) => (
          <Link key={b.slug} to={`/books/${b.slug}`} className="mm-item">
            {b.title}
            <span className="mm-item-arrow" aria-hidden="true">
              →
            </span>
          </Link>
        ))}
        <div className="mm-rule" />
        <Link to="/books" className="mm-big">
          Browse all books
        </Link>
      </div>
      <Link to="/wisdom-call" className="mm-promo">
        <h4>Looking for guided practice?</h4>
        <p>Join the free Wednesday Evening Wisdom Class and practise alongside the community.</p>
        <span className="mm-cta">Explore</span>
      </Link>
      <Link to="/signup" className="mm-promo mm-promo-dark">
        <h4>Begin your transformation today</h4>
        <p>Create a free account to track your courses, classes and reading list in one place.</p>
        <span className="mm-cta">Get Started</span>
      </Link>
    </div>
  );
}

function MenuBlog() {
  const { rows } = useBlog();
  const cats = blogCategories.filter((c) => c.key !== 'all');
  const coverFor = (key) => {
    const pool = key === 'all' ? rows : rows.filter((p) => p.category === key);
    for (const p of pool) {
      const cover = postMeta(p).cover;
      if (cover) return cover;
    }
    return null;
  };
  const [prev, setPrev] = useState('all');
  const cover = coverFor(prev);

  return (
    <div className="mm-grid mm-blog">
      <div className="mm-list">
        <Link to="/blog" className="mm-item" onMouseEnter={() => setPrev('all')}>
          All Insights
          <span className="mm-item-arrow" aria-hidden="true">
            →
          </span>
        </Link>
        {cats.map((c) => (
          <Link
            key={c.key}
            to={`/blog?cat=${c.key}`}
            className="mm-item"
            onMouseEnter={() => setPrev(c.key)}
          >
            {c.label}
            <span className="mm-item-arrow" aria-hidden="true">
              →
            </span>
          </Link>
        ))}
        <div className="mm-rule" />
        <Link to="/blog" className="mm-big">
          Read the blog
        </Link>
      </div>
      <div className="mm-photo mm-photo-swap">
        {cover ? (
          <img key={prev} src={cover} alt="" loading="lazy" />
        ) : (
          <span className="mm-photo-ph">
            <Icon name="lotus" size={44} />
          </span>
        )}
      </div>
    </div>
  );
}

function MenuTestimonials() {
  return (
    <div className="mm-quotes">
      <div className="mm-list">
        {testimonials.slice(0, 3).map((t) => (
          <Link key={t.name} to="/testimonials#t-stories" className="mm-quote">
            <p className="mm-quote-text">&ldquo;{clip(t.lead)}&rdquo;</p>
            <span className="mm-quote-name">
              {t.name}
              <span className="mm-item-arrow" aria-hidden="true">
                →
              </span>
            </span>
          </Link>
        ))}
        <div className="mm-rule" />
        <Link to="/testimonials" className="mm-big">
          See all testimonials
        </Link>
      </div>
      <Link to="/testimonials" className="mm-promo mm-promo-dark">
        <h4>Real people. Real transformations.</h4>
        <p>
          Students who have sat with Zalah for five, twenty, twenty-five years writing about what actually changed,
          calm, clarity, and a kinder way of living with themselves.
        </p>
        <span className="mm-cta">
          Read every story
          <span className="mm-arrow">
            <Icon name="arrow" size={12} />
          </span>
        </span>
      </Link>
    </div>
  );
}

function MenuFaqs() {
  return (
    <div className="mm-faq">
      <div className="mm-list">
        {faqGroups.map((g) => (
          <Link key={g.key} to={`/faq#fq-${g.key}`} className="mm-item mm-item-sm">
            {g.title}
            <span className="mm-item-arrow" aria-hidden="true">
              →
            </span>
          </Link>
        ))}
      </div>
      {faqs.slice(0, 1).map((f) => (
        <Link key={f.q} to={`/faq#fq-${f.category}`} className="mm-promo">
          <h4>{f.q}</h4>
          <p>{clip(f.a[0], 190)}</p>
          <span className="mm-cta">
            Explore
            <span className="mm-arrow">
              <Icon name="arrow" size={12} />
            </span>
          </span>
        </Link>
      ))}
      <Link to="/faq" className="mm-promo mm-promo-dark">
        <h4>{faqs.length} questions, seven topics</h4>
        <p>Everything about the teachings, the courses, the free Wednesday class and the practical details.</p>
        <span className="mm-cta">
          See all FAQs
          <span className="mm-arrow">
            <Icon name="arrow" size={12} />
          </span>
        </span>
      </Link>
    </div>
  );
}

function MenuConnect() {
  return (
    <div className="mm-connect">
      <div className="mm-list">
        <Link to="/connect#cn-form" className="mm-item mm-item-sm">
          Send us a message
          <span className="mm-item-arrow" aria-hidden="true">
            →
          </span>
        </Link>
        <Link to="/connect#cn-wisdom" className="mm-item mm-item-sm">
          Join the Wednesday Wisdom Class
          <span className="mm-item-arrow" aria-hidden="true">
            →
          </span>
        </Link>
        <a href={site.calendly} target="_blank" rel="noreferrer" className="mm-item mm-item-sm">
          Book a call
          <span className="mm-item-arrow" aria-hidden="true">
            →
          </span>
        </a>
        <a href={`mailto:${site.email}`} className="mm-item mm-item-sm">
          {site.email}
          <span className="mm-item-arrow" aria-hidden="true">
            →
          </span>
        </a>
        <a href={`tel:${site.phone.replace(/[^\d+]/g, '')}`} className="mm-item mm-item-sm">
          {site.phone}
          <span className="mm-item-arrow" aria-hidden="true">
            →
          </span>
        </a>
        <div className="mm-rule" />
        <Link to="/connect" className="mm-big">
          See all ways to connect
        </Link>
      </div>
      <div className="mm-promo mm-promo-dark">
        <h4>Every meaningful journey begins with a conversation.</h4>
        <p>
          {site.address.line1}
          <br />
          {site.address.line2}
        </p>
        <p>Tell us where you are on your path and we will point you to the right first step.</p>
        <Link to="/connect" className="mm-cta">
          Start a conversation
          <span className="mm-arrow">
            <Icon name="arrow" size={12} />
          </span>
        </Link>
      </div>
    </div>
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

  const openMenu = (key) => {
    clearTimeout(t1.current);
    clearTimeout(t2.current);
    setExiting(false);
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
                onMouseEnter={() => openMenu(key)}
                onFocus={() => openMenu(key)}
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
        <div key={menu} className={`mm-panel${exiting ? ' is-exiting' : ''}`}>
          <div className="mm-inner" onMouseEnter={() => openMenu(menu)}>
            {MENU_CONTENT[menu]}
          </div>
        </div>
      )}
    </header>
  );
}
