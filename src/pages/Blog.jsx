import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { blogCategories, categoryLabel, postMeta, searchBodies } from '../data/blog';
import { useBlog } from '../lib/blog';
import { Icon } from '../components/icons';
import PostCard from '../components/PostCard';

/* Editorial pick for the wide lead slot: strong cover photograph and a
   theme that introduces the whole library. Never repeated in the grid below. */
const FEATURED_SLUG = 'the-moments-that-quietly-change-your-life';

/* One lead article plus a six-up grid, so every page reads the same way. */
const PER_PAGE = 7;

function Lead({ p, isPick }) {
  const { hasBody } = useBlog();
  const meta = postMeta(p);
  const internal = hasBody(p);
  const linkProps = internal
    ? { to: `/blog/${p.slug}` }
    : { href: p.sourceUrl, target: '_blank', rel: 'noreferrer' };
  const Comp = internal ? Link : 'a';

  return (
    <article className="bl-feat">
      <div className="bl-feat-media">
        {meta.cover ? <img src={meta.cover} alt={p.title} /> : null}
      </div>
      <div className="bl-feat-body">
        {isPick && <span className="bl-feat-flag">Featured Insight</span>}
        <span className="bl-cat">{categoryLabel(p.category)}</span>
        <h2 className="bl-feat-head">
          <Comp className="bl-feat-title" {...linkProps}>
            {p.title}
          </Comp>
        </h2>
        {meta.blurb && <p className="bl-feat-dek">{meta.blurb}</p>}
        <span className="bl-read" aria-hidden="true">
          {internal ? 'Read Article' : 'Read on thecft.ca'}
          <Icon name="arrow" size={15} />
        </span>
      </div>
    </article>
  );
}

