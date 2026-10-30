import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './icons';
import { SkeletonImage } from './Skeleton';

export default function JourneyCard({ journey, enter, delay = 0 }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!enter) return undefined;
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -6% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [enter]);

  return (
    <Link
      ref={ref}
      to={`/journey/${journey.slug}`}
      className={`journey-card${enter ? ` is-enter${shown ? ' is-in' : ''}` : ''}`}
      {...(enter ? { 'data-enter': enter, style: { '--jd': `${delay}ms` } } : null)}
    >
      <SkeletonImage
        className="journey-card-bg"
        src={journey.imageSmall}
        srcSet={`${journey.imageSmall} 760w, ${journey.image} 1400w`}
        sizes="(max-width: 640px) 100vw, (max-width: 980px) 50vw, 330px"
        alt=""
        loading="lazy"
        style={{ objectPosition: journey.focus }}
      />
      <span className="journey-card-veil" aria-hidden="true" />
      <span className="journey-card-icon">
        <Icon name={journey.icon} size={26} />
      </span>
      <div className="journey-card-body">
        <span className="num">{journey.num}</span>
        <h3>{journey.title}</h3>
        <p>{journey.text}</p>
        <span className="card-cta">
          Learn More <Icon name="arrow" size={16} />
        </span>
      </div>
    </Link>
  );
}
