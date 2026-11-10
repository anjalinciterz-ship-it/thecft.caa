import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const WEB = process.env.CFT_WEB || 'http://127.0.0.1:5180';
const shots = fileURLToPath(new URL('./shots/', import.meta.url));

const browser = await chromium.launch({ channel: 'msedge' });
const results = [];
const check = (name, pass, detail) => results.push({ name, pass, detail });

const login = async (page, identifier, password) => {
  await page.goto(`${WEB}/login?next=%2Fdashboard`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Password' }).click();
  await page.getByLabel('Email, mobile number or username').fill(identifier);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  try {
    await page.waitForFunction(() => /\/(dashboard|admin)/.test(location.pathname), null, { timeout: 20000 });
  } catch (error) {
    const where = await page.evaluate(() => ({ url: location.pathname, alert: document.querySelector('[role=alert]')?.textContent || 'no error shown' }));
    throw new Error(`login for ${identifier} stalled at ${where.url} — ${where.alert}`);
  }
  await page.waitForSelector('.db-nav', { timeout: 15000 });
  await page.waitForTimeout(1200);
};

// Runs in the page: reads the colours the browser actually resolved and works
// out the WCAG ratio of each text sample against the first opaque surface behind it.
const probe = () => {
  const rgb = (c) => {
    const m = /rgba?\(([^)]+)\)/.exec(c || '');
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(',').map(Number);
    if ([r, g, b].some(Number.isNaN)) return null;
    return { r, g, b, a };
  };
  // Walk the whole ancestor chain and composite each translucent layer over the
  // next one — the dashboard is translucent in places, so a single parent's
  // background-colour would flatter the real contrast.
  const backdrop = (el) => {
    const layers = [];
    let node = el;
    while (node && node !== document.documentElement) {
      const c = rgb(getComputedStyle(node).backgroundColor);
      if (c && (c.a > 0.001)) layers.push(c);
      node = node.parentElement;
    }
    let acc = { r: 248, g: 245, b: 239 };
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
    // browsers composite alpha in sRGB channel space, then contrast uses relative luminance
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
    light: app?.classList.contains('db-light'),
    canvas: app ? getComputedStyle(app).backgroundColor : null,
    panelBg: panel ? getComputedStyle(panel).backgroundColor : null,
    panelImage: panel ? getComputedStyle(panel).backgroundImage : null,
    panelBorder: panel ? getComputedStyle(panel).borderTopColor : null,
    topbarBg: topbar ? getComputedStyle(topbar).backgroundColor : null,
    topbarH: topbar ? Math.round(topbar.getBoundingClientRect().height) : null,
    navBottom: nav ? Math.round(nav.getBoundingClientRect().bottom) : null,
    search: document.querySelectorAll('.db-search').length,
    searchForms: document.querySelectorAll('.db-topbar form').length,
    sample: {
      heading: withRatio(read('.db-section-title h2', '.db-page-heading h1', '.db-course-tile h3')),
      body: withRatio(read('.db-course-meta', '.db-muted', '.db-page-heading p')),
      link: withRatio(read('.db-text-link', '.db-section-title > a')),
      nav: withRatio(read('.db-nav a.active', '.db-nav a'))
    },
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  };
};

const readable = (info) => Object.entries(info.sample).filter(([, v]) => v && v.ratio !== null && v.ratio < 4.5).map(([k, v]) => `${k} ${v.ratio}:1 (${v.sel} on ${v.bg})`);

// The local API rate-limits /auth and the SPA fetches on mount, so a route can
// land on the auth gate; reload once before measuring anything.
const open = async (page, path, settle = 1500) => {
  await page.goto(`${WEB}${path}`, { waitUntil: 'domcontentloaded' });
  try { await page.waitForSelector('.db-topbar', { timeout: 12000 }); }
  catch (error) { await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(7000); }
  await page.waitForTimeout(settle);
};

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await login(page, 'browser.student@verify.test', 'BrowserVerify2026');

const routes = [['home', '/dashboard'], ['explore', '/dashboard/explore'], ['courses', '/dashboard/courses'], ['orders', '/dashboard/orders'], ['community', '/dashboard/community'], ['settings', '/dashboard/settings'], ['notifications', '/dashboard/notifications'], ['wishlist', '/dashboard/wishlist']];
let first = null;
for (const [name, path] of routes) {
  await open(page, path, 1400);
  const info = await page.evaluate(probe);
  if (name === 'home') first = info;
  check(`${name}: renders the light dashboard shell`, info.light === true && info.canvas === 'rgb(248, 245, 239)', `${info.url} · ${info.canvas} · db-light=${info.light}`);
  check(`${name}: no search bar`, info.search === 0 && info.searchForms === 0, `topbar forms ${info.searchForms}`);
  check(`${name}: no horizontal overflow`, info.overflow === false, 'checked');
  const weak = readable(info);
  check(`${name}: every text sample >= 4.5:1`, weak.length === 0, weak.join(' | ') || Object.entries(info.sample).map(([k, v]) => `${k} ${v ? v.ratio : 'n/a'}`).join(', '));
  await page.screenshot({ path: `${shots}97-dash-${name}.png`, fullPage: true });
}

