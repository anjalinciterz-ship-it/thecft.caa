import test from 'node:test';
import assert from 'node:assert/strict';
import { authDestination, authLink, safeAuthNext, rememberRecoveryIntent, recoveryAuthSearch, clearRecoveryIntent } from '../../src/lib/authNavigation.js';

test('Selected course returns to its purchase review page instead of the dashboard', () => {
  assert.equal(authDestination('?course=accelerator'), '/checkout?course=accelerator');
  assert.equal(authDestination('?course=spiritual-awakening-1'), '/checkout?course=spiritual-awakening-1');
  assert.equal(authDestination('?program=complete'), '/checkout?program=complete');
});
test('Login, signup and recovery links preserve only valid intent', () => {
  for (const page of ['/login', '/signup', '/forgot-password']) {
    assert.equal(authLink(page, '?course=sa1&token=secret'), `${page}?course=sa1`);
    assert.equal(authLink(page, '?program=mindlife&token=secret'), `${page}?program=mindlife`);
  }
  assert.equal(authDestination(authLink('/login', '?next=%2Fdashboard%2Fcourses%2Fexample').split('?')[1]), '/dashboard/courses/example');
  assert.equal(authDestination(authLink('/login', '?next=%2Fcheckout%3Fcourse%3Dsa1').split('?')[1]), '/checkout?course=sa1');
});
test('Course identifiers cannot inject paths or query strings', () => {
  for (const course of ['../login', '//outside.test', 'sa1?next=/admin', 'sa1#section', 'a'.repeat(121)]) {
    assert.equal(authDestination(`?course=${encodeURIComponent(course)}`), '/dashboard');
  }
  for (const program of ['../login', 'life?next=/admin', 'a'.repeat(121)]) {
    assert.equal(authDestination(`?program=${encodeURIComponent(program)}`), '/dashboard');
  }
});
for (const next of ['https://outside.test', '//outside.test', '/\\outside.test', '/login', '/signup', '/dashboard/../../login', '/dashboard/%2f%2foutside.test', '/dashboard\n']) {
  test(`Rejects unsafe authentication destination ${JSON.stringify(next)}`, () => {
    assert.equal(safeAuthNext(next), null);
    assert.equal(authDestination(`?next=${encodeURIComponent(next)}`), '/dashboard');
  });
}
test('Known internal destinations and their query parameters survive', () => {
  assert.equal(safeAuthNext('/dashboard/orders?order=example'), '/dashboard/orders?order=example');
  assert.equal(safeAuthNext('/admin/courses'), '/admin/courses');
  assert.equal(authLink('/login', '?next=https://outside.test&unrelated=1'), '/login');
});

function storage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}

test('Recovery remembers only the destination, never the token or email', () => {
  const store = storage();
  rememberRecoveryIntent('?course=sa1&token=secret&email=private@example.test', store);
  assert.equal(recoveryAuthSearch('?token=reset-secret', store), '?course=sa1');
  assert.equal(store.getItem('cft.recovery-intent').includes('secret'), false);
  assert.equal(store.getItem('cft.recovery-intent').includes('private'), false);
  assert.equal(recoveryAuthSearch('?course=sa2', store), '?course=sa2');
  clearRecoveryIntent(store);
  assert.equal(recoveryAuthSearch('', store), '');
});

test('Recovery keeps session selection but removes sensitive nested queries', () => {
  const store = storage();
  rememberRecoveryIntent('?next=' + encodeURIComponent('/dashboard/bookings?sessionType=abc123&token=secret&email=private'), store);
  assert.equal(authDestination(recoveryAuthSearch('', store)), '/dashboard/bookings?sessionType=abc123');
  assert.equal(store.getItem('cft.recovery-intent').includes('secret'), false);
});

test('Expired, malformed and unsafe stored recovery destinations are ignored', () => {
  const store = storage();
  for (const raw of ['bad-json', JSON.stringify({ search: '?course=sa1', expiresAt: Date.now() - 1 }), JSON.stringify({ search: '?next=https://outside.test', expiresAt: Date.now() + 60000 })]) {
    store.setItem('cft.recovery-intent', raw);
    assert.equal(recoveryAuthSearch('', store), '');
  }
  rememberRecoveryIntent('?course=sa1', store);
  rememberRecoveryIntent('', store);
  assert.equal(recoveryAuthSearch('', store), '');
});

test('Blocked browser storage cannot break password recovery', () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  assert.doesNotThrow(() => rememberRecoveryIntent('?course=sa1', blocked));
  assert.equal(recoveryAuthSearch('', blocked), '');
  assert.doesNotThrow(() => clearRecoveryIntent(blocked));
});
