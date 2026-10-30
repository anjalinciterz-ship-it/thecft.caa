import { Link } from 'react-router-dom';
import { Icon } from './icons';
import { site } from '../data/site';
import { useAuth } from '../lib/auth';
import { dayIn, localTime, schedulePath, timeIn, visitorZone } from '../lib/schedule';

/** A published schedule is an internal journey; without one the invitation still reaches the facilitator. */
function Cta({ to, href, className, children }) {
  const arrow = <Icon name="arrow" size={15} />;
  if (to) {
    return (
      <Link to={to} className={className}>
        {children} {arrow}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {children} {arrow}
    </a>
  );
}

/**
 * A published Wednesday class makes the site's own schedule the booking path —
 * free calls and paid appointments live in one place. Until a class is
 * published the invitation keeps using the facilitator's existing link, so the
 * page is never left without a way in.
 */
export function WisdomCallCta({ next, children = 'Reserve Your Free Spot', className = 'btn btn-gold' }) {
  return (
    <Cta to={next ? schedulePath('classes') : undefined} href={site.calendly} className={className}>
      {children}
    </Cta>
  );
}

/** Personal time with Zalah is booked on the same schedule the free class uses. */
export function BookCallCta({ children = 'Book a Call', className = 'btn btn-gold' }) {
  return <Cta to={schedulePath('bookings')} className={className}>{children}</Cta>;
}

/** The written invitation says "every Wednesday, 7:00 PM"; this is the date people can put in a diary. */
export function NextCallNotice({ next, className = 'wp-hero-fine' }) {
  if (!next) return null;
  const zone = visitorZone();
  const mine = zone && zone !== next.timeZone ? ` · ${localTime(next.startAt)} your time` : '';
  return (
    <p className={className}>
      Next live session: {dayIn(next.startAt, next.timeZone)} · {timeIn(next.startAt, next.timeZone)}
      {mine}
    </p>
  );
}
