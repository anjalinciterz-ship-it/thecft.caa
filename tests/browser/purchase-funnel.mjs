// Drives the real purchase + DRM funnel in a browser against the disposable dev stack.
// Run with: node tests/browser/purchase-funnel.mjs   (from the cft-frontend directory)
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium, expect } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(here, '..', '..');
const shots = path.join(here, 'shots');
const WEB_PORT = Number(process.env.CFT_FUNNEL_WEB_PORT || 5180);
const WEB = `http://127.0.0.1:${WEB_PORT}`;
// The stack refuses cross-origin requests, so it has to be told the same port
// this run happens to use.
process.env.CFT_DEV_STACK_FRONTEND = WEB;

const { startDevStack, funnelUser } = await import('../../../backend/scripts/dev-stack.mjs');
const { paymentEvent, deliver } = await import('../../../backend/tests/helpers/payment-simulator.js');

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

await mkdir(shots, { recursive: true });
// Signing is only real when backend/.env carries the Bunny key; the playback
// checks below then talk to the actual video library.
const stack = await startDevStack({ quiet: true, useRealAuth: true });
const api = stack.apiOrigin;

// The stack has no mailbox, so the code it prints is what a person would read
// from their own terminal — this captures it the same way and keeps it out of
// the report so a code never lands in the check output.
const otpCodes = [];
const printLine = console.log.bind(console);
console.log = (...args) => {
  const line = args.map(String).join(' ');
  const code = /\[otp:dev\] code for \S+: (\d{6})/.exec(line)?.[1];
  if (!code) printLine(...args);
  else otpCodes.push(code);
};
const latestCode = () => otpCodes[otpCodes.length - 1] || '';

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
const mediaHits = [];
const browser = await chromium.launch({ channel: 'msedge', args: ['--autoplay-policy=no-user-gesture-required'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', (error) => consoleErrors.push(String(error.message)));
page.on('response', (res) => {
  const url = res.url();
  if (/mediadelivery\.net|b-cdn\.net/.test(url) && /(\.m3u8|\.mp4|\.m4s|\.ts(\?|$)|\.mpd|\/hls\/)/i.test(url)) {
    mediaHits.push(`${res.status()} ${url.slice(0, 120)}`);
  }
});

const shot = (name) => page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: false }).catch(() => {});

try {
  const catalog = await fetch(`${api}/api/v1/courses`).then((r) => r.json());
  const course = (catalog.data.courses || catalog.data.items || []).find((c) => /accelerator/i.test(c.slug || c.id));
  check('catalog serves the accelerator course', Boolean(course), course?.slug);

  // 1. A signed-out visitor opening the course page and pressing Enroll Now.
  await page.goto(`${WEB}/course/${encodeURIComponent(course.id)}`, { waitUntil: 'networkidle' });
  const enroll = page.getByRole('link', { name: /Enroll Now/i }).first();
  check('course page shows Enroll Now', await enroll.isVisible().catch(() => false));
  await shot('01-course-page');
  await enroll.click();

  // 2. Buy Now answers his brief by forcing sign-in first, with a return path.
  await page.waitForURL(/\/login\?course=/, { timeout: 15000 });
  check('enrolment redirects to login first and keeps the chosen course', page.url().includes('course=accelerator'), page.url());
  await shot('02-login');

  await page.getByRole('button', { name: /Password/i }).first().click();
  await page.fill('#au-identifier', funnelUser.student.email);
  await page.fill('#au-password', funnelUser.student.password);
  await page.getByRole('button', { name: /^Sign In$/i }).first().click();

  // 3. Back on checkout the price must come from the server, not the page data.
  await page.waitForURL(/\/checkout/, { timeout: 15000 });
  await page.getByRole('heading', { name: /Review your enrolment/i }).waitFor({ timeout: 15000 });
  const due = page.locator('.cq-fact', { hasText: 'Due today' });
  await expect.poll(async () => (await due.innerText()).replace(/\s+/g, ' '), { timeout: 15000 })
    .toContain('199.00');
  const dueText = (await due.innerText()).replace(/\s+/g, ' ');
  check('server prices the order at USD 199.00', /USD 199\.00/.test(dueText), dueText);
  await shot('03-checkout-review');

  const payButton = page.getByRole('button', { name: /^Pay / }).first();
  const payLabel = (await payButton.innerText()).replace(/\s+/g, ' ');
  check('the pay button quotes the server price, not page data', /Pay USD 199\.00/.test(payLabel), payLabel);
  check('pay button is enabled', await payButton.isEnabled());
  await payButton.click();
  await page.getByText(/waiting for payment/i).first().waitFor({ timeout: 15000 });
  check('mock provider holds the order pending instead of faking a payment', true, page.url());
  await shot('04-awaiting-payment');

  const orderId = new URL(page.url()).searchParams.get('order');
  check('checkout keeps the order id in the address', Boolean(orderId), orderId);

  // 4. The provider confirmation arrives through the webhook, then the page re-reads it.
  await deliver(paymentEvent(orderId));
  await page.getByRole('button', { name: /Refresh status/i }).first().click();
  await page.getByRole('link', { name: /Open course/i }).first().waitFor({ timeout: 15000 });
  check('paid order flips the page to course access', true);
  await shot('05-paid');

  const { Order, Entitlement, EmailMessage, Course } = await import('../../../backend/src/models/index.js');
  const order = await Order.findById(orderId).lean();
  check('order is paid and fulfilled', order?.paymentStatus === 'paid' && order?.fulfillmentStatus === 'fulfilled', `${order?.paymentStatus}/${order?.fulfillmentStatus}`);
  check('one entitlement was issued', (await Entitlement.countDocuments({ course: order.items[0].course, status: 'active' })) === 1);
  const mail = await EmailMessage.find({ order: orderId }).lean();
  const studentMail = mail.filter((m) => m.to === funnelUser.student.email);
  const adminMail = mail.filter((m) => m.to === 'notify@example.test');
  check('student receipt is queued', studentMail.length > 0, studentMail[0]?.subject);
  check('admin inbox is notified of the sale', adminMail.length > 0, adminMail[0]?.subject);

  // 5. The library and player.
  await page.goto(`${WEB}/dashboard/courses`, { waitUntil: 'networkidle' });
  const tile = page.getByRole('link', { name: /accelerator|consciousness/i }).first();
  check('course appears in the learning library', await tile.isVisible().catch(() => false));
  await shot('06-library');

  await page.goto(`${WEB}/dashboard/courses/${encodeURIComponent(course.slug)}`, { waitUntil: 'networkidle' });
  const lessonSelect = page.locator('select').first();
  await lessonSelect.waitFor({ timeout: 15000 });
  const options = await lessonSelect.locator('option').all();
  const videoLessons = [];
  for (const option of options) {
    const value = await option.getAttribute('value');
    const label = (await option.innerText()).trim();
    if (value) videoLessons.push({ value, label, locked: await option.isDisabled() });
  }
  check('curriculum lists lessons with video', videoLessons.length > 0, videoLessons.map((l) => l.label).join(' | '));

  const playable = videoLessons.find((l) => !l.locked) || videoLessons[0];
  // A session held from the page itself proves the one-viewer rule without
  // depending on whether the hosted video player answers.
  const holdSlot = async () => page.evaluate(async (lesson) => {
    const csrf = await fetch('/api/v1/auth/csrf', { credentials: 'include' }).then((r) => r.json());
    const response = await fetch(`/api/v1/video/lessons/${lesson}/playback`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf.data.csrfToken }
    });
    return { status: response.status, body: await response.json() };
  }, playable.value);

  const releaseSlot = (sessionId) => page.evaluate(async (id) => {
    const csrf = await fetch('/api/v1/auth/csrf', { credentials: 'include' }).then((r) => r.json());
    return fetch(`/api/v1/video/playback/${id}`, {
      method: 'DELETE', credentials: 'include', headers: { 'x-csrf-token': csrf.data.csrfToken }
    }).then((r) => r.status);
  }, sessionId);

  const held = await holdSlot();
  check('the API issues a playback session for an owned course', held.status === 200, String(held.status));
  const sessionId = held.body?.data?.playback?.sessionId;

  await lessonSelect.selectOption(playable.value);
  await page.getByRole('button', { name: /Start video/i }).first().click();
  const refusal = await page.getByRole('alert').filter({ hasText: /another device/i }).first()
    .waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
  check('the player refuses a second viewer on the same account', refusal);
  await shot('07-second-device-refused');

  await releaseSlot(sessionId);
  const playbackCall = page.waitForResponse((r) => r.url().includes('/video/lessons/') && r.url().includes('/playback'), { timeout: 20000 });
  await page.getByRole('button', { name: /Start video/i }).first().click();
  const playbackRes = await playbackCall;
  const playbackBody = await playbackRes.json().catch(() => null);
  const playback = playbackBody?.data?.playback;
  check('playback is issued by the server', Boolean(playback?.playbackUrl), playbackRes.status());

  if (playback) {
    const url = new URL(playback.playbackUrl);
    check('player is the Bunny iframe the client accepts',
      playback.playbackType === 'iframe' && url.origin === 'https://player.mediadelivery.net' && /^\/embed\/\d+\/[a-f\d-]{36}\/?$/i.test(url.pathname),
      playback.playbackUrl);
    check('playback expires on its own', new Date(playback.expiresAt) > new Date(), playback.expiresAt);

    const frame = page.locator('iframe[title]').first();
    await frame.waitFor({ timeout: 10000 });
    check('no downloadable media is exposed to the page', (await page.locator('video, [download]').count()) === 0);
    check('iframe is locked down', (await frame.getAttribute('allow')) === 'autoplay; encrypted-media'
      && (await frame.getAttribute('referrerPolicy')) === 'no-referrer');

    // A signed embed is only worth anything if the video actually streams, so
    // press play inside Bunny's own frame and watch for real media.
    let bunnyFrame = null;
    for (let attempt = 0; attempt < 40 && !bunnyFrame; attempt += 1) {
      bunnyFrame = page.frames().find((f) => /mediadelivery\.net/.test(f.url())) || null;
      if (!bunnyFrame) await page.waitForTimeout(250);
    }
    const gate = bunnyFrame ? await bunnyFrame.evaluate(() => ({
      denied: /403|Forbidden|token is not valid/i.test(document.body.innerText),
      hasVideoElement: Boolean(document.querySelector('video'))
    })).catch(() => null) : null;
    check('Bunny opens the signed embed instead of answering 403', Boolean(gate) && gate.denied === false,
      gate ? JSON.stringify(gate) : `frames: ${page.frames().map((f) => f.url().slice(0, 70)).join(' | ')}`);
    // Press play where a student would press it. Bunny's own frame keeps the
    // <video> beyond this page's reach, so the proof here is the signed CDN
    // traffic it produces; tests/browser/bunny-playback.mjs reads the clock.
    const box = await frame.boundingBox();
    if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.38);
    const mediaBefore = mediaHits.length;
    for (let attempt = 0; attempt < 24 && mediaHits.length === mediaBefore; attempt += 1) await page.waitForTimeout(500);
    check('the lesson files stream to this student only, over a signed CDN link',
      mediaHits.length > mediaBefore && mediaHits.every((hit) => /^(200|206)/.test(hit)) && /token=/.test(mediaHits.join(' ')),
      `${mediaHits.length - mediaBefore} of ${mediaHits.length} media responses: ${mediaHits.slice(0, 1).join('')}`);
    await shot('08b-lesson-playing');
    await shot('08b-lesson-playing');

    const mark = page.locator('span[aria-hidden="true"]').filter({ hasText: /@/ }).first();
    const markSeen = await mark.waitFor({ timeout: 10000 }).then(() => true).catch(() => false);
    check('watermark is painted over the video', markSeen);
    if (markSeen) {
      const text = (await mark.innerText()).trim();
      check('watermark carries the student name, email and session', text.includes(funnelUser.student.email.split('@')[0]) && text.includes('Browser Verify'), text);
      await shot('08-watermark');

      const firstCorner = await mark.evaluate((el) => [el.style.top || '', el.style.left || '', el.style.bottom || '', el.style.right || ''].join('|'));
      const moveMs = Math.min((playback.watermark.moveSeconds || 7) * 1000 + 400, 12000);
      await page.waitForTimeout(moveMs);
      const secondCorner = await mark.isVisible().catch(() => false)
        ? await mark.evaluate((el) => [el.style.top || '', el.style.left || '', el.style.bottom || '', el.style.right || ''].join('|'))
        : null;
      check('watermark moves around the frame', Boolean(secondCorner) && secondCorner !== firstCorner, `${firstCorner} -> ${secondCorner}`);
      await shot('09-watermark-moved');
    }
    check('watermark opacity is configured', playback.watermark.enabled === true && playback.watermark.opacity > 0, String(playback.watermark.opacity));
  }

  // 6. Access is the entitlement, not the URL.
  const entitlement = await Entitlement.findOne({ course: order.items[0].course }).lean();
  const owned = await Course.findById(order.items[0].course).lean();
  check('access is lifetime, with no expiry written', owned?.accessPolicy === 'lifetime' && !entitlement?.accessUntil, );

  // 7. A first-time visitor signs up with an email code and lands inside.
  const signupEmail = `funnel.signup+${Date.now()}@verify.test`;
  const signupContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const signupPage = await signupContext.newPage();
  await signupPage.goto(`${WEB}/signup`, { waitUntil: 'networkidle' });
  await signupPage.fill('#otp-first', 'Funnel');
  await signupPage.fill('#otp-destination', signupEmail);
  await signupPage.locator('form.au-fields .au-check input').first().check();
  await signupPage.getByRole('button', { name: /Send email code/i }).first().click();
  const codeField = signupPage.locator('#otp-code');
  const codeAsked = await codeField.waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
  check('signup asks for a code by email', codeAsked, codeAsked ? signupEmail : await signupPage.locator('.au-err').first().innerText().catch(() => ''));
  await signupPage.screenshot({ path: path.join(shots, '10-signup-code-asked.png') }).catch(() => {});

  check('the code is never handed to the browser', !(await signupPage.locator('body').innerText()).includes(latestCode()), signupEmail);
  await codeField.fill(latestCode());
  await signupPage.getByRole('button', { name: /Verify and create account/i }).first().click();
  const landed = await signupPage.waitForURL(/dashboard/, { timeout: 15000 }).then(() => true).catch(() => false);
  check('the new account is signed in and taken inside', landed, signupPage.url());
  await signupPage.screenshot({ path: path.join(shots, '11-signup-done.png') }).catch(() => {});

  const { User } = await import('../../../backend/src/models/index.js');
  const newcomer = await User.findOne({ email: signupEmail }).lean();
  check('signup stores the account with consent and no password', Boolean(newcomer) && !newcomer.passwordHash && newcomer.termsAcceptedAt instanceof Date, `${signupEmail} · ${newcomer?.role}`);
  const whoami = await signupPage.evaluate(() => fetch('/api/v1/auth/me', { credentials: 'include' }).then((r) => r.json()));
  check('the fresh session belongs to the new account', whoami?.data?.user?.email === signupEmail);
  await signupContext.close();
} catch (error) {
  check('funnel completed without a crash', false, String(error?.message || error).slice(0, 300));
  await shot('99-failure');
} finally {
  const noise = consoleErrors.filter((line) => !/favicon|Download the React DevTools|playerjs|mediadelivery|net::ERR|Failed to load resource/i.test(line));
  check('no unexpected console errors', noise.length === 0, noise.slice(0, 3).join(' || '));
  await browser.close();
  vite.kill('SIGTERM');
  await stack.stop();
  const passed = results.filter((r) => r.pass).length;
  console.log(`\n${passed}/${results.length} browser checks passed`);
  if (passed !== results.length) console.log(viteLog.slice(-1200));
  process.exit(passed === results.length ? 0 : 1);
}
