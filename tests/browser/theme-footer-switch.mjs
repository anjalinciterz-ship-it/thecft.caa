// The theme choice, after it left the dashboard topbar: cosmic opens every
// page, the only switch sits in the footer, and the member shell carries that
// same footer switch instead of its own Day/Night pill. Run against the built
// bundle, because this has to be true of what ships.
//   node tests/browser/theme-footer-switch.mjs   (from the cft-frontend directory)
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(here, '..', '..');
const shots = path.join(here, 'shots');
const WEB_PORT = Number(process.env.CFT_THEME_WEB_PORT || 4181);
const WEB = `http://127.0.0.1:${WEB_PORT}`;
process.env.CFT_DEV_STACK_PORT = String(process.env.CFT_THEME_API_PORT || 5009);
process.env.CFT_DEV_STACK_FRONTEND = WEB;

const { startDevStack, funnelUser } = await import('../../../backend/scripts/dev-stack.mjs');

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail.slice(0, 220)}` : ''}`);
};

await mkdir(shots, { recursive: true });
const stack = await startDevStack({ quiet: true });

const serve = spawn(process.execPath, [
  path.join(webDir, 'node_modules', 'vite', 'bin', 'vite.js'),
  'preview', '--host', '127.0.0.1', '--port', String(WEB_PORT), '--strictPort',
], {
  cwd: webDir,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, CFT_DEV_API_TARGET: stack.apiOrigin },
});
let serveLog = '';
serve.stdout.on('data', (b) => { serveLog += b.toString(); });
serve.stderr.on('data', (b) => { serveLog += b.toString(); });

let ready = false;
for (let attempt = 0; attempt < 60; attempt += 1) {
  ready = await fetch(WEB).then((r) => r.ok).catch(() => false);
  if (ready) break;
  await new Promise((resolve) => setTimeout(resolve, 500));
}
if (!ready) {
  console.log(`FAIL  the built bundle is not being served on ${WEB} — ${serveLog.slice(-400)}`);
  serve.kill('SIGTERM');
  await stack.stop();
  process.exit(1);
}

const browser = await chromium.launch({ channel: 'msedge' });
const shot = (page, name, clip) => page.screenshot({ path: path.join(shots, `${name}.png`), clip }).catch(() => {});
// A footer is the thing being judged, so it is photographed as itself: the
// whole element, whatever part of the page it happens to sit in.
const shotEl = (page, selector, name) => page.locator(selector).screenshot({ path: path.join(shots, `${name}.png`) }).catch(() => {});
const theme = (page) => page.evaluate(() => document.documentElement.dataset.theme || null);
const stored = (page) => page.evaluate(() => localStorage.getItem('cft-appearance'));
const switchText = (page, scope) => page.locator(`${scope} .ft-theme`).first().innerText().catch(() => null);

// What the browser really resolved for the switch, so a repaint that leaves it
// invisible on paper still fails here. The contrast is worked out against the
// backdrop the button is actually seen on, which means compositing its own
// translucent fill over whatever the footer is wearing.
const paint = (page, scope) => page.evaluate(([sel]) => {
  const el = document.querySelector(`${sel} .ft-theme`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const host = el.closest('footer')?.getBoundingClientRect();
  const rgba = (c) => {
    const m = /rgba?\(([^)]+)\)/.exec(c || '');
    if (!m) return null;
    const [red, green, blue, alpha = 1] = m[1].split(',').map(Number);
    return { r: red, g: green, b: blue, a: alpha };
  };
  const layers = [];
  for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
    const c = rgba(getComputedStyle(node).backgroundColor);
    if (c && c.a > 0.001) layers.push(c);
  }
  layers.push({ r: 26, g: 16, b: 51, a: 1 });
  const base = layers.reverse().reduce((under, over) => ({
    r: over.r * over.a + under.r * (1 - over.a),
    g: over.g * over.a + under.g * (1 - over.a),
    b: over.b * over.a + under.b * (1 - over.a),
  }), { r: 26, g: 16, b: 51 });
  const lum = ({ r, g, b }) => {
    const [x, y, z] = [r, g, b].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * x + 0.7152 * y + 0.0722 * z;
  };
  const ink = rgba(cs.color);
  const hi = lum(base);
  const lo = lum(ink);
  const ratio = (Math.max(hi, lo) + 0.05) / (Math.min(hi, lo) + 0.05);
  return {
    top: r.top + window.scrollY, h: r.height, w: r.width,
    color: cs.color, bg: cs.backgroundColor, border: cs.borderColor,
    contrast: Math.round(ratio * 100) / 100,
    insideFooter: !!host && r.top >= host.top - 1 && r.bottom <= host.bottom + 1,
  };
}, [scope]);

