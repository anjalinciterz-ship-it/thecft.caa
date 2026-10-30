import { test as base, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import '../../../backend/tests/helpers/preload.js';
import mongoose from '../../../backend/node_modules/mongoose/index.js';
import memory from '../../../backend/node_modules/mongodb-memory-server/index.js';
import session from '../../../backend/node_modules/express-session/index.js';
import { useTestEnv } from '../../../backend/tests/helpers/env.js';
import { User, Course, Module, Lesson, Notification } from '../../../backend/src/models/index.js';

const password = 'Browser-Test-Password-123!';

// Must match playwright.config.js: this origin pair is what the CSRF and CORS
// guards compare against, so a divergent port fails every browser mutation.
const webPort = Number(process.env.CFT_TEST_WEB_PORT || 5174);
const apiPort = Number(process.env.CFT_TEST_API_PORT || 5051);
export const frontendOrigin = `http://127.0.0.1:${webPort}`;
export const apiOrigin = `http://127.0.0.1:${apiPort}`;

export const test = base.extend({
  // Every page talks to the API the moment it loads, so the platform fixture is
  // declared here rather than per test: an omitted `platform` would let a test
  // browse against a proxy whose backend has not started (or has already gone).
  page: async ({ platform, page }, use, testInfo) => {
    const errors = [];
    const consoleErrors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    await use(page);
    await testInfo.attach('browser-errors', { body: JSON.stringify({ uncaught: errors, console: consoleErrors }, null, 2), contentType: 'application/json' });
    expect(errors, 'No uncaught browser errors').toEqual([]);
  },
  platform: [async ({}, use) => {
    const mongo = await memory.MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
    const config = useTestEnv({ MONGODB_URI: mongo.getUri('payment_test_browser'), PAYMENT_PROVIDER: 'mock', PAYMENT_MOCK_ENABLED: 'true', FRONTEND_URL: frontendOrigin, BACKEND_URL: apiOrigin, CORS_ALLOWED_ORIGINS: frontendOrigin });
    await mongoose.connect(config.MONGODB_URI);
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
    const simulator = await import('../../../backend/tests/helpers/payment-simulator.js');
    const { createApp } = await import('../../../backend/src/app.js');
    const app = createApp({ sessionStore: new session.MemoryStore() });
    const server = await new Promise((resolve, reject) => {
      const listening = app.listen(apiPort, '127.0.0.1', () => resolve(listening));
      listening.once('error', reject);
    });
    const course = await Course.create({ title: 'Browser Test Learning Course', slug: 'browser-learning', shortDescription: 'An isolated course for browser verification.', description: 'Practice learning with a real stored lesson.', isFree: true, priceMinor: 0, currency: 'CAD', publicationStatus: 'published', gradient: 'linear-gradient(135deg, #120a24, #35204d)' });
    const module = await Module.create({ course: course._id, title: 'First module', publicationStatus: 'published' });
    const lesson = await Lesson.create({ course: course._id, module: module._id, title: 'Reflect and begin', lessonType: 'text', textContent: 'Read, reflect and deliberately complete this lesson.', completion: { rule: 'manual' }, publicationStatus: 'published' });
    const paidCourse = await Course.create({ title: 'Browser Test Paid Course', slug: 'browser-paid', shortDescription: 'A priced offering for isolated checkout verification.', priceMinor: 12500, currency: 'CAD', publicationStatus: 'published' });
    // A paid offering only shows its pay button once its own lessons are
    // deliverable, so the isolated fixture publishes one the way the real catalog does.
    const paidModule = await Module.create({ course: paidCourse._id, title: 'Paid module', publicationStatus: 'published' });
    const paidLesson = await Lesson.create({ course: paidCourse._id, module: paidModule._id, title: 'Begin here', lessonType: 'text', textContent: 'A stored lesson that unlocks after payment.', completion: { rule: 'manual' }, publicationStatus: 'published' });
    try { await use({ simulator, course, paidCourse, lesson, paidLesson }); }
    finally { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); await mongoose.disconnect(); await mongo.stop(); }
  }, { scope: 'worker', timeout: 120000 }],
  accounts: async ({ platform }, use) => {
    const suffix = randomUUID();
    const make = async (role) => {
      const user = new User({ name: `${role === 'admin' ? 'Admin' : 'Student'} Browser Member`, email: `${role}-${suffix}@payments.test`, role, emailVerified: true });
      await user.setPassword(password); await user.save();
      return user;
    };
    const student = await make('student');
    const admin = await make('admin');
    await Notification.create({ recipient: student._id, type: 'system', title: 'Browser verification notice', body: 'This notice is stored in the isolated database.', link: '/dashboard/courses' });
    await use({ student, admin, password });
  },
});
export { expect, password };

export async function signIn(page, user, secret = password) {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Password', exact: true }).click();
  await expect(page.locator('.au-submit')).toBeEnabled();
  await page.locator('#au-identifier').fill(user.email);
  await page.locator('#au-password').fill(secret);
  await page.locator('.au-submit').click();
  await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
  await expect(page.locator('.db-content h1')).toBeVisible();
}

export async function api(page, path, options = {}) {
  return page.evaluate(async ({ path, options }) => {
    const { apiRequest } = await import('/src/lib/api.js');
    return apiRequest(path, options);
  }, { path, options });
}
