// Drives the exact live complaint: click "Pay USD 199", then "Record test
// payment", and the course must open without a card. Run from cft-frontend:
//   node tests/browser/test-payment-button.mjs
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(here, '..', '..');
const shots = path.join(here, 'shots');
const WEB_PORT = Number(process.env.CFT_TP_WEB_PORT || 5185);
const WEB = `http://127.0.0.1:${WEB_PORT}`;
process.env.CFT_DEV_STACK_FRONTEND = WEB;

const { startDevStack, funnelUser } = await import('../../../backend/scripts/dev-stack.mjs');

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${String(detail).slice(0, 220)}` : ''}`);
};

await mkdir(shots, { recursive: true });
const stack = await startDevStack({ quiet: true, useRealAuth: true });
const api = stack.apiOrigin;

const vite = spawn(process.execPath, [path.join(webDir, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '127.0.0.1', '--port', String(WEB_PORT), '--strictPort'], {
  cwd: webDir,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, CFT_DEV_API_TARGET: api }
});
let viteLog = '';
vite.stdout.on('data', (b) => { viteLog += b.toString(); });
vite.stderr.on('data', (b) => { viteLog += b.toString(); });
let viteReady = false;
for (let attempt = 0; attempt < 60; attempt += 1) {
  viteReady = await fetch(WEB).then((r) => r.ok).catch(() => false);
  if (viteReady) break;
  await new Promise((resolve) => setTimeout(resolve, 500));
}
if (!viteReady) {
  console.log(`FAIL  dev server answered on ${WEB} — ${viteLog.slice(-400)}`);
  vite.kill('SIGTERM');
  await stack.stop();
  process.exit(1);
}

const consoleErrors = [];
const browser = await chromium.launch({ channel: 'msedge' });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', (error) => consoleErrors.push(String(error.message)));
const shot = (name) => page.screenshot({ path: path.join(shots, `${name}.png`) }).catch(() => {});

let orderId = null;
try {
  const integrations = await fetch(`${api}/api/v1/health/integrations`).then((r) => r.json());
  check('the stack reports the mock payment provider', integrations?.data?.payments?.provider === 'mock', JSON.stringify(integrations?.data?.payments));

  const catalog = await fetch(`${api}/api/v1/courses`).then((r) => r.json());
  const course = (catalog.data.courses || catalog.data.items || []).find((c) => /accelerator/i.test(c.slug || c.id));
  check('the accelerator is purchasable', Boolean(course), course?.slug);

  await page.goto(`${WEB}/login?course=${encodeURIComponent(course.id)}`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Password/i }).first().click();
  await page.fill('#au-identifier', funnelUser.student.email);
  await page.fill('#au-password', funnelUser.student.password);
  await page.getByRole('button', { name: /^Sign In$/i }).first().click();
  await page.waitForURL(/\/checkout/, { timeout: 20000 });
  await page.getByRole('heading', { name: /Review your enrolment/i }).waitFor({ timeout: 20000 });

  await page.getByRole('button', { name: /^Pay / }).first().click();
  await page.getByText(/waiting for payment|no card page/i).first().waitFor({ timeout: 20000 });
  orderId = new URL(page.url()).searchParams.get('order');
  check('paying leaves a pending order', Boolean(orderId), orderId);
  await shot('tp-01-awaiting');

  const record = page.getByRole('button', { name: /Record test payment/i }).first();
  check('the record-test-payment button is offered', await record.isVisible().catch(() => false));

  const payCall = page.waitForResponse((r) => r.url().includes('/test-payment'), { timeout: 20000 });
  await record.click();
  const res = await payCall;
  const body = await res.json().catch(() => null);
  check('the browser posts to the test-payment route', res.status() === 200 && body?.data?.order?.paymentStatus === 'paid', `${res.status()} ${JSON.stringify(body?.error || body?.data?.testPayment)}`);

  await page.getByRole('link', { name: /Open course/i }).first().waitFor({ timeout: 20000 });
  check('the page flips to course access', true);
  await shot('tp-02-paid');

  await page.goto(`${WEB}/dashboard/courses`, { waitUntil: 'networkidle' });
  const tile = page.getByRole('link', { name: /accelerator|consciousness/i }).first();
  check('the course is in the learning library', await tile.isVisible().catch(() => false));
  await shot('tp-03-library');

  const { Order, Entitlement } = await import('../../../backend/src/models/index.js');
  const order = await Order.findById(orderId).lean();
  check('the order is paid and fulfilled', order?.paymentStatus === 'paid' && order?.fulfillmentStatus === 'fulfilled', `${order?.paymentStatus}/${order?.fulfillmentStatus}`);
  check('an entitlement was issued', (await Entitlement.countDocuments({ student: order.student, status: 'active' })) > 0);

  // The same click twice must not double-charge or double-grant.
  const again = await page.evaluate(async (id) => {
    const csrf = await fetch('/api/v1/auth/csrf', { credentials: 'include' }).then((r) => r.json());
    const response = await fetch(`/api/v1/orders/${id}/test-payment`, {
      method: 'POST', credentials: 'include', headers: { 'x-csrf-token': csrf.data.csrfToken }
    });
    return { status: response.status, body: await response.json() };
  }, orderId);
  check('recording it twice is harmless', again.status === 200 && again.body?.data?.alreadyPaid === true, JSON.stringify(again.body?.data || again.body?.error));
} catch (error) {
  check('funnel completed without a crash', false, String(error?.message || error).slice(0, 300));
  await shot('tp-99-failure');
} finally {
  // Google's button refuses any origin that is not on its allow-list, so the
  // spare port this run uses always logs that; nothing else is allowed through.
  const noise = consoleErrors.filter((line) => !/favicon|Download the React DevTools|playerjs|mediadelivery|net::ERR|Failed to load resource|GSI_LOGGER.*origin is not allowed/i.test(line));
  check('no unexpected console errors', noise.length === 0, noise.slice(0, 3).join(' || '));
  await browser.close();
  vite.kill('SIGTERM');
  await stack.stop();
  const passed = results.filter((r) => r.pass).length;
  console.log(`\n${passed}/${results.length} browser checks passed`);
  if (passed !== results.length && viteLog) console.log(viteLog.slice(-800));
  process.exit(passed === results.length ? 0 : 1);
}
