import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getBook, bookNeighbours } from '../data/books';
import { AudioPlaylist } from '../components/ProtectedMedia';
import { Icon } from '../components/icons';
import NotFound from './NotFound';

function Cover({ book }) {
  const [side, setSide] = useState('front');
  const src = side === 'front' ? book.cover.front : book.cover.back;
  const small = side === 'front' ? book.cover.frontSmall : book.cover.backSmall;
  return (
    <div className="book-cover-frame">
      <img
        src={small}
        srcSet={`${small} 560w, ${src} 1024w`}
        sizes="(max-width: 900px) 62vw, 340px"
        alt={`${book.title} ${side} cover`}
      />
      <button type="button" className="cover-flip" onClick={() => setSide(side === 'front' ? 'back' : 'front')}>
        {side === 'front' ? 'See the back cover' : 'See the front cover'}
      </button>
    </div>
  );
}

const SECTION_LABEL = { prose: 'About This Book', explore: 'What You Will Find' };

function Section({ block, tone }) {
  return (
    <section className={`cq-band cq-${tone}`}>
      <div className="container">
        <div className="cq-prose">
          <span className="cq-eyebrow">
            {SECTION_LABEL[block.type] || 'From the Book'}
          </span>
          <h2 className="cq-h2">{block.heading}</h2>
          {block.body.map((p) => (
            <p key={p} className="cq-body">
              {p}
            </p>
          ))}
          {block.listHeading ? (
            <>
              <h3 className="cq-prose-h3">{block.listHeading}</h3>
              <ul className="cq-outcomes cq-outcomes-lg">
                {block.items.map((i) => (
                  <li key={i}>
                    <Icon name="lotus" size={16} />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default function BookDetail() {
  const { slug } = useParams();
  const book = getBook(slug);
  if (!book) return <NotFound />;

  const { prev, next } = bookNeighbours(slug);
  const h = book.hero;

  return (
    <>
      <section className="cq-band cq-lav cq-post-hero">
        <div className="container">
          <nav className="cq-crumb cq-crumb-left" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span aria-hidden="true">/</span>
            <Link to="/books">Books</Link>
            <span aria-hidden="true">/</span>
            <span>{book.title}</span>
          </nav>
          <div className="cq-post-grid">
            <div className="cq-post-copy">
              <div className="cq-chips">
                <span className="cq-chip cq-chip-gold">{book.num}</span>
                <span className="cq-chip">By {book.author}</span>
              </div>
              <span className="cq-eyebrow">{h.eyebrow}</span>
              <h1 className="cq-post-title">{h.heading}</h1>
              <p className="book-sub">{h.subheading}</p>
              <p className="cq-post-dek">{h.intro.join(' ')}</p>
              {h.quote ? <blockquote className="book-quote">{h.quote}</blockquote> : null}
              {h.introAfterQuote
                ? h.introAfterQuote.map((p) => (
                    <p key={p} className="cq-body">
                      {p}
                    </p>
                  ))
                : null}
            </div>
            <div className="cq-post-art">
              <Cover book={book} />
            </div>
          </div>
        </div>
      </section>

      {book.sections.map((block, i) => (
        <Section key={block.heading} block={block} tone={i % 2 ? 'ivory' : 'white'} />
      ))}

      {book.audio ? (
        <section className="cq-band cq-lav">
          <div className="container">
            <div className="cq-prose">
              <span className="cq-eyebrow">
                Listen
              </span>
              <h2 className="cq-h2">Listen to the Book</h2>
            </div>
            <div className="cq-audio-wrap">
              <AudioPlaylist audio={book.audio} />
            </div>
          </div>
        </section>
      ) : null}

      <section className="cq-band cq-plum">
        <div className="container">
          <div className="cq-enrol-box">
            <div>
              <span className="cq-eyebrow">Continue Your Journey</span>
              <h2 className="cq-h2">Keep Going</h2>
            </div>
            <div className="book-nav-links">
              <Link to="/books" className="btn btn-ghost">
                ← Back to All Books
              </Link>
              {prev ? (
                <Link to={`/books/${prev.slug}`} className="btn btn-ghost">
                  ← Previous Book: {prev.title}
                </Link>
              ) : null}
              {next ? (
                <Link to={`/books/${next.slug}`} className="btn btn-gold">
                  Next Book: {next.title} →
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
