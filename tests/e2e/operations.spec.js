import { randomUUID } from 'node:crypto';
import { test, expect, signIn, api, apiOrigin } from './fixtures.js';
import { Program, ContentReport, AuditLog, Order, DiscountCode, SiteSettings, User } from '../../../backend/src/models/index.js';
import { getConfig, setConfig } from '../../../backend/src/config/env.js';

const actionStatus = (page) => page.locator('[role="status"]:not(.db-loading)');

// Operations screens, keyed by their in-shell path and their h1 title.
const operationsScreens = [
  ['programs', 'Programs'],
  ['certificates', 'Certificates'],
  ['moderation', 'Community moderation'],
  ['media', 'Media assets'],
  ['platform', 'Platform integrations'],
  ['discounts', 'Discount codes'],
  ['settings', 'Site settings'],
];

for (const [path, title] of operationsScreens) {
  test(`Admin operations ${title} loads real data without public website chrome`, async ({ page, accounts }) => {
    await signIn(page, accounts.admin);
    await page.goto(`/admin/${path}`);
    await expect(page.locator('.db-content h1')).toHaveText(title);
    await expect(page.locator('.db-loading')).toHaveCount(0);
    await expect(page.locator('.db-error')).toHaveCount(0);
    await expect(page.locator('.site-header')).toHaveCount(0);
  });
}

test('Administrator creates a program through the UI; it persists in the database and survives reload', async ({ page, accounts }) => {
  const title = `Operations Program ${randomUUID()}`;
  await signIn(page, accounts.admin);
  await page.goto('/admin/programs');

  const form = page.getByRole('form', { name: 'Create program' });
  await form.getByLabel('New program title').fill(title);
  await form.getByLabel('Mark new program free').check();
  await form.getByRole('button', { name: 'Create draft program' }).click();

  await expect(actionStatus(page)).toContainText(title);
  await expect(page.getByRole('region', { name: 'Programs' })).toContainText(title);

  const persisted = await Program.findOne({ title }).lean();
  expect(persisted).not.toBeNull();
  expect(persisted.publicationStatus).toBe('draft');

  await page.reload();
  await expect(page.getByRole('region', { name: 'Programs' })).toContainText(title);
});

test('Community report created through business logic is resolved via the moderation API, leaves the queue and is audited', async ({ page, accounts }) => {
  const postTitle = `Reported post ${randomUUID()}`;

  // A student creates a real post then reports it through the public community API.
  await signIn(page, accounts.student);
  const { post } = await api(page, '/community/posts', {
    method: 'POST',
    body: { kind: 'discussion', title: postTitle, body: 'A genuine discussion post that will be reported for moderation.' },
  });
  const report = await api(page, '/community/reports', {
    method: 'POST',
    body: { targetKind: 'post', target: post.id, reason: 'spam', detail: 'Raised for browser moderation verification.' },
  });
  const reportId = report.id;
  const tail = reportId.slice(-6);

  await api(page, '/auth/logout', { method: 'POST' });
  await signIn(page, accounts.admin);
  await page.goto('/admin/moderation');

  const card = page.locator('article').filter({ hasText: postTitle });
  await expect(card).toHaveCount(1);
  await card.getByRole('button', { name: `Open review actions for report ${tail}` }).click();

  const resolveForm = card.getByRole('form', { name: `Resolve report ${tail}` });
  page.once('dialog', (dialog) => dialog.accept());
  await resolveForm.getByRole('button', { name: 'Resolve report' }).click();

  await expect(actionStatus(page)).toContainText(tail);
  await expect(page.locator('article').filter({ hasText: postTitle })).toHaveCount(0);

  const refreshed = await ContentReport.findById(reportId).lean();
  expect(refreshed.status).toBe('actioned');
  expect(await AuditLog.countDocuments({ targetId: reportId, action: 'community.report_actioned' })).toBe(1);

  // The resolved report is still queryable in the closed queue rather than deleted.
  await page.getByLabel('Filter report status').selectOption('actioned');
  await expect(page.locator('article').filter({ hasText: postTitle })).toHaveCount(1);
});

