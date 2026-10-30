import { randomUUID } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import { test, expect, signIn, api } from './fixtures.js';
import { User, Course, Module, Lesson, Order, Entitlement, Refund, ContactRequest, AuditLog } from '../../../backend/src/models/index.js';

const actionStatus = (page) => page.locator('[role="status"]:not(.db-loading)');

for (const [path, title] of [['', 'Overview'], ['students', 'Students'], ['courses', 'Courses'], ['orders', 'Orders & payments'], ['audit', 'Audit log'], ['contact', 'Support inbox']]) {
  test(`Admin ${title} loads real data without public website chrome`, async ({ page, accounts }, testInfo) => {
    await signIn(page, accounts.admin); await page.goto(`/admin/${path}`);
    await expect(page.locator('.db-content h1')).toHaveText(title);
    await expect(page.locator('.db-loading')).toHaveCount(0);
    await expect(page.locator('.db-error')).toHaveCount(0);
    await expect(page.locator('.site-header')).toHaveCount(0);
    const controls = await page.locator('button,a,input,select,textarea').evaluateAll((nodes) => nodes.map((node) => ({ tag: node.tagName, name: node.getAttribute('aria-label') || node.labels?.[0]?.textContent.trim() || node.textContent.trim(), href: node.getAttribute('href'), disabled: !!node.disabled })));
    await testInfo.attach('interactive-inventory', { body: JSON.stringify({ path: `/admin/${path}`, controls }, null, 2), contentType: 'application/json' });
    if (!path) await page.screenshot({ path: testInfo.outputPath('admin-overview.png'), fullPage: true });
  });
}

