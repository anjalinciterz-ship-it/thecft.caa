import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { useBlog } from '../lib/blog';
import { faqs } from '../data/faqs';
import { site } from '../data/site';
import { wisdomCall } from '../data/wisdomCall';
import WisdomCountdown from '../components/WisdomCountdown';
import { WisdomCallCta } from '../components/ScheduleCta';
import { useNextWisdomCall } from '../lib/schedule';
import { findOffering, formatMoney, useCatalog } from '../lib/catalog';
import PostCard from '../components/PostCard';
import TestimonialShowcase from '../components/TestimonialShowcase';
import JourneyShowcase from '../components/JourneyShowcase';
import BookShowcase from '../components/BookShowcase';
import FaqAccordion, { faqCategoryIcon } from '../components/FaqAccordion';
import {
  MorphingPopover,
  MorphingPopoverClose,
  MorphingPopoverContent,
  MorphingPopoverTrigger,
} from '../components/MorphingPopover';
import { SectionHead } from '../components/ui';
import { TextEffect } from '../components/TextEffect';
import { Icon } from '../components/icons';

// Inside his 3–5 second ask; long enough to read a banner, short enough that
// the rotation is obvious.
const HERO_ROTATE_MS = 4000;

function prefersReduced() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// The reveal is CSS-staggered, so it only plays when the tokens are created.
// Re-keying the copy on activation restarts it, which is what makes each slide
// animate as it takes the stage instead of once at page load while hidden.
const runKey = (name, active) => `${name}-${active ? 'run' : 'idle'}`;

// The cosmic artwork keeps its own frame and its own floating pieces; the three
// photographs only fill the stage. See site.heroSlides.
const COSMIC_ART = {
  src: '/images/site/hero-banner.webp',
  srcSet: '/images/site/hero-banner-900.webp 900w, /images/site/hero-banner.webp 1672w',
  alt: 'Zalah welcoming you to The Centre for Transformation',
  width: '1672',
  height: '941',
};

const cosmicCopy = (h) => ({
  eyebrow: h.eyebrow,
  titleLead: h.titleLead,
  titleAccent: h.titleAccent,
  lead: h.lead,
  ctaPrimary: 'Explore Courses',
  ctaSecondary: 'Join Wednesday Wisdom Class',
  features: h.features.map((f) => f.label),
  footnote: h.footnote,
});