test('A real mock fulfillment produces a webhook row that filters by provider and an email ledger row for the order_paid template', async ({ page, accounts, platform }) => {
  // The email ledger only records rows when a transport is configured; the test
  // environment starts with EMAIL_PROVIDER 'off', so capture mode is enabled for
  // the fulfillment only, then restored. This is a real provider decision, not a fixture.
  const previous = getConfig();
  await signIn(page, accounts.student);
  await page.goto(`/checkout?course=${platform.paidCourse.slug}`);
  await page.getByRole('button', { name: 'Pay CAD 125.00' }).click();
  await expect(page).toHaveURL(/\/checkout\?course=browser-paid&order=/);
  const order = await Order.findOne({ user: accounts.student._id });
  expect(order).not.toBeNull();

  setConfig({ ...previous, EMAIL_PROVIDER: 'log' });
  try {
    await platform.simulator.deliver(await platform.simulator.paymentEvent(order._id, 'success'));
  } finally {
    setConfig(previous);
  }

  await api(page, '/auth/logout', { method: 'POST' });
  await signIn(page, accounts.admin);
  await page.goto('/admin/platform');

  // Webhook ledger filters by provider: the mock event appears, an unused provider does not.
  await page.getByLabel('Webhook provider filter').fill('mock');
  const webhookRegion = page.getByRole('region', { name: 'Webhook events' });
  await expect(webhookRegion).toContainText('mock');
  await expect(webhookRegion).toContainText('checkout.session.completed');

  await page.getByLabel('Webhook provider filter').fill('stripe');
  await expect(page.getByText('No webhook events match')).toBeVisible();

  // Email ledger filtered by the template produced by the real fulfillment event.
  await page.getByLabel('Webhook provider filter').fill('');
  await page.getByLabel('Email template filter').fill('order_paid');
  const emailRegion = page.getByRole('region', { name: 'Email deliveries' });
  await expect(emailRegion).toContainText(accounts.student.email);
  await expect(emailRegion).toContainText('order_paid');
});

test('A discount code managed through the admin UI prices a real student checkout', async ({ page, accounts, platform }) => {
  const code = `E2E${randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`;
  const stored = async () => DiscountCode.findOne({ code }).lean();

  await signIn(page, accounts.admin);
  await page.goto('/admin/discounts');
  const create = page.getByRole('form', { name: 'Create discount code' });
  await create.getByLabel('New discount code').fill(code);
  await create.getByLabel('New discount value').fill('10');
  await create.getByRole('button', { name: 'Create discount code' }).click();
  await expect(actionStatus(page)).toContainText(code);
  await expect(page.getByRole('region', { name: 'Discount codes' })).toContainText('0 used');
  expect({ ...(await stored()) }).toMatchObject({ kind: 'percentage', value: 10, active: true, redemptionCount: 0 });

  // An inactive code must be refused before a student reaches payment.
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: `Deactivate discount ${code}` }).click();
  await expect(actionStatus(page)).toContainText('deactivated');
  expect((await stored()).active).toBe(false);

  await api(page, '/auth/logout', { method: 'POST' });
  await signIn(page, accounts.student);
  await page.goto(`/checkout?course=${platform.paidCourse.slug}&discount=${code}`);
  await expect(page.locator('.au-err')).toContainText('no longer active');

  await api(page, '/auth/logout', { method: 'POST' });
  await signIn(page, accounts.admin);
  await page.goto('/admin/discounts');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: `Activate discount ${code}` }).click();
  await expect(actionStatus(page)).toContainText('activated');
  expect((await stored()).active).toBe(true);

  await api(page, '/auth/logout', { method: 'POST' });
  await signIn(page, accounts.student);
  await page.goto(`/checkout?course=${platform.paidCourse.slug}&discount=${code}`);
  await expect(page.getByText('− CAD 12.50', { exact: true })).toBeVisible();
  // The address already carries the discount before the click, so the wait has to
  // be on the order the server just created — otherwise this reads the database
  // while the checkout request is still in flight.
  const [checkoutResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes('/cart/checkout')),
    page.getByRole('button', { name: 'Pay CAD 112.50' }).click(),
  ]);
  expect(checkoutResponse.status()).toBe(200);
  await expect(page).toHaveURL(/&order=/);

  const order = await Order.findOne({ user: accounts.student._id, discountCode: code }).lean();
  expect(order).not.toBeNull();
  expect(order.totalMinor).toBe(11250); // 12500 minus the server-priced 10%
  expect(order.paymentStatus).toBe('pending');
  expect(order.stripeCheckoutSessionId, 'the order carries its provider session').toBeTruthy();
  expect((await stored()).redemptionCount).toBe(0);

  await platform.simulator.deliver(await platform.simulator.paymentEvent(order._id, 'success'));
  expect((await stored()).redemptionCount).toBe(1);
  expect((await Order.findById(order._id).lean()).fulfillmentStatus).toBe('fulfilled');
});

test('Unconfigured external providers surface as unavailable rather than as silent successes', async ({ page, accounts }) => {
  await signIn(page, accounts.admin);

  await page.goto('/admin/platform');
  await expect(page.getByRole('region', { name: 'Integration status' })).toContainText('not configured');
  await expect(page.getByRole('region', { name: 'Video provider capability' })).toContainText('Video provider unavailable');

  // Requesting an upload signature without Cloudinary credentials reports the gap honestly.
  await page.goto('/admin/media');
  const signatureForm = page.getByRole('form', { name: 'Request media upload signature' });
  await signatureForm.getByLabel('Upload file size in bytes').fill('2048');
  await signatureForm.getByRole('button', { name: 'Request upload signature' }).click();
  await expect(page.getByRole('alert')).toContainText('Cloudinary is not configured');
});

