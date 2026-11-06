import { wisdomCall as c } from '../data/wisdomCall';
import WisdomCountdown from '../components/WisdomCountdown';
import { NextCallNotice, WisdomCallCta as BookButton } from '../components/ScheduleCta';
import FaqAccordion from '../components/FaqAccordion';
import { Icon } from '../components/icons';
import { usePageMeta } from '../lib/seo';
import { useNextWisdomCall } from '../lib/schedule';

export default function WisdomCall() {
  const { next } = useNextWisdomCall();
  usePageMeta({
    title: 'Wednesday Wisdom Call, CFT by Zalah',
    description:
      'Join the free Wednesday Wisdom Call: a live weekly session at 7:00 PM Mountain Time with Zalah. Insights, guided reflection, interactive Q&A and practical tools, open to everyone, live on Zoom.',
    path: '/wisdom-call',
  });

  return (
    <>
      {/* 1 — editorial introduction */}
      <section className="cq-band cq-plum wp-hero">
        <div className="container wp-hero-grid">
          <div className="wp-hero-copy">
            <span className="cq-eyebrow">
              {c.intro.eyebrow}
            </span>
            <h1 className="cq-title">{c.intro.title}</h1>
            <p className="cq-lead">{c.intro.copy}</p>
            <div className="wp-hero-cta">
              <BookButton next={next}>Book Your Free Spot</BookButton>
              <a href="#wp-details" className="btn btn-ghost">
                {c.intro.explore}
              </a>
            </div>
            <p className="wp-hero-fine">{c.intro.reassurance.join(' · ')}</p>
            <NextCallNotice next={next} />
          </div>
          <figure className="wp-hero-art">
            <img
              src={c.image}
              alt="A woman seated in meditation at home, eyes closed and at ease"
              width="1331"
              height="749"
              fetchpriority="high"
            />
          </figure>
        </div>
      </section>

      {/* 2 — call details */}
      <section className="cq-band cq-ivory" id="wp-details">
        <div className="container">
          <h2 className="cq-h2 wp-center">{c.details.title}</h2>
          <div className="wp-details">
            {c.details.rows.map((row) => (
              <div className="wp-detail" key={row.label}>
                <span className="wp-detail-ico" aria-hidden="true">
                  <span className="gdot" />
                </span>
                <em>{row.label}</em>
                <b>{row.value}</b>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3 — countdown */}
      <section className="cq-band cq-white wp-count-band">
        <div className="container">
          <h2 className="cq-h2 wp-center">{c.count.title}</h2>
          <p className="cq-lead wp-center wp-sub">{c.count.sub}</p>
          <WisdomCountdown variant="card" heading={null} />
          <p className="wp-count-note">{c.count.note}</p>
        </div>
      </section>

      {/* 4 — why join */}
      <section className="cq-band cq-lav">
        <div className="container">
          <h2 className="cq-h2 wp-center">{c.why.title}</h2>
          <p className="cq-lead wp-center wp-sub">{c.why.sub}</p>
          <div className="wp-why-grid">
            {c.why.items.map((item) => (
              <article className="wp-why-card" key={item.title}>
                <span className="wp-why-ico" aria-hidden="true">
                  <span className="gdot" />
                </span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 5 — what to expect */}
      <section className="cq-band cq-plum">
        <div className="container wp-narrow">
          <h2 className="cq-h2 wp-center">
            <span>{c.experience.title}</span>
          </h2>
          <p className="cq-lead wp-center wp-sub">{c.experience.lead}</p>
          <ol className="wp-expect">
            {c.experience.items.map((item, i) => (
              <li className="wp-expect-row" key={item.title}>
                <span className="wp-expect-num" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 6 — audience */}
      <section className="cq-band cq-ivory">
        <div className="container wp-aud-grid">
          <div>
            <h2 className="cq-h2">{c.audience.title}</h2>
            <p className="cq-lead wp-sub-left">{c.audience.copy}</p>
            <ul className="wp-checks">
              {c.audience.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
          <div className="wp-aud-card">
            <h3>{c.audience.cardTitle}</h3>
            <ul>
              {c.audience.card.map((row) => (
                <li key={row.text}>
                  <span aria-hidden="true">
                    <Icon name={row.icon} size={18} />
                  </span>
                  {row.text}
                </li>
              ))}
            </ul>
            <BookButton next={next} />
          </div>
        </div>
      </section>

      {/* 7 — how to book */}
      <section className="cq-band cq-white">
        <div className="container">
          <h2 className="cq-h2 wp-center">{c.booking.title}</h2>
          <p className="cq-lead wp-center wp-sub">{c.booking.sub}</p>
          <ol className="wp-steps">
            {c.booking.steps.map((s, i) => (
              <li className="wp-step" key={s.title}>
                <span className="wp-step-num" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
          <div className="wp-book-cta">
            <BookButton next={next}>{c.booking.cta}</BookButton>
          </div>
        </div>
      </section>

      {/* 8 — FAQ */}
      <section className="cq-band cq-lav">
        <div className="container wp-narrow">
          <h2 className="cq-h2 wp-center">Questions About the Wisdom Call?</h2>
          <div className="wp-faq">
            {c.faqs.map((f, i) => (
              <FaqAccordion key={f.q} id={`wp-faq-${i}`} question={f.q} answer={f.a} icon={f.icon} defaultOpen={i === 0} />
            ))}
          </div>
        </div>
      </section>

      {/* 9 — closing conversion */}
      <section className="cq-band cq-plum wp-close">
        <div className="container wp-narrow wp-center">
          <span className="cq-eyebrow wp-center-eyebrow">
            {c.closing.eyebrow}
          </span>
          <h2 className="cq-h2">
            <span>{c.closing.title}</span>
          </h2>
          <p className="cq-lead">{c.closing.copy}</p>
          <div className="wp-close-cta">
            <BookButton next={next} />
          </div>
          <p className="wp-close-fine">{c.closing.reassurance}</p>
        </div>
      </section>
    </>
  );
}
