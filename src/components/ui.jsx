import { Link } from 'react-router-dom';

export function SectionDivider() {
  return (
    <div className="section-divider" aria-hidden="true">
      <span className="diamond" />
    </div>
  );
}

export function Eyebrow({ children }) {
  return <span className="eyebrow">{children}</span>;
}

export function SectionHead({ eyebrow, title, accent, sub }) {
  return (
    <div className="section-head">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2>
        {title}
        {accent ? <span> {accent}</span> : null}
      </h2>
      {sub && <p>{sub}</p>}
    </div>
  );
}

export function PageBanner({ crumb, eyebrow, title, accent, sub }) {
  return (
    <section className="page-banner aurora-bg">
      <div className="stars" />
      <div className="container">
        <div className="breadcrumb">
          <Link to="/">Home</Link>
          {crumb ? ` / ${crumb}` : ''}
        </div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1>
          {title}
          {accent ? <span style={{ color: 'var(--gold-300)' }}> {accent}</span> : null}
        </h1>
        {sub && <p>{sub}</p>}
      </div>
    </section>
  );
}

export function Chip({ children }) {
  return <span className="chip">{children}</span>;
}

export function Thumb({ grad, label, badge, style }) {
  return (
    <div className={style} style={{ '--thumb-grad': grad }}>
      {badge && <span className="course-badge">{badge}</span>}
      <span>{label}</span>
    </div>
  );
}

export function BookCover({ item }) {
  return (
    <div className="book-cover" style={{ '--thumb-grad': item.grad }}>
      {item.image ? (
        <img className="book-cover-img" src={item.image} alt={item.title} loading="lazy" />
      ) : (
        <span>{item.title}</span>
      )}
    </div>
  );
}