const consoleErrors = [];
const failedAssets = [];

async function freshContext(viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(String(e.message)));
  page.on('response', (r) => {
    if (r.status() >= 400 && !/\/api\//.test(r.url())) failedAssets.push(`${r.status()} ${r.url().replace(WEB, '')}`);
  });
  return { context, page };
}

// ---------- A first visitor, who has chosen nothing ----------
{
  const { context, page } = await freshContext({ width: 1440, height: 900 });
  await page.goto(`${WEB}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);

  check('a first visitor opens on cosmic without having to choose', (await theme(page)) === 'dark' && (await stored(page)) === null, `theme ${await theme(page)} · stored ${await stored(page)}`);
  check('the Day/Night pill is gone from the site', await page.locator('.appearance-toggle').count() === 0);
  check('the footer carries the one switch', await page.locator('.site-footer .ft-theme').count() === 1, await switchText(page, '.site-footer'));
  check('nothing else on the page offers a theme', await page.locator('.ft-theme').count() === 1);

  const dark = await paint(page, '.site-footer');
  check('the switch is a real button inside the footer', !!dark && dark.h >= 36 && dark.insideFooter && dark.contrast >= 4.5, dark && `${Math.round(dark.w)}x${Math.round(dark.h)} · inside footer ${dark.insideFooter} · ${dark.contrast}:1`);
  await page.locator('.site-footer').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await shotEl(page, '.site-footer', '100-theme-public-footer-cosmic');

  await page.locator('.site-footer .ft-theme').click();
  await page.waitForTimeout(700);
  check('one click brings the lighter appearance', (await theme(page)) === 'light', `theme ${await theme(page)}`);
  check('and the switch names the way back', (await switchText(page, '.site-footer'))?.toLowerCase().includes('cosmic'), await switchText(page, '.site-footer'));
  await page.locator('.site-footer').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const light = await paint(page, '.site-footer');
  check('the switch stays legible on paper', !!light && light.contrast >= 4.5, light && `${light.color} on its own backdrop · ${light.contrast}:1`);
  await shotEl(page, '.site-footer', '100-theme-public-footer-lighter');

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  check('the visitor keeps their choice across a reload', (await theme(page)) === 'light' && (await stored(page)) === 'light', `theme ${await theme(page)} · stored ${await stored(page)}`);

  await page.locator('.site-footer').scrollIntoViewIfNeeded();
  await page.locator('.site-footer .ft-theme').click();
  await page.waitForTimeout(700);
  check('and cosmic again when they change their mind', (await theme(page)) === 'dark', `theme ${await theme(page)}`);
  await context.close();
}

// ---------- The member shell, where the pill used to live ----------
{
  const { context, page } = await freshContext({ width: 1440, height: 900 });
  await page.goto(`${WEB}/login?next=%2Fdashboard`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Password' }).click();
  await page.waitForSelector('#au-password', { timeout: 15000 });
  await page.fill('#au-identifier', funnelUser.student.email);
  await page.fill('#au-password', funnelUser.student.password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  const landed = await page.waitForFunction(() => /\/dashboard/.test(location.pathname), null, { timeout: 20000 }).then(() => true).catch(() => false);
  check('signed in as a member', landed, page.url());
  await page.waitForSelector('.db-nav', { timeout: 15000 });
  await page.waitForTimeout(1200);

  check('the member opens on cosmic too', (await theme(page)) === 'dark' && !!await page.locator('.db-app.db-night').first(), `theme ${await theme(page)}`);
  check('the dashboard topbar no longer carries a theme control', await page.locator('.db-topbar .ft-theme, .db-topbar .appearance-toggle').count() === 0);
  check('the dashboard footer carries the switch', await page.locator('.db-footer .ft-theme').count() === 1, await switchText(page, '.db-footer'));

  await page.locator('.db-topbar').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await shot(page, '100-theme-dash-topbar-cosmic', { x: 0, y: 0, width: 1440, height: 120 });

  await page.locator('.db-footer').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const dashDark = await paint(page, '.db-footer');
  check('the dashboard switch sits in the footer row', !!dashDark && dashDark.insideFooter && dashDark.h >= 44 && dashDark.contrast >= 4.5, dashDark && `${Math.round(dashDark.w)}x${Math.round(dashDark.h)} · inside footer ${dashDark.insideFooter} · ${dashDark.contrast}:1`);
  await shotEl(page, '.db-footer', '100-theme-dash-footer-cosmic');

  await page.locator('.db-footer .ft-theme').click();
  await page.waitForTimeout(900);
  check('one click repaints the member shell', (await theme(page)) === 'light' && !!await page.locator('.db-app.db-light').first(), `theme ${await theme(page)}`);
  check('and the footer names the way back to cosmic', (await switchText(page, '.db-footer'))?.toLowerCase().includes('cosmic'), await switchText(page, '.db-footer'));
  await page.locator('.db-footer').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const dashLight = await paint(page, '.db-footer');
  check('the switch stays legible on the paper shell', !!dashLight && dashLight.contrast >= 4.5, dashLight && `${dashLight.color} on its own backdrop · ${dashLight.contrast}:1`);
  await shotEl(page, '.db-footer', '100-theme-dash-footer-lighter');

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.db-nav', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1000);
  check('the member keeps their choice across a reload', (await theme(page)) === 'light' && (await stored(page)) === 'light', `theme ${await theme(page)} · stored ${await stored(page)}`);

  await page.goto(`${WEB}/courses`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  check('one choice, so the public site follows the member shell', (await theme(page)) === 'light', `theme ${await theme(page)}`);

  // The footer row is where the switch had to find room, so it is measured at
  // every width the shell changes its layout, in both appearances.
  await page.goto(`${WEB}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.db-footer', { timeout: 15000 });
  for (const width of [1440, 1180, 900, 650, 390]) {
    for (const appearance of ['dark', 'light']) {
      if ((await theme(page)) !== appearance) {
        await page.locator('.db-footer .ft-theme').click();
        await page.waitForTimeout(800);
      }
      await page.setViewportSize({ width, height: 900 });
      await page.locator('.db-footer').scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      const row = await paint(page, '.db-footer');
      const neighbours = await page.evaluate(() => {
        const foot = document.querySelector('.db-footer');
        const sw = foot.querySelector('.ft-theme')?.getBoundingClientRect();
        if (!sw) return null;
        // Anything the switch sits on top of is a layout failure, and a footer
        // wider than the screen means the page scrolls sideways.
        const hits = [...foot.querySelectorAll('a, img, p')]
          .map((el) => el.getBoundingClientRect())
          .filter((r) => r.width && r.right > sw.left + 2 && r.left < sw.right - 2 && r.bottom > sw.top + 2 && r.top < sw.bottom - 2);
        return { overlaps: hits.length, overflow: document.documentElement.scrollWidth - window.innerWidth };
      });
      check(`${width}px ${appearance}: the switch keeps its own room in the footer`, !!row && row.insideFooter && row.h >= 44 && row.w <= width && neighbours?.overlaps === 0 && neighbours.overflow <= 1, row && `${Math.round(row.w)}x${Math.round(row.h)} · overlaps ${neighbours?.overlaps} · overflow ${neighbours?.overflow}px · ${row.contrast}:1`);
    }
  }
  await context.close();
}

// ---------- A phone ----------
{
  const { context, page } = await freshContext({ width: 390, height: 844 });
  await page.goto(`${WEB}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  check('a phone opens on cosmic too', (await theme(page)) === 'dark', `theme ${await theme(page)}`);
  await page.locator('.site-footer').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const phone = await paint(page, '.site-footer');
  check('the phone footer carries the switch', !!phone && phone.w <= 390 && phone.h >= 44, phone && `${Math.round(phone.w)}x${Math.round(phone.h)}`);
  await page.locator('.site-footer .ft-theme').click();
  await page.waitForTimeout(700);
  check('and it works there', (await theme(page)) === 'light', `theme ${await theme(page)}`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('the phone page does not scroll sideways', overflow <= 1, `overflow ${overflow}px`);
  await shot(page, '100-theme-phone-footer-lighter', { x: 0, y: 0, width: 390, height: 844 });
  await context.close();
}

check('no console errors', consoleErrors.filter((e) => !/status of 5\d\d/.test(e)).length === 0, consoleErrors.slice(0, 3).join(' | '));
check('every asset the page asked for arrived', failedAssets.length === 0, failedAssets.slice(0, 3).join(' | '));

await browser.close();
serve.kill('SIGTERM');
await stack.stop();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
