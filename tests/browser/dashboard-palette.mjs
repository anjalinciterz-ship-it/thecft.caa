// The member shell and the admin area, painted for the only appearance there
// now: cosmic blue. Run with: node tests/browser/dashboard-palette.mjs
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(here, '..', '..');
const shots = path.join(here, 'shots');
const WEB_PORT = Number(process.env.CFT_PALETTE_WEB_PORT || 5186);
const WEB = `http://127.0.0.1:${WEB_PORT}`;
process.env.CFT_DEV_STACK_PORT = String(process.env.CFT_PALETTE_API_PORT || 5006);
process.env.CFT_DEV_STACK_FRONTEND = WEB;

const { startDevStack, funnelUser } = await import('../../../backend/scripts/dev-stack.mjs');

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${String(detail).slice(0, 220)}` : ''}`);
};

await mkdir(shots, { recursive: true });
const stack = await startDevStack({ quiet: true });
const api = stack.apiOrigin;

const vite = spawn(process.execPath, [path.join(webDir, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '127.0.0.1', '--port', String(WEB_PORT), '--strictPort'], {
  cwd: webDir,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, CFT_DEV_API_TARGET: api },
});
let viteLog = '';
vite.stdout.on('data', (b) => { viteLog += b.toString(); });
vite.stderr.on('data', (b) => { viteLog += b.toString(); });
let ready = false;
for (let attempt = 0; attempt < 60; attempt += 1) {
  ready = await fetch(WEB).then((r) => r.ok).catch(() => false);
  if (ready) break;
  await new Promise((resolve) => setTimeout(resolve, 500));
}
if (!ready) {
  console.log(`FAIL  dev server answered on ${WEB} — ${viteLog.slice(-400)}`);
  vite.kill('SIGTERM');
  await stack.stop();
  process.exit(1);
}

const browser = await chromium.launch({ channel: 'msedge' });

