import { Link } from 'react-router-dom';
import { categoryLabel, postMeta } from '../data/blog';
import { useBlog } from '../lib/blog';
import { Icon } from './icons';

/* Editorial library card. The title is the single link (stretched over the
   card via ::after), so the whole card is clickable without nested controls. */
export default function PostCard({ p, level = 2 }) {
  const { hasBody } = useBlog();
  const meta = postMeta(p);
  const internal = hasBody(p);
  const Heading = `h${level}`;
  const linkProps = internal
    ? { to: `/blog/${p.slug}` }
    : { href: p.sourceUrl, target: '_blank', rel: 'noreferrer' };
  const Comp = internal ? Link : 'a';

  return (
    <article className="bl-card">
      <div className="bl-media">
        {meta.cover ? (
          <img src={meta.cover} alt={p.coverAlt || p.title} loading="lazy" />
        ) : (
          <span className="bl-media-ph" aria-hidden="true">
            <Icon name="lotus" size={30} />
          </span>
        )}
      </div>
      <div className="bl-card-body">
        <span className="bl-cat">{categoryLabel(p.category)}</span>
        <Heading className="bl-card-head">
          <Comp className="bl-card-title" {...linkProps}>
            {p.title}
          </Comp>
          <span className="bl-tarrow" aria-hidden="true">
            →
          </span>
        </Heading>
        {meta.blurb && <p className="bl-dek">{meta.blurb}</p>}
        <span className="bl-foot">
          <span className="bl-read" aria-hidden="true">
            {internal ? 'Read Article' : 'Read on thecft.ca'}
            <Icon name="arrow" size={14} />
          </span>
          {meta.series && <span className="bl-series">{meta.series}</span>}
        </span>
      </div>
    </article>
  );
}
