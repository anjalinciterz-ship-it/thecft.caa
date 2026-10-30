import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="aurora-bg" style={{ padding: '120px 0' }}>
      <div className="stars" />
      <div className="container text-center">
        <span className="eyebrow" style={{ justifyContent: 'center' }}>
          Page Not Found
        </span>
        <h1 style={{ color: 'var(--text-on-dark)' }}>
          This path leads <span style={{ color: 'var(--gold-300)' }}>somewhere new</span>
        </h1>
        <p style={{ color: 'var(--cream-dim)', maxWidth: 480, margin: '0 auto 24px' }}>
          The page you were looking for isn’t here. Let’s get you back to the journey.
        </p>
        <div className="hero-cta" style={{ justifyContent: 'center' }}>
          <Link to="/" className="btn btn-gold">
            Back to Home
          </Link>
          <Link to="/courses" className="btn btn-ghost">
            Browse Courses
          </Link>
        </div>
      </div>
    </section>
  );
}
