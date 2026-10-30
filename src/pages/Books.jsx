import { Link } from 'react-router-dom';
import { books, meditation } from '../data/books';
import { AudioPlaylist, ProtectedVideo } from '../components/ProtectedMedia';
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
            <i className="rule" aria-hidden="true" />
            The Writings of Author: Zalah
            <i className="rule" aria-hidden="true" />
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

      <section className="cq-band cq-ivory">
        <div className="container">
          <div className="cq-prose">
            <span className="cq-eyebrow">
              <i className="rule" aria-hidden="true" />
              {meditation.kind}
              <i className="rule" aria-hidden="true" />
            </span>
            <h2 className="cq-h2">{meditation.title}</h2>
          </div>
          <div className="meditation-grid">
            <ProtectedVideo title={`${meditation.title} Video`} video={meditation.video} />
            <AudioPlaylist audio={meditation.audio} />
          </div>
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
            <i className="rule" aria-hidden="true" />
            Keep Exploring
            <i className="rule" aria-hidden="true" />
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
