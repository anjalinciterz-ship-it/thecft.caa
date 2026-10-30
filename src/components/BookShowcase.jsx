import { useState } from 'react';
import { Link } from 'react-router-dom';
import { books } from '../data/books';
import { SectionHead } from './ui';
import { Icon } from './icons';

const trackCount = (book) =>
  book.audio ? book.audio.groups.reduce((n, g) => n + g.tracks.length, 0) : 0;

/* Center-stage carousel: the active book sits centre, its neighbours peek in
   from either edge and the row slides when a tab (or a peeking card) is picked. */
export default function BookShowcase() {
  const [active, setActive] = useState(0);

  return (
    <section className="bs-band">
      <div className="container">
        <SectionHead
          eyebrow="Books By Zalah"
          title="Insights for a More"
          accent="Conscious Life"
          sub="Practical wisdom drawn from over two decades of teaching: books to support your journey toward clarity, peace and purpose."
        />
      </div>

      <div className="bs-tabs" role="tablist" aria-label="Books by Zalah">
        {books.map((b, i) => (
          <button
            key={b.slug}
            type="button"
            role="tab"
            aria-selected={i === active}
            className={i === active ? 'bs-tab active' : 'bs-tab'}
            onClick={() => setActive(i)}
          >
            {b.title}
          </button>
        ))}
      </div>

      <div className="bs-stage">
        {books.map((b, i) => {
          const off = (i - active + books.length) % books.length;
          const pos = off === 0 ? 0 : off === 1 ? 1 : -1;
          const center = pos === 0;
          const tracks = trackCount(b);
          return (
            <article
              key={b.slug}
              className={center ? 'bs-card is-center' : 'bs-card'}
              style={{ '--pos': pos }}
              aria-hidden={!center}
              onClick={center ? undefined : () => setActive(i)}
            >
              <div className="bs-copy">
                <span className="bs-num">{b.num}</span>
                <h3>{b.title}</h3>
                <p className="bs-sub">{b.subtitle}</p>
                <p className="bs-blurb">{b.blurb}</p>
                {tracks ? <span className="bs-tracks">{tracks} audio tracks</span> : null}
                <Link to={`/books/${b.slug}`} className="bs-cta" tabIndex={center ? 0 : -1}>
                  Explore The Book
                  <span className="bs-cta-ico">
                    <Icon name="arrow" size={14} />
                  </span>
                </Link>
              </div>
              <div className="bs-art">
                <img
                  src={b.cover.front}
                  srcSet={`${b.cover.frontSmall} 560w, ${b.cover.front} 1024w`}
                  sizes="(max-width: 860px) 60vw, 42vw"
                  alt={`${b.title} front cover`}
                  loading="lazy"
                />
              </div>
            </article>
          );
        })}
      </div>

      <div className="bs-nav">
        <button
          type="button"
          className="bs-arrow"
          aria-label="Previous book"
          onClick={() => setActive((a) => (a - 1 + books.length) % books.length)}
        >
          <Icon name="chevron" size={18} className="rot-l" />
        </button>
        <div className="slider-dots bs-dots">
          {books.map((b, i) => (
            <button
              key={b.slug}
              type="button"
              className={`slider-dot${i === active ? ' is-active' : ''}`}
              aria-label={`Show ${b.title}`}
              aria-current={i === active}
              onClick={() => setActive(i)}
            />
          ))}
        </div>
        <button
          type="button"
          className="bs-arrow"
          aria-label="Next book"
          onClick={() => setActive((a) => (a + 1) % books.length)}
        >
          <Icon name="chevron" size={18} className="rot-r" />
        </button>
      </div>

      <div className="container text-center mt-32">
        <Link to="/books" className="btn btn-ghost">
          Visit The Books →
        </Link>
      </div>
    </section>
  );
}