// One renderer for all four slides: the photograph fills the frame, a wash
// keeps the words readable over it, and every word is live HTML that re-types
// as the slide takes the stage.
function HeroSlide({ slide, h, eager, active }) {
  const cosmic = slide.kind === 'live';
  const art = cosmic ? COSMIC_ART : slide;
  const copy = cosmic ? cosmicCopy(h) : slide.copy;
  return (
    <>
      <img
        className={`hero-art${cosmic ? ' hero-art-cosmic' : ' hero-art-photo'}`}
        src={art.src}
        srcSet={art.srcSet}
        sizes="100vw"
        alt={art.alt}
        width={art.width}
        height={art.height}
        loading={eager ? 'eager' : 'lazy'}
        fetchpriority={eager ? 'high' : 'auto'}
        decoding="async"
        style={cosmic ? undefined : { '--hero-art-pos': slide.mobilePos }}
      />
      <div className="hero-veil" aria-hidden="true" />

      {slide.planks ? (
        // One word on each plank of the signpost, in the order the boards read
        // top to bottom, so the sentence arrives as a sentence.
        <p className="hero-planks" key={runKey('planks', active)}>
          {slide.planks.map((p, i) => (
            <span
              key={`${p.word}-${i}`}
              className="hero-plank"
              style={{ left: `${p.x}%`, top: `${p.y}%`, '--pi': i }}
            >
              {p.word}
            </span>
          ))}
        </p>
      ) : null}

      <div className="hero-copy" key={runKey('copy', active)}>
        <p className="hero-eyebrow">
          <TextEffect per="word" preset="spring" delay={0} intensity={0.35}>
            {copy.eyebrow}
          </TextEffect>
        </p>
        <h1>
          <TextEffect per="char" preset="fade" delay={0.15}>
            {copy.titleLead}
          </TextEffect>{' '}
          <TextEffect
            as="span"
            className="accent"
            per="word"
            preset="spring"
            delay={0.8}
            step={0.12}
            intensity={0.5}
          >
            {copy.titleAccent}
          </TextEffect>
        </h1>
        <p className="hero-lead">
          <TextEffect per="word" preset="fade" delay={1.15} step={0.02}>
            {copy.lead}
          </TextEffect>
        </p>
        <div className="hero-actions">
          <Link to="/courses" className="btn btn-gold">
            {copy.ctaPrimary} <Icon name="arrow" />
          </Link>
          <Link to="/connect#cn-wisdom" className="btn btn-ghost">
            {copy.ctaSecondary}
          </Link>
        </div>
        <ul className="hero-features">
          {copy.features.map((label, i) => (
            <li key={label}>
              <span className="gdot" aria-hidden="true" />
              <TextEffect per="word" preset="spring" delay={1.7 + i * 0.18} intensity={0.3}>
                {label}
              </TextEffect>
            </li>
          ))}
        </ul>
        <p className="hero-footnote">
          <TextEffect per="word" preset="spring" delay={2.15} intensity={0.25}>
            {copy.footnote}
          </TextEffect>
        </p>
      </div>

      {/* The three floating pieces belong to the cosmic composition only. The
          photographs carry their own words and nothing else. */}
      {cosmic && (
        <>
          <div className="hero-cred">
            <div className="lockup">
              <span className="tedx">
                TED<sup>x</sup>
              </span>
              <span className="role">{h.tedx.label}</span>
            </div>
            <div className="talk">{h.tedx.talk}</div>
          </div>

          <Link to="/connect#cn-wisdom" className="hero-note">
            <Icon name="calendar" />
            <span className="hero-note-lines">
              <span className="k">{h.classCard.line1}</span>
              <span className="v">{h.classCard.line2}</span>
              <span className="m">{site.wisdomClass.when}</span>
            </span>
          </Link>

          <figure className="hero-quote" key={runKey('quote', active)}>
            <blockquote>
              <TextEffect per="word" preset="spring" delay={2.5} intensity={0.3}>
                {`“${site.quote.text}”`}
              </TextEffect>
            </blockquote>
            <figcaption>
              <TextEffect per="word" preset="spring" delay={2.8} intensity={0.3}>
                {site.quote.by}
              </TextEffect>
            </figcaption>
          </figure>
        </>
      )}
    </>
  );
}

