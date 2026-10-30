import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { blogCategories, categoryLabel, postMeta, searchBodies } from '../data/blog';
import { useBlog } from '../lib/blog';
import { Icon } from '../components/icons';
import PostCard from '../components/PostCard';

/* Editorial pick for the wide lead slot: strong cover photograph and a
   theme that introduces the whole library. Never repeated in the grid below. */
const FEATURED_SLUG = 'the-moments-that-quietly-change-your-life';

function Featured({ p }) {
  const meta = postMeta(p);
  return (
    <article className="bl-feat">
      <div className="bl-feat-media">
        {meta.cover ? <img src={meta.cover} alt={p.title} /> : null}
      </div>
      <div className="bl-feat-body">
        <span className="bl-feat-flag">Featured Insight</span>
        <span className="bl-cat">{categoryLabel(p.category)}</span>
        <h2 className="bl-feat-head">
          <Link className="bl-feat-title" to={`/blog/${p.slug}`}>
            {p.title}
          </Link>
        </h2>
        {meta.blurb && <p className="bl-feat-dek">{meta.blurb}</p>}
        <span className="bl-read" aria-hidden="true">
          Read Article
          <Icon name="arrow" size={15} />
        </span>
      </div>
    </article>
  );
}

export default function Blog() {
  const { rows, getPost, hasBody } = useBlog();
  const [searchParams] = useSearchParams();
  const urlCat = searchParams.get('cat');
  const [cat, setCat] = useState(blogCategories.some((c) => c.key === urlCat) ? urlCat : 'all');
  const [query, setQuery] = useState('');
  const [bodyHits, setBodyHits] = useState(null);

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
  const featured = unfiltered ? getPost(FEATURED_SLUG) : null;
  const grid = featured && hasBody(featured) ? filtered.filter((p) => p.slug !== featured.slug) : filtered;

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
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button type="button" className="bl-search-clear" aria-label="Clear search" onClick={() => setQuery('')}>
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
                onClick={() => setCat(c.key)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <p className="bl-count" role="status">
            Showing {filtered.length} of {rows.length} articles
          </p>
        </div>
      </section>
      <section className="bl-band bl-main">
        <div className="container">
          {featured && <Featured p={featured} />}
          {grid.length ? (
            <div className="bl-grid">
              {grid.map((p) => (
                <PostCard key={p.slug} p={p} />
              ))}
            </div>
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
                  }}
                >
                  Clear Filters
                </button>
              </div>
            </div>
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
