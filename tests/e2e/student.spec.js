import AxeBuilder from '@axe-core/playwright';
import { test, expect, signIn, api } from './fixtures.js';
import { User, Order, Entitlement, LessonProgress, Notification, CommunityPost, Comment } from '../../../backend/src/models/index.js';

const pages = [['courses', 'My Courses'], ['library', 'Free Books'], ['calls', 'Calls & Bookings'], ['live-classes', 'Live Classes'], ['bookings', 'Book a Call with Zalah'], ['explore', 'All Programs'], ['orders', 'Orders & Payments'], ['certificates', 'Certificates'], ['community', 'Community'], ['wishlist', 'Wishlist'], ['settings', 'Settings'], ['notifications', 'Notifications']];

test('Registration asks for a verified channel instead of a password, and the dashboard stays behind sign-in', async ({ page, accounts }) => {
  await page.goto('/signup');
  await expect(page.getByLabel('Email address', { exact: true })).toBeVisible();
  expect(await page.locator('.au-methods button').count()).toBe(0);
  expect(await page.locator('input[type="password"]').count()).toBe(0);
  expect(await page.locator('input[type="date"]').count()).toBe(0);

  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login\?next=/);
  await signIn(page, accounts.student);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'My Purchased Courses' })).toBeVisible();
  await expect(page.locator('.site-header')).toHaveCount(0);
  await expect(page.locator('.db-nav a')).toHaveCount(2);
});

test('The navbar holds the two program sections and the account menu keeps the rest reachable', async ({ page, accounts }) => {
  await signIn(page, accounts.student);
  await expect(page.locator('.db-nav a')).toHaveText(['My Program', 'All Programs']);
  // The side navigation is retired; nothing may still render it.
  await expect(page.locator('.db-sidebar')).toHaveCount(0);

  await page.getByRole('button', { name: 'Student Browser Member', exact: true }).click();
  const menu = page.locator('#dashboard-account');
  await expect(menu).toBeVisible();
  for (const label of ['Orders & receipts', 'Certificates', 'Wishlist', 'Community', 'Account settings', 'Visit website']) {
    await expect(menu.getByRole('link', { name: label, exact: true })).toBeVisible();
  }
  await expect(menu.getByRole('button', { name: 'Sign out' })).toBeVisible();

  // Simplifying the navigation must not retire a single destination.
  for (const path of ['library', 'calls', 'explore', 'live-classes', 'bookings', 'orders', 'certificates', 'community', 'wishlist', 'settings', 'notifications', 'search']) {
    await page.goto(`/dashboard/${path}`);
    await expect(page.getByText('This page isn’t in your dashboard')).toHaveCount(0);
  }
});

for (const [path, title] of pages) {
  test(`${title}: authenticated route renders and has named controls`, async ({ page, accounts }, testInfo) => {
    await signIn(page, accounts.student);
    await page.goto(`/dashboard/${path}`);
    await expect(page.locator('.db-content h1')).toHaveText(title);
    await expect(page.locator('.db-loading')).toHaveCount(0);
    await expect(page.locator('.site-header')).toHaveCount(0);
    const inventory = await page.locator('a,button,input,textarea,select,summary').evaluateAll((nodes) => nodes.map((node) => ({ tag: node.tagName, name: node.getAttribute('aria-label') || node.labels?.[0]?.textContent?.trim() || node.textContent.trim() || node.getAttribute('title') || '', href: node.getAttribute('href'), disabled: Boolean(node.disabled), visible: Boolean(node.getClientRects().length), result: 'INVENTORIED; behavior covered separately where specified' })));
    await testInfo.attach('interactive-inventory', { body: JSON.stringify({ path, controls: inventory }, null, 2), contentType: 'application/json' });
    expect(inventory.filter((control) => control.visible && ['BUTTON', 'SELECT', 'TEXTAREA'].includes(control.tag) && !control.name)).toEqual([]);
  });
}