function Hero() {
  const h = site.hero;
  const slides = site.heroSlides;
  const n = slides.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || prefersReduced()) return undefined;
    const id = setInterval(() => setActive((a) => (a + 1) % n), HERO_ROTATE_MS);
    return () => clearInterval(id);
    // Depending on `active` restarts the clock after a dot click, so a manually
    // chosen slide gets its full 4 seconds instead of the leftover fraction.
  }, [paused, n, active]);

  return (
    <section className="hero-band">
      <div
        className="hero-stage"
        role="group"
        aria-roledescription="carousel"
        aria-label="Welcome to The Centre for Transformation"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        {slides.map((slide, i) => (
          <div
            key={slide.key}
            className={`hero-slide${slide.kind === 'live' ? '' : ' hero-slide-photo'}${i === active ? ' is-active' : ''}`}
            aria-hidden={i !== active}
          >
            <HeroSlide slide={slide} h={h} eager={i === 0} active={i === active} />
          </div>
        ))}
        <div className="hero-dots slider-dots">
          {slides.map((slide, i) => (
            <button
              key={slide.key}
              type="button"
              className={`slider-dot${i === active ? ' is-active' : ''}`}
              aria-label={`Show the ${slide.title} slide`}
              aria-current={i === active}
              onClick={() => setActive(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function Journeys() {
  return <JourneyShowcase />;
}

function Facilitator() {
  const f = site.facilitator;
  return (
    <section className="fac-band">
      <div className="container fac-ed">
        <figure className="fac-portrait">
          <img
            src={site.portrait}
            alt="Zalah, facilitator at The Centre for Transformation"
            loading="lazy"
          />
        </figure>

        <div className="fac-copy">
          <p className="fac-eyebrow-ed">Meet The Facilitator</p>
          <h2 className="fac-name-ed">{f.name}</h2>
          <p className="fac-role-ed">{f.role}</p>
          {f.paras.map((p) => (
            <p key={p} className="fac-text-ed">
              {p}
            </p>
          ))}

          <p className="fac-cred">
            <span className="fac-cred-word">
              <b>TED</b>
              <sup>x</sup> Speaker
            </span>
            <span className="fac-cred-strap">{f.tedx.join(' ')}</span>
          </p>

          <div className="fac-actions-ed">
            <Link to="/about" className="btn btn-gold">
              Discover Zalah’s Story <Icon name="arrow" size={16} />
            </Link>
            <a href={site.tedTalk} target="_blank" rel="noreferrer" className="fac-talk">
              <span className="fac-talk-ico" aria-hidden="true">
                <Icon name="play" size={13} />
              </span>
              Watch His TEDx Talk
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Programs() {
  const [active, setActive] = useState(0);
  const { offerings } = useCatalog();
  /* The rail order matches the approved reference; an offering the admin
     publishes later is appended, so the five known cards never move. */
  const RAIL_ORDER = ['accelerator', 'mindlife', 'sa1', 'sa2', 'complete'];
  const rail = [
    ...RAIL_ORDER.map((id) => findOffering(offerings, id)).filter(Boolean),
    ...offerings.filter((c) => c.listed !== false && !RAIL_ORDER.includes(c.id) && !RAIL_ORDER.includes(c.slug)),
  ];
  return (
    <section className="cq-band cq-white cq-home cs-band">
      <div className="container">
        <SectionHead
          eyebrow="Our Programs"
          title="Five Powerful Programs,"
          accent="One Guided Path"
          sub="Each course is a step towards a more conscious, peaceful and purposeful life."
        />
      </div>
      <div className="cs-fluid">
        <div className="cs-acc">
          {rail.map((c, i) => {
            const on = i === active;
            const price = formatMoney(c.price, c.currency);
            return (
              <article
                key={c.id}
                className={on ? 'cs-card cs-on' : 'cs-card'}
                tabIndex={0}
                aria-label={`${c.name}, ${price.amount} ${price.code}${on ? ', expanded' : ''}`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActive(i);
                  }
                }}
              >
                <div className="cs-art">
                  {c.banner ? <img src={c.banner} alt="" loading="lazy" /> : null}
                </div>
                <div className="cs-body">
                  <span className="cs-num" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="cs-title">{c.name}</h3>
                  <p className="cs-short">{c.short}</p>
                  <div className="cs-foot">
                    <span className="cs-price">
                      <b>{price.amount}</b>
                      <i>{price.code}</i>
                    </span>
                    <Link className="cs-explore" to={`/course/${c.id}`}>
                      Explore program <Icon name="arrow" size={15} />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
      <div className="container">
        <div className="text-center mt-32">
          <Link to="/courses" className="btn btn-ghost">
            View All Programs
            <Icon name="arrow" size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Voices() {
  return (
    <section className="ts-band">
      <div className="ts-wrap">
        <span className="ts-eyebrow">Results &amp; Testimonials</span>
        <h2 className="ts-word">
          Real people,
          <br />
          real
          <br />
          transformations.
        </h2>
        <TestimonialShowcase />
      </div>
      <div className="container text-center mt-32">
        <Link to="/testimonials" className="btn btn-ghost">
          View All Testimonials →
        </Link>
      </div>
    </section>
  );
}

/* A moving rail of real articles — uniform card widths, constant scroll,
   ~4 visible at a time. Capped at 8 posts; the sequence is duplicated so the
   loop is seamless. */
const INSIGHT_PICKS = [
  'you-dont-have-to-have-everything-figured-out',
  'you-are-allowed-to-slow-down',
  'healing-doesnt-always-look-like-happiness',
  'what-are-you-holding-onto-that-your-soul-is-asking-you-to-release',
  'you-are-more-than-what-happened-to-you',
  'peace-doesnt-mean-your-life-is-perfect',
  'when-you-feel-disconnected-from-yourself',
  'you-dont-need-to-become-someone-else-to-become-better',
];

/* Vlog-card silhouette: photo aspect cycles portrait / landscape / square so
   the top-aligned rail staggers into an uneven bottom edge, like the reference. */
const INSIGHT_ASPECTS = [0.72, 1.5, 1.0, 0.78, 1.45, 1.0, 0.72, 1.3];

function InsightRail({ picks, clone = false }) {
  return (
    <div className="ins-seq" aria-hidden={clone ? 'true' : undefined}>
      {picks.map((p, i) => (
        <div
          className="ins-item"
          key={p.slug}
          style={{ '--ar': INSIGHT_ASPECTS[i % INSIGHT_ASPECTS.length] }}
        >
          <PostCard p={p} level={clone ? 3 : 2} />
        </div>
      ))}
    </div>
  );
}

function Insights() {
  const { getPost } = useBlog();
  const picks = INSIGHT_PICKS.map((s) => getPost(s)).filter(Boolean);
  return (
    <section className="ins-band">
      <div className="container">
        <SectionHead
          eyebrow="Insights & Wisdom"
          title="Insights for a Kinder,"
          accent="Brighter Tomorrow"
          sub="Short reads from the CFT community on consciousness, presence, and everyday spiritual practice."
        />
      </div>
      <div className="ins-marquee">
        <div className="ins-track">
          <InsightRail picks={picks} />
          <InsightRail picks={picks} clone />
        </div>
      </div>
      <div className="container">
        <div className="text-center mt-32">
          <Link to="/blog" className="btn btn-gold">
            View All Insights
            <Icon name="arrow" size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Questions() {
  const preview = ['cft', 'zalah', 'courses'].map((k) => faqs.find((f) => f.category === k)).filter(Boolean);
  return (
    <section className="faq-band">
      <div className="stars" aria-hidden="true" />
      <div className="faq-milky" aria-hidden="true" />
      <div className="faq-dawn" aria-hidden="true" />
      <svg className="faq-ridge" viewBox="0 0 1440 320" preserveAspectRatio="none" aria-hidden="true">
        <path
          className="r1"
          d="M0 150 L128 112 L268 156 L392 96 L536 162 L684 118 L826 172 L968 122 L1112 168 L1268 116 L1440 158 L1440 320 L0 320Z"
        />
        <path
          className="r2"
          d="M0 206 L152 172 L312 214 L470 166 L628 218 L790 176 L948 222 L1108 178 L1268 216 L1440 186 L1440 320 L0 320Z"
        />
        <path
          className="r3"
          d="M0 254 L174 230 L356 260 L540 228 L724 264 L908 232 L1092 266 L1276 236 L1440 258 L1440 320 L0 320Z"
        />
      </svg>

      <div className="container faq-inner">
        <div className="faq-head">
          <p className="faq-eyebrow">
            Questions &amp; Answers
          </p>
          <h2 className="faq-title">
            Find the <span>Clarity You’re Looking For</span>
          </h2>
          <p className="faq-sub">
            Explore answers to common questions about spirituality, consciousness, our programs, and your journey with
            CFT.
          </p>
        </div>

        <div className="faq-list">
          {preview.map((f, i) => (
            <FaqAccordion
              key={f.q}
              id={`home-faq-${i}`}
              question={f.q}
              answer={f.a}
              icon={faqCategoryIcon[f.category]}
              defaultOpen={i === 0}
            />
          ))}
        </div>

        <div className="text-center">
          <Link to="/faq" className="btn btn-gold faq-all">
            Visit The FAQ Page <Icon name="arrow" size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function WisdomCall() {
  const { next } = useNextWisdomCall();
  return (
    <section className="wc2" aria-labelledby="wc2-title">
      <div className="wc2-arcs" aria-hidden="true" />
      <figure className="wc2-photo">
        <img
          src={wisdomCall.image}
          alt="A woman seated in meditation at home, eyes closed and at ease"
          width="1331"
          height="749"
          loading="lazy"
        />
      </figure>

      <div className="container wc2-inner">
        <div className="wc2-copy">
          <p className="wc2-eyebrow">
            {wisdomCall.eyebrow}
          </p>
          <h2 className="wc2-title" id="wc2-title">
            {wisdomCall.titleLead}
            <span>{wisdomCall.titleAccent}</span>
          </h2>
          <p className="wc2-strap">{wisdomCall.tagline}</p>
          <p className="wc2-lead">
            {wisdomCall.lead.before}
            <b>{wisdomCall.lead.bold}</b>
            {wisdomCall.lead.after}
          </p>

          <div className="wc2-actions">
            <WisdomCallCta next={next}>Book Your Spot Now</WisdomCallCta>
            <Link to="/wisdom-call" className="btn wc2-ghost">
              Why, when &amp; how to join <Icon name="arrow" size={16} />
            </Link>
          </div>
          <p className="wc2-micro">{wisdomCall.micro.join(' · ')}</p>
        </div>

        <WisdomCountdown variant="card" />

        <ul className="wc2-benefits">
          {wisdomCall.benefits.map((b) => (
            <li key={b.title}>
              <span className="wc2-b-ico" aria-hidden="true">
                <span className="gdot" />
              </span>
              <span className="wc2-b-txt">
                <b>{b.title}</b>
                <span>{b.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// The badge art he supplied carries its own label, so the title lives in the
// image (and its alt text) and only the supporting line stays live copy —
// otherwise the same words would print twice, once baked and once typeset.
const closeProps = [
  { badge: 'personal-growth', title: 'Personal Growth', text: 'Support for your unique journey' },
  { badge: 'meaningful-conversations', title: 'Meaningful Conversations', text: 'A warm, like-minded community' },
  { badge: 'supportive-community', title: 'A Supportive Community', text: 'Together, we create positive change' },
];

function ClosingConnect() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const submission = useRef(null);
  const pending = useRef(false);
  const submit = async (event) => {
    event.preventDefault();
    if (pending.current) return;
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const signature = JSON.stringify(body);
    if (submission.current?.signature !== signature) submission.current = { signature, key: crypto.randomUUID() };
    pending.current = true; setSending(true); setSendError('');
    try {
      await apiRequest('/contact', { method: 'POST', body, headers: { 'Idempotency-Key': submission.current.key } });
      setSent(true);
    } catch (error) { setSendError(error.message); }
    finally { pending.current = false; setSending(false); }
  };

  return (
    <section className="cx-band">
      <div className="container cx-inner">
        <div className="cx-cta">
          <div className="stars" aria-hidden="true" />
          <h2 className="cx-cta-title">
            Towards a <span>Brighter</span> Tomorrow.
          </h2>
          <Link to="/connect" className="btn btn-gold cx-go">
            Begin Your Journey <Icon name="arrow" size={16} />
          </Link>
        </div>

        <div className="cx-grid">
          <div className="cx-copy">
            <p className="cx-eyebrow">
              Get In Touch
            </p>
            <h2 className="cx-title">
              Let’s Connect
              <br />
              and <span>Create a Brighter You</span>
            </h2>
            <p className="cx-lead">
              We’d love to hear from you. Whether you have a question, want to discuss a course, need support, or
              simply want to share your journey, we’re here for you.
            </p>
          </div>

          <div className="cx-card">
            <span className="cx-badge" aria-hidden="true">
              <img src="/images/icons/contact-email-v.png" alt="" />
            </span>
            <h3 className="cx-card-title">Send Us a Message</h3>
            <p className="cx-card-note">We’d love to hear from you. Fill out the form below and we’ll get back to you soon.</p>
            {sent ? (
              <p className="cx-thanks" role="status">Thank you. Your message is with the CFT team. We usually respond within 24–48 hours.</p>
            ) : (
              <MorphingPopover
                variants={{
                  initial: { opacity: 0, filter: 'blur(10px)' },
                  animate: { opacity: 1, filter: 'blur(0px)' },
                  exit: { opacity: 0, filter: 'blur(10px)' },
                }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <MorphingPopoverTrigger className="btn btn-gold cx-open">
                  Open the Form <Icon name="arrow" size={15} />
                </MorphingPopoverTrigger>
                <MorphingPopoverContent label="Send us a message" className="touch-pop">
                  <MorphingPopoverClose label="Close the form" />
                  <form onSubmit={submit}>
                    <div className="form-field touch-field">
                      <Icon name="seeker" size={16} className="touch-f-ico" />
                      <input name="name" aria-label="Your name" placeholder="Your Name *" required maxLength={120} autoComplete="name" />
                    </div>
                    <div className="form-field touch-field">
                      <img className="touch-f-ico" src="/images/icons/contact-email-line.png" alt="" />
                      <input
                        name="email"
                        type="email"
                        aria-label="Email address"
                        placeholder="Email Address *"
                        required
                        maxLength={254}
                        autoComplete="email"
                      />
                    </div>
                    <div className="form-field touch-field">
                      <Icon name="chat" size={16} className="touch-f-ico" />
                      <select name="subject" aria-label="Subject" defaultValue="" required>
                        <option value="">Select a Subject</option>
                        {site.contactSubjects.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-field touch-field touch-field-area">
                      <img className="touch-f-ico" src="/images/icons/contact-message-1.png" alt="" />
                      <textarea name="message" rows={4} aria-label="Your message" placeholder="Your Message *" required minLength={10} maxLength={5000} />
                    </div>
                    {sendError && <p className="cn-form-err" role="alert">{sendError}</p>}
                    <button type="submit" className="btn btn-gold touch-send" disabled={sending}>
                      {sending ? 'Sending…' : 'Send Message'} <Icon name="arrow" size={15} />
                    </button>
                    <p className="form-note">We read every message and usually respond within 24–48 hours.</p>
                  </form>
                </MorphingPopoverContent>
              </MorphingPopover>
            )}
          </div>
        </div>

        <ul className="cx-props" aria-label="What you can expect">
          {closeProps.map((p) => (
            <li key={p.title}>
              <img
                className="cx-p-badge"
                src={`/images/icons/value-badge-${p.badge}.png`}
                alt={p.title}
                width={288}
                height={301}
                loading="lazy"
                decoding="async"
              />
              <span className="cx-p-txt">
                <span>{p.text}</span>
              </span>
            </li>
          ))}
        </ul>

        <svg className="cx-wave" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 74 C 210 116 430 22 720 48 C 1010 74 1210 26 1440 62 L1440 120 L0 120 Z" />
        </svg>

        <div className="cx-socials">
          {site.socials.map((s) => (
            <a
              key={s.key}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              title={`${s.label} ${s.handle}`}
              aria-label={s.label}
            >
              <img className="s1" src={`/images/icons/social-${s.icon}-1.png`} alt="" />
              <img className="s2" src={`/images/icons/social-${s.icon}-2.png`} alt="" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="home">
      <Hero />
      <Journeys />
      <WisdomCall />
      <Facilitator />
      <Programs />
      <BookShowcase />
      <Voices />
      <Insights />
      <Questions />
      <ClosingConnect />
    </div>
  );
}
