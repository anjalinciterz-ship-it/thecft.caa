import { test, expect } from './fixtures.js';
import { SiteSettings } from '../../../backend/src/models/index.js';

async function setAppearance({ toggleEnabled = true, defaultTheme = 'dark' } = {}) {
  await SiteSettings.updateOne(
    {},
    { $set: { 'appearance.toggleEnabled': toggleEnabled, 'appearance.defaultTheme': defaultTheme } },
    { upsert: true },
  );
}

const theme = (page) => page.evaluate(() => document.documentElement.dataset.theme);
const painted = (page, selector, property) => page.evaluate(
  ([sel, prop]) => {
    const el = document.querySelector(sel);
    return el ? getComputedStyle(el)[prop] : null;
  },
  [selector, property],
);

test('the site default opens the page and the visitor choice is remembered afterwards', async ({ page }) => {
  await setAppearance({ defaultTheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('.appearance-toggle')).toBeVisible();
  expect(await theme(page)).toBe('dark');

  await page.locator('.appearance-toggle').click();
  await expect.poll(() => theme(page)).toBe('light');
  expect(await page.evaluate(() => localStorage.getItem('cft-appearance'))).toBe('light');

  await page.reload({ waitUntil: 'networkidle' });
  expect(await theme(page)).toBe('light');

  await page.locator('.appearance-toggle').click();
  await expect.poll(() => theme(page)).toBe('dark');
  expect(await page.evaluate(() => localStorage.getItem('cft-appearance'))).toBe('dark');
});

test('a system default follows the device until the visitor picks', async ({ page }) => {
  await setAppearance({ defaultTheme: 'system' });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await expect.poll(() => theme(page)).toBe('light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.reload({ waitUntil: 'networkidle' });
  await expect.poll(() => theme(page)).toBe('dark');
  await page.evaluate(() => localStorage.setItem('cft-appearance', 'light'));
  await page.reload({ waitUntil: 'networkidle' });
  expect(await theme(page)).toBe('light');
});

test('light paints the paper canvas while the cosmic bands keep their night text', async ({ page }) => {
  await setAppearance({ defaultTheme: 'light' });
  await page.goto('/');
  await expect.poll(() => theme(page)).toBe('light');

  expect(await painted(page, 'body', 'backgroundColor')).toBe('rgb(255, 255, 255)');
  expect(await painted(page, 'body', 'color')).toBe('rgb(18, 10, 36)');
  // The hero stays a night sky, so its own text stays light.
  expect(await painted(page, '.hero-band', 'backgroundColor')).toBe('rgb(18, 10, 36)');
  expect(await painted(page, '.hero-lead', 'color')).toBe('rgba(237, 231, 245, 0.9)');
  // A paper band reads in plum.
  expect(await painted(page, '.jy-band h2, .jy-band .jy-title', 'color')).toBe('rgb(18, 10, 36)');
});

test('hiding the control does not change what either appearance shows', async ({ page }) => {
  await setAppearance({ toggleEnabled: false, defaultTheme: 'light' });
  await page.goto('/courses');
  await expect.poll(() => theme(page)).toBe('light');
  await expect(page.locator('.appearance-toggle')).toHaveCount(0);
  // Same programs, same prices, same calls — only the switch is gone.
  await expect(page.getByRole('link', { name: /Open course|Enrol|View|Explore/i })).not.toHaveCount(0);
  expect(await painted(page, 'body', 'backgroundColor')).toBe('rgb(255, 255, 255)');

  await setAppearance({ toggleEnabled: false, defaultTheme: 'dark' });
  await page.reload({ waitUntil: 'networkidle' });
  await expect.poll(() => theme(page)).toBe('dark');
  expect(await painted(page, 'body', 'backgroundColor')).toBe('rgb(26, 16, 51)');
});
