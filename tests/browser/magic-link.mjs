// The magic-link sign-in Vaibhav asked for on 2026-11-06, end to end: the tab on
// /login, the link the stack emails, the page that spends it, and where the
// member lands afterwards. Also re-checks that the three older methods still work.
// Run with: node tests/browser/magic-link.mjs   (from the cft-frontend directory)
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(here, '..', '..');
const shots = path.join(here, 'shots');
const WEB_PORT = Number(process.env.CFT_MAGIC_WEB_PORT || 5183);
const WEB = `http://127.0.0.1:${WEB_PORT}`;
process.env.CFT_DEV_STACK_PORT = String(process.env.CFT_MAGIC_API_PORT || 5003);
process.env.CFT_DEV_STACK_FRONTEND = WEB;

const { startDevStack, funnelUser } = await import('../../../backend/scripts/dev-stack.mjs');

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail.slice(0, 180)}` : ''}`);
};

await mkdir(shots, { recursive: true });
const stack = await startDevStack({ quiet: true });
const api = stack.apiOrigin;

// There is no mailbox in this stack, so the link it would have sent is read from
// the same place a person reads it — the terminal — and kept out of the report.
const issuedLinks = [];
const printLine = console.log.bind(console);
console.log = (...args) => {
  const line = args.map(String).join(' ');
  const url = /\[magic:dev\] sign-in link for (\S+): (\S+)/.exec(line);
  if (!url) printLine(...args);
  else issuedLinks.push({ email: url[1], url: url[2] });
};
const lastLinkFor = (email) => [...issuedLinks].reverse().find((entry) => entry.email === email)?.url || '';

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
  printLine(`FAIL  dev server answered on ${WEB} — ${viteLog.slice(-400)}`);
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

const shot = (name, target = page) => target.screenshot({ path: path.join(shots, `${name}.png`) }).catch(() => {});
const tab = (name) => page.getByRole('button', { name, exact: true });

// The API answers /auth at 40 requests a minute per address, and one page load
// costs two of them. This run makes a point of covering a lot of paths, so the
// later blocks wait until the limiter reports headroom rather than failing on a
// 429 that says nothing about the feature.
const remainingAuth = (res) => {
  const draft6 = Number(String(res.headers.get('ratelimit') || '').match(/remaining=(\d+)/)?.[1]);
  return Number.isFinite(draft6) ? draft6 : Number(res.headers.get('x-ratelimit-remaining'));
};
const waitForAuthHeadroom = async (want = 14) => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const res = await fetch(`${api}/api/v1/auth/status`).catch(() => null);
    if (res?.ok && remainingAuth(res) >= want) return true;
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  return false;
};

const student = funnelUser.student.email;
let studentLink = '';