check('canvas is Warm Ivory #F8F5EF', first.canvas === 'rgb(248, 245, 239)', first.canvas);
check('panels are Pure White with a plum hairline', first.panelBg === 'rgb(255, 255, 255)' && first.panelImage === 'none', `${first.panelBg} · border ${first.panelBorder}`);
check('topbar is translucent white', first.topbarBg === 'rgba(255, 255, 255, 0.9)', String(first.topbarBg));
check('headings are Cosmic Plum ink', first.sample.heading?.color === 'rgb(18, 10, 36)', String(first.sample.heading?.color));
check('page titles use Cosmic Blue', (await page.evaluate(() => getComputedStyle(document.querySelector('.db-page-heading h1') || document.querySelector('.db-app h1')).color)) === 'rgb(20, 16, 62)', 'h1 computed colour');
check('gold text steps down to gold-ink on paper', [first.sample.link?.color, first.sample.nav?.color].includes('rgb(138, 106, 31)'), `link ${first.sample.link?.color} · nav ${first.sample.nav?.color}`);

const fieldSel = '.db-app input:not([type=checkbox]):not([type=radio]), .db-app select, .db-app textarea';
const formTargets = ['/dashboard/settings', '/dashboard/explore', '/dashboard/orders', '/dashboard/calls', '/dashboard/community'];
let form = null;
const emptyTargets = [];
for (const path of formTargets) {
  await open(page, path, 1200);
  // The settings page renders its fields only once /student/profile lands, so give
  // the request a window instead of reading the DOM the moment the shell appears.
  const found = await page.waitForSelector(fieldSel, { timeout: 15000 }).then(() => true).catch(() => false);
  if (!found) { emptyTargets.push(path); continue; }
  form = await page.evaluate((sel) => {
    const f = document.querySelector(sel);
    const b = document.querySelector('.db-button');
    const fs = f ? getComputedStyle(f) : null;
    const bs = b ? getComputedStyle(b) : null;
    return { url: location.pathname, fieldBg: fs?.backgroundColor, fieldColor: fs?.color, scheme: fs?.colorScheme, btnBg: bs?.backgroundImage.slice(0, 44), btnColor: bs?.color, hasButton: !!b, hasField: !!f };
  }, fieldSel);
  break;
}
check('form fields flipped to a light scheme', !!form && form.fieldBg === 'rgb(255, 255, 255)' && /^rgba?\(18, 10, 36/.test(String(form.fieldColor)), form ? `${form.url} · ${form.fieldBg} · ${form.fieldColor} · color-scheme ${form.scheme}` : `no field on any route tried: ${emptyTargets.join(', ')}`);
check('primary button is champagne gold with Cosmic Plum ink', !!form && form.hasButton && /gradient/.test(String(form.btnBg)) && form.btnColor === 'rgb(18, 10, 36)', form ? `${form.btnBg} · ${form.btnColor}` : 'skipped, no fielded route loaded');

// .db-app section{padding:0} outranks .db-panel, so the settings page's
// section-panel has to re-assert its own padding and column width.
await open(page, '/dashboard/settings', 1500);
const signIn = await page.evaluate(() => {
  const el = document.querySelector('section.db-panel');
  if (!el) return null;
  const s = getComputedStyle(el);
  return { pad: s.padding, w: Math.round(el.getBoundingClientRect().width), form: Math.round(document.querySelector('.db-form')?.getBoundingClientRect().width || 0) };
});
check('section panels keep their padding and column', !!signIn && parseFloat(signIn.pad) >= 16 && signIn.w <= signIn.form + 2, signIn ? `padding ${signIn.pad} · ${signIn.w}px wide next to ${signIn.form}px forms` : 'no section.db-panel on settings');

await page.setViewportSize({ width: 390, height: 844 });
for (const [name, path] of [['mobile', '/dashboard'], ['mobile-explore', '/dashboard/explore']]) {
  await open(page, path, 1200);
  const info = await page.evaluate(probe);
  check(`mobile ${name}: light shell, no search bar, no overflow`, info.light === true && info.search === 0 && info.overflow === false, `${info.url} · db-light=${info.light} · topbar ${info.topbarH}px, nav ends ${info.navBottom}px`);
  check(`mobile ${name}: topbar fits its two rows`, info.topbarH > 60 && info.topbarH <= 120, `${info.topbarH}px tall`);
  await page.screenshot({ path: `${shots}97-dash-${name}.png`, fullPage: true });
}
await context.close();

const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const admin = await adminContext.newPage();
try {
  await login(admin, 'browser.admin@verify.test', 'BrowserAdmin2026');
  await open(admin, '/admin', 1500);
  const adminInfo = await admin.evaluate(() => {
    const app = document.querySelector('.db-app');
    return { url: location.pathname, light: app?.classList.contains('db-light'), canvas: app ? getComputedStyle(app).backgroundColor : null, search: document.querySelectorAll('.db-search').length };
  });
  check('admin keeps the cosmic-plum scheme', adminInfo.light === false && adminInfo.canvas === 'rgb(18, 10, 36)', `${adminInfo.url} · ${adminInfo.canvas} · search bars ${adminInfo.search}`);
  await admin.screenshot({ path: `${shots}97-admin.png`, fullPage: false });
} catch (error) {
  check('admin area reachable for the palette check', false, String(error.message).split('\n')[0]);
}
await adminContext.close();

await browser.close();
const failed = results.filter((x) => !x.pass);
for (const x of results) console.log(`${x.pass ? 'PASS' : 'FAIL'}  ${x.name}${x.detail ? `  — ${x.detail}` : ''}`);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
