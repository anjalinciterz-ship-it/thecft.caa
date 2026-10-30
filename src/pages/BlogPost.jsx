import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { categoryLabel, postMeta } from '../data/blog';
import { useBlog } from '../lib/blog';
import { Icon } from '../components/icons';
import Markdown from '../components/Markdown';
import { SkeletonArticle } from '../components/Skeleton';
import PostCard from '../components/PostCard';
import NotFound from './NotFound';

export default function BlogPost() {
  const { slug } = useParams();
  const { getPost, hasBody, loadBody, related: relatedFrom, minutesFor, loading } = useBlog();
  const post = getPost(slug);
  // Keyed by slug so moving between posts can never flash the previous one's body.
  const [loaded, setLoaded] = useState({ slug: null, md: '' });

  useEffect(() => {
    if (!post || !hasBody(post)) return undefined;
    let alive = true;
    loadBody(post).then((md) => alive && setLoaded({ slug: post.slug, md }));
    return () => {
      alive = false;
    };
  }, [post]);

  // While the library is still arriving, a slug is not unknown: it is unread.
  if (!post && loading) return <SkeletonArticle />;
  if (!post || !hasBody(post)) return <NotFound />;

  const body = loaded.slug === post.slug ? loaded.md : '';
  const meta = postMeta(post);
  const minutes = minutesFor(post, body);
  const related = relatedFrom(post, 3);

  return (
    <article>
      <section className="bl-band bl-post-hero">
        <div className="container bl-col">
          <nav className="bl-crumb bl-crumb-left" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span aria-hidden="true">/</span>
            <Link to="/blog">Insights &amp; Wisdom</Link>
          </nav>
          <div className="bl-post-chips">
            <span className="bl-cat">{categoryLabel(post.category)}</span>
            {meta.series && (
              <span className="bl-series-chip">
                <Icon name="lotus" size={14} />
                {meta.series}
              </span>
            )}
          </div>
          <h1 className="bl-post-title">{post.title}</h1>
          {meta.blurb && <p className="bl-post-dek">{meta.blurb}</p>}
          <div className="bl-post-facts">
            {minutes ? <span>{minutes} min read</span> : null}
            {meta.date ? <span>{meta.date}</span> : null}
            <span>By {post.authorName || 'Zalah'} &middot; Centre for Transformation</span>
          </div>
        </div>
      </section>

      <section className="bl-band bl-post-band">
        <div className="container narrow">
          {meta.cover && (
            <figure className="bl-post-figure">
              <img src={meta.cover} alt={post.coverAlt || post.title} />
            </figure>
          )}
          <div className="post-article bl-article">{body ? <Markdown source={body} /> : <SkeletonArticle />}</div>
          <Link to="/blog" className="btn btn-ghost bl-back">
            <Icon name="arrow" size={16} style={{ transform: 'rotate(180deg)' }} />
            All Insights &amp; Wisdom
          </Link>
        </div>
      </section>

      {related.length > 0 && (
        <section className="bl-band bl-related">
          <div className="container">
            <h2 className="bl-related-head">Related Insights</h2>
            <div className="bl-grid">
              {related.map((p) => (
                <PostCard key={p.slug} p={p} level={3} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bl-band bl-close">
        <div className="container">
          <div className="bl-close-panel">
            <h2>Ready for the Next Chapter?</h2>
            <p>Reading is only half of it. Come sit with the teaching live, every Wednesday evening.</p>
            <Link to="/courses" className="btn btn-gold">
              Explore the Courses
              <Icon name="arrow" size={16} />
            </Link>
          </div>
        </div>
      </section>
    </article>
  );
}
