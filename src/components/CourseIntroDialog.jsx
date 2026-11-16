import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { VideoSlot } from './ProtectedMedia';

/*
 * The detailed description popup on a course page. It carries the introduction
 * film that used to sit in its own band on the page, and opens from either the
 * banner or the large button, so it is driven by page state rather than the
 * single-trigger MorphingDialog.
 */
export default function CourseIntroDialog({ open, onClose, course }) {
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    boxRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="cd-modal">
      <div className="cd-scrim" onClick={onClose} />
      <div
        ref={boxRef}
        className="cd-box"
        role="dialog"
        aria-modal="true"
        aria-label={`${course.name}, detailed description`}
        tabIndex={-1}
      >
        <button type="button" className="cd-close" aria-label="Close" onClick={onClose}>
          <span className="md-x" aria-hidden="true" />
        </button>
        <p className="cd-kicker">A Transformative Journey</p>
        <h2 className="cd-title">{course.name}</h2>
        <div className="cd-video">
          <VideoSlot
            src={course.introVideo?.src}
            poster={course.introVideo?.poster}
            guid={course.introVideo?.guid}
            title={`${course.name} introduction`}
            autoPlay
          />
        </div>
        <p className="cd-note">
          Watch the introduction, then use the cross to head back to this page.
        </p>
      </div>
    </div>,
    document.body
  );
}
