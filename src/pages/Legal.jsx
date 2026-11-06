import { Link } from 'react-router-dom';
import { legalDocuments, DRAFT_NOTE, OPEN_ITEMS } from '../data/legal';
import { site } from '../data/site';
import { Icon } from '../components/icons';

function Eyebrow({ children }) {
  return (
    <span className="cq-eyebrow">
      {children}
    </span>
  );
}

export default function Legal({ doc }) {
  const d = legalDocuments[doc];

  return (
    <>
      <section className="cq-band cq-lav cq-hero">
        <div className="container">
          <nav className="cq-crumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span>{d.crumb}</span>
          </nav>
          <Eyebrow>{d.eyebrow}</Eyebrow>
          <h1 className="cq-title">{d.title}</h1>
          <p className="cq-lead">{d.sub}</p>
        </div>
      </section>

      <section className="cq-band cq-white">
        <div className="container">
          <div className="lg-draft" role="status">
            <p className="lg-draft-tag">Draft · Not legal advice</p>
            <p>{DRAFT_NOTE}</p>
            <p className="lg-updated">{d.updated}</p>
          </div>
        </div>
      </section>

      <section className="cq-band cq-ivory">
        <div className="container">
          <div className="lg-doc">
            {d.sections.map((s) => (
              <section key={s.h} className="lg-section">
                <h2>{s.h}</h2>
                {s.p && s.p.map((t) => <p key={t}>{t}</p>)}
                {s.list && (
                  <ul>
                    {s.list.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                )}
                {s.p2 && s.p2.map((t) => <p key={t}>{t}</p>)}
              </section>
            ))}
          </div>
        </div>
      </section>

      <section className="cq-band cq-white">
        <div className="container">
          <div className="lg-todo">
            <h3>Before this goes live</h3>
            <p>Every item below is a decision or a fact we still need from you.</p>
            <ul>
              {OPEN_ITEMS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="cq-band cq-plum">
        <div className="container cq-col">
          <Eyebrow>Questions</Eyebrow>
          <h2 className="cq-h2">Something Here Needs Clarifying?</h2>
          <p className="cq-lead">
            Write to us and we will answer in plain language. Both documents are drafts until they are formally
            adopted.
          </p>
          <div className="lg-cross">
            <Link to={doc === 'privacy' ? '/terms' : '/privacy'} className="btn btn-ghost">
              {doc === 'privacy' ? 'Read the Terms of Service' : 'Read the Privacy Policy'}
            </Link>
            <a href={`mailto:${site.email}`} className="btn btn-gold">
              Email us about this <Icon name="arrow" size={16} />
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
