import { Link } from 'react-router-dom';
import { books, meditation } from '../data/books';
import { VideoSlot } from '../components/ProtectedMedia';
import BookCard from '../components/BookCard';
import { BookCallCta } from '../components/ScheduleCta';
import { Icon } from '../components/icons';
import { site } from '../data/site';

export default function Books() {
  return (
    <>
      <section className="cq-band cq-lav cq-hero">
        <div className="container">
          <nav className="cq-crumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span>Books</span>
          </nav>
          <span className="cq-eyebrow">
            The Writings of Author: Zalah
          </span>
          <h1 className="cq-title">
            Books for <span>Transformation</span>
          </h1>
          <p className="cq-lead">
            Explore the books by Zalah, created to inspire reflection, deepen understanding, and support your journey
            toward greater clarity, peace, purpose, and transformation.
          </p>
        </div>
      </section>

      <section className="cq-band cq-white">
        <div className="container">
          <div className="cq-grid">
            {books.map((b) => (
              <BookCard key={b.slug} book={b} />
            ))}
          </div>
        </div>
      </section>

      <section className="cq-band cq-ivory kids-meditation" aria-labelledby="km-title">
        <div className="container">
          <div className="km-head">
            <span className="cq-eyebrow">{meditation.kind}</span>
            <h2 className="cq-h2" id="km-title">{meditation.title}</h2>
            <p className="cq-lead">{meditation.intro}</p>
          </div>

          <ol className="km-parts">
            {meditation.parts.map((part) => (
              <li key={part.num} className="km-part">
                <div className="km-part-head">
                  <span className="km-num" aria-hidden="true">{part.num}</span>
                  {part.tag ? <span className="km-tag">{part.tag}</span> : null}
                </div>
                <h3 className="km-part-title">{part.heading}</h3>
                <p className="km-part-body">{part.body}</p>
                <VideoSlot src={part.src} poster={part.poster} />
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="cq-band cq-lav">
        <div className="container">
          <div className="cq-panel author-card">
            <img src={site.portrait} alt="Zalah, author and facilitator" />
            <div>
              <span className="cq-eyebrow">About the Author</span>
              <h2 className="cq-h2">Written From Two Decades on the Path</h2>
              <p className="cq-body">
                Each book distills teachings from Zalah’s live classes and one-on-one work with students: practical
                philosophy meant to be lived, not just read. As Zalah puts it, “I provide you with philosophy. It is not
                your truth until you have lived it.”
              </p>
              <div className="cq-show-cta">
                <Link to="/connect" className="btn btn-gold">
                  Ask About the Books →
                </Link>
                <BookCallCta className="btn btn-ghost">Book a Call</BookCallCta>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cq-band cq-plum">
        <div className="container cq-col">
          <span className="cq-eyebrow">
            Keep Exploring
          </span>
          <h2 className="cq-h2">Continue Your Journey of Transformation</h2>
          <p className="cq-lead">
            Explore meaningful teachings, personal growth, and resources from The Centre for Transformation.
          </p>
          <div className="cq-hero-cta">
            <Link to="/courses" className="btn btn-gold">
              Explore Our Courses <Icon name="arrow" size={16} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
