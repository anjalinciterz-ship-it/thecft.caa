import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { site } from '../data/site';
import { Icon } from '../components/icons';
import { TextEffect } from '../components/TextEffect';

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

// [start, gap] in seconds for each block of the cascade. The wide composition
// can afford to spend 2.9s unfolding; on a phone the same schedule is still
// finishing when the slide rotates, so the compact one runs the identical order
// in a third of the time: eyebrow, heading, lead, benefits, then the cards and
// the tagline. The two buttons are timed in CSS, on 550ms and 650ms.
const TIMING = {
  wide: {
    eyebrow: [0, 0.055],
    titleLead: [0.15, 0.028],
    titleAccent: [0.8, 0.12],
    lead: [1.15, 0.02],
    features: [1.7, 0.18],
    featureStep: 0.055,
    footnote: [2.15, 0.055],
    quote: [2.5, 0.055],
    quoteBy: [2.8, 0.055],
  },
  compact: {
    eyebrow: [0, 0.02],
    titleLead: [0.15, 0.0055],
    titleAccent: [0.24, 0.05],
    lead: [0.35, 0.0055],
    features: [0.45, 0.08],
    featureStep: 0.04,
    footnote: [0.95, 0.03],
    quote: [0.65, 0.03],
    quoteBy: [0.8, 0.03],
  },
};

// The hero band is full-bleed, so its container width is the viewport width and
// this media query reads the same break as the CSS container queries. The layout
// itself is pure CSS, so resizing never remounts the copy and never restarts an
// animation; only the schedule has to be known in JavaScript, because a phone
// cannot spend three seconds unfolding before its slide rotates.
function useCompactHero() {
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width:1000px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width:1000px)');
    const onChange = (e) => setCompact(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return compact;
}

