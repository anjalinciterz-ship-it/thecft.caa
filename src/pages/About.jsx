import { Link } from 'react-router-dom';
import { site } from '../data/site';
import { testimonials } from '../data/testimonials';
import { Icon } from '../components/icons';
import TestimonialCard from '../components/TestimonialCard';
import { usePageMeta } from '../lib/seo';

const VOICE_PICKS = ['Jay', 'Barry', 'Chris'];

export default function About() {
  usePageMeta({
    title: 'About Us — CFT by Zalah',
    description:
      'Meet Zalah, founder of The Centre for Transformation: our mission, vision and values, our story and philosophy, his teaching approach, milestones and TEDx talk, and real student transformations.',
    path: '/about',
  });
  const f = site.facilitator;
  const mvv = site.purpose.slice(0, 3);
  const voices = VOICE_PICKS.map((n) => testimonials.find((t) => t.name === n)).filter(Boolean);

  return (
    <>
      {/* 1 — founder-led hero */}
      <section className="cq-band cq-lav ab-hero">
        <div className="container ab-hero-grid">
          <figure className="ab-portrait">
            <img
              src={site.portrait}
              alt="Zalah, founder of The Centre for Transformation"
              width={1086}
              height={1448}
              fetchpriority="high"
            />
          </figure>
          <div className="ab-hero-copy">
            <span className="cq-eyebrow">
              <i className="rule" aria-hidden="true" />
              About Our Founder
              <i className="rule" aria-hidden="true" />
            </span>
            <h1 className="cq-title">
              A Life Dedicated to <span>Transformation</span>
            </h1>
            <p className="ab-hero-role">{f.role}</p>
            <p className="cq-lead">
              Zalah is the founder of The Centre for Transformation (CFT), an accomplished entrepreneur, distinguished
              TEDx speaker, and a lifelong seeker of wisdom. His work brings together practical insight, spiritual
              understanding, and real-life experience to support individuals in living a more conscious, compassionate
              and purposeful life.
            </p>
            <p className="ab-hero-bio">{f.paras[0]}</p>
            <div className="ab-hero-cta">
              <a href="#story" className="btn btn-gold">
                Discover Zalah’s Story
                <Icon name="arrow" size={16} />
              </a>
              <a href={site.tedTalk} target="_blank" rel="noreferrer" className="btn btn-ghost">
                Watch His TEDx Talk
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 2 — mission, vision, values */}
      <section className="cq-band cq-white ab-mvv">
        <div className="container">
          <span className="cq-eyebrow">
            <i className="rule" aria-hidden="true" />
            Our Purpose
            <i className="rule" aria-hidden="true" />
          </span>
          <h2 className="cq-h2">
            Guiding You Toward a <span>Brighter Tomorrow</span>
          </h2>
          <p className="cq-lead">
            Everything we do is rooted in a simple but powerful purpose: to support you in creating a kinder, more
            conscious, and more meaningful life.
          </p>
          <div className="ab-mvv-grid">
            {mvv.map((p) => (
              <div key={p.title} className="ab-mvv-block">
                <Icon name={p.icon} size={26} />
                <h3>{p.title}</h3>
                <p>{p.text}</p>
                <span className="ab-mvv-foot">{p.foot}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3 — story and philosophy */}
      <section id="story" className="cq-band cq-ivory ab-story">
        <div className="container">
          <span className="cq-eyebrow">
            <i className="rule" aria-hidden="true" />
            Our Story &amp; Philosophy
            <i className="rule" aria-hidden="true" />
          </span>
          <h2 className="cq-h2">A Sanctuary for Your Spiritual Transformation</h2>
          <div className="ab-story-cols">
            <div>
              <p>
                At The Centre for Transformation™ (CFT), we guide individuals through the profound shifts brought about
                by “The Quickening”, the rapid evolution in global consciousness. Our spiritual path supports you in
                navigating these changes, helping you evolve toward a more balanced and purposeful life.
              </p>
              <p>
                Our community is designed for those ready to make significant strides in their spiritual journey.
                Whether you’re just starting or have been on this path for a while, the CFT offers sacred wisdom,
                practical tools, and a nurturing environment where real transformation occurs daily.
              </p>
            </div>
            <div>
              <p>
                Our teachings are non-religious and non-denominational, speaking directly to your heart and soul. At the
                CFT, we encourage you to follow your inner guidance rather than external dogma. With affordable courses,
                a rich variety of free content, and a supportive community, we provide an adventure of the soul, where
                every day becomes an opportunity for spiritual growth.
              </p>
              <p>
                Our wisdom ranges from “novice” to “university” levels, offering insights that are often not found in
                mainstream circles. Learning here is ongoing and shared — community, practice and conversation matter as
                much as the teachings themselves.
              </p>
            </div>
          </div>
          <blockquote className="ab-quote">
            <p>“{site.philosophy}”</p>
            <cite>— Zalah</cite>
          </blockquote>
        </div>
      </section>

      {/* 4 — teaching approach */}
      <section className="cq-band cq-white ab-approach">
        <div className="container ab-approach-grid">
          <div className="ab-approach-copy">
            <span className="cq-eyebrow">
              <i className="rule" aria-hidden="true" />
              Zalah’s Approach
              <i className="rule" aria-hidden="true" />
            </span>
            <h2 className="cq-h2">
              A Holistic Path to <span>Transformation</span>
            </h2>
            <p className="cq-lead">
              Zalah’s work brings together practical wisdom, spiritual insight, and real-life experience in an approach
              that is inclusive, compassionate, and designed to help you live with greater clarity, balance and purpose.
            </p>
            <ul className="ab-points">
              {site.approach.points.map((p) => (
                <li key={p}>
                  <Icon name="lotus" size={15} />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <p className="ab-body">
              At the CFT, you can take small steps or giant leaps toward your spiritual goals. We help you align with
              your heart, face the challenges of life, and strengthen your capacity to live your best life.
            </p>
            <p className="ab-body">
              Our classes have been described as “pure magic,” providing exactly what each individual needs at that
              moment. After every live session, participants share their takeaways, which often differ, because everyone
              is at their perfect level of evolution, receiving what they need to hear.
            </p>
          </div>
          <figure className="ab-approach-art">
            <img
              src="/images/site/meditation-concept.jpg"
              alt="Meditation concept artwork used in CFT sessions"
              width={1600}
              height={897}
              loading="lazy"
            />
            <figcaption>Teachings move from concept to lived practice in every CFT session.</figcaption>
          </figure>
        </div>
      </section>

      {/* 5 — experience, milestones, TEDx */}
      <section className="cq-band cq-plum ab-exp">
        <div className="container">
          <span className="cq-eyebrow">
            <i className="rule" aria-hidden="true" />
            Experience &amp; Milestones
            <i className="rule" aria-hidden="true" />
          </span>
          <h2 className="cq-h2">
            Two Decades of Teaching, <span>Shared Worldwide</span>
          </h2>
          <p className="cq-lead">{f.paras[0]}</p>
          <div className="ab-mile">
            {site.stats.slice(0, 3).map((s) => (
              <div key={s.label} className="ab-mile-item">
                <span className="ab-mile-val">{s.value}</span>
                <h3>{s.label}</h3>
                <p>{s.note}</p>
              </div>
            ))}
          </div>
          <div className="ab-tedx">
            <div>
              <span className="ab-tedx-word">
                <b>TED</b>
                <sup>x</sup> Speaker
              </span>
              <h3>{site.hero.tedx.talk}</h3>
              <p>{f.tedx.join(' ')} — Zalah has carried CFT’s ideas from the classroom to the TEDx stage.</p>
            </div>
            <a href={site.tedTalk} target="_blank" rel="noreferrer" className="btn btn-gold">
              Watch His TEDx Talk
              <Icon name="arrow" size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* 6 — testimonials */}
      <section className="cq-band cq-ivory ab-voices">
        <div className="container">
          <span className="cq-eyebrow">
            <i className="rule" aria-hidden="true" />
            Results &amp; Testimonials
            <i className="rule" aria-hidden="true" />
          </span>
          <h2 className="cq-h2">
            Real People. <span>Real Transformations.</span>
          </h2>
          <div className="ab-voices-grid">
            {voices.map((t) => (
              <TestimonialCard key={t.name} t={t} />
            ))}
          </div>
          <div className="ab-voices-more">
            <Link to="/testimonials" className="btn btn-ghost">
              Read More Student Stories
              <Icon name="arrow" size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* 7 — programs and community CTA */}
      <section className="cq-band cq-plum ab-cta">
        <div className="container ab-cta-box">
          <span className="cq-eyebrow">
            <i className="rule" aria-hidden="true" />
            Be Part of a Kinder World
            <i className="rule" aria-hidden="true" />
          </span>
          <h2 className="cq-h2">
            Together, We Can Create a <span>Brighter Tomorrow</span>
          </h2>
          <p className="cq-lead">
            Explore CFT’s educational programs, join the free Wednesday Evening Wisdom Class, or start a conversation —
            every path begins with a single step.
          </p>
          <div className="ab-cta-row">
            <Link to="/courses" className="btn btn-gold">
              Explore Our Programs
              <Icon name="arrow" size={16} />
            </Link>
            <Link to="/wisdom-call" className="btn btn-ghost">
              Join the Wednesday Wisdom Call
            </Link>
            <Link to="/connect" className="btn btn-ghost">
              Connect With Us
            </Link>
          </div>
          <p className="ab-cta-when">
            {site.wisdomClass.cadence} · {site.wisdomClass.when}
          </p>
        </div>
      </section>
    </>
  );
}
