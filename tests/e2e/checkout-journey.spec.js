import { test, expect, signIn, password } from './fixtures.js';
import { Course, Entitlement, Lesson, Module, Order } from '../../../backend/src/models/index.js';

const review = /\/checkout\?course=browser-paid/;

async function payWithPassword(page, user) {
  await page.getByRole('button', { name: 'Password', exact: true }).click();
  await page.locator('#au-identifier').fill(user.email);
  await page.locator('#au-password').fill(password);
  await page.locator('.au-submit').click();
}

test('A selected course goes sign-in, then the server-priced review page, then payment', async ({ page, accounts, platform }) => {
  await page.goto(`/checkout?course=${platform.paidCourse.slug}`);
  await expect(page).toHaveURL(/\/login\?course=browser-paid$/);
  await payWithPassword(page, accounts.student);
  await expect(page).toHaveURL(review);
  await expect(page.getByRole('heading', { name: 'Review your enrolment' })).toBeVisible();
  await expect(page.locator('.cq-fact').filter({ hasText: 'Due today' })).toContainText('CAD 125.00');
  await expect(page.locator('.cq-fact').filter({ hasText: 'Currency' })).toContainText('CAD');
  await expect(page.getByText('1 published lesson across 1 module.', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Pay CAD 125.00' }).click();
  await expect(page.getByText('This order is waiting for payment')).toBeVisible();
  const order = await Order.findOne({ user: accounts.student._id });
  expect(order.totalMinor).toBe(12500);
  await expect(page).toHaveURL(new RegExp(`/checkout\\?course=browser-paid&order=${order._id}$`));
  expect(await Entitlement.countDocuments({ user: accounts.student._id })).toBe(0);

  // The provider confirmation is what grants access, and it can arrive late.
  await platform.simulator.deliver(await platform.simulator.paymentEvent(order._id, 'success'));
  await page.getByRole('button', { name: 'Refresh status' }).click();
  await expect(page.getByRole('link', { name: 'Open course' })).toBeVisible();
  expect(await Entitlement.countDocuments({ user: accounts.student._id, product: platform.paidCourse._id, status: 'active' })).toBe(1);
});

test('A cancelled payment leaves no order access and says so plainly', async ({ page, accounts, platform }) => {
  await signIn(page, accounts.student);
  await page.goto(`/checkout?course=${platform.paidCourse.slug}&status=cancelled`);
  await expect(page.getByText(/Payment was cancelled/)).toBeVisible();
  await expect(page.getByText(/nothing was charged and no access was granted/)).toBeVisible();
  expect(await Order.countDocuments({ user: accounts.student._id })).toBe(0);
  expect(await Entitlement.countDocuments({ user: accounts.student._id })).toBe(0);
});

test('A free enrolment on the review page opens the course without a payment', async ({ page, accounts, platform }) => {
  await signIn(page, accounts.student);
  await page.goto(`/checkout?course=${platform.course.slug}`);
  await expect(page.getByText('Included at no cost', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Enrol for free' }).click();
  await expect(page.getByRole('link', { name: 'Open course' })).toBeVisible();
  expect(await Entitlement.countDocuments({ user: accounts.student._id, product: platform.course._id, status: 'active' })).toBe(1);
});

test('An offering without deliverable lessons is reviewed but never charged', async ({ page, accounts, platform }) => {
  const draftLessons = await Course.create({
    title: 'Browser Test Unready Course', slug: 'browser-unready', priceMinor: 9900, currency: 'CAD', publicationStatus: 'published',
  });
  const module = await Module.create({ course: draftLessons._id, title: 'Module one', publicationStatus: 'published' });
  await Lesson.create({ course: draftLessons._id, module: module._id, title: 'Video lesson', lessonType: 'video', publicationStatus: 'published' });
  await signIn(page, accounts.student);
  await page.goto(`/checkout?course=${draftLessons.slug}`);
  await expect(page.getByText(/Enrolment is not open yet/)).toBeVisible();
  await expect(page.getByText(/You will not be charged\./)).toBeVisible();
  await expect(page.getByRole('button', { name: /Pay CAD/ })).toHaveCount(0);
  expect(await Order.countDocuments({ user: accounts.student._id })).toBe(0);
  await draftLessons.deleteOne(); await module.deleteOne();
});

test('A course published in the admin reaches the website and checkout without a code change', async ({ page, accounts, platform }) => {
  const fresh = await Course.create({
    title: 'Browser Admin Published Course', slug: 'browser-admin-published',
    shortDescription: 'Published through the admin, not the source code.', priceMinor: 8000, currency: 'CAD', publicationStatus: 'published',
  });
  const module = await Module.create({ course: fresh._id, title: 'First module', publicationStatus: 'published' });
  await Lesson.create({ course: fresh._id, module: module._id, title: 'Opening teaching', lessonType: 'text', textContent: 'A lesson stored in the database.', completion: { rule: 'manual' }, publicationStatus: 'published' });

  try {
    await page.goto('/courses');
    const card = page.locator('.cq-show').filter({ hasText: 'Browser Admin Published Course' });
    await expect(card.first()).toBeVisible();
    await expect(card.first().getByText(/CA\$80/)).toBeVisible();

    await page.goto('/course/browser-admin-published');
    await expect(page.getByRole('heading', { name: 'Browser Admin Published Course', level: 1 })).toBeVisible();
    await expect(page.locator('.cq-fact').filter({ hasText: 'Modules' })).toContainText('1 module · 1 lesson');
    await expect(page.getByRole('link', { name: /Enroll Now/ }).first()).toHaveAttribute('href', '/checkout?course=browser-admin-published');

    await signIn(page, accounts.student);
    await page.goto('/checkout?course=browser-admin-published');
    await expect(page.locator('.cq-fact').filter({ hasText: 'Due today' })).toContainText('CAD 80.00');
  } finally {
    await Lesson.deleteMany({ course: fresh._id });
    await module.deleteOne();
    await fresh.deleteOne();
  }
});
