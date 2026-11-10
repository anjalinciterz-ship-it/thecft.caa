// Vaibhav's vetoes of 2026-11-06, checked on every route: no decorative accent
// lines anywhere (a painted box that is thin in one direction and gold in the
// other), and no em dash in the copy. Run with:
// node tests/browser/line-sweep.mjs   (from the cft-frontend directory)
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(here, '..', '..');
const WEB_PORT = Number(process.env.CFT_SWEEP_WEB_PORT || 5185);
const WEB = `http://127.0.0.1:${WEB_PORT}`;
process.env.CFT_DEV_STACK_PORT = String(process.env.CFT_SWEEP_API_PORT || 5005);
process.env.CFT_DEV_STACK_FRONTEND = WEB;

const { startDevStack, funnelUser } = await import('../../../backend/scripts/dev-stack.mjs');

const routes = ['/', '/about', '/courses', '/books', '/blog', '/faq', '/testimonials', '/connect', '/wisdom-call', '/login', '/signup', '/privacy', '/terms', '/dashboard', '/dashboard/welcome', '/dashboard/courses', '/dashboard/calls', '/dashboard/explore'];

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail.slice(0, 260)}` : ''}`);
};

const stack = await startDevStack({ quiet: true });
const vite = spawn(process.execPath, [path.join(webDir, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '127.0.0.1', '--port', String(WEB_PORT), '--strictPort'], {
  cwd: webDir,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, CFT_DEV_API_TARGET: stack.apiOrigin },
});
let viteReady = false;
for (let attempt = 0; attempt < 60; attempt += 1) {
  viteReady = await fetch(WEB).then((r) => r.ok).catch(() => false);
  if (viteReady) break;
  await new Promise((resolve) => setTimeout(resolve, 500));
}
if (!viteReady) {
  vite.kill('SIGTERM');
  await stack.stop();
  console.log(`FAIL  dev server never answered on ${WEB}`);
  process.exit(1);
}

const browser = await chromium.launch({ channel: 'msedge' });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

// Signed in first, so the dashboard routes are scanned as member pages instead
// of redirecting to the login form.
const signIn = await context.newPage();
await signIn.goto(`${WEB}/login?next=%2Fdashboard`, { waitUntil: 'domcontentloaded' });
await signIn.getByRole('button', { name: 'Password' }).click();
await signIn.getByLabel('Email, mobile number or username').fill(funnelUser.student.email);
await signIn.getByLabel('Password', { exact: true }).fill(funnelUser.student.password);
await signIn.getByRole('button', { name: 'Sign In' }).click();
await signIn.waitForURL(/\/dashboard/, { timeout: 25000 }).catch(() => {});
check('signed in as the seeded student for the dashboard routes', /\/dashboard/.test(signIn.url()), signIn.url());
await signIn.close();

// A line, by his definition: a painted box at most 4px thick, at least 14px
// long, whose fill or border is a gold/champagne colour. Neutral 1px column
// separators between list items are not flagged — those are structure, not
// ornament, and he never cropped one.
const scan = () => {
  const gold = (value) => {
    const m = String(value || '').match(/rgba?\(([^)]+)\)/);
    if (m) {
      const [r, g, b] = m[1].split(',').map((n) => parseFloat(n));
      return r >= 140 && r > g && g >= b && r - b >= 55 && r - g >= 25;
    }
    return /(e8b9|fbe7|ce9c|d8b8|f3dc|c997|f0d5)/i.test(String(value || ''));
  };
  const grad = (value) => /linear-gradient/i.test(String(value || '')) && /(e8b9|fbe7|ce9c|d8b8|f3dc|232,\s*185|216,\s*184)/i.test(String(value || ''));
  const found = new Set();
  const report = (label, w, h, style) => {
    if ((w <= 4 && h >= 14) || (h <= 4 && w >= 14)) {
      if (gold(style.backgroundColor) || grad(style.backgroundImage)) found.add(`${label} fill ${Math.round(w)}x${Math.round(h)}`);
    }
    // A single gold edge on an otherwise unbordered box is an accent bar, not a
    // frame — that is the .db-rule-head shape he vetoed.
    const sides = ['Top', 'Right', 'Bottom', 'Left'];
    const thick = sides.filter((side) => parseFloat(style[`border${side}Width`]) >= 2 && gold(style[`border${side}Color`]));
    if (thick.length === 1) found.add(`${label} border-${thick[0].toLowerCase()} ${Math.round(w)}x${Math.round(h)}`);
  };
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const box = el.getBoundingClientRect();
    if (cs.position === 'fixed' && (box.bottom < 0 || box.top > window.innerHeight)) continue;
    report(`${el.tagName.toLowerCase()}.${el.className || '?'}`, box.width, box.height, cs);
    for (const pseudo of ['::before', '::after']) {
      const ps = getComputedStyle(el, pseudo);
      if (!ps.content || ps.content === 'none') continue;
      report(`${el.tagName.toLowerCase()}.${el.className || '?'}${pseudo}`, parseFloat(ps.width) || 0, parseFloat(ps.height) || 0, ps);
    }
  }
  return [...found];
};

const sweep = async (ctx, list, tag) => {
  for (const route of list) {
    const page = await ctx.newPage();
    await page.goto(`${WEB}${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(1600);
    // Scroll so lazy sections paint before the scan.
    const height = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < height; y += 700) {
      await page.evaluate((offset) => window.scrollTo(0, offset), y);
      await page.waitForTimeout(90);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    const hits = await page.evaluate(scan);
    // The only gold line allowed anywhere is the underline under the current nav
    // label — that is wayfinding, not ornament, and Vaibhav has not vetoed it.
    const ornaments = hits.filter((label) => !/\bactive\b/.test(label));
    check(`${tag}${route}: no gold accent lines painted`, ornaments.length === 0, ornaments.slice(0, 8).join(' | '));
    const dashes = await page.evaluate(() => [...String(document.body.innerText).matchAll(/[^\n]{0,36}—[^\n]{0,36}/g)].map((match) => match[0].replace(/\s+/g, ' ').trim()));
    check(`${tag}${route}: no em dash in the visible copy`, dashes.length === 0, dashes.slice(0, 3).join(' | '));
    await page.screenshot({ path: path.join(here, 'shots', `sweep-${tag.replace(/\s+/g, '-')}${route === '/' ? 'home' : route.replace(/[^\w]+/g, '-')}-full.png`), fullPage: true }).catch(() => {});
    await page.close();
  }
};

try {
  await sweep(context, routes, '');
  // Some of the lines he cropped only exist in the phone layouts.
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const phoneSignIn = await phone.newPage();
  await phoneSignIn.goto(`${WEB}/login?next=%2Fdashboard`, { waitUntil: 'domcontentloaded' });
  await phoneSignIn.getByRole('button', { name: 'Password' }).click();
  await phoneSignIn.getByLabel('Email, mobile number or username').fill(funnelUser.student.email);
  await phoneSignIn.getByLabel('Password', { exact: true }).fill(funnelUser.student.password);
  await phoneSignIn.getByRole('button', { name: 'Sign In' }).click();
  await phoneSignIn.waitForURL(/\/dashboard/, { timeout: 25000 }).catch(() => {});
  await phoneSignIn.close();
  await sweep(phone, ['/', '/books', '/wisdom-call', '/dashboard'], '390-');
} finally {
  await browser.close();
  vite.kill('SIGTERM');
  await stack.stop();
}
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} page scans clean`);
if (failed.length) process.exitCode = 1;
