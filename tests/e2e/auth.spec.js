import AxeBuilder from '@axe-core/playwright';
import { randomUUID } from 'node:crypto';
import { test, expect, signIn } from './fixtures.js';
import { VerificationToken } from '../../../backend/src/models/index.js';
import { issuePasswordResetToken } from '../../../backend/src/services/recovery.service.js';

const NEW_PASSWORD = 'Recovered-Browser-Password-98!';

test('Login offers a real recovery page instead of a mail link', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Password', exact: true }).click();
  const forgot = page.getByRole('link', { name: 'Forgot password?' });
  await expect(forgot).toHaveAttribute('href', '/forgot-password');
  await forgot.click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('.site-header, .site-footer')).toHaveCount(0);
});

test('Requesting a link stores one for a real account and nothing for an unknown address', async ({ page, accounts }) => {
  await page.goto('/forgot-password');
  await page.locator('#au-email').fill(accounts.student.email);
  await page.getByRole('button', { name: 'Email me a reset link' }).click();
  await expect(page.getByText('Check your inbox')).toBeVisible();
  expect(await VerificationToken.countDocuments({ user: accounts.student._id, purpose: 'password_reset' })).toBe(1);

  // The visible answer must be identical, or the page becomes an account probe.
  const stored = await VerificationToken.countDocuments();
  await page.goto('/forgot-password');
  await page.locator('#au-email').fill(`nobody-${randomUUID()}@payments.test`);
  await page.getByRole('button', { name: 'Email me a reset link' }).click();
  await expect(page.getByText('Check your inbox')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(await VerificationToken.countDocuments()).toBe(stored);
});

test('A member recovers through the browser, then signs in only with the new password', async ({ page, accounts }) => {
  const token = await issuePasswordResetToken(accounts.student);
  await page.goto(`/reset-password?token=${token}`);
  await page.locator('#au-password').fill(NEW_PASSWORD);
  await page.locator('#au-confirm').fill(NEW_PASSWORD);
  await page.getByRole('button', { name: 'Save new password' }).click();

  await expect(page.getByText('Your new password is live')).toBeVisible();
  // A spent link must not linger in the address bar or in browser history.
  await expect(page).toHaveURL(/\/reset-password$/);
  expect(await VerificationToken.countDocuments({ user: accounts.student._id })).toBe(0);

  await page.getByRole('link', { name: 'Go to sign in' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole('button', { name: 'Password', exact: true }).click();
  await page.locator('#au-identifier').fill(accounts.student.email);
  await page.locator('#au-password').fill('Browser-Test-Password-123!');
  await page.locator('.au-submit').click();
  await expect(page.locator('form [role="alert"]')).toContainText(/password is incorrect/i);

  await signIn(page, accounts.student, NEW_PASSWORD);
});

test('A stale or missing link explains itself and offers a new request', async ({ page }) => {
  await page.goto('/reset-password');
  await expect(page.getByText('This link is incomplete')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save new password' })).toHaveCount(0);

  await page.goto('/reset-password?token=not-a-real-token-value-00000000');
  await page.locator('#au-password').fill(NEW_PASSWORD);
  await page.locator('#au-confirm').fill(NEW_PASSWORD);
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.getByRole('alert')).toContainText('That link no longer works');
  await expect(page.getByRole('link', { name: 'Request a new link' })).toBeVisible();
});

test('A mismatched confirmation is caught before the request leaves the page', async ({ page, accounts }) => {
  const token = await issuePasswordResetToken(accounts.student);
  await page.goto(`/reset-password?token=${token}`);
  await page.locator('#au-password').fill(NEW_PASSWORD);
  await page.locator('#au-confirm').fill(`${NEW_PASSWORD}x`);
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.getByRole('alert')).toContainText('Passwords do not match');

  const row = await VerificationToken.findOne({ user: accounts.student._id });
  expect(row.consumedAt, 'a rejected attempt must not spend the link').toBeUndefined();
});

for (const path of ['/forgot-password', '/reset-password']) {
  test(`${path} has no serious or critical automated accessibility violations`, async ({ page }, testInfo) => {
    await page.goto(path);
    await expect(page.locator('.au-card')).toBeVisible();
    const result = await new AxeBuilder({ page }).analyze();
    await testInfo.attach('accessibility', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
    expect(result.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))).toEqual([]);
  });
}
