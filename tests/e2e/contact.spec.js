import { randomUUID } from 'node:crypto';
import { test, expect } from './fixtures.js';
import { ContactRequest } from '../../../backend/src/models/index.js';

async function fillContact(page, email) {
  await page.getByLabel('First Name *', { exact: true }).fill('Contact');
  await page.getByLabel('Last Name *', { exact: true }).fill('Browser Member');
  await page.locator('#cn-email').fill(email);
  await page.locator('#cn-subject').selectOption({ index: 1 });
  await page.locator('#cn-message').fill('Please help me choose the right course for my learning journey.');
}

test('Connect form stores a message and explicit new submission creates a new record', async ({ page, platform }) => {
  const email = `contact-${randomUUID()}@example.test`;
  await page.goto('/connect'); await fillContact(page, email);
  await page.getByRole('button', { name: 'Send Message' }).click();
  await expect(page.locator('.cn-sent')).toContainText('Your message is with the CFT team');
  expect(await ContactRequest.countDocuments({ email })).toBe(1);
  await page.getByRole('button', { name: 'Send another message' }).click();
  await fillContact(page, email); await page.getByRole('button', { name: 'Send Message' }).click();
  await expect(page.locator('.cn-sent')).toBeVisible();
  expect(await ContactRequest.countDocuments({ email })).toBe(2);
});

test('Connect shows validation errors without creating a message', async ({ page, platform }) => {
  const before = await ContactRequest.countDocuments();
  await page.goto('/connect'); await page.getByRole('button', { name: 'Send Message' }).click();
  await expect(page.locator('.cn-form-err')).toContainText('Please fix the highlighted fields');
  await expect(page.locator('#cn-first')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('.cn-sent')).toHaveCount(0);
  expect(await ContactRequest.countDocuments()).toBe(before);
});

test('Contact transport failure after saving retries the same request without duplication', async ({ page, platform }) => {
  const email = `retry-${randomUUID()}@example.test`;
  let originalKey;
  await page.route('**/api/v1/contact', async (route) => {
    originalKey = route.request().headers()['idempotency-key'];
    const response = await route.fetch(); expect(response.status()).toBe(201);
    await route.abort('connectionfailed');
  });
  await page.goto('/connect'); await fillContact(page, email);
  await page.getByRole('button', { name: 'Send Message' }).click();
  await expect(page.locator('.cn-form-err')).toBeVisible();
  await expect(page.locator('.cn-sent')).toHaveCount(0);
  expect(await ContactRequest.countDocuments({ email })).toBe(1);
  await page.unroute('**/api/v1/contact');
  const retry = page.waitForRequest((request) => request.url().endsWith('/api/v1/contact') && request.method() === 'POST');
  await page.getByRole('button', { name: 'Send Message' }).click();
  expect((await retry).headers()['idempotency-key']).toBe(originalKey);
  await expect(page.locator('.cn-sent')).toBeVisible();
  expect(await ContactRequest.countDocuments({ email })).toBe(1);
});

test('Homepage contact dialog persists all fields and confirms only after saving', async ({ page, platform }) => {
  const email = `home-${randomUUID()}@example.test`;
  await page.goto('/'); await page.getByRole('button', { name: 'Open the Form' }).click();
  const dialog = page.getByRole('dialog', { name: 'Send us a message' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Your name').fill('Home Browser Member');
  await dialog.getByLabel('Email address').fill(email);
  await dialog.getByLabel('Subject', { exact: true }).selectOption({ index: 1 });
  await dialog.getByLabel('Your message').fill('Please tell me more about the published courses.');
  await dialog.getByRole('button', { name: 'Send Message' }).click();
  await expect(page.locator('.cx-thanks')).toHaveAttribute('role', 'status');
  const stored = await ContactRequest.findOne({ email });
  expect(stored.name).toBe('Home Browser Member'); expect(stored.subject).toBeTruthy(); expect(stored.message).toContain('published courses');
});

test('Homepage contact errors retain entered fields and allow retry', async ({ page, platform }) => {
  const email = `home-error-${randomUUID()}@example.test`;
  await page.route('**/api/v1/contact', (route) => route.fulfill({ status: 503, json: { error: { message: 'Contact storage unavailable' } } }));
  await page.goto('/'); await page.getByRole('button', { name: 'Open the Form' }).click();
  const dialog = page.getByRole('dialog', { name: 'Send us a message' });
  await dialog.getByLabel('Your name').fill('Retry Browser Member'); await dialog.getByLabel('Email address').fill(email);
  await dialog.getByLabel('Subject', { exact: true }).selectOption({ index: 1 });
  await dialog.getByLabel('Your message').fill('This message should remain visible until it is saved.');
  await dialog.getByRole('button', { name: 'Send Message' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Contact storage unavailable');
  await expect(dialog.getByLabel('Email address')).toHaveValue(email); expect(await ContactRequest.countDocuments({ email })).toBe(0);
  await page.unroute('**/api/v1/contact'); await dialog.getByRole('button', { name: 'Send Message' }).click();
  await expect(page.locator('.cx-thanks')).toBeVisible(); expect(await ContactRequest.countDocuments({ email })).toBe(1);
});