try {
  // ---- the affordance on /login ----
  await page.goto(`${WEB}/login`, { waitUntil: 'networkidle' });
  const labels = await page.locator('.au-methods button span').allInnerTexts();
  check('login offers three sign-in methods', labels.length === 3, labels.join(' / '));
  check('the new method is named Sign-in link', labels.includes('Sign-in link'));
  check('email code still defaults to pressed', await tab('Email code').getAttribute('aria-pressed') === 'true');
  await shot('80-login-email-code');

  await tab('Sign-in link').click();
  check('the link tab takes the pressed state', await tab('Sign-in link').getAttribute('aria-pressed') === 'true');
  const emailField = page.locator('#au-magic-email');
  check('the link tab shows one field: an address', await emailField.isVisible());
  check('no code box or password box on the link tab', await page.locator('#otp-code, #au-password').count() === 0);
  check('the send button asks for a link', await page.getByRole('button', { name: /Email me a sign-in link/i }).isVisible());
  await shot('81-login-link-tab');

  // ---- asking for a link ----
  await emailField.fill(student);
  await page.getByRole('button', { name: /Email me a sign-in link/i }).click();
  const inboxNote = page.locator('.au-note', { hasText: /Check your inbox/i });
  await inboxNote.waitFor({ timeout: 15000 });
  const inboxText = (await inboxNote.innerText()).replace(/\s+/g, ' ');
  check('the page confirms a link is on its way', await inboxNote.isVisible());
  check('the address is masked, never spelled out', inboxText.includes('b*') && !inboxText.includes(student), inboxText);
  check('the link says it works once and expires', /works once/i.test(inboxText) && /10 minutes/i.test(inboxText));
  const resendAgain = page.getByRole('button', { name: /Send again in \d+s|Send a new link/i });
  check('the resend control is cooling down', await resendAgain.isDisabled(), (await resendAgain.innerText()).trim());
  check('the stack actually issued a link', Boolean(lastLinkFor(student)), lastLinkFor(student).slice(0, 60));
  check('the link goes to the magic-link route with a token', /\/magic-link\?token=[\w-]{20,}$/.test(lastLinkFor(student)));
  studentLink = lastLinkFor(student);
  const { User, EmailMessage } = await import('../../../backend/src/models/index.js');
  const mailRow = await EmailMessage.findOne({ template: 'magic_link', to: student }).lean();
  check('the mailed body is redacted after delivery', mailRow?.status === 'skipped' && !mailRow.html, `${mailRow?.template}/${mailRow?.status}`);
  await shot('82-login-link-sent');

  check('changing the address returns to the field', await (async () => {
    await page.getByRole('button', { name: /^Change email$/i }).click();
    return page.locator('#au-magic-email').isVisible();
  })());

  // ---- opening the link ----
  await page.goto(studentLink, { waitUntil: 'networkidle' });
  const landed = await page.waitForURL(/\/dashboard/, { timeout: 15000 }).then(() => true).catch(() => false);
  check('the link signs the member in without a password', landed, page.url());
  const whoami = await page.evaluate(() => fetch('/api/v1/auth/me', { credentials: 'include' }).then((r) => r.json()));
  check('the fresh session belongs to that address', whoami?.data?.user?.email === student, whoami?.data?.user?.email);
  await shot('83-after-link-landing');

  // ---- the link is spent ----
  await page.goto(studentLink, { waitUntil: 'networkidle' });
  const spent = page.locator('.au-err', { hasText: /already used/i });
  check('opening it twice is refused', await spent.waitFor({ timeout: 10000 }).then(() => true).catch(() => false));
  check('the spent page offers a new link', await page.getByRole('link', { name: /Request a new link/i }).isVisible());
  await shot('84-link-spent');

  // ---- a URL with nothing on it ----
  await page.goto(`${WEB}/magic-link`, { waitUntil: 'networkidle' });
  check('an incomplete link says so', await page.getByText(/Nothing to confirm/i).isVisible());
  check('a junk token is refused, not silently ignored', await (async () => {
    await page.goto(`${WEB}/magic-link?token=not_a_real_token_at_all_abcdefg`, { waitUntil: 'networkidle' });
    return page.locator('.au-err').waitFor({ timeout: 10000 }).then(() => true).catch(() => false);
  })());

  // ---- an address with no account ----
  await waitForAuthHeadroom();
  // The main page is signed in by now, and /login sends signed-in members
  // inside, so this one needs a fresh anonymous context.
  const anonContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const anonPage = await anonContext.newPage();
  anonPage.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  anonPage.on('pageerror', (error) => consoleErrors.push(String(error.message)));
  await anonPage.goto(`${WEB}/login`, { waitUntil: 'networkidle' });
  await anonPage.getByRole('button', { name: 'Sign-in link', exact: true }).click();
  await anonPage.locator('#au-magic-email').fill('nobody.here@verify.test');
  await anonPage.getByRole('button', { name: /Email me a sign-in link/i }).click();
  check('an unknown address is answered, not mailed', await anonPage.locator('.au-err', { hasText: /could not find an account/i }).waitFor({ timeout: 10000 }).then(() => true).catch(() => false));
  check('and it offers to create an account', await anonPage.getByRole('link', { name: /Create your account/i }).isVisible());
  await anonPage.screenshot({ path: path.join(shots, '85-unknown-address.png') }).catch(() => {});
  await anonContext.close();

  // ---- mid-purchase: the link must land them back where they came from ----
  await waitForAuthHeadroom();
  // A third address, because the first two are still inside their resend window.
  const shopper = new User({ firstName: 'Shop', lastName: 'Demo', email: 'browser.shop@verify.test', role: 'student', emailVerified: true });
  await shopper.save();
  const shopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const shopPage = await shopContext.newPage();
  shopPage.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  shopPage.on('pageerror', (error) => consoleErrors.push(String(error.message)));
  await shopPage.goto(`${WEB}/login?next=%2Fdashboard%2Flibrary`, { waitUntil: 'networkidle' });
  await shopPage.getByRole('button', { name: 'Sign-in link', exact: true }).click();
  await shopPage.locator('#au-magic-email').fill(shopper.email);
  await shopPage.getByRole('button', { name: /Email me a sign-in link/i }).click();
  await shopPage.locator('.au-note', { hasText: /Check your inbox/i }).waitFor({ timeout: 15000 });
  const shopLink = lastLinkFor(shopper.email);
  check('a second address gets its own link', Boolean(shopLink) && shopLink !== studentLink);
  await shopPage.goto(shopLink, { waitUntil: 'networkidle' });
  const kept = await shopPage.waitForURL(/dashboard\/library/, { timeout: 15000 }).then(() => true).catch(() => false);
  check('and remembers where they were headed', kept, kept ? shopPage.url() : `${shopPage.url()} :: ${(await shopPage.locator('.au-card').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 140)}`);
  await shopPage.screenshot({ path: path.join(shots, '86-link-keeps-destination.png') }).catch(() => {});
  await shopContext.close();

  // ---- the older methods are untouched ----
  await waitForAuthHeadroom();
  // The email-code check runs first: once a method signs the member in, /login
  // starts bouncing to the dashboard and the anonymous forms stop being reachable.
  const oldContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const oldPage = await oldContext.newPage();
  oldPage.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  oldPage.on('pageerror', (error) => consoleErrors.push(String(error.message)));
  await oldPage.goto(`${WEB}/login`, { waitUntil: 'networkidle' });
  await oldPage.getByRole('button', { name: 'Email code', exact: true }).click();
  await oldPage.locator('#otp-destination').fill(student);
  await oldPage.getByRole('button', { name: /Send email code/i }).click();
  check('email code still sends a six-digit code', await oldPage.locator('#otp-code').waitFor({ timeout: 15000 }).then(() => true).catch(() => false));
  await oldPage.goto(`${WEB}/login`, { waitUntil: 'networkidle' });
  await oldPage.getByRole('button', { name: 'Password', exact: true }).click();
  await oldPage.fill('#au-identifier', student);
  await oldPage.fill('#au-password', funnelUser.student.password);
  await oldPage.getByRole('button', { name: /^Sign In$/i }).first().click();
  check('password sign-in still works', await oldPage.waitForURL(/\/dashboard/, { timeout: 15000 }).then(() => true).catch(() => false), oldPage.url());
  await oldContext.close();

  // ---- mobile ----
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mobPage = await mobile.newPage();
  mobPage.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  mobPage.on('pageerror', (error) => consoleErrors.push(String(error.message)));
  await mobPage.goto(`${WEB}/login`, { waitUntil: 'networkidle' });
  await mobPage.getByRole('button', { name: 'Sign-in link', exact: true }).click();
  const metrics = await mobPage.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    rows: new Set([...document.querySelectorAll('.au-methods button')].map((b) => Math.round(b.getBoundingClientRect().top))).size,
    tap: Math.min(...[...document.querySelectorAll('.au-methods button')].map((b) => Math.round(b.getBoundingClientRect().height))),
    fieldWidth: Math.round(document.querySelector('#au-magic-email').getBoundingClientRect().width),
  }));
  check('no sideways scroll on a phone', metrics.overflow <= 0, `scrollWidth +${metrics.overflow}`);
  check('the three methods stay in one row on a phone', metrics.rows === 1, `${metrics.rows} rows`);
  check('every method stays a real tap target', metrics.tap >= 44, `${metrics.tap}px tall`);
  check('the address field fits its column', metrics.fieldWidth > 200, `${metrics.fieldWidth}px`);
  await shot('87-login-link-390', mobPage);
  // No request is sent from the phone: the addresses above are still cooling
  // down, and a 429 would be a harness artefact rather than a finding.
  await mobile.close();
} catch (error) {
  check('the magic-link run completed without a crash', false, String(error?.message || error).replace(/\s+/g, ' ').slice(0, 700));
  await shot('89-failure');
} finally {
  const noise = consoleErrors.filter((line) => !/favicon|Download the React DevTools|playerjs|mediadelivery|net::ERR|Failed to load resource/i.test(line));
  check('no unexpected console errors', noise.length === 0, noise.slice(0, 3).join(' || '));
  await browser.close();
  vite.kill('SIGTERM');
  await stack.stop();
  const passed = results.filter((r) => r.pass).length;
  console.log(`\n${passed}/${results.length} magic-link checks passed`);
  if (passed !== results.length) console.log(viteLog.slice(-1200));
  process.exit(passed === results.length ? 0 : 1);
}