for (const [width, height] of [[320, 568], [375, 812], [430, 932], [768, 1024], [1280, 720], [1440, 900], [1920, 1080]]) {
  test(`Dashboard at ${width}x${height} has no overflow or clipped navigation`, async ({ page, accounts }) => {
    await page.setViewportSize({ width, height }); await signIn(page, accounts.student);
    // Measure the settled dashboard: under load the panels are still arriving
    // when sign-in lands, and a half-painted grid is not a layout defect.
    await expect(page.getByRole('heading', { name: 'My Purchased Courses' })).toBeVisible();
    await expect(page.locator('.db-loading')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const links = page.locator('.db-nav a');
    await expect(links).toHaveCount(2);
    for (const link of await links.all()) {
      const box = await link.boundingBox();
      expect(box, `navbar link "${await link.textContent()}" is laid out`).not.toBeNull();
      expect(box.height).toBeGreaterThanOrEqual(32);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
    }
    await expect(page.locator('.db-visit')).toBeVisible();
    await expect(page.locator('.db-notification')).toBeVisible();
    await expect(page.locator('.db-profile-trigger')).toBeVisible();
  });
}

test('Profile saves to MongoDB and survives refresh', async ({ page, accounts }) => {
  await signIn(page, accounts.student); await page.goto('/dashboard/settings');
  await page.getByLabel('Full name', { exact: true }).fill('Updated Browser Member');
  await page.getByLabel('Username (optional)').fill(`member_${accounts.student.id.slice(-12)}`);
  await page.getByLabel('Time zone', { exact: true }).selectOption('UTC');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Your profile has been saved');
  const saved = await User.findById(accounts.student._id); expect(saved.name).toBe('Updated Browser Member'); expect(saved.timeZone).toBe('UTC');
  await page.reload(); await expect(page.getByLabel('Full name', { exact: true })).toHaveValue('Updated Browser Member');
});

test('Notification preference persists after refresh', async ({ page, accounts }) => {
  await signIn(page, accounts.student); await page.goto('/dashboard/settings');
  await page.getByLabel('New courses and updates', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Save preferences', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Notification preferences saved');
  expect((await User.findById(accounts.student._id)).notificationPreferences.emailProductUpdates).toBe(false);
  await page.reload(); await expect(page.getByLabel('New courses and updates', { exact: true })).not.toBeChecked();
});

test('Wrong current password rejects change without false success', async ({ page, accounts }) => {
  await signIn(page, accounts.student); await page.goto('/dashboard/settings');
  await page.getByLabel('Current password', { exact: true }).fill('Wrong-Password-123!');
  await page.getByLabel('New password', { exact: true }).fill('Replacement-Password-123!');
  await page.getByLabel('Confirm new password', { exact: true }).fill('Replacement-Password-123!');
  await page.getByRole('button', { name: 'Update password' }).click(); await expect(page.getByRole('alert')).toBeVisible();
  expect(await (await User.findById(accounts.student._id).select('+passwordHash')).verifyPassword(accounts.password)).toBe(true);
});

test('Notification read state persists and updates the bell', async ({ page, accounts }) => {
  await signIn(page, accounts.student); await page.goto('/dashboard/notifications');
  await page.getByRole('button', { name: 'Mark all as read' }).click();
  // The button is disabled while the request is in flight too, so the stored
  // read state is the only proof that the action actually completed.
  await expect.poll(() => Notification.countDocuments({ recipient: accounts.student._id, read: false })).toBe(0);
  await expect(page.getByRole('button', { name: 'Mark all as read' })).toBeDisabled();
  await expect(page.locator('.db-notification')).toHaveAttribute('aria-label', 'Notifications');
  await page.reload(); await expect(page.getByRole('button', { name: 'Mark all as read' })).toBeDisabled();
});

test('Wishlist add and remove changes real stored list', async ({ page, accounts, platform }) => {
  await signIn(page, accounts.student); await page.goto(`/dashboard/explore/${platform.paidCourse.slug}`);
  await page.getByRole('button', { name: 'Save to wishlist' }).click(); await expect(page.getByRole('status')).toContainText('Saved to your wishlist');
  await page.goto('/dashboard/wishlist'); await expect(page.getByRole('heading', { name: platform.paidCourse.title })).toBeVisible();
  await page.getByRole('button', { name: 'Remove from wishlist' }).click(); await expect(page.getByRole('heading', { name: 'Save what speaks to you' })).toBeVisible();
  expect((await api(page, '/student/wishlist')).items).toHaveLength(0);
});

test('Community conversation, like and reply persist', async ({ page, accounts }) => {
  await signIn(page, accounts.student); await page.goto('/dashboard/community');
  await page.getByRole('button', { name: 'Start a conversation' }).click();
  const title = `Browser conversation ${Date.now()}`;
  await page.getByLabel('Title', { exact: true }).fill(title); await page.getByLabel('Your message').fill('A saved conversation, not a local preview.');
  await page.getByRole('button', { name: 'Post conversation', exact: true }).click();
  const article = page.locator('article').filter({ has: page.getByRole('heading', { name: title }) });
  await expect(article).toBeVisible(); await article.getByRole('button', { name: /^Like/ }).click();
  await expect(article.getByRole('button', { name: /^Liked/ })).toHaveAttribute('aria-pressed', 'true');
  await article.getByRole('button', { name: /^Replies/ }).click(); await article.getByLabel('Your reply').fill('A persisted reply.');
  await article.getByRole('button', { name: 'Post reply', exact: true }).click(); await expect(article.getByText('A persisted reply.', { exact: true })).toBeVisible();
  const post = await CommunityPost.findOne({ title }); expect(post).not.toBeNull(); expect(await Comment.countDocuments({ post: post._id })).toBe(1);
  await page.reload(); await expect(page.getByRole('heading', { name: title })).toBeVisible();
});

test('Free enrollment, deliberate text completion and progress survive refresh', async ({ page, accounts, platform }) => {
  await signIn(page, accounts.student); await page.goto(`/dashboard/explore/${platform.course.slug}`);
  // Enrolment always passes through the review page, which states the price
  // before anything is charged — even when the price is nothing.
  await page.getByRole('link', { name: 'Review and enrol' }).click();
  await expect(page).toHaveURL(new RegExp(`/checkout\\?course=${platform.course.slug}$`));
  await page.getByRole('button', { name: 'Enrol for free' }).click();
  await expect(page.getByRole('link', { name: 'Open course' })).toBeVisible();
  expect(await Entitlement.countDocuments({ user: accounts.student._id, product: platform.course._id, status: 'active' })).toBe(1);
  await page.goto('/dashboard/courses');
  await page.getByRole('link', { name: 'Start learning', exact: true }).click(); await page.getByRole('link', { name: 'Open lesson', exact: true }).click();
  await expect(page.getByText(platform.lesson.textContent, { exact: true })).toBeVisible();
  expect(await LessonProgress.countDocuments({ user: accounts.student._id, status: 'completed' })).toBe(0);
  await page.getByRole('button', { name: 'Mark lesson complete', exact: true }).click(); await expect(page.getByText('Status: completed', { exact: true })).toBeVisible();
  expect(await LessonProgress.countDocuments({ user: accounts.student._id, lesson: platform.lesson._id, status: 'completed' })).toBe(1);
  await page.reload(); await expect(page.getByText('Status: completed', { exact: true })).toBeVisible();
});

for (const outcome of ['success', 'failed', 'pending', 'cancelled']) {
  test(`Paid checkout ${outcome} uses in-process mock fulfillment, never a frontend success`, async ({ page, accounts, platform }) => {
    await signIn(page, accounts.student); await page.goto(`/checkout?course=${platform.paidCourse.slug}`);
    await page.getByRole('button', { name: 'Pay CAD 125.00' }).click();
    await expect(page).toHaveURL(/\/checkout\?course=browser-paid&order=/);
    const order = await Order.findOne({ user: accounts.student._id }); expect(order.totalMinor).toBe(12500);
    expect(await Entitlement.countDocuments({ user: accounts.student._id })).toBe(0);
    await platform.simulator.deliver(await platform.simulator.paymentEvent(order._id, outcome));
    await page.goto(`/dashboard/orders?order=${encodeURIComponent(String(order._id))}`);
    const expected = outcome === 'success' ? 'paid' : outcome;
    await expect(page.locator('.db-content .db-badge')).toHaveText(expected);
    expect(await Entitlement.countDocuments({ user: accounts.student._id, status: 'active' })).toBe(outcome === 'success' ? 1 : 0);
    const owned = await api(page, '/student/courses'); expect(owned.courses.some((course) => course.id === String(platform.paidCourse._id))).toBe(outcome === 'success');
  });
}

test('Library outage shows retry and recovers without losing session', async ({ page, accounts }) => {
  // The home is one panel now, so the outage has to land on the library call it
  // actually makes — not on the old summary endpoint it no longer asks for.
  await signIn(page, accounts.student); await page.route('**/api/v1/student/courses*', (route) => route.fulfill({ status: 503, json: { error: { message: 'Temporary browser test outage' } } }));
  await page.goto('/dashboard'); await expect(page.getByRole('alert').first()).toContainText('Temporary browser test outage');
  await page.unroute('**/api/v1/student/courses*'); await page.getByRole('button', { name: 'Try again', exact: true }).first().click();
  await expect(page.getByRole('alert')).toHaveCount(0); await expect(page.getByRole('heading', { name: 'My Purchased Courses' })).toBeVisible();
});

test('Student cannot call admin API or change role', async ({ page, accounts }) => {
  await signIn(page, accounts.student);
  const result = await page.request.get('/api/v1/admin/students'); expect(result.status()).toBe(403);
  await api(page, '/users/me', { method: 'PATCH', body: { name: accounts.student.name, role: 'admin' } });
  expect((await User.findById(accounts.student._id)).role).toBe('student');
});

for (const path of ['settings', 'orders', 'community']) {
  test(`${path} has no serious or critical automated accessibility violations`, async ({ page, accounts }, testInfo) => {
    await signIn(page, accounts.student); await page.goto(`/dashboard/${path}`); await expect(page.locator('.db-loading')).toHaveCount(0);
    const result = await new AxeBuilder({ page }).analyze();
    await testInfo.attach('accessibility', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
    expect(result.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))).toEqual([]);
  });
}
