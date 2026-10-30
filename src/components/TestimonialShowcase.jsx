import { useEffect, useState } from 'react';
import { testimonials } from '../data/testimonials';
import { Icon } from './icons';

// 25% quicker shuffle than the original 4200ms cadence, per user request 2026-10-19.
const AUTO_MS = 3360;

function prefersReduced() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function TestimonialShowcase() {
  const n = testimonials.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || prefersReduced()) return undefined;
    const id = setInterval(() => setActive((a) => (a + 1) % n), AUTO_MS);
    return () => clearInterval(id);
  }, [paused, n]);

  // 0 = centred, 1 = waiting off-stage right, -1 = parked off-stage left.
  const posOf = (i) => {
    const off = (i - active + n) % n;
    if (off === 0) return 0;
    if (off === 1) return 1;
    if (off === n - 1) return -1;
    return off < n / 2 ? 1 : -1;
  };

  return (
    <>
      <div
        className="ts-stage"
        role="group"
        aria-roledescription="carousel"
        aria-label="Student testimonials"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        {testimonials.map((t, i) => {
          const pos = posOf(i);
          return (
            <figure
              key={t.name}
              className={`ts-card${pos === 0 ? ' is-center' : pos === 1 ? ' is-right' : ' is-left'}`}
              aria-hidden={pos !== 0}
            >
              <span className="ts-mark" aria-hidden="true">
                “
              </span>
              <blockquote className="ts-quote">
                <p>{t.lead}</p>
              </blockquote>
              <figcaption className="ts-who">
                <span className="ts-name">{t.name}</span>
                <span className="ts-role">CFT Student</span>
              </figcaption>
              <span className="ts-stars" aria-hidden="true">
                ★★★★★
              </span>
            </figure>
          );
        })}
      </div>

      <div className="ts-nav">
        <button
          type="button"
          className="ts-arrow"
          aria-label="Previous testimonial"
          onClick={() => setActive((a) => (a - 1 + n) % n)}
        >
          <Icon name="chevron" size={18} className="rot-l" />
        </button>
        <div className="slider-dots ts-dots">
          {testimonials.map((t, i) => (
            <button
              key={t.name}
              type="button"
              className={`slider-dot${i === active ? ' is-active' : ''}`}
              aria-label={`Show testimonial from ${t.name}`}
              aria-current={i === active}
              onClick={() => setActive(i)}
            />
          ))}
        </div>
        <button
          type="button"
          className="ts-arrow"
          aria-label="Next testimonial"
          onClick={() => setActive((a) => (a + 1) % n)}
        >
          <Icon name="chevron" size={18} className="rot-r" />
        </button>
      </div>
    </>
  );
}
