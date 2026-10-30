import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/*
 * Call-for-call stand-in for motion-primitives' MorphingPopover, built on measured
 * rects + CSS keyframes (no animation library in this project).
 *
 * The trigger button's rect is the start of the morph and a centred sheet sized to
 * its own content is the end, so the button opens into the panel instead of being
 * replaced by it. The panel is pinned to its final width while it grows, so the
 * fields never re-wrap mid-flight.
 *
 * `variants={{ initial, animate, exit }}` accepts motion's opacity / filter:blur() /
 * y / scale numbers and `transition={{ duration, ease }}` accepts the named easing
 * strings or a four-point array, both translated into CSS custom properties.
 */

const PopContext = createContext(null);

const GAP = 24;
const MAX_W = 620;

const EASES = {
  linear: 'linear',
  ease: 'ease',
  easeIn: 'cubic-bezier(.4,0,1,1)',
  easeOut: 'cubic-bezier(0,0,.2,1)',
  easeInOut: 'cubic-bezier(.4,0,.2,1)',
};

const easingFor = (ease) =>
  Array.isArray(ease) ? `cubic-bezier(${ease.join(',')})` : EASES[ease] || EASES.easeOut;

const blurOf = (filter) => {
  const m = /blur\(([-\d.]+)(px|rem)?\)/.exec(filter || '');
  if (!m) return 0;
  return m[2] === 'rem' ? parseFloat(m[1]) * 16 : parseFloat(m[1]);
};

const edgeOf = (v) => ({
  op: v?.opacity ?? 0,
  blur: blurOf(v?.filter),
  y: v?.y ?? 0,
  scale: v?.scale ?? 1,
});

export function MorphingPopover({ variants, transition, children }) {
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const bodyRef = useRef(null);
  const [phase, setPhase] = useState('idle');

  const openPopover = useCallback(() => setPhase('in'), []);
  const requestClose = useCallback(() => setPhase((p) => (p === 'idle' ? p : 'out')), []);
  const done = useCallback(() => setPhase('idle'), []);

  const open = phase !== 'idle';
  const duration = transition?.duration ?? 0.25;
  const easing = easingFor(transition?.ease);
  const edge = useMemo(
    () => ({ from: edgeOf(variants?.initial), to: edgeOf(variants?.exit ?? variants?.initial) }),
    [variants]
  );

  /* The sheet dims the page behind it, so the page holds still while it is up.
     Escape and a pointerdown on the scrim both close it. */
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onPointerDown = (e) => {
      if (panelRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return;
      requestClose();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') requestClose();
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, requestClose]);

  return (
    <PopContext.Provider
      value={{
        phase,
        triggerRef,
        panelRef,
        bodyRef,
        openPopover,
        requestClose,
        done,
        duration,
        easing,
        edge,
      }}
    >
      {children}
    </PopContext.Provider>
  );
}

export function MorphingPopoverTrigger({ as: Tag = 'button', children, className = '', ...rest }) {
  const { triggerRef, openPopover, phase } = useContext(PopContext);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (phase !== 'idle') {
      wasOpen.current = true;
    } else if (wasOpen.current) {
      wasOpen.current = false;
      triggerRef.current?.focus();
    }
  }, [phase, triggerRef]);

  return (
    <Tag
      ref={triggerRef}
      type="button"
      className={className}
      aria-expanded={phase !== 'idle'}
      aria-haspopup="dialog"
      onClick={openPopover}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function MorphingPopoverClose({ label = 'Close' }) {
  const { requestClose } = useContext(PopContext);
  return (
    <button type="button" className="md-close" aria-label={label} onClick={requestClose}>
      <span className="md-x" aria-hidden="true" />
    </button>
  );
}

export function MorphingPopoverContent({ children, label, className = '' }) {
  const pop = useContext(PopContext);
  if (!pop || pop.phase === 'idle') return null;
  return createPortal(
    <PopFrame {...pop} closing={pop.phase === 'out'} className={className} label={label}>
      {children}
    </PopFrame>,
    document.body
  );
}

function PopFrame({ panelRef, bodyRef, triggerRef, closing, done, duration, easing, edge, className, label, children }) {
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const body = bodyRef.current;
    const trigger = triggerRef.current;
    if (!panel || !body || !trigger) return;

    const measure = () => {
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const t = trigger.getBoundingClientRect();
      const w = Math.round(Math.min(MAX_W, vw - GAP * 2));
      const style = panel.style;

      /* Pin the body to the sheet width before measuring it, otherwise the first
         number is the width it was laid out at, not the one it keeps.
         scrollHeight, not offsetHeight: the CSS clamp on the body must not feed
         back into the number that sets it. */
      style.setProperty('--md-w1', `${w}px`);
      const natural = body.scrollHeight;
      const h = Math.round(Math.min(natural, vh - GAP * 2));
      style.setProperty('--md-h1', `${h}px`);
      style.setProperty('--md-x1', `${Math.round((vw - w) / 2)}px`);
      style.setProperty('--md-y1', `${Math.round((vh - h) / 2)}px`);
      style.setProperty('--md-w0', `${Math.round(t.width)}px`);
      style.setProperty('--md-h0', `${Math.round(t.height)}px`);
      style.setProperty('--md-x0', `${Math.round(t.left)}px`);
      style.setProperty('--md-y0', `${Math.round(t.top)}px`);
      style.setProperty('--md-r0', getComputedStyle(trigger).borderTopLeftRadius || '100px');

      const root = panel.parentElement;
      if (root) {
        root.style.setProperty('--md-dur', `${duration}s`);
        root.style.setProperty('--md-ease', easing);
        root.style.setProperty('--mp-dur', `${duration}s`);
        root.style.setProperty('--mp-ease', easing);
        root.style.setProperty('--mp-op0', `${edge.from.op}`);
        root.style.setProperty('--mp-blur0', `${edge.from.blur}px`);
        root.style.setProperty('--mp-y0', `${edge.from.y}px`);
        root.style.setProperty('--mp-scale0', `${edge.from.scale}`);
        root.style.setProperty('--mp-op1', `${edge.to.op}`);
        root.style.setProperty('--mp-blur1', `${edge.to.blur}px`);
        root.style.setProperty('--mp-y1', `${edge.to.y}px`);
        root.style.setProperty('--mp-scale1', `${edge.to.scale}`);
      }

      panel.classList.add('is-running');
    };

    measure();
    const first = body.querySelector('input, select, textarea');
    (first || panel).focus({ preventScroll: true });
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [panelRef, bodyRef, triggerRef, duration, easing, edge]);

  useLayoutEffect(() => {
    if (!closing) return undefined;
    const t = setTimeout(done, (duration + 0.15) * 1000);
    return () => clearTimeout(t);
  }, [closing, done, duration]);

  return (
    <div className="md-root mp-root" data-out={closing ? '1' : undefined}>
      <div className="md-scrim" aria-hidden="true" />
      <div
        ref={panelRef}
        className={`md-box mp-panel${className ? ` ${className}` : ''}`}
        role="dialog"
        aria-label={label}
        tabIndex={-1}
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget && e.animationName === 'md-shrink' && closing) done();
        }}
      >
        <div ref={bodyRef} className="md-canvas mp-body">
          {children}
        </div>
      </div>
    </div>
  );
}
