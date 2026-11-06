import { Link } from 'react-router-dom';
import { Icon } from './icons';
import { site } from '../data/site';

export function AuthShell({ image, eyebrow, titleLead, titleAccent, lead, features, children }) {
  return (
    <section className="au">
      <div className="au-arcs" aria-hidden="true" />
      <div className="au-grid">
        <div className="au-hero">
          <img className="au-hero-img" src={image} alt="" aria-hidden="true" />
          <Link to="/" className="au-brand" aria-label={`${site.name} home`}>
            <img src={site.logo} alt={site.name} />
          </Link>
          <div className="au-hero-copy">
            <p className="au-eyebrow">
              {eyebrow}
            </p>
            <h1 className="au-title">
              {titleLead}
              <span>{titleAccent}</span>
            </h1>
            <p className="au-lead">{lead}</p>
          </div>
          {features ? (
            <ul className="au-feats">
              {features.map((f) => (
                <li key={f.label}>
                  <span className="au-feat-ic">
                    <Icon name={f.icon} size={24} />
                  </span>
                  <b>{f.label}</b>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="au-card">{children}</div>
      </div>
    </section>
  );
}

export function AuthCardHead({ eyebrow, title, sub }) {
  return (
    <>
      <div className="au-card-head">
        <span className="au-badge">
          <span className="gdot" />
        </span>
      </div>
      {eyebrow ? <p className="au-card-eyebrow">{eyebrow}</p> : null}
      <h2 className="au-card-title">{title}</h2>
      <p className="au-card-sub">{sub}</p>
    </>
  );
}

export function AuthField({ id, label, icon, children }) {
  return (
    <div className="au-field">
      <label htmlFor={id}>{label}</label>
      <div className="au-input">
        <Icon name={icon} size={17} />
        {children}
      </div>
    </div>
  );
}

export function AuthOr() {
  return (
    <div className="au-or" aria-hidden="true">
      <i />
      or
      <i />
    </div>
  );
}
