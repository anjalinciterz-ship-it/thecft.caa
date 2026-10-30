import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from './icons';

export default function Slider({ items, keyOf, render, label }) {
  const track = useRef(null);
  const [view, setView] = useState({ pos: 0, max: 0, step: 0 });

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const cell = el.firstElementChild;
    if (!cell) return;
    const step = cell.getBoundingClientRect().width + (parseFloat(getComputedStyle(el).columnGap) || 0);
    if (!(step > 0)) return;
    const round = (n) => Math.max(0, Math.round(n));
    setView({
      step,
      pos: round(el.scrollLeft / step),
      max: round((el.scrollWidth - el.clientWidth) / step),
    });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    const ro = new ResizeObserver(measure);
    const el = track.current;
    if (el) {
      ro.observe(el);
      if (el.firstElementChild) ro.observe(el.firstElementChild);
    }
    return () => {
      window.removeEventListener('resize', measure);
      ro.disconnect();
    };
  }, [measure]);

  const nudge = (dir) => track.current.scrollBy({ left: dir * view.step, behavior: 'smooth' });

  return (
    <div className="slider">
      <div
        className="slider-track"
        ref={track}
        onScroll={measure}
        tabIndex={0}
        role="group"
        aria-label={label}
      >
        {items.map((item, i) => (
          <div className="slider-cell" key={keyOf(item, i)}>
            {render(item)}
          </div>
        ))}
      </div>

      <button
        type="button"
        className="slider-nav prev"
        onClick={() => nudge(-1)}
        disabled={view.pos === 0}
        aria-label={`Previous ${label}`}
      >
        <Icon name="arrow" size={18} />
      </button>
      <button
        type="button"
        className="slider-nav next"
        onClick={() => nudge(1)}
        disabled={view.pos >= view.max}
        aria-label={`Next ${label}`}
      >
        <Icon name="arrow" size={18} />
      </button>

      <div className="slider-dots">
        {Array.from({ length: view.max + 1 }, (_, i) => (
          <button
            key={i}
            type="button"
            className={`slider-dot${i === view.pos ? ' is-active' : ''}`}
            onClick={() => track.current.scrollTo({ left: i * view.step, behavior: 'smooth' })}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === view.pos}
          />
        ))}
      </div>
    </div>
  );
}