// The cosmic artwork keeps its own frame and its own floating pieces; the three
// photographs only fill the stage. See site.heroSlides.
const COSMIC_ART = {
  src: '/images/site/hero-banner.webp',
  srcSet: '/images/site/hero-banner-900.webp 900w, /images/site/hero-banner.webp 1672w',
  alt: 'Zalah welcoming you to The Centre for Transformation',
  width: '1672',
  height: '941',
  // Below the desktop break the frame is narrower than the artwork, so cover
  // keeps the full height and crops the width. This window holds his face, and
  // on a tablet the ring and the glow at its feet as well.
  mobilePos: '70% 50%',
  tabletPos: '68% 50%',
  /* Every cosmic asset in the library has him painted into it, so there is no
     separate starfield to put behind a portrait. The picture is wide enough
     that its left-hand window is pure sky, mountains and the gold ribbons at
     their feet, with none of him in it: the compact layouts use that window,
     because a phone hero carries its message in words, not in a face. */
  compactArt: {
    src: '/images/site/hero-banner.webp',
    srcSet: '/images/site/hero-banner.webp',
    pos: '0% 50%',
    tabletPos: '0% 50%',
  },
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
function HeroSlide({ slide, h, eager, active, t }) {
  const cosmic = slide.kind === 'live';
  const art = cosmic ? COSMIC_ART : slide;
  const copy = cosmic ? cosmicCopy(h) : slide.copy;
  // Below the desktop break the frame is opened on a different window of the
  // same photograph, one that holds the place and none of the person.
  const plate = art.compactArt || { pos: art.mobilePos, tabletPos: art.tabletPos };
  return (
    <>
      {/* L1. One frame, two windows: the desktop sees the whole composite the
          slide was drawn for; a phone sees the quarter of it that has no face
          in it, because covering a 2.1:1 composite in a 1:2 frame is what
          magnified Zalah until his head filled the screen. */}
      <picture
        className={`hero-art${cosmic ? ' hero-art-cosmic' : ' hero-art-photo'}`}
        style={{
          '--hero-art-pos': plate.pos,
          '--hero-art-pos-tablet': plate.tabletPos,
        }}
      >
        {art.compactArt ? <source media="(max-width: 1000px)" srcSet={art.compactArt.srcSet} /> : null}
        <img
          src={art.src}
          srcSet={art.srcSet}
          sizes="100vw"
          alt={art.alt}
          width={art.width}
          height={art.height}
          loading={eager ? 'eager' : 'lazy'}
          fetchpriority={eager ? 'high' : 'auto'}
          decoding="async"
        />
      </picture>
      {/* L1b: the portrait layer that used to stand in this slot is gone by
          design. A phone hero is read as a poster, not as a face, and the
          window each slide now paints has no person in it at all, so nothing
          here needs to be hidden at the break: it is simply never requested. */}
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
          <TextEffect per="word" preset="spring" delay={t.eyebrow[0]} step={t.eyebrow[1]} intensity={0.35}>
            {copy.eyebrow}
          </TextEffect>
        </p>
        <h1>
          <TextEffect per="char" preset="fade" delay={t.titleLead[0]} step={t.titleLead[1]}>
            {copy.titleLead}
          </TextEffect>{' '}
          <TextEffect
            as="span"
            className="accent"
            per="word"
            preset="spring"
            delay={t.titleAccent[0]}
            step={t.titleAccent[1]}
            intensity={0.5}
          >
            {copy.titleAccent}
          </TextEffect>
        </h1>
        <p className="hero-lead">
          <TextEffect per="word" preset="fade" delay={t.lead[0]} step={t.lead[1]}>
            {copy.lead}
          </TextEffect>
        </p>
        <div className="hero-actions">
          {/* An inactive slide is only faded out, so its links are still in the
              tab order and a keyboard can reach words nobody can see. Dropping
              them out of the sequence, the same way the book carousel does, is
              what makes the aria-hidden on the wrapper true. */}
          <Link to="/courses" className="btn btn-gold" tabIndex={active ? undefined : -1}>
            {copy.ctaPrimary} <Icon name="arrow" />
          </Link>
          <Link to="/connect#cn-wisdom" className="btn btn-ghost" tabIndex={active ? undefined : -1}>
            {copy.ctaSecondary}
          </Link>
        </div>
        <ul className="hero-features">
          {copy.features.map((label, i) => (
            <li key={label}>
              <span className="gdot" aria-hidden="true" />
              <TextEffect
                per="word"
                preset="spring"
                delay={t.features[0] + i * t.features[1]}
                step={t.featureStep}
                intensity={0.3}
              >
                {label}
              </TextEffect>
            </li>
          ))}
        </ul>
        <p className="hero-footnote">
          <TextEffect per="word" preset="spring" delay={t.footnote[0]} step={t.footnote[1]} intensity={0.25}>
            {copy.footnote}
          </TextEffect>
        </p>
      </div>

      {/* The three floating pieces belong to the cosmic composition only. The
          photographs carry their own words and nothing else. They are wrapped
          so the compact layouts can group them into one band; on desktop the
          wrapper generates no box and each piece keeps its own position. */}
      {cosmic && (
        <div className="hero-pieces">
          <div className="hero-cred">
            <div className="lockup">
              <span className="tedx">
                TED<sup>x</sup>
              </span>
              <span className="role">{h.tedx.label}</span>
            </div>
            <div className="talk">{h.tedx.talk}</div>
          </div>

          <Link to="/connect#cn-wisdom" className="hero-note" tabIndex={active ? undefined : -1}>
            <Icon name="calendar" />
            <span className="hero-note-lines">
              <span className="k">{h.classCard.line1}</span>
              <span className="v">{h.classCard.line2}</span>
              <span className="m">{site.wisdomClass.when}</span>
            </span>
          </Link>

          <figure className="hero-quote" key={runKey('quote', active)}>
            <blockquote>
              <TextEffect per="word" preset="spring" delay={t.quote[0]} step={t.quote[1]} intensity={0.3}>
                {`“${site.quote.text}”`}
              </TextEffect>
            </blockquote>
            <figcaption>
              <TextEffect per="word" preset="spring" delay={t.quoteBy[0]} step={t.quoteBy[1]} intensity={0.3}>
                {site.quote.by}
              </TextEffect>
            </figcaption>
          </figure>
        </div>
      )}
    </>
  );
}

function Hero() {
  const h = site.hero;
  const slides = site.heroSlides;
  const n = slides.length;
  const compact = useCompactHero();
  const t = compact ? TIMING.compact : TIMING.wide;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  // Once the band has scrolled away nobody is watching it change, so the clock
  // stops rather than spending four second after four second on slides that are
  // out of the document's viewport.
  const stageRef = useRef(null);
  const [onscreen, setOnscreen] = useState(true);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([entry]) => setOnscreen(entry.isIntersecting), {
      threshold: 0.15,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (paused || !onscreen || prefersReduced()) return undefined;
    const id = setInterval(() => setActive((a) => (a + 1) % n), HERO_ROTATE_MS);
    return () => clearInterval(id);
    // Depending on `active` restarts the clock after a dot click, so a manually
    // chosen slide gets its full 4 seconds instead of the leftover fraction.
  }, [paused, onscreen, n, active]);

  /* A thumb across the band turns it, the same way the book carousel does. The
     gesture has to be clearly sideways: a tap on a button, or a pull down the
     page, moves the finger a few pixels too and must never change the slide. */
  const drag = useRef(null);
  const onSwipe = (e) => {
    const from = drag.current;
    drag.current = null;
    if (!from) return;
    const dx = e.changedTouches[0].clientX - from.x;
    const dy = e.changedTouches[0].clientY - from.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    setActive((a) => (a + (dx < 0 ? 1 : n - 1)) % n);
  };

  return (
    <section className="hero-band">
      <div
        ref={stageRef}
        className="hero-stage"
        role="group"
        aria-roledescription="carousel"
        aria-label="Welcome to The Centre for Transformation"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
        onTouchStart={(e) => {
          drag.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchEnd={onSwipe}
        onTouchCancel={() => {
          drag.current = null;
        }}
      >
        {slides.map((slide, i) => (
          <div
            key={slide.key}
            data-slide={slide.key}
            className={`hero-slide${slide.kind === 'live' ? '' : ' hero-slide-photo'}${i === active ? ' is-active' : ''}`}
            aria-hidden={i !== active}
          >
            <HeroSlide
              slide={slide}
              h={h}
              eager={i === 0}
              active={i === active}
              t={t}
            />
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

/* The sections below the fold are a chunk of their own, fetched and mounted
   only once the hero is on screen. In a client-rendered app the hero cannot
   paint until React has run, so everything this page bundles and mounts is on
   the critical path of the largest paint; the fold is where that stops. */
const HomeSections = lazy(() => import('./HomeSections'));

export default function Home() {
  return (
    <div className="home">
      <Hero />
      <Suspense fallback={null}>
        <HomeSections />
      </Suspense>
    </div>
  );
}
