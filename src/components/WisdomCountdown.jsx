import { useEffect, useState } from 'react';
import { Icon } from './icons';
import { dayIn, localTime, timeIn, useNextWisdomCall, visitorZone } from '../lib/schedule';

// Only the placeholder before a class is actually published on the server.
const TZ = 'America/Edmonton';
const START_HOUR = 19;
const WEDNESDAY = 3;

const clock = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});
const longDay = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'long', month: 'long', day: 'numeric' });

function fields(instant) {
  const out = {};
  for (const { type, value } of clock.formatToParts(new Date(instant))) out[type] = value;
  return out;
}

function offsetSeconds(instant) {
  const p = fields(instant);
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUTC - instant) / 1000);
}

/* 19:00 on an Edmonton calendar day, resolved to a real instant so the Mountain Time DST shifts are honoured. */
function wallToInstant(y, m, d, hh) {
  const naive = Date.UTC(y, m - 1, d, hh, 0, 0);
  const once = naive - offsetSeconds(naive) * 1000;
  return naive - offsetSeconds(once) * 1000;
}

export function nextWisdomCall(from = Date.now()) {
  const p = fields(from);
  const midnight = Date.UTC(+p.year, +p.month - 1, +p.day);
  for (let add = 0; add <= 7; add += 1) {
    const day = new Date(midnight + add * 86400000);
    if (day.getUTCDay() !== WEDNESDAY) continue;
    const at = wallToInstant(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), START_HOUR);
    if (at > from) return at;
  }
  return from + 7 * 86400000;
}

export default function WisdomCountdown({ heading = 'The next call starts in', variant = 'inline' }) {
  const { next } = useNextWisdomCall();
  const publishedAt = next ? new Date(next.startAt).getTime() : null;
  const [target, setTarget] = useState(() => publishedAt || nextWisdomCall());
  const [now, setNow] = useState(() => Date.now());

  // The published schedule wins as soon as it arrives; the computed Wednesday is
  // only the placeholder shown before anyone has published a class.
  useEffect(() => { if (publishedAt) setTarget(publishedAt); }, [publishedAt]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (publishedAt || target - now > 0) return;
    setTarget(nextWisdomCall(Date.now() + 1000));
  }, [publishedAt, target, now]);

  const zone = next?.timeZone || TZ;
  const day = dayIn(target, zone) || longDay.format(target);
  const held = timeIn(target, zone) || '7:00 PM Mountain Time';
  const mine = visitorZone() && visitorZone() !== zone ? localTime(target) : null;

  const total = Math.max(0, Math.floor((target - now) / 1000));
  const units = [
    [Math.floor(total / 86400), 'Days'],
    [Math.floor(total / 3600) % 24, 'Hours'],
    [Math.floor(total / 60) % 60, 'Minutes'],
    [total % 60, 'Seconds'],
  ];

  if (variant === 'card') {
    return (
      <div className="wc2-count">
        <span className="wc2-count-badge" aria-hidden="true">
          <Icon name="calendar" size={26} />
        </span>
        {heading ? (
          <p className="wc2-count-head">
            <i aria-hidden="true" />
            {heading}
            <i aria-hidden="true" />
          </p>
        ) : null}
        <div className="wc2-tiles" role="timer" aria-live="off">
          {units.map(([value, label]) => (
            <div className="wc2-tile" key={label}>
              <b>{String(value).padStart(2, '0')}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <p className="wc2-when">
          <Icon name="calendar" size={16} />
          <b>{day}</b>
          <i aria-hidden="true" />
          <span>{held}</span>
          {mine && <em>· {mine} your time</em>}
        </p>
      </div>
    );
  }

  return (
    <div className="wc-count">
      {heading ? <p className="wc-count-head">{heading}</p> : null}
      <div className="wc-tiles" role="timer" aria-live="off">
        {units.map(([value, label]) => (
          <div className="wc-tile" key={label}>
            <b>{String(value).padStart(2, '0')}</b>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <p className="wc-when">
        {day} · {held}{mine ? ` · ${mine} your time` : ''}
      </p>
    </div>
  );
}