test('Student cannot open administrative screens or see administration link', async ({ page, accounts }) => {
  await signIn(page, accounts.student); await page.locator('.db-profile-trigger').click();
  await expect(page.getByRole('link', { name: 'Administration', exact: true })).toHaveCount(0);
  await page.goto('/admin/students'); await expect(page.getByRole('heading', { name: 'Staff access required' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Staff navigation' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Return to dashboard' }).click(); await expect(page).toHaveURL(/\/dashboard$/);
});

test('Administrator enters admin area through account menu and returns to student view', async ({ page, accounts }) => {
  await signIn(page, accounts.admin); await page.locator('.db-profile-trigger').click();
  await page.getByRole('link', { name: 'Administration', exact: true }).click(); await expect(page).toHaveURL(/\/admin$/);
  await page.getByRole('link', { name: 'Student view' }).click(); await expect(page).toHaveURL(/\/dashboard$/);
});

test('Student search uses server filters and opens the correct persisted account', async ({ page, accounts }) => {
  await signIn(page, accounts.admin); await page.goto('/admin/students');
  await page.getByLabel('Search name or email').fill(accounts.student.email);
  await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('link', { name: accounts.student.name, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/students/${accounts.student._id}$`));
  await expect(page.locator('.db-content h1')).toHaveText(accounts.student.name);
});

test('Students pagination pages 25 at a time and keeps the URL, filters and rows in sync', async ({ page, accounts }) => {
  // The list sorts newest-first and caps at 25 rows, so 30 accounts is the
  // smallest set that produces a real second page. createdAt is spread a minute
  // apart because the server has no tiebreaker, and an ambiguous order would
  // make "which row belongs on which page" unverifiable.
  const earliest = Date.now() - 60 * 60 * 1000;
  const paged = Array.from({ length: 30 }, (_, index) => ({
    name: `Paged Student ${String(index + 1).padStart(2, '0')}`,
    email: `paged-${randomUUID()}@payments.test`,
    at: new Date(earliest + index * 60_000),
  }));
  const created = await User.insertMany(paged.map(({ name, email }) => ({ name, email, role: 'student', emailVerified: true })));
  await User.collection.bulkWrite(created.map((user, index) => ({ updateOne: { filter: { _id: user._id }, update: { $set: { createdAt: paged[index].at } } } })));

  await signIn(page, accounts.admin);
  await page.goto('/admin/students');

  const pager = page.getByRole('navigation', { name: 'Students pagination' });
  const rows = page.locator('tbody tr td:first-child a');
  const previous = pager.getByRole('button', { name: 'Previous' });
  const next = pager.getByRole('button', { name: 'Next' });

  await page.getByLabel('Search name or email').fill('Paged Student');
  await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
  await expect(page).toHaveURL(/page=1/);
  await expect(pager).toContainText('Page 1 of 2 · 30 results');
  await expect(rows).toHaveText(Array.from({ length: 25 }, (_, index) => `Paged Student ${String(30 - index).padStart(2, '0')}`));
  await expect(previous).toBeDisabled();
  await expect(next).toBeEnabled();

  await next.click();
  await expect(page).toHaveURL(/page=2/);
  await expect(pager).toContainText('Page 2 of 2 · 30 results');
  await expect(rows).toHaveText(['Paged Student 05', 'Paged Student 04', 'Paged Student 03', 'Paged Student 02', 'Paged Student 01']);
  await expect(previous).toBeEnabled();
  await expect(next).toBeDisabled();

  // The URL, not component state, decides what an operator sees after a refresh.
  await page.reload();
  await expect(pager).toContainText('Page 2 of 2 · 30 results');
  await expect(rows).toHaveText(['Paged Student 05', 'Paged Student 04', 'Paged Student 03', 'Paged Student 02', 'Paged Student 01']);

  await previous.click();
  await expect(page).toHaveURL(/page=1/);
  await expect(rows).toHaveCount(25);

  // Narrowing the filter from page 2 must return to page 1: staying on page 2 of
  // a one-row result set would silently show an empty table.
  await next.click();
  await expect(rows).toHaveCount(5);
  await page.getByLabel('Search name or email').fill('Paged Student 03');
  await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
  await expect(page).toHaveURL(/page=1/);
  await expect(pager).toContainText('Page 1 of 1 · 1 results');
  await expect(rows).toHaveText(['Paged Student 03']);
});

test('Admin cancellation leaves status unchanged; confirmed suspension persists and is audited', async ({ page, accounts }) => {
  await signIn(page, accounts.admin); await page.goto(`/admin/students/${accounts.student._id}`);
  const form = page.getByRole('form', { name: 'Change account status' });
  await form.getByRole('combobox').selectOption('suspended'); await form.getByRole('textbox').fill('Browser regression verifies account suspension.');
  page.once('dialog', (dialog) => dialog.dismiss()); await form.getByRole('button', { name: 'Review status change' }).click();
  expect((await User.findById(accounts.student._id)).status).toBe('active');
  page.once('dialog', (dialog) => dialog.accept()); await form.getByRole('button', { name: 'Review status change' }).click();
  await expect(actionStatus(page)).toContainText('Account status updated to suspended');
  expect((await User.findById(accounts.student._id)).status).toBe('suspended');
  expect(await AuditLog.countDocuments({ targetId: accounts.student._id })).toBeGreaterThan(0);
  await page.reload(); await expect(page.getByRole('form', { name: 'Change account status' }).getByRole('combobox')).toHaveValue('suspended');
});

test('Administrator grants selected course access and revokes it with a recorded reason', async ({ page, accounts, platform }) => {
  await signIn(page, accounts.admin); await page.goto(`/admin/students/${accounts.student._id}`);
  const grant = page.getByRole('form', { name: 'Grant student access' });
  await grant.getByRole('combobox').nth(1).selectOption(String(platform.course._id));
  await grant.getByLabel('Grant reason (required)').fill('Approved learning access for browser verification.');
  page.once('dialog', (dialog) => dialog.accept()); await grant.getByRole('button', { name: 'Review access grant' }).click();
  await expect(actionStatus(page)).toContainText('Access granted');
  expect(await Entitlement.countDocuments({ user: accounts.student._id, product: platform.course._id, status: 'active' })).toBe(1);
  await page.getByRole('button', { name: 'Revoke access', exact: true }).click();
  await page.getByLabel('Revocation reason').fill('Browser access verification complete.');
  page.once('dialog', (dialog) => dialog.accept()); await page.getByRole('button', { name: 'Confirm access revocation' }).click();
  await expect(actionStatus(page)).toContainText('Access revocation recorded');
  expect(await Entitlement.countDocuments({ user: accounts.student._id, status: 'active' })).toBe(0);
});

test('Course author creates draft, module and text lesson then publishes persisted curriculum', async ({ page, accounts }) => {
  const title = `Authored Course ${randomUUID()}`;
  await signIn(page, accounts.admin); await page.goto('/admin/courses'); await page.getByRole('button', { name: 'Create course', exact: true }).click();
  await page.getByLabel('Course title *', { exact: true }).fill(title);
  await page.getByLabel('This is a free course').check();
  await page.getByLabel('Cover gradient', { exact: true }).fill('linear-gradient(135deg, #120A24, #E8B95F)');
  await page.getByRole('button', { name: 'Create draft course', exact: true }).click();
  await expect(page.locator('.db-content h1')).toHaveText(title);
  const course = await Course.findOne({ title }); expect(course.publicationStatus).toBe('draft');
  await page.getByRole('button', { name: /^Curriculum/ }).click(); await page.getByRole('button', { name: 'Add module', exact: true }).click();
  await page.getByLabel('Module title *', { exact: true }).fill('The authored module');
  await page.getByLabel('Module publication status', { exact: true }).selectOption('published');
  await page.getByRole('button', { name: 'Create module', exact: true }).click();
  await page.getByRole('button', { name: 'Add lesson', exact: true }).click();
  await page.getByLabel('Lesson title *', { exact: true }).fill('The authored lesson');
  await page.getByLabel('Lesson publication status', { exact: true }).selectOption('published');
  await page.getByRole('textbox', { name: 'Lesson text', exact: true }).fill('A real lesson created and saved by an administrator.');
  await page.getByRole('button', { name: 'Create lesson', exact: true }).click();
  page.once('dialog', (dialog) => dialog.accept()); await page.getByRole('button', { name: 'Publish course', exact: true }).click();
  await expect(actionStatus(page)).toContainText('Course is now published');
  expect((await Course.findById(course._id)).publicationStatus).toBe('published'); expect(await Module.countDocuments({ course: course._id })).toBe(1);
  expect((await Lesson.findOne({ course: course._id })).textContent).toContain('real lesson');
  await page.reload(); await page.getByRole('button', { name: /^Curriculum/ }).click(); await page.getByRole('button', { name: 'Edit lesson The authored lesson' }).click();
  await expect(page.getByRole('textbox', { name: 'Lesson text', exact: true })).toHaveValue('A real lesson created and saved by an administrator.');
});

test('Admin full mock refund uses real fulfillment reversal and persists one refund', async ({ page, accounts, platform }) => {
  await signIn(page, accounts.student); await page.goto(`/checkout?course=${platform.paidCourse.slug}`);
  await page.getByRole('button', { name: 'Pay CAD 125.00' }).click(); await expect(page).toHaveURL(/\/checkout\?course=browser-paid&order=/);
  const order = await Order.findOne({ user: accounts.student._id });
  await platform.simulator.deliver(await platform.simulator.paymentEvent(order._id, 'success'));
  await api(page, '/auth/logout', { method: 'POST' }); await signIn(page, accounts.admin); await page.goto(`/admin/orders/${order._id}`);
  await page.getByLabel('Audit note (required)').fill('Isolated mock refund requested for browser verification.');
  page.once('dialog', (dialog) => dialog.accept()); await page.getByRole('button', { name: 'Review & confirm refund' }).click();
  await expect(actionStatus(page)).toContainText('Refund succeeded');
  expect((await Order.findById(order._id)).paymentStatus).toBe('refunded');
  expect(await Refund.countDocuments({ order: order._id, status: 'succeeded' })).toBe(1);
  expect(await Entitlement.countDocuments({ user: accounts.student._id, status: 'active' })).toBe(0);
  await page.reload(); await expect(actionStatus(page)).toContainText('Refund succeeded');
});

test('Support inbox resolves submitted contact request and survives refresh', async ({ page, accounts }) => {
  await signIn(page, accounts.admin);
  const subject = `Browser support ${randomUUID()}`;
  await api(page, '/contact', { method: 'POST', body: { name: 'Support Browser Member', email: 'support@example.test', subject, message: 'Please help with a persisted support request.' }, headers: { 'Idempotency-Key': randomUUID() } });
  await page.goto('/admin/contact');
  const article = page.locator('article').filter({ has: page.getByRole('heading', { name: subject }) });
  await expect(article).toContainText('Please help with a persisted support request.');
  await article.getByRole('combobox').selectOption('resolved'); await article.getByRole('button', { name: 'Save message status' }).click();
  await expect(article).toHaveCount(0); expect((await ContactRequest.findOne({ subject })).status).toBe('resolved');
  await page.getByLabel('Filter message status', { exact: true }).selectOption('resolved'); await expect(article).toBeVisible();
  await page.reload(); await page.getByLabel('Filter message status', { exact: true }).selectOption('resolved'); await expect(article).toContainText('Resolved');
});

for (const width of [320, 768, 1440]) {
  test(`Admin navigation at ${width}px stays keyboard accessible without overflow`, async ({ page, accounts }, testInfo) => {
    await page.setViewportSize({ width, height: 900 }); await signIn(page, accounts.admin); await page.goto('/admin');
    await expect(page.locator('.db-loading')).toHaveCount(0); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    if (width < 900) {
      const trigger = page.getByRole('button', { name: 'Open admin navigation' });
      await trigger.click();
      const drawer = page.locator('#admin-navigation');
      const stops = await drawer.locator('button,a[href]').count();
      const where = () => page.evaluate(() => {
        const node = document.activeElement;
        return { inside: !!node?.closest('#admin-navigation'), tag: node?.tagName?.toLowerCase(), label: node?.getAttribute('aria-label') || node?.textContent?.trim().slice(0, 45) || '' };
      });
      // Start from the first stop rather from the trigger button: after a click the
      // window can hold focus itself, and a Tab then moves nothing and the ring
      // appears to "escape" to <body>. Focusing the drawer proves focus took.
      const firstStop = drawer.locator('button,a[href]').first();
      await firstStop.focus();
      await expect(firstStop).toBeFocused();
      // Tab every visible stop plus a full extra lap: a fixed count drifted as the
      // navigation grew and only proved the trap held for the first twelve items.
      for (let index = 0; index < stops + 1; index += 1) {
        await page.keyboard.press('Tab');
        const focus = await where();
        expect(focus.inside, `Forward tab ${index + 1} of ${stops} stops escaped to <${focus.tag}> ${focus.label}`).toBe(true);
      }
      for (let index = 0; index < stops + 1; index += 1) {
        await page.keyboard.press('Shift+Tab');
        const focus = await where();
        expect(focus.inside, `Backward tab ${index + 1} of ${stops} stops escaped to <${focus.tag}> ${focus.label}`).toBe(true);
      }
      await expect(drawer.locator('button,a[href]').first()).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(trigger).toBeFocused();
    }
    await page.screenshot({ path: testInfo.outputPath(`admin-${width}.png`), fullPage: true });
  });
}

test('Admin student screen has no serious or critical automated accessibility violations', async ({ page, accounts }, testInfo) => {
  await signIn(page, accounts.admin); await page.goto('/admin/students'); await expect(page.locator('.db-loading')).toHaveCount(0);
  const result = await new AxeBuilder({ page }).analyze(); await testInfo.attach('accessibility', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
  expect(result.violations.filter((item) => ['serious', 'critical'].includes(item.impact))).toEqual([]);
});
