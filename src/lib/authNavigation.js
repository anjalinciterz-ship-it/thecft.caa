const coursePattern = /^[a-z0-9][a-z0-9-]{0,119}$/i;
const programPattern = /^[a-z0-9][a-z0-9-]{0,119}$/i;

export function safeAuthNext(value) {
  if (typeof value !== 'string' || /[\\\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    const url = new URL(value, 'https://auth.local');
    if (url.origin !== 'https://auth.local' || !value.startsWith('/') || value.startsWith('//')) return null;
    if (!/^\/(?:dashboard|admin)(?:\/[a-z0-9_-]+)*\/?$/i.test(url.pathname)
      && !/^\/course\/[a-z0-9-]+$/i.test(url.pathname)
      && url.pathname !== '/checkout') return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

/**
 * A selected course means the student was mid-enrolment: send them to the
 * review page, not the marketing page, so the price is shown before any payment.
 */
export function authDestination(search) {
  const params = new URLSearchParams(search);
  const course = params.get('course');
  if (course && coursePattern.test(course)) return `/checkout?course=${encodeURIComponent(course)}`;
  const program = params.get('program');
  if (program && programPattern.test(program)) return `/checkout?program=${encodeURIComponent(program)}`;
  return safeAuthNext(params.get('next')) || '/dashboard';
}

export function authLink(path, search) {
  const params = new URLSearchParams(search);
  const next = new URLSearchParams();
  const course = params.get('course');
  const program = params.get('program');
  if (course && coursePattern.test(course)) next.set('course', course);
  else if (program && programPattern.test(program)) next.set('program', program);
  else {
    const destination = safeAuthNext(params.get('next'));
    if (destination) next.set('next', destination);
  }
  return `${path}${next.size ? `?${next}` : ''}`;
}

const recoveryKey = 'cft.recovery-intent';
const recoveryLifetime = 30 * 60 * 1000;

function recoveryIntent(search) {
  const params = new URLSearchParams(authLink('', search));
  if (params.has('next')) {
    const url = new URL(params.get('next'), 'https://auth.local');
    for (const [key, value] of [...url.searchParams]) {
      if (!['sessionType', 'order', 'tab', 'course', 'program', 'kind', 'product', 'discount', 'status'].includes(key) || !/^[a-z0-9_-]{1,120}$/i.test(value)) url.searchParams.delete(key);
    }
    params.set('next', `${url.pathname}${url.search}`);
  }
  return params.size ? `?${params}` : '';
}

export function rememberRecoveryIntent(search, storage) {
  try {
    const store = storage || window.localStorage;
    const intent = recoveryIntent(search);
    if (intent) store.setItem(recoveryKey, JSON.stringify({ search: intent, expiresAt: Date.now() + recoveryLifetime }));
    else store.removeItem(recoveryKey);
  } catch {}
}

export function recoveryAuthSearch(search, storage) {
  const explicit = recoveryIntent(search);
  if (explicit) return explicit;
  try {
    const store = storage || window.localStorage;
    const saved = JSON.parse(store.getItem(recoveryKey));
    if (!saved || !Number.isFinite(saved.expiresAt) || saved.expiresAt <= Date.now() || saved.expiresAt > Date.now() + recoveryLifetime) {
      store.removeItem(recoveryKey);
      return '';
    }
    return typeof saved.search === 'string' ? recoveryIntent(saved.search) : '';
  } catch { return ''; }
}

export function clearRecoveryIntent(storage) {
  try { (storage || window.localStorage).removeItem(recoveryKey); } catch {}
}
