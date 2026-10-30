import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getJourney, relatedJourneys } from '../data/journeys';
import { Icon } from '../components/icons';
import JourneyCard from '../components/JourneyCard';
import NotFound from './NotFound';

function Eyebrow({ children }) {
  return (
    <span className="cq-eyebrow">
      <i className="rule" aria-hidden="true" />
      {children}
      <i className="rule" aria-hidden="true" />
    </span>
  );
}

function JourneyHero({ journey }) {
  const h = journey.hero;
  return (
    <section className="cq-band cq-lav cq-post-hero">
      <div className="container">
        <nav className="cq-crumb cq-crumb-left" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span aria-hidden="true">/</span>
          <span>{journey.title}</span>
        </nav>
        <div className="cq-post-grid">
          <div className="cq-post-copy">
            <div className="cq-chips">
              <span className="cq-chip cq-chip-gold">{journey.num}</span>
              <span className="cq-chip">{journey.theme}</span>
            </div>
            <Eyebrow>{h.eyebrow}</Eyebrow>
            <h1 className="cq-post-title">
              {h.heading}
              <span> {h.headingAccent}</span>
            </h1>
            <div className="journey-hero-lead">
              {h.lead.map((p) => (
                <p key={p} className="cq-post-dek">
                  {p}
                </p>
              ))}
            </div>
            <div className="cq-show-cta">
              <Link to={h.primary.to} className="btn btn-gold">
                {h.primary.label} <Icon name="arrow" />
              </Link>
              <a href={h.secondary.to} className="btn btn-ghost">
                {h.secondary.label}
              </a>
            </div>
          </div>
          <div className="cq-post-art">
            <img
              className="cq-art"
              src={journey.image}
              srcSet={`${journey.imageSmall} 760w, ${journey.image} 1400w`}
              sizes="(max-width: 980px) 100vw, 48vw"
              alt={journey.title}
              style={{ objectPosition: journey.focus }}
              fetchpriority="high"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Prose({ s, tone }) {
  const copy = (
    <>
      <Eyebrow>{s.label}</Eyebrow>
      <h2 className="cq-h2">{s.heading}</h2>
      {s.body.map((p) => (
        <p key={p} className="cq-body">
          {p}
        </p>
      ))}
    </>
  );
  const aside = (s.points || s.example || s.closing) && (
    <aside>
      {s.points && (
        <div className="journey-points">
          <h3>{s.pointsTitle}</h3>
          {s.points.map((p) => (
            <div key={p.term}>
              <strong>{p.term}</strong>
              <span>{p.def}</span>
            </div>
          ))}
        </div>
      )}
      {s.example && (
        <div className="journey-example">
          <h3>{s.exampleLabel}</h3>
          <p>{s.example}</p>
        </div>
      )}
      {s.closing && <p className="journey-closing">{s.closing}</p>}
    </aside>
  );

  return (
    <section className={`cq-band cq-${tone}`} id={s.id}>
      <div className="container">
        {aside ? (
          <div className="journey-split">
            <div className="journey-split-copy">{copy}</div>
            {aside}
          </div>
        ) : (
          <div className="cq-prose">{copy}</div>
        )}
      </div>
    </section>
  );
}

function Benefits({ s, tone }) {
  return (
    <section className={`cq-band cq-${tone}`}>
      <div className="container">
        <div className="cq-prose">
          <Eyebrow>{s.label}</Eyebrow>
          <h2 className="cq-h2">{s.heading}</h2>
          {s.intro?.map((p) => (
            <p key={p} className="cq-body">
              {p}
            </p>
          ))}
          <h3 className="cq-prose-h3">{s.listHeading}</h3>
        </div>
        <div className="cq-grid journey-benefits">
          {s.items.map((item, i) => (
            <div key={item.title} className="journey-benefit">
              <span className="n">{String(i + 1).padStart(2, '0')}</span>
              <h4>{item.title}</h4>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
        {s.note && <p className="journey-note">{s.note}</p>}
      </div>
    </section>
  );
}

function Dimensions({ s, tone }) {
  return (
    <section className={`cq-band cq-${tone}`} id="dimensions">
      <div className="container">
        <div className="cq-prose">
          <Eyebrow>{s.label}</Eyebrow>
          <h2 className="cq-h2">{s.heading}</h2>
        </div>
        <div className="journey-dimensions">
          {s.items.map((item, i) => (
            <div key={item.title} className="journey-dimension">
              <span className="num">{String(i + 1).padStart(2, '0')}</span>
              <h3>{item.title}</h3>
              {item.body.map((p) => (
                <p key={p} className="journey-p">
                  {p}
                </p>
              ))}
              <p className="journey-practice">
                <strong>{item.practiceLabel || 'Practice'}</strong>
                {item.practice}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Steps({ s, tone }) {
  return (
    <section className={`cq-band cq-${tone}`} id="steps">
      <div className="container">
        <div className="cq-prose">
          <Eyebrow>{s.label}</Eyebrow>
          <h2 className="cq-h2">{s.heading}</h2>
          {s.intro && <p className="cq-body">{s.intro}</p>}
        </div>
        <ol className="journey-steps">
          {s.items.map((item, i) => (
            <li key={item.title}>
              <span className="step-n">{i + 1}</span>
              <div>
                <h3>{item.title}</h3>
                {item.body.map((p) => (
                  <p key={p} className="journey-p">
                    {p}
                  </p>
                ))}
                {item.question && (
                  <p className="journey-question">
                    <strong>Reflection question:</strong> {item.question}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Practice({ s, tone }) {
  return (
    <section className={`cq-band cq-${tone}`} id="practice">
      <div className="container">
        <div className="cq-prose">
          <Eyebrow>{s.label}</Eyebrow>
          <h2 className="cq-h2">{s.heading}</h2>
          {s.intro && <p className="cq-body">{s.intro}</p>}
        </div>

        {s.chips && (
          <>
            <p className="journey-sub-label">{s.chipsLabel}</p>
            <ul className="journey-chips">
              {s.chips.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </>
        )}

        {s.variant === 'exercise' ? (
          <div className="journey-example">
            <h3>{s.exerciseLabel}</h3>
            <ol className="journey-ordered">
              {s.exercise.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        ) : (
          <div className={s.variant === 'days' ? 'journey-checklist' : 'journey-routine'}>
            {(s.items || s.days.map((text, i) => ({ label: `Day ${i + 1}`, text }))).map((item, i) => (
              <div key={i} className="journey-routine-step">
                <span className="label">{item.label}</span>
                {item.title && <h4>{item.title}</h4>}
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        )}

        {s.example && (
          <div className="journey-example-para">
            {s.exampleLabel && <h3>{s.exampleLabel}</h3>}
            <p>{s.example}</p>
          </div>
        )}
        {s.closing && <p className="journey-closing journey-closing-block">{s.closing}</p>}
      </div>
    </section>
  );
}

function Faqs({ s, tone }) {
  const [open, setOpen] = useState(null);
  return (
    <section className={`cq-band cq-${tone}`}>
      <div className="container">
        <div className="cq-prose">
          <Eyebrow>{s.label}</Eyebrow>
          <h2 className="cq-h2">Questions Answered</h2>
        </div>
        <div className="cq-faqs">
          {s.items.map((f) => {
            const isOpen = open === f.q;
            return (
              <div key={f.q} className="journey-faq">
                <button type="button" onClick={() => setOpen(isOpen ? null : f.q)} aria-expanded={isOpen}>
                  {f.q}
                  <span>{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && <p>{f.a}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FinalCta({ s }) {
  return (
    <section className="cq-band cq-plum">
      <div className="container">
        <div className="cq-prose">
          <h2 className="cq-h2">{s.heading}</h2>
          {s.body.map((p) => (
            <p key={p} className="cq-body">
              {p}
            </p>
          ))}
          <div className="cq-hero-cta">
            <Link to={s.button.to} className="btn btn-gold">
              {s.button.label} <Icon name="arrow" />
            </Link>
            <Link to={s.link.to} className="btn btn-ghost">
              {s.link.label} →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

const renderers = {
  prose: Prose,
  benefits: Benefits,
  dimensions: Dimensions,
  steps: Steps,
  practice: Practice,
  faq: Faqs,
  cta: FinalCta,
};

function Related({ journey }) {
  return (
    <section className="cq-band cq-ivory">
      <div className="container">
        <div className="cq-prose">
          <Eyebrow>Continue Your Journey</Eyebrow>
          <h2 className="cq-h2">Where would you like to go next?</h2>
        </div>
        <div className="cq-grid">
          {relatedJourneys(journey.slug).map((j) => (
            <JourneyCard key={j.slug} journey={j} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Journey() {
  const { slug } = useParams();
  const journey = getJourney(slug);
  if (!journey) return <NotFound />;

  /* Content bands alternate ivory and white the way the Courses pages do; the
     closing call to action always lands on plum. */
  let toneIndex = 0;
  const nextTone = () => (toneIndex++ % 2 === 0 ? 'ivory' : 'white');

  return (
    <>
      <JourneyHero journey={journey} />
      {journey.sections.map((s, i) => {
        const Renderer = renderers[s.type];
        if (!Renderer) return null;
        const tone = s.type === 'cta' ? 'plum' : nextTone();
        return <Renderer key={i} s={s} tone={tone} />;
      })}
      <Related journey={journey} />
      <section className="cq-band cq-plum">
        <div className="container cq-col">
          <Eyebrow>Begin</Eyebrow>
          <h2 className="cq-h2">Your Journey Towards Transformation Begins Here.</h2>
          <p className="cq-lead">
            Explore timeless wisdom, practical self-growth exercises, and guided learning experiences designed to help
            you understand yourself and live more intentionally.
          </p>
          <div className="cq-hero-cta">
            <Link to="/courses" className="btn btn-gold">
              Explore All Courses <Icon name="arrow" />
            </Link>
            <Link to="/connect#cn-wisdom" className="btn btn-ghost">
              Join Wednesday Wisdom Class
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
