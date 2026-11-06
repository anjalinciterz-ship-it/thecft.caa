import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { journeySrcSet, journeys } from '../data/journeys';
import { SectionHead } from './ui';
import { Icon } from './icons';

/* Scattered polaroid collage: four rotated photo cards pinned across a dark
   band with scribbled arrows, each one linking through to its journey page. */

const SPOTS = [
  { left: '6%', top: 0, rot: '-4deg' },
  { right: '5%', top: '250px', rot: '3deg' },
  { left: '14%', top: '560px', rot: '-2.5deg' },
  { right: '10%', top: '850px', rot: '4deg' },
];

const DOODLES = [
  { left: '40%', top: '60px', transform: 'scaleX(-1) rotate(-6deg)' },
  { right: '38%', top: '330px', transform: 'rotate(6deg)' },
  { left: '46%', top: '640px', transform: 'scaleX(-1) rotate(-8deg)' },
  { right: '40%', top: '930px', transform: 'rotate(4deg)' },
];

function Doodle({ style }) {
  return (
    <span className="jy-doodle" style={style} aria-hidden="true">
      <svg viewBox="0 0 90 70">
        <path d="M10 8 C34 22 56 40 76 58" />
        <path d="M26 6 C44 22 60 40 76 58" />
        <path d="M12 26 C34 36 58 48 76 58" />
      </svg>
    </span>
  );
}

export default function JourneyShowcase() {
  const bandRef = useRef(null);
  const [wordIn, setWordIn] = useState(false);

  useEffect(() => {
    const el = bandRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setWordIn(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="jy-band" ref={bandRef}>
      <span className={wordIn ? 'jy-word is-in' : 'jy-word'} aria-hidden="true">
        {'JOURNEY'.split('').map((ch, i) => (
          <span className="jy-l" style={{ '--i': i }} key={i}>
            {ch}
          </span>
        ))}
      </span>
      <div className="container">
        <SectionHead
          eyebrow="Your Inner Journey Matters"
          title="Four Inner Journeys."
          accent="A Brighter You."
          sub="Explore the key pillars that guide our work at CFT: practical wisdom for a more peaceful, purposeful and fulfilling life."
        />
      </div>

      <div className="jy-field">
        {DOODLES.map((d, i) => (
          <Doodle key={i} style={d} />
        ))}
        {journeys.map((j, i) => (
          <Link
            key={j.slug}
            to={`/journey/${j.slug}`}
            className="jy-card"
            style={{ ...SPOTS[i], '--rot': SPOTS[i].rot }}
          >
            <span className="jy-polaroid">
              <img
                src={j.image}
                srcSet={journeySrcSet(j)}
                sizes="(max-width: 900px) 88vw, 380px"
                alt={j.title}
                style={{ objectPosition: j.focus }}
                loading="lazy"
              />
            </span>
            <span className="jy-cap">
              <span className="jy-num" aria-hidden="true">
                {j.num}
              </span>
              <h3>{j.title}</h3>
              <span className="jy-text">{j.text}</span>
              <span className="jy-more">Learn more →</span>
              <span className="jy-go" aria-hidden="true">
                <Icon name="arrow" size={16} />
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
