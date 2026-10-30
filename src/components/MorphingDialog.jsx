import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/*
 * Call-for-call stand-in for motion-primitives' MorphingDialog, built on measured
 * rects + CSS keyframes because this project has no animation library.
 *
 * The trigger's own rect is the start of the morph and the centred dialog rect is
 * the end, so the card really grows into the dialog instead of cross-fading. The
 * body is pinned to the dialog width inside the growing box, which stops the text
 * re-wrapping mid-flight.
 *
 * `transition={{ type:'spring', bounce, duration }}` maps to the same feel with a
 * cubic-bezier whose end control point overshoots by the requested bounce.
 */

const MdContext = createContext(null);

const GUTTER = 32;
const MAX_W = 640;

const easingFor = ({ bounce = 0.05 } = {}) =>
  `cubic-bezier(.22,.68,.16,${(1 + bounce * 0.6).toFixed(3)})`;

export function MorphingDialog({ transition, maxWidth, children }) {
  const triggerRef = useRef(null);
  const boxRef = useRef(null);
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState('idle');

  const openDialog = useCallback(() => setPhase('in'), []);
  const requestClose = useCallback(() => setPhase((p) => (p === 'idle' ? p : 'out')), []);
  const done = useCallback(() => setPhase('idle'), []);

  const open = phase !== 'idle';

  useLayoutEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, requestClose]);

  return (
    <MdContext.Provider
      value={{
        phase,
        triggerRef,
        boxRef,
        canvasRef,
        openDialog,
        requestClose,
        done,
        duration: transition?.duration ?? 0.3,
        easing: easingFor(transition),
        maxWidth,
      }}
    >
      {children}
    </MdContext.Provider>
  );
}

export function MorphingDialogTrigger({ as: Tag = 'div', children, label, className = '', ...rest }) {
  const { triggerRef, openDialog, phase } = useContext(MdContext);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (phase !== 'idle') {
      wasOpen.current = true;
    } else if (wasOpen.current) {
      wasOpen.current = false;
      /* Deferred to after the card is un-hidden, so the focus really lands. */
      triggerRef.current?.focus();
    }
  }, [phase, triggerRef]);

  return (
    <Tag
      ref={triggerRef}
      className={className}
      data-morph-open={phase === 'idle' ? undefined : ''}
      role="button"
      tabIndex={0}
      aria-haspopup="dialog"
      aria-label={label}
      onClick={openDialog}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openDialog();
        }
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function MorphingDialogContainer({ children }) {
  const md = useContext(MdContext);
  if (!md || md.phase === 'idle') return null;
  return createPortal(
    <MdFrame {...md} closing={md.phase === 'out'}>
      {children}
    </MdFrame>,
    document.body
  );
}

function MdFrame({ boxRef, canvasRef, triggerRef, closing, done, duration, easing, requestClose, maxWidth, children }) {
  useLayoutEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    const trigger = triggerRef.current;
    if (!box || !canvas || !trigger) return;

    const measure = () => {
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const w = Math.round(Math.min(maxWidth || MAX_W, vw - GUTTER));
      const maxH = vh - GUTTER;
      const from = trigger.getBoundingClientRect();
      const style = box.style;

      /* The body is pinned to the dialog width before it is measured, otherwise
         the first number reflects the card's width instead of the dialog's.
         scrollHeight, not offsetHeight: the CSS clamp on the canvas must not
         feed back into the number that sets it. */
      style.setProperty('--md-w1', `${w}px`);
      const natural = canvas.scrollHeight;
      /* Never settle for a dialog smaller than the card it grew from, or the
         morph reads as a shrink. */
      const h = Math.round(Math.min(Math.max(natural, from.height), maxH));

      style.setProperty('--md-h1', `${h}px`);
      style.setProperty('--md-x1', `${Math.round((vw - w) / 2)}px`);
      style.setProperty('--md-y1', `${Math.round((vh - h) / 2)}px`);
      style.setProperty('--md-w0', `${Math.round(from.width)}px`);
      style.setProperty('--md-h0', `${Math.round(from.height)}px`);
      style.setProperty('--md-x0', `${Math.round(from.left)}px`);
      style.setProperty('--md-y0', `${Math.round(from.top)}px`);
      style.setProperty('--md-r0', getComputedStyle(trigger).borderTopLeftRadius || '18px');

      const root = box.parentElement;
      if (root) {
        root.style.setProperty('--md-dur', `${duration}s`);
        root.style.setProperty('--md-ease', easing);
      }

      box.classList.add('is-running');
    };

    measure();
    box.focus({ preventScroll: true });
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [boxRef, canvasRef, triggerRef, duration, easing, maxWidth]);

  /* Keyboard focus stays inside the dialog while it is open. */
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;
    const focusables = () =>
      [...box.querySelectorAll('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(
        (el) => el.getClientRects().length
      );
    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (!f.length) {
        e.preventDefault();
        box.focus();
        return;
      }
      const first = f[0];
      const last = f[f.length - 1];
      const active = document.activeElement;
      if (!box.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [boxRef]);

  /* Backstop: with animations suppressed there is no end event to unmount on. */
  useLayoutEffect(() => {
    if (!closing) return undefined;
    const t = setTimeout(done, (duration + 0.15) * 1000);
    return () => clearTimeout(t);
  }, [closing, done, duration]);

  return (
    <div className="md-root" data-out={closing ? '1' : undefined}>
      <div className="md-scrim" onClick={requestClose} />
      {children}
    </div>
  );
}

export function MorphingDialogContent({ children, label, className = '' }) {
  const { boxRef, canvasRef, done, phase } = useContext(MdContext);
  return (
    <div
      ref={boxRef}
      className={`md-box${className ? ` ${className}` : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget && e.animationName === 'md-shrink' && phase === 'out') done();
      }}
    >
      <div ref={canvasRef} className="md-canvas">
        {children}
      </div>
    </div>
  );
}

/* The title and subtitle are the pieces a reader tracks across the morph, so
   they stay in flow at the top of the body; styling comes from the card classes. */
export function MorphingDialogTitle({ as: Tag = 'h2', children, className = '', ...rest }) {
  return (
    <Tag className={className} {...rest}>
      {children}
    </Tag>
  );
}

export function MorphingDialogSubtitle({ as: Tag = 'p', children, className = '', ...rest }) {
  return (
    <Tag className={className} {...rest}>
      {children}
    </Tag>
  );
}

/* motion-primitives' `disableLayoutAnimation`: the body fades and lifts in on its
   own timeline instead of being laid out with the growing box. */
export function MorphingDialogDescription({ children, className = '', ...rest }) {
  return (
    <div className={`md-desc${className ? ` ${className}` : ''}`} {...rest}>
      {children}
    </div>
  );
}

/* Portalled onto the box rather than left in the scrolling canvas, so a long
   testimonial can scroll without taking the way out with it. */
export function MorphingDialogClose() {
  const { requestClose, boxRef } = useContext(MdContext);
  const [host, setHost] = useState(null);

  useEffect(() => {
    setHost(boxRef.current);
  }, [boxRef]);

  const button = (
    <button type="button" className="md-close" aria-label="Close" onClick={requestClose}>
      <span className="md-x" aria-hidden="true" />
    </button>
  );

  return host ? createPortal(button, host) : button;
}
