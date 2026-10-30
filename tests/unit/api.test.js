import test from 'node:test';
import assert from 'node:assert/strict';
import { apiRequest, invalidateCsrfToken } from '../../src/lib/api.js';

const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
test.afterEach(() => { test.mock.restoreAll(); invalidateCsrfToken(); });

test('API data remains unwrapped by default', async () => {
  test.mock.method(globalThis, 'fetch', async () => json({ data: { courses: [] }, meta: { total: 42 } }));
  assert.deepEqual(await apiRequest('/courses'), { courses: [] });
});
test('List consumers explicitly retain pagination metadata', async () => {
  test.mock.method(globalThis, 'fetch', async () => json({ data: { courses: [] }, meta: { total: 42, page: 2, pages: 3 } }));
  assert.deepEqual(await apiRequest('/courses?page=2', { includeMeta: true }), { data: { courses: [] }, meta: { total: 42, page: 2, pages: 3 } });
});
for (const path of ['https://example.invalid', '//example.invalid', '/../../private', '/courses#section', '/\\outside']) {
  test(`Rejects non API-relative path ${path}`, async () => {
    const fetch = test.mock.method(globalThis, 'fetch', async () => { throw new Error('Must not fetch'); });
    await assert.rejects(apiRequest(path), { code: 'INVALID_PATH' });
    assert.equal(fetch.mock.callCount(), 0);
  });
}
test('API errors preserve status and details', async () => {
  test.mock.method(globalThis, 'fetch', async () => json({ error: { code: 'invalid', message: 'Invalid title', details: [{ field: 'title' }] } }, 422));
  await assert.rejects(apiRequest('/courses'), (error) => error.status === 422 && error.message === 'Invalid title' && error.details[0].field === 'title');
});
test('Malformed success response cannot become a false success', async () => {
  test.mock.method(globalThis, 'fetch', async () => json({ success: true }));
  await assert.rejects(apiRequest('/courses'), { code: 'INVALID_RESPONSE' });
});
test('Network failure remains an explicit network error', async () => {
  test.mock.method(globalThis, 'fetch', async () => { throw new TypeError('offline'); });
  await assert.rejects(apiRequest('/courses'), { code: 'NETWORK_ERROR' });
});
test('Mutations obtain CSRF, send cookies and prevent redirects', async () => {
  const calls = [];
  test.mock.method(globalThis, 'fetch', async (url, options) => { calls.push({ url, options }); return json(url.endsWith('/csrf') ? { data: { csrfToken: 'test-csrf-token' } } : { data: { saved: true } }); });
  await apiRequest('/users/me', { method: 'PATCH', body: { name: 'Saved Name' } });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].options.headers.get('x-csrf-token'), 'test-csrf-token');
  assert.equal(calls[1].options.credentials, 'include');
  assert.equal(calls[1].options.redirect, 'error');
  assert.deepEqual(JSON.parse(calls[1].options.body), { name: 'Saved Name' });
});
test('Aborted requests never reach the network', async () => {
  const controller = new AbortController(); controller.abort();
  const fetch = test.mock.method(globalThis, 'fetch', async () => { throw new Error('Must not fetch'); });
  await assert.rejects(apiRequest('/courses', { signal: controller.signal }), { code: 'ABORTED' });
  assert.equal(fetch.mock.callCount(), 0);
});
