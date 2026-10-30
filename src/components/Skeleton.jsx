import { useEffect, useRef, useState } from 'react';

// Loading states for the two things that genuinely resolve later in this app:
// image bytes, and an article body that ships as its own lazy chunk.
function Skeleton({ lines = 1, widths, className = '' }) {
  if (lines > 1) {
    return (
      <span className={`sk-stack ${className}`} aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => (
          <span
            key={i}
            className="sk"
            style={{ width: (widths && widths[i]) || (i === lines - 1 ? '62%' : '100%') }}
          />
        ))}
      </span>
    );
  }
  return <span className={`sk ${className}`} aria-hidden="true" />;
}

// The image keeps its own class so existing layout rules still apply; the
// placeholder is its sibling and only lives until the bytes arrive.
export function SkeletonImage({ className = '', ...imgProps }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth > 0) setReady(true);
  }, []);

  const cls = [className, imgProps.className].filter(Boolean).join(' ');

  return (
    <>
      <img
        {...imgProps}
        ref={ref}
        {...(cls ? { className: cls } : null)}
        onLoad={() => setReady(true)}
        onError={() => setReady(true)}
      />
      {!ready && <span className="sk sk-cover" aria-hidden="true" />}
    </>
  );
}

export function SkeletonArticle() {
  return (
    <div className="sk-article" role="status" aria-label="Loading article">
      <Skeleton lines={2} widths={['88%', '54%']} className="sk-article-title" />
      <Skeleton lines={6} className="sk-article-body" />
      <Skeleton lines={5} className="sk-article-body" />
    </div>
  );
}
