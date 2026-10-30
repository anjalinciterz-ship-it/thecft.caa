import { randomUUID } from 'node:crypto';
import { test, expect, signIn } from './fixtures.js';
import { User, SessionType, Availability, BlockedDate, Booking, LiveClass } from '../../../backend/src/models/index.js';

// The scheduling screens run inside the real administration shell, so these
// checks also prove the /admin routes and sidebar wiring reach each screen.
const routes = { schedule: '/admin/schedule', bookings: '/admin/bookings', live: '/admin/live-classes' };
const gotoView = async (page, view, query = '') => {
  await page.goto(routes[view] + query);
  await expect(page.locator('.db-content')).toBeVisible();
};

// Every scheduling mutation routes through window.confirm first; accept it so the
// guarded action proceeds exactly as a human clicking "OK" would.
const acceptDialogs = (page) => { page.on('dialog', (dialog) => dialog.accept()); };
const actionStatus = (page) => page.locator('[role="status"]:not(.db-loading)');
const notice = (page, text) => actionStatus(page).filter({ hasText: text });
const form = (page, name) => page.getByRole('form', { name, exact: true });
const stamp = () => randomUUID().split('-')[0];

const pad = (n) => String(n).padStart(2, '0');
const isoDay = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const isoLocal = (d) => `${isoDay(d)}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
const HOURS = 'America/Denver';

test('the schedule screen loads persisted records with no public-website chrome', async ({ page, accounts }) => {
  await signIn(page, accounts.admin);
  await gotoView(page, 'schedule');
  await expect(page.getByRole('heading', { name: 'Schedule setup' })).toBeVisible();
  // Real admin content area, driven by a real API response, never the public site.
  await expect(page.locator('.site-header, .site-footer, nav[aria-label="Primary"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Session types' })).toHaveCount(1);
  // Session types list reflects the database (empty here): an honest empty state, not fake rows.
  await expect(page.getByText('No session types yet')).toBeVisible();
});

test('a session type created through the UI persists in Mongo and survives a reload', async ({ page, accounts }) => {
  const slug = `wisdom-${stamp()}`;
  await signIn(page, accounts.admin);
  acceptDialogs(page);
  await gotoView(page, 'schedule');

  const create = form(page, 'Create session type');
  await create.getByLabel('Session type name', { exact: true }).fill(`Wisdom Call ${slug}`);
  await create.getByLabel('Session type slug', { exact: true }).fill(slug);
  await create.getByLabel('Default duration (minutes)', { exact: true }).fill('60');
  await create.getByRole('button', { name: 'Create session type' }).click();

  await expect(actionStatus(page)).toContainText('saved');
  await expect(page.getByRole('row').filter({ hasText: `Wisdom Call ${slug}` })).toBeVisible();

  const stored = await SessionType.findOne({ slug });
  expect(stored, 'session type written through the UI is persisted').not.toBeNull();
  expect(stored.durationMinutes).toBe(60);
  expect(stored.active).toBe(true);

  await page.reload();
  await expect(page.getByRole('row').filter({ hasText: `Wisdom Call ${slug}` })).toBeVisible();
});

test('an availability window created through the UI persists and survives a reload', async ({ page, accounts }) => {
  await signIn(page, accounts.admin);
  acceptDialogs(page);
  await gotoView(page, 'schedule', '?section=availability');

  const create = form(page, 'Create availability window');
  await create.locator('select[name="weekday"]').selectOption('1'); // Monday
  await create.locator('input[name="start"]').fill('09:00');
  await create.locator('input[name="end"]').fill('17:00');
  await create.locator('input[name="slotMinutes"]').fill('60');
  await create.locator('input[name="timeZone"]').fill(HOURS);
  await create.getByRole('button', { name: 'Create availability window' }).click();

  await expect(actionStatus(page)).toContainText('Availability window saved');
  await expect(page.getByRole('row').filter({ hasText: '09:00–17:00' })).toBeVisible();

  const stored = await Availability.findOne({ weekday: 1, startMinutes: 540, endMinutes: 1020, timeZone: HOURS });
  expect(stored).not.toBeNull();

  await page.reload();
  await expect(page.getByRole('row').filter({ hasText: '09:00–17:00' })).toBeVisible();
});

test('a blocked date created through the UI persists and survives a reload', async ({ page, accounts }) => {
  const day = isoDay(new Date(Date.now() + 45 * 86400000));
  await signIn(page, accounts.admin);
  acceptDialogs(page);
  await gotoView(page, 'schedule', '?section=blocked');

  const create = form(page, 'Create blocked date');
  await create.locator('input[name="date"]').fill(day);
  await create.locator('input[name="timeZone"]').fill(HOURS);
  await create.locator('input[name="reason"]').fill('Instructor travel');
  await create.getByRole('button', { name: 'Create blocked date' }).click();

  await expect(actionStatus(page)).toContainText('saved');
  await expect(page.getByRole('row').filter({ hasText: day })).toBeVisible();

  const stored = await BlockedDate.findOne({ date: day });
  expect(stored).not.toBeNull();
  expect(stored.allDay).toBe(true);
  expect(stored.reason).toBe('Instructor travel');

  await page.reload();
  await expect(page.getByRole('row').filter({ hasText: day })).toBeVisible();
});

test('the bookings screen reflects a booking created through the real hold flow', async ({ page, accounts }) => {
  const slug = `held-${stamp()}`;
  await signIn(page, accounts.admin);
  acceptDialogs(page);

  // Seed a bookable session type + Monday availability window through the UI so the
  // hold has a genuinely offered slot, then drive the real createHold service.
  await gotoView(page, 'schedule');
  const typeForm = form(page, 'Create session type');
  await typeForm.getByLabel('Session type name', { exact: true }).fill(`Held Session ${slug}`);
  await typeForm.getByLabel('Session type slug', { exact: true }).fill(slug);
  await typeForm.getByLabel('Default duration (minutes)', { exact: true }).fill('60');
  await typeForm.getByRole('button', { name: 'Create session type' }).click();
  await expect(actionStatus(page)).toContainText('saved');

  await gotoView(page, 'schedule', '?section=availability');
  const winForm = form(page, 'Create availability window');
  await winForm.locator('select[name="weekday"]').selectOption('1');
  await winForm.locator('input[name="start"]').fill('09:00');
  await winForm.locator('input[name="end"]').fill('17:00');
  await winForm.locator('input[name="slotMinutes"]').fill('60');
  await winForm.locator('input[name="timeZone"]').fill(HOURS);
  await winForm.getByRole('button', { name: 'Create availability window' }).click();
  await expect(actionStatus(page)).toContainText('Availability window saved');

  // Import the hold service lazily so the backend config is already loaded.
  const { createHold, findAvailableSlots } = await import('../../../backend/src/services/booking.service.js');
  const { nextWeekdayDateKey, addZonedDays, zonedParts } = await import('../../../backend/src/utils/time.js');

  const sessionType = await SessionType.findOne({ slug });
  const todayKey = zonedParts(new Date(), HOURS).dateKey;
  const firstMonday = nextWeekdayDateKey(todayKey, 1, HOURS);
  let held = null;
  for (let week = 0; week < 12 && !held; week += 1) {
    const dateKey = addZonedDays(firstMonday, week * 7, HOURS);
    const availability = await findAvailableSlots({ sessionTypeId: slug, dateKey, durationMinutes: 60 });
    const slot = availability.slots?.[0];
    if (slot) {
      held = await createHold({ user: accounts.student, sessionTypeId: String(sessionType._id), startAt: slot.startAt, durationMinutes: 60, timeZone: HOURS, idempotencyKey: `hold-${randomUUID()}` });
    }
  }
  expect(held, 'the real hold flow produced a held booking').not.toBeNull();
  expect((await Booking.findById(held.booking._id)).status).toBe('held');

  // Now read that very booking back through the admin UI.
  await gotoView(page, 'bookings');
  await expect(page.getByRole('heading', { name: 'Bookings' })).toBeVisible();
  const row = page.getByRole('row').filter({ hasText: accounts.student.email }).first();
  await expect(row).toBeVisible();

  // Resyncing a real held booking must report provider truth, never a fake success.
  await row.getByRole('button', { name: 'Review booking' }).click();
  const detail = page.getByRole('region', { name: 'Booking detail' });
  await expect(detail).toBeVisible();
  await detail.getByRole('button', { name: 'Resync providers' }).click();
  await expect(detail.getByText('Provider resync result')).toBeVisible();
  const result = detail.locator('[role="status"]').filter({ hasText: 'Provider resync result' });
  await expect(result).toContainText('Zoom is not configured on this server, so nothing was synced.');
  await expect(result).toContainText('Google Calendar is not configured on this server, so nothing was synced.');
});

test('an unconfigured provider is reported as unavailable on a live class, never as synced', async ({ page, accounts }) => {
  const title = `Honesty Circle ${stamp()}`;
  const start = new Date(Date.now() + 7 * 86400000);
  const end = new Date(start.getTime() + 90 * 60000);
  await signIn(page, accounts.admin);
  acceptDialogs(page);
  await gotoView(page, 'live');

  const create = form(page, 'Create live class');
  await create.getByLabel('Live class title', { exact: true }).fill(title);
  await create.getByLabel('Starts (date and time)', { exact: true }).fill(isoLocal(start));
  await create.getByLabel('Ends (date and time)', { exact: true }).fill(isoLocal(end));
  await create.getByLabel('Time zone', { exact: true }).fill(HOURS);
  await create.getByRole('button', { name: 'Create live class' }).click();

  // The screen must never claim a Zoom sync that the server did not perform.
  await expect(page.getByText('Zoom is not configured on this server, so nothing was synced.')).toBeVisible();
  await expect(page.getByText(/is synced/)).toHaveCount(0);

  const stored = await LiveClass.findOne({ title });
  expect(stored).not.toBeNull();
  expect(stored.zoom?.syncStatus).toBe('none');
});

test('a repeating live class stores the rule the schedule job will follow', async ({ page, accounts }) => {
  const title = `Wednesday Wisdom ${stamp()}`;
  const start = new Date(Date.now() + 7 * 86400000);
  const end = new Date(start.getTime() + 60 * 60000);
  await signIn(page, accounts.admin);
  acceptDialogs(page);
  await gotoView(page, 'live');

  const create = form(page, 'Create live class');
  await create.getByLabel('Live class title', { exact: true }).fill(title);
  await create.getByLabel('Starts (date and time)', { exact: true }).fill(isoLocal(start));
  await create.getByLabel('Ends (date and time)', { exact: true }).fill(isoLocal(end));
  await create.getByLabel('Time zone', { exact: true }).fill(HOURS);
  await create.locator('select[name="series"]').selectOption('wednesday_wisdom_call');
  await create.locator('select[name="freq"]').selectOption('weekly');
  await create.locator('select[name="weekday"]').selectOption('3');
  await create.locator('input[name="hour"]').fill('19');
  await create.getByRole('button', { name: 'Create live class' }).click();
  await expect(notice(page, 'created')).toBeVisible();

  // One published schedule means the rule survives the form: the job turns it into
  // individual occurrences instead of the administrator adding dates by hand.
  const stored = await LiveClass.findOne({ title });
  expect(stored, 'repeating class written through the UI is persisted').not.toBeNull();
  expect(stored.series).toBe('wednesday_wisdom_call');
  expect(stored.recurrence.enabled).toBe(true);
  expect(stored.recurrence.freq).toBe('weekly');
  expect(stored.recurrence.weekday).toBe(3);
  expect(stored.recurrence.hour).toBe(19);
  expect(stored.recurrence.generateWeeksAhead).toBe(8);
  expect(stored.timeZone).toBe(HOURS);
});

test('the website invitation follows the published Wednesday schedule', async ({ page }) => {
  const start = new Date(Date.now() + 9 * 86400000);
  const published = await LiveClass.create({
    title: `Wisdom Call ${stamp()}`,
    series: 'wednesday_wisdom_call',
    startAt: start,
    endAt: new Date(start.getTime() + 60 * 60000),
    timeZone: HOURS,
    publicationStatus: 'published',
    eligibility: { kind: 'public' },
  });

  await page.goto('/wisdom-call');
  await expect(page.getByRole('link', { name: /Book Your Free Spot/ }).first())
    .toHaveAttribute('href', '/dashboard/calls?tab=classes');
  // The diary date comes from the stored record, read in the zone the class is held in.
  const diaryDay = new Intl.DateTimeFormat('en-US', { timeZone: HOURS, weekday: 'long', month: 'long', day: 'numeric' }).format(start);
  await expect(page.getByText('Next live session:')).toContainText(diaryDay);
  await expect(page.getByText('Next live session:')).toContainText(/(MST|MDT)/);
  await expect(page.locator('a[href*="calendly.com"]')).toHaveCount(0);
  await page.goto('/connect');
  await expect(page.getByText('Next live session:')).toBeVisible();

  // Withdraw it and the page is still not a dead end: the invitation returns to
  // the facilitator's own booking link rather than pointing at an empty schedule.
  await published.deleteOne();
  await page.goto('/wisdom-call');
  await expect(page.getByRole('link', { name: /Book Your Free Spot/ }).first())
    .toHaveAttribute('href', /calendly\.com/);
  await expect(page.getByText('Next live session:')).toHaveCount(0);
});

test('a content manager can manage live classes but cannot change schedule configuration', async ({ page, accounts }) => {
  const manager = new User({ name: 'Content Manager Scheduler', email: `cm-${randomUUID()}@payments.test`, role: 'content_manager', emailVerified: true });
  await manager.setPassword(accounts.password);
  await manager.save();

  await signIn(page, manager);
  await gotoView(page, 'schedule');
  await expect(page.getByRole('heading', { name: 'Schedule setup' })).toBeVisible();
  await expect(page.getByText('Only administrators can create or change')).toBeVisible();
  // The admin-only authoring controls are absent for a content manager.
  await expect(page.getByRole('form', { name: 'Create session type' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Create session type' })).toHaveCount(0);

  // But live classes are a staff (not admin-only) responsibility.
  await gotoView(page, 'live');
  await expect(page.getByRole('form', { name: 'Create live class' })).toBeVisible();
});
