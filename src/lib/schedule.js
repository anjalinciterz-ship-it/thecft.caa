import { useEffect, useState } from 'react';
import { apiRequest } from './api';

/* The invitation and its countdown sit on the same screen and ask for the same
   one class, so a request already on its way serves both. It is dropped the
   moment it lands, so a page opened later still asks afresh. */
let pending = null;

/**
 * The Wednesday Wisdom Call is a published live class on the server, not a copy
 * block: the invitation shows whatever is actually scheduled. When nothing is
 * published yet the pages keep their written invitation and the previous
 * external booking link, so a quiet schedule never becomes a dead end.
 */
export function useNextWisdomCall() {
  const [state, setState] = useState({ loading: true, next: null, failed: false });
  useEffect(() => {
    let live = true;
    if (!pending) {
      pending = apiRequest('/live-classes?series=wednesday_wisdom_call&scope=upcoming&limit=1')
        .then((data) => ({ next: data?.liveClasses?.[0] || null, failed: false }))
        .catch(() => ({ next: null, failed: true }))
        .finally(() => { pending = null; });
    }
    pending.then((result) => { if (live) setState({ loading: false, ...result }); });
    return () => { live = false; };
  }, []);
  return state;
}

/* A countdown tick reads the same two or three formats a dozen times over, and
   building an Intl.DateTimeFormat means an ICU look-up every time, so the same
   zone and shape are built once and reused. */
const forms = new Map();

function format(value, options, timeZone) {
  if (!value) return null;
  const key = `${timeZone || ''}|${JSON.stringify(options)}`;
  try {
    let form = forms.get(key);
    if (!form) {
      form = new Intl.DateTimeFormat('en-US', { ...(timeZone ? { timeZone } : {}), ...options });
      forms.set(key, form);
    }
    return form.format(new Date(value));
  } catch {
    return null;
  }
}

/** "Wednesday, 29 October" in the zone the class is actually held in. */
export const dayIn = (value, timeZone) => format(value, { weekday: 'long', month: 'long', day: 'numeric' }, timeZone);

/** "7:00 PM MST" — the zone name travels with the time, so it is never ambiguous. */
export const timeIn = (value, timeZone) => format(value, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }, timeZone);

export const visitorZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
};

/** The same instant read in the visitor's own zone — the number they set a reminder for. */
export const localTime = (value) => timeIn(value, undefined);

/**
 * One published schedule for both kinds of call: the free Wednesday class and a
 * paid appointment with Zalah are held in the same place on purpose, so every
 * invitation on the website leads into the student's own schedule. A visitor who
 * isn't signed in is taken through sign-in and back here by the dashboard guard.
 */
export const schedulePath = (tab = 'classes') => `/dashboard/calls?tab=${tab === 'bookings' ? 'bookings' : 'classes'}`;
