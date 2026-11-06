// When the frontend and API live on different hosts (Netlify + Render), the
// API origin comes from VITE_API_BASE with no trailing slash. Unset, it falls
// back to same-origin, which is what the local stack and the old deploys use.
export const API_ORIGIN = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');
const API_PREFIX = '/api/v1';
// One builder for every API URL so a bare href or fetch cannot skip the origin
// and quietly hit the frontend host instead of the API.
export const apiUrl = (path) => `${API_ORIGIN}${API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
let csrfToken = null;
let csrfRequest = null;
let csrfGeneration = 0;

export class ApiError extends Error {
  constructor(code, status, message, details = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/** A 422 is only useful once the failing field is named. */
function describeFailure(message, details) {
  const issues = Array.isArray(details) ? details : details?.issues || details?.details;
  const first = Array.isArray(issues) ? issues[0] : null;
  if (!first || typeof first.message !== 'string') return message;
  const field = Array.isArray(first.path) ? first.path.join('.') : (first.path || first.field || 'form');
  return `${message}: ${field}, ${first.message}${issues.length > 1 ? ` (+${issues.length - 1} more)` : ''}`;
}

export function invalidateCsrfToken() {
  csrfToken = null;
  csrfRequest = null;
  csrfGeneration += 1;
}

function aborted() {
  return new ApiError('ABORTED', 0, 'The request was cancelled.');
}

async function request(path, options, includeMeta = false) {
  let response;
  try {
    response = await fetch(apiUrl(path), { ...options, credentials: 'include' });
  } catch (error) {
    if (options.signal?.aborted || error.name === 'AbortError') throw aborted();
    throw new ApiError('NETWORK_ERROR', 0, 'Unable to connect. Please check your connection and try again.');
  }

  let payload;
  try {
    payload = response.status === 204 ? null : await response.json();
  } catch (error) {
    if (options.signal?.aborted || error.name === 'AbortError') throw aborted();
    throw new ApiError('INVALID_RESPONSE', response.status, 'The server returned an unreadable response. Please try again.');
  }

  if (!response.ok) {
    const error = payload?.error;
    const details = error?.details ?? payload?.details ?? null;
    throw new ApiError(
      error?.code || payload?.code || 'REQUEST_FAILED',
      response.status,
      describeFailure(error?.message || payload?.message || 'The request could not be completed. Please try again.', details),
      details,
    );
  }
  if (response.status === 204) return null;
  if (!payload || !Object.prototype.hasOwnProperty.call(payload, 'data')) {
    throw new ApiError('INVALID_RESPONSE', response.status, 'The server returned an unexpected response.');
  }
  return includeMeta ? { data: payload.data, meta: payload.meta || null } : payload.data;
}

function getCsrfToken() {
  if (csrfToken) return Promise.resolve(csrfToken);
  if (!csrfRequest) {
    const generation = csrfGeneration;
    const pending = request('/auth/csrf', { method: 'GET', headers: { Accept: 'application/json' } })
      .then((data) => {
        const token = data?.csrfToken ?? data?.token;
        if (typeof token !== 'string' || !token) {
          throw new ApiError('CSRF_UNAVAILABLE', 200, 'Unable to establish a secure session. Please reload and try again.');
        }
        if (generation !== csrfGeneration) throw aborted();
        csrfToken = token;
        return token;
      })
      .finally(() => {
        if (csrfRequest === pending) csrfRequest = null;
      });
    csrfRequest = pending;
  }
  return csrfRequest;
}

// Cancelling one caller must not cancel the shared CSRF request for other callers.
function withSignal(promise, signal) {
  if (!signal) return promise;
  return new Promise((resolve, reject) => {
    const cancel = () => reject(aborted());
    if (signal.aborted) cancel();
    else signal.addEventListener('abort', cancel, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', cancel);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener('abort', cancel);
        reject(error);
      },
    );
  });
}

export async function apiRequest(path, { method = 'GET', body, signal, headers: suppliedHeaders, includeMeta = false, ...options } = {}) {
  // Only accept API-relative paths; cookies and CSRF headers never go to another origin.
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || /[\\#]/.test(path)
    || new URL(`${API_PREFIX}${path}`, 'http://api.local').pathname.indexOf(`${API_PREFIX}/`) !== 0) {
    throw new ApiError('INVALID_PATH', 0, 'An API-relative path is required.');
  }
  if (signal?.aborted) throw aborted();
  const verb = method.toUpperCase();
  const headers = new Headers(suppliedHeaders);
  headers.set('Accept', 'application/json');
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isForm) headers.set('Content-Type', 'application/json');

  try {
    if (!SAFE_METHODS.has(verb)) {
      headers.set('x-csrf-token', await withSignal(getCsrfToken(), signal));
    }
    if (signal?.aborted) throw aborted();
    return await request(path, {
      ...options,
      method: verb,
      headers,
      signal,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      redirect: 'error',
    }, includeMeta);
  } catch (error) {
    if (error.status === 403 && String(error.code).toLowerCase().includes('csrf')) invalidateCsrfToken();
    throw error;
  } finally {
    if (path.split('?')[0] === '/auth/logout' && !SAFE_METHODS.has(verb)) invalidateCsrfToken();
  }
}