export default function Blog() {
  const { rows, getPost } = useBlog();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlCat = searchParams.get('cat');
  const [cat, setCat] = useState(blogCategories.some((c) => c.key === urlCat) ? urlCat : 'all');
  const [query, setQuery] = useState('');
  const [bodyHits, setBodyHits] = useState(null);
  const listTop = useRef(null);

  useEffect(() => {
    setCat(blogCategories.some((c) => c.key === urlCat) ? urlCat : 'all');
  }, [urlCat]);

  const q = query.trim().toLowerCase();

  // Full-text pass over the markdown bodies, debounced; titles/excerpts match instantly.
  useEffect(() => {
    if (!q) {
      setBodyHits(null);
      return undefined;
    }
    let alive = true;
    const t = setTimeout(() => {
      searchBodies(q).then((slugs) => alive && setBodyHits(new Set(slugs)));
    }, 220);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  const filtered = useMemo(
    () =>
      rows.filter((p) => {
        if (cat !== 'all' && p.category !== cat) return false;
        if (!q) return true;
        const hay = `${p.title} ${p.dek || p.excerpt || ''} ${categoryLabel(p.category)}`.toLowerCase();
        return hay.includes(q) || (bodyHits ? bodyHits.has(p.slug) : false);
      }),
    [rows, cat, q, bodyHits],
  );

  const unfiltered = !q && cat === 'all';
  const pick = unfiltered ? getPost(FEATURED_SLUG) : null;

  // The editorial pick leads page one; every page then shows one big card and six below it.
  const ordered = useMemo(() => (pick ? [pick, ...filtered.filter((p) => p.slug !== pick.slug)] : filtered), [pick, filtered]);

  const pageCount = Math.max(1, Math.ceil(ordered.length / PER_PAGE));
  const page = Math.min(Math.max(1, Number(searchParams.get('page')) || 1), pageCount);
  const slice = ordered.slice((page - 1) * PER_PAGE, (page - 1) * PER_PAGE + PER_PAGE);
  const [head, ...rest] = slice;

  // A narrower list is a different list — never strand the reader on an empty page.
  const clearPage = () =>
    setSearchParams((prev) => {
      if (!prev.has('page')) return prev;
      const next = new URLSearchParams(prev);
      next.delete('page');
      return next;
    }, { replace: true });

  // Real hrefs, so /blog?page=2 is crawlable, shareable and openable in a new tab.
  const pageHref = (n) => {
    const next = new URLSearchParams(searchParams);
    if (n > 1) next.set('page', String(n));
    else next.delete('page');
    const qs = next.toString();
    return `/blog${qs ? `?${qs}` : ''}`;
  };

  // Landing on another page should put the list under the reader's eyes. The app's
  // scroll reset ignores search-only navigation, so the pager owns this jump.
  const mounted = useRef(true);
  useEffect(() => {
    if (mounted.current) {
      mounted.current = false;
      return;
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    listTop.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }, [page]);

  return (
    <>
      <section className="bl-band bl-hero">
        <div className="container">
          <nav className="bl-crumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span>Blog</span>
          </nav>
          <p className="bl-eyebrow">
            <span className="rule" aria-hidden="true" />
            INSIGHTS &amp; WISDOM
            <span className="rule" aria-hidden="true" />
          </p>
          <h1 className="bl-title">
            Ideas for a <span>More Conscious Life</span>
          </h1>
          <p className="bl-lead">
            Explore thoughtful reads on consciousness, inner peace, personal growth, and the journey back to
            yourself.
          </p>
        </div>
      </section>

      <section className="bl-band bl-tools">
        <div className="container">
          <div className="bl-search">
            <Icon name="search" size={18} />
            <label className="sr-only" htmlFor="bl-search">
              Search articles
            </label>
            <input
              id="bl-search"
              type="search"
              placeholder="Search articles, topics, or keywords..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                clearPage();
              }}
            />
            {query && (
              <button
                type="button"
                className="bl-search-clear"
                aria-label="Clear search"
                onClick={() => {
                  setQuery('');
                  clearPage();
                }}
              >
                ×
              </button>
            )}
          </div>
          <div className="bl-cats" role="group" aria-label="Filter articles by topic">
            {blogCategories.map((c) => (
              <button
                key={c.key}
                type="button"
                className={`bl-pill${cat === c.key ? ' active' : ''}`}
                aria-pressed={cat === c.key}
                onClick={() => {
                  setCat(c.key);
                  clearPage();
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
          <p className="bl-count" role="status">
            Showing {slice.length} of {ordered.length} articles
            {pageCount > 1 && (
              <>
                {' · '}
                <b>
                  Page {page} of {pageCount}
                </b>
              </>
            )}
          </p>
        </div>
      </section>
      <section className="bl-band bl-main">
        <div className="container">
          <div ref={listTop} className="bl-anchor" aria-hidden="true" />
          {slice.length ? (
            <>
              <Lead p={head} isPick={page === 1 && !!pick} />
              {rest.length > 0 && (
                <div className="bl-grid">
                  {rest.map((p) => (
                    <PostCard key={p.slug} p={p} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="bl-empty">
              <h2>No articles match your search</h2>
              <p>Try a different word or topic, or clear the filters to see all {rows.length} articles.</p>
              <div className="bl-empty-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setQuery('');
                    setCat('all');
                    clearPage();
                  }}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}

          {pageCount > 1 && (
            <nav className="bl-pager" aria-label="Browse article pages">
              {page > 1 ? (
                <Link className="bl-page-edge" to={pageHref(page - 1)} aria-label="Previous page">
                  <span className="bl-page-flip" aria-hidden="true">
                    <Icon name="arrow" size={15} />
                  </span>
                </Link>
              ) : (
                <span className="bl-page-edge is-off" aria-hidden="true">
                  <span className="bl-page-flip" aria-hidden="true">
                    <Icon name="arrow" size={15} />
                  </span>
                </span>
              )}
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) =>
                n === page ? (
                  <span key={n} className="bl-page is-current" aria-current="page">
                    {n}
                  </span>
                ) : (
                  <Link key={n} className="bl-page" to={pageHref(n)} aria-label={`Page ${n}`}>
                    {n}
                  </Link>
                ),
              )}
              {page < pageCount ? (
                <Link className="bl-page-edge" to={pageHref(page + 1)} aria-label="Next page">
                  <Icon name="arrow" size={15} />
                </Link>
              ) : (
                <span className="bl-page-edge is-off" aria-hidden="true">
                  <Icon name="arrow" size={15} />
                </span>
              )}
            </nav>
          )}
        </div>
      </section>

      <section className="bl-band bl-close">
        <div className="container">
          <div className="bl-close-panel">
            <h2>Want These Insights in Your Week?</h2>
            <p>Join the free Wednesday Evening Wisdom Class, live with Zalah every week.</p>
            <Link to="/connect#cn-wisdom" className="btn btn-gold">
              Join the Wisdom Class
              <Icon name="arrow" size={16} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