const login = async (page, identifier, password) => {
  await page.goto(`${WEB}/login?next=%2Fdashboard`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Password' }).click();
  await page.waitForSelector('#au-password', { timeout: 15000 });
  await page.fill('#au-identifier', identifier);
  await page.fill('#au-password', password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  try {
    await page.waitForFunction(() => /\/(dashboard|admin)/.test(location.pathname), null, { timeout: 25000 });
  } catch (error) {
    const where = await page.evaluate(() => ({ url: location.pathname, alert: document.querySelector('[role=alert]')?.textContent || 'no error shown' }));
    throw new Error(`login for ${identifier} stalled at ${where.url} — ${where.alert}`);
  }
  await page.waitForSelector('.db-nav', { timeout: 15000 });
  await page.waitForTimeout(1200);
};

// Runs in the page: reads the colours the browser actually resolved and works
// out the WCAG ratio of each text sample against the layers behind it.
const probe = () => {
  const rgb = (c) => {
    const m = /rgba?\(([^)]+)\)/.exec(c || '');
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(',').map(Number);
    if ([r, g, b].some(Number.isNaN)) return null;
    return { r, g, b, a };
  };
  const backdrop = (el) => {
    const layers = [];
    let node = el;
    while (node && node !== document.documentElement) {
      const c = rgb(getComputedStyle(node).backgroundColor);
      if (c && c.a > 0.001) layers.push(c);
      node = node.parentElement;
    }
    // The canvas under everything is Cosmic Plum, whatever the page adds above it.
    let acc = { r: 18, g: 10, b: 36 };
    for (let i = layers.length - 1; i >= 0; i -= 1) {
      const l = layers[i];
      acc = { r: l.r * l.a + acc.r * (1 - l.a), g: l.g * l.a + acc.g * (1 - l.a), b: l.b * l.a + acc.b * (1 - l.a) };
    }
    return acc;
  };
  const read = (...sels) => {
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (el) {
        const s = getComputedStyle(el);
        return { sel: `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`, color: s.color, bg: `rgb(${Math.round(backdrop(el).r)}, ${Math.round(backdrop(el).g)}, ${Math.round(backdrop(el).b)})` };
      }
    }
    return null;
  };
  const lum = ({ r, g, b }) => {
    const lin = (x) => (x / 255 <= 0.03928 ? x / 255 / 12.92 : ((x / 255 + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const withRatio = (v) => {
    if (!v) return null;
    const f = rgb(v.color);
    const bg = rgb(v.bg);
    if (!f || !bg) return { ...v, ratio: null };
    const over = (x, y) => x * f.a + y * (1 - f.a);
    const L1 = lum({ r: over(f.r, bg.r), g: over(f.g, bg.g), b: over(f.b, bg.b) });
    const L2 = lum(bg);
    return { ...v, ratio: +((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)).toFixed(2) };
  };
  const app = document.querySelector('.db-app');
  const panel = document.querySelector('.db-panel');
  const topbar = document.querySelector('.db-topbar');
  const nav = document.querySelector('.db-nav');
  return {
    url: location.pathname,
    night: app?.classList.contains('db-night'),
    light: app?.classList.contains('db-light'),
    theme: document.documentElement.dataset.theme,
    canvas: app ? getComputedStyle(app).backgroundColor : null,
    panelBg: panel ? getComputedStyle(panel).backgroundColor : null,
    panelImage: panel ? getComputedStyle(panel).backgroundImage : null,
    panelBorder: panel ? getComputedStyle(panel).borderTopColor : null,
    topbarBg: topbar ? getComputedStyle(topbar).backgroundColor : null,
    topbarH: topbar ? Math.round(topbar.getBoundingClientRect().height) : null,
    navBottom: nav ? Math.round(nav.getBoundingClientRect().bottom) : null,
    search: document.querySelectorAll('.db-search').length,
    switches: document.querySelectorAll('.ft-theme').length,
    switchWords: /switch to (lighter|cosmic|darker)/i.test(document.body.innerText),
    logoSrc: document.querySelector('.db-brand a img')?.getAttribute('src') || null,
    footerLogo: document.querySelector('.db-footer a img')?.getAttribute('src') || null,
    sample: {
      heading: withRatio(read('.db-section-title h2', '.db-page-heading h1', '.db-course-tile h3', '.db-hero h1', '.db-welcome h1', 'h1')),
      body: withRatio(read('.db-course-meta', '.db-muted', '.db-page-heading p')),
      link: withRatio(read('.db-text-link', '.db-section-title > a')),
      nav: withRatio(read('.db-nav a.active', '.db-nav a')),
    },
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
};

const readable = (info) => Object.entries(info.sample).filter(([, v]) => v && v.ratio !== null && v.ratio < 4.5).map(([k, v]) => `${k} ${v.ratio}:1 (${v.sel} on ${v.bg})`);

// The local API rate-limits /auth and the SPA fetches on mount, so a route can
// land on the auth gate; reload once before measuring anything.
const open = async (page, path, settle = 1500) => {
  await page.goto(`${WEB}${path}`, { waitUntil: 'domcontentloaded' });
  try { await page.waitForSelector('.db-topbar', { timeout: 12000 }); }
  catch { await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(7000); }
  await page.waitForTimeout(settle);
};

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await login(page, funnelUser.student.email, funnelUser.student.password);

const routes = [['home', '/dashboard'], ['explore', '/dashboard/explore'], ['courses', '/dashboard/courses'], ['orders', '/dashboard/orders'], ['community', '/dashboard/community'], ['settings', '/dashboard/settings'], ['notifications', '/dashboard/notifications'], ['wishlist', '/dashboard/wishlist']];
let first = null;
let sampled = null;
for (const [name, route] of routes) {
  await open(page, route, 1400);
  const info = await page.evaluate(probe);
  if (name === 'home') first = info;
  if (name === 'explore') sampled = info;
  check(`${name}: renders the cosmic night shell`, info.night === true && info.light === false && info.canvas === 'rgb(18, 10, 36)', `${info.url} · ${info.canvas} · db-night=${info.night} db-light=${info.light}`);
  check(`${name}: the page is on the night appearance`, info.theme === 'dark', `data-theme=${info.theme}`);
  check(`${name}: no theme switch anywhere in the shell`, info.switches === 0 && !info.switchWords, `${info.switches} button(s), wording ${info.switchWords ? 'found' : 'absent'}`);
  check(`${name}: no search bar`, info.search === 0, `search nodes ${info.search}`);
  check(`${name}: no horizontal overflow`, info.overflow === false, 'checked');
  const weak = readable(info);
  check(`${name}: every text sample >= 4.5:1`, weak.length === 0, weak.join(' | ') || Object.entries(info.sample).map(([k, v]) => `${k} ${v ? v.ratio : 'n/a'}`).join(', '));
  await page.screenshot({ path: path.join(shots, `97-dash-${name}.png`), fullPage: true });
}

check('the member shell wears the white logo', /logo(-white)?\.(png|webp|svg)/.test(String(first.logoSrc)) && !/logo-color/.test(String(first.logoSrc)), `topbar ${first.logoSrc} · footer ${first.footerLogo}`);
check('canvas is Cosmic Plum #120A24', first.canvas === 'rgb(18, 10, 36)', first.canvas);
check('panels are the plum step that reads as raised', /linear-gradient/.test(String(first.panelImage)) && first.panelBg === 'rgba(0, 0, 0, 0)', `${first.panelBg} · border ${first.panelBorder}`);
check('topbar is translucent plum', first.topbarBg === 'rgba(18, 10, 36, 0.95)', String(first.topbarBg));
check('headings are Warm Ivory ink', sampled.sample.heading?.color === 'rgb(248, 245, 239)', `${sampled.sample.heading?.color} on ${sampled.sample.heading?.bg}`);
// The gold accent is champagne on plum; whichever gold element the route happens
// to carry is enough to prove the token stepped up with the shell.
const goldSeen = [sampled.sample.link?.color, sampled.sample.nav?.color].filter(Boolean);
check('gold text is champagne on plum', goldSeen.includes('rgb(232, 185, 95)'), `link ${sampled.sample.link?.color || '(none on route)'} · nav ${sampled.sample.nav?.color}`);

const fieldSel = '.db-app input:not([type=checkbox]):not([type=radio]), .db-app select, .db-app textarea';
const formTargets = ['/dashboard/settings', '/dashboard/explore', '/dashboard/orders', '/dashboard/calls', '/dashboard/community'];
let form = null;
const emptyTargets = [];
for (const route of formTargets) {
  await open(page, route, 1200);
  // The settings page renders its fields only once /student/profile lands, so give
  // the request a window instead of reading the DOM the moment the shell appears.
  const found = await page.waitForSelector(fieldSel, { timeout: 15000 }).then(() => true).catch(() => false);
  if (!found) { emptyTargets.push(route); continue; }
  form = await page.evaluate((sel) => {
    const f = document.querySelector(sel);
    const b = document.querySelector('.db-button');
    const fs = f ? getComputedStyle(f) : null;
    const bs = b ? getComputedStyle(b) : null;
    return { url: location.pathname, fieldBg: fs?.backgroundColor, fieldColor: fs?.color, scheme: fs?.colorScheme, btnBg: bs?.backgroundImage.slice(0, 44), btnColor: bs?.color, hasButton: !!b, hasField: !!f };
  }, fieldSel);
  break;
}
check('form fields are plum with a dark scheme', !!form && /^rgba?\(18, 10, 36/.test(String(form.fieldBg)) && form.fieldColor === 'rgb(248, 245, 239)' && form.scheme === 'dark', form ? `${form.url} · ${form.fieldBg} · ${form.fieldColor} · color-scheme ${form.scheme}` : `no field on any route tried: ${emptyTargets.join(', ')}`);
check('primary button is champagne gold with Cosmic Plum ink', !!form && form.hasButton && /gradient/.test(String(form.btnBg)) && form.btnColor === 'rgb(18, 10, 36)', form ? `${form.btnBg} · ${form.btnColor}` : 'skipped, no fielded route loaded');

await open(page, '/dashboard/settings', 1500);
const signIn = await page.evaluate(() => {
  const el = document.querySelector('section.db-panel');
  if (!el) return null;
  const s = getComputedStyle(el);
  return { pad: s.padding, w: Math.round(el.getBoundingClientRect().width), form: Math.round(document.querySelector('.db-form')?.getBoundingClientRect().width || 0) };
});
check('section panels keep their padding and column', !!signIn && parseFloat(signIn.pad) >= 16 && signIn.w <= signIn.form + 2, signIn ? `padding ${signIn.pad} · ${signIn.w}px wide next to ${signIn.form}px forms` : 'no section.db-panel on settings');

await page.setViewportSize({ width: 390, height: 844 });
for (const [name, route] of [['mobile', '/dashboard'], ['mobile-explore', '/dashboard/explore']]) {
  await open(page, route, 1200);
  const info = await page.evaluate(probe);
  check(`mobile ${name}: night shell, no switch, no search bar, no overflow`, info.night === true && info.switches === 0 && info.search === 0 && info.overflow === false, `${info.url} · db-night=${info.night} · topbar ${info.topbarH}px, nav ends ${info.navBottom}px`);
  check(`mobile ${name}: topbar fits its two rows`, info.topbarH > 60 && info.topbarH <= 130, `${info.topbarH}px tall`);
  await page.screenshot({ path: path.join(shots, `97-dash-${name}.png`), fullPage: true });
}
await context.close();

const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const admin = await adminContext.newPage();
try {
  await login(admin, funnelUser.admin.email, funnelUser.admin.password);
  await open(admin, '/admin', 1500);
  const adminInfo = await admin.evaluate(() => {
    const app = document.querySelector('.db-app');
    return {
      url: location.pathname,
      night: app?.classList.contains('db-night'),
      canvas: app ? getComputedStyle(app).backgroundColor : null,
      switches: document.querySelectorAll('.ft-theme').length,
      appearanceCard: /Appearance/.test(document.body.innerText),
    };
  });
  check('admin keeps the cosmic-plum scheme', adminInfo.canvas === 'rgb(18, 10, 36)', `${adminInfo.url} · ${adminInfo.canvas} · db-night=${adminInfo.night}`);
  check('admin has no theme switch', adminInfo.switches === 0, `${adminInfo.switches} button(s)`);
  check('admin has no Appearance settings group', adminInfo.appearanceCard === false, `Appearance wording ${adminInfo.appearanceCard ? 'still on the page' : 'gone'}`);
  await admin.screenshot({ path: path.join(shots, '97-admin.png'), fullPage: false });
} catch (error) {
  check('admin area reachable for the palette check', false, String(error.message).split('\n')[0]);
}
await adminContext.close();

await browser.close();
vite.kill('SIGTERM');
await stack.stop();
const failed = results.filter((x) => !x.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