test('Site settings saved through the UI persist, survive reload, are audited and only the safe leaves reach the public projection', async ({ page, accounts }) => {
  const suffix = randomUUID().slice(0, 8);
  const brandName = `Zalah E2E Settings ${suffix}`;
  const joinUrl = `https://zoom.us/j/e2e-settings-${suffix}`;
  const socialUrl = `https://instagram.com/cft-e2e-${suffix}`;

  await signIn(page, accounts.admin);
  await page.goto('/admin/settings');

  // The screen is display and policy configuration only; nothing credential-shaped is offered.
  await expect(page.locator('label, h2, button').filter({ hasText: /secret|api key|apikey|token|password|credential/i })).toHaveCount(0);

  await page.getByLabel('Brand name').fill(brandName);
  await page.getByLabel('Reservation hold (minutes)').fill('18');
  await page.getByLabel('Join URL').fill(joinUrl);
  await page.getByRole('button', { name: 'Add social link' }).click();
  const socialRows = page.locator('[id^="social-label-"]');
  const newIndex = (await socialRows.count()) - 1;
  await socialRows.nth(newIndex).fill('E2E profile');
  await page.locator(`#social-url-${newIndex}`).fill(socialUrl);

  // Unsaved work is announced and the only save control becomes usable, then answers once.
  await expect(page.locator('.db-muted').filter({ hasText: '4 unsaved changes' })).toBeVisible();
  const save = page.getByRole('button', { name: 'Save site settings' });
  await expect(save).toBeEnabled();
  const patchStatuses = [];
  page.on('response', (response) => {
    if (response.request().method() === 'PATCH' && response.url().includes('/api/v1/admin/settings')) patchStatuses.push(response.status());
  });
  await Promise.all([
    page.waitForResponse((response) => response.request().method() === 'PATCH' && response.url().includes('/api/v1/admin/settings')),
    save.click(),
  ]);
  await expect(actionStatus(page)).toContainText('Site settings saved at');
  expect(patchStatuses, 'One save click sends exactly one PATCH').toEqual([200]);

  const stored = async () => SiteSettings.findOne({ key: 'global' }).lean();
  expect({ ...(await stored()) }).toMatchObject({
    brand: { name: brandName },
    bookingPolicy: { holdMinutes: 18 },
    wisdomCall: { zoomJoinUrl: joinUrl },
  });
  expect((await stored()).socials).toEqual([{ label: 'E2E profile', url: socialUrl }]);

  await page.reload();
  await expect(page.getByLabel('Brand name')).toHaveValue(brandName);
  await expect(page.getByLabel('Reservation hold (minutes)')).toHaveValue('18');
  expect(await AuditLog.countDocuments({ action: 'settings.update', category: 'settings', actor: accounts.admin._id })).toBe(1);

  // The public projection carries the intended display values and never the private join URL.
  const publicResponse = await page.request.get(`${apiOrigin}/api/v1/pages/settings`);
  expect(publicResponse.ok(), 'Public settings must answer 200').toBe(true);
  const { data: projected } = await publicResponse.json();
  expect(projected.settings.brand.name).toBe(brandName);
  expect(projected.settings.wisdomCall.zoomJoinUrl, 'The Wisdom Call join URL must not be public').toBeUndefined();
  expect(projected.settings.bookingPolicy, 'Booking policy must not be public').toBeUndefined();
  expect(projected.settings.socials).toEqual([{ label: 'E2E profile', url: socialUrl }]);
});

test('A content manager reads site settings but cannot change them through the UI or the endpoint', async ({ page, accounts }) => {
  const manager = new User({
    name: 'Settings Content Manager',
    email: `settings-manager-${randomUUID()}@payments.test`,
    role: 'content_manager',
    emailVerified: true,
  });
  await manager.setPassword(accounts.password);
  await manager.save();

  await signIn(page, manager);
  await page.goto('/admin/settings');
  await expect(page.getByRole('heading', { level: 1, name: 'Site settings' })).toBeVisible();
  await expect(page.getByText('Read-only access. Only administrators can change site settings.')).toBeVisible();

  // Editing is refused before a request is ever built: every control stays disabled.
  await expect(page.getByLabel('Brand name')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Save site settings' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Add social link' })).toBeDisabled();

  const before = await SiteSettings.findOne({ key: 'global' }).lean();
  const refusal = await page.evaluate(async () => {
    const { apiRequest } = await import('/src/lib/api.js');
    try {
      await apiRequest('/admin/settings', { method: 'PATCH', body: { brand: { name: 'Written by a content manager' } } });
      return { status: 200 };
    } catch (failure) {
      return { status: failure.status, message: failure.message };
    }
  });
  expect(refusal.status, 'The settings endpoint must refuse a content manager').toBe(403);
  const after = await SiteSettings.findOne({ key: 'global' }).lean();
  expect(after.brand.name).toBe(before.brand.name);
  expect(after.updatedBy?.toString()).not.toBe(manager._id.toString());
});
