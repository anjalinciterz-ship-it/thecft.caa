/* The navbar hover panels used to be full-bleed mega menus. This harness hovers
   each of the seven triggers and measures how much of the screen the panel eats.
   He has asked for them bigger twice over, so the bound is now 36% of the width
   with the panel area still well under a third of the viewport. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dist = path.join(root, 'dist');
const shots = path.join(root, 'tests', 'browser', 'shots', 'nav-panels');
const PORT = Number(process.env.CFT_PANEL_PORT || 4191);
const WEB = `http://127.0.0.1:${PORT}`;
fs.mkdirSync(shots, { recursive: true });

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const pick = (p) => (fs.existsSync(p) && fs.statSync(p).isFile() ? p : null);
  const file =
    pick(path.join(dist, urlPath)) ||
    (path.extname(urlPath) ? null : pick(path.join(dist, 'index.html'))) ||
    pick(path.join(dist, urlPath, 'index.html'));
  if (!file) {
    res.writeHead(404).end('nope');
    return;
  }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

let pass = 0;
let fail = 0;
const check = (label, ok, detail = '') => {
  if (ok) pass += 1;
  else fail += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  [${detail}]` : ''}`);
};

const TRIGGERS = [
  '/about',
  '/courses',
  '/books',
  '/blog',
  '/testimonials',
  '/faq',
  '/connect',
];

async function measure(page) {
  return page.evaluate(() => {
    const panel = document.querySelector('.mm-panel');
    if (!panel) return null;
    const r = panel.getBoundingClientRect();
    const header = document.querySelector('.site-header').getBoundingClientRect();
    const trigger = [...document.querySelectorAll('.nav-links a.is-open')][0];
    const tr = trigger ? trigger.getBoundingClientRect() : null;
    const inner = panel.firstElementChild.getBoundingClientRect();
    const items = panel.querySelectorAll('.mm-item');
    const list = panel.querySelector('.mm-list');
    const cta = panel.querySelector('.mm-all');
    const title = panel.querySelector('.mm-title');
    const overflowing = [...panel.querySelectorAll('*')].filter((el) => {
      const b = el.getBoundingClientRect();
      return b.right > r.right + 1 || b.left < r.left - 1;
    }).length;
    return {
      x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      vw: window.innerWidth, vh: window.innerHeight,
      headerBottom: Math.round(header.bottom),
      triggerLeft: tr ? Math.round(tr.left) : null,
      triggerRight: tr ? Math.round(tr.right) : null,
      contentBottom: Math.round(inner.bottom),
      panelBottom: Math.round(r.bottom),
      scrollH: Math.round(panel.scrollHeight),
      clientsH: Math.round(panel.clientHeight),
      // The heading and the gold action must always be inside the panel; only
      // the list is allowed to run past the cap, and then it scrolls itself.
      titleVisible: !!title && title.getBoundingClientRect().top >= r.top - 1 && title.getBoundingClientRect().bottom <= r.bottom + 1,
      ctaVisible: !!cta && cta.getBoundingClientRect().bottom <= r.bottom + 1 && cta.getBoundingClientRect().top >= r.top - 1,
      listScrolls: !!list && list.scrollHeight > list.clientHeight + 1,
      listFits: !!list && list.scrollHeight <= list.clientHeight + 1,
      items: items.length,
      overflowing,
      areaPct: Math.round(((r.width * r.height) / (window.innerWidth * window.innerHeight)) * 1000) / 10,
      wPct: Math.round((r.width / window.innerWidth) * 1000) / 10,
      hPct: Math.round((r.height / window.innerHeight) * 1000) / 10,
      headerBg: getComputedStyle(document.querySelector('.site-header')).backgroundColor,
    };
  });
}

;(async () => {
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', args: ['--no-sandbox'] });
  let crashed = null;
  try {
    const page = await browser.newPage({ viewport: { width: 1512, height: 950 } });
    const errors = [];
    // No backend in this harness, so the catalog request failing is expected noise.
    page.on('console', (m) => {
      if (m.type() === 'error' && !/offerings|Failed to load resource|net::ERR/i.test(m.text())) errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto(`${WEB}/`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.nav-links a', { timeout: 20000 });

    for (const to of TRIGGERS) {
      const key = to.slice(1);
      const link = page.locator(`.nav-links a[href="${to}"]`).first();
      await link.hover();
      await page.waitForSelector('.mm-panel', { timeout: 5000 });
      await page.waitForTimeout(400);
      const m = await measure(page);
      check(`${key}: panel appeared`, !!m);
      check(`${key}: width under 37% of the screen`, m.wPct <= 37.5, `${m.wPct}% (${m.w}px of ${m.vw})`);
      check(`${key}: height under 50% of the screen`, m.hPct <= 50.5, `${m.hPct}% (${m.h}px of ${m.vh})`);
      check(`${key}: total area under a sixth of the screen`, m.areaPct <= 17, `${m.areaPct}% of the viewport`);
      check(`${key}: stays inside the viewport`, m.x >= 0 && m.x + m.w <= m.vw, `x=${m.x} right=${m.x + m.w}`);
      check(`${key}: nothing clipped sideways`, m.overflowing === 0, `${m.overflowing} overflowing`);
      check(`${key}: hangs under its own word`, m.triggerLeft !== null && Math.abs(m.x - m.triggerLeft) <= 26, `panel ${m.x} vs trigger ${m.triggerLeft}`);
      check(`${key}: starts below the header bar`, m.y >= m.headerBottom - 2, `${m.y} vs ${m.headerBottom}`);
      check(`${key}: header stays translucent`, m.headerBg.startsWith('rgba(18, 10, 36, 0.65)'), m.headerBg);
      check(`${key}: heading stays inside the panel`, m.titleVisible);
      check(`${key}: the gold action stays inside the panel`, m.ctaVisible);
      check(`${key}: the list fits with no scroller`, m.listFits && !m.listScrolls, `scroll ${m.scrollH}/${m.clientsH}`);
      await page.screenshot({ path: path.join(shots, `${key}.png`) });
      await page.mouse.move(700, 700);
      await page.waitForTimeout(500);
      check(`${key}: leaves when the pointer does`, (await page.locator('.mm-panel').count()) === 0);
    }

    // Courses is the one with five tiles, so it proves the widest list still fits.
    await page.locator('.nav-links a[href="/courses"]').first().hover();
    await page.waitForSelector('.mm-panel', { timeout: 5000 });
    await page.waitForTimeout(300);
    const labels = await page.locator('.mm-panel .mm-item').allInnerTexts();
    check('courses panel lists the catalog', labels.length >= 3, labels.join(' | '));
    await page.screenshot({ path: path.join(shots, 'courses-open.png') });

    // The rightmost word must not push the panel off the right edge.
    await page.locator('.nav-links a[href="/connect"]').first().hover();
    await page.waitForSelector('.mm-panel', { timeout: 5000 });
    await page.waitForTimeout(300);
    const right = await measure(page);
    check('connect us clamps inside the viewport', right.x + right.w <= right.vw, `right edge ${right.x + right.w} of ${right.vw}`);
    await page.screenshot({ path: path.join(shots, 'connect-clamped.png') });

    // Moving from one word to the next should swap the panel, never stack two.
    await page.locator('.nav-links a[href="/books"]').first().hover();
    await page.waitForTimeout(150);
    await page.locator('.nav-links a[href="/blog"]').first().hover();
    await page.waitForTimeout(400);
    check('only one panel at a time', (await page.locator('.mm-panel').count()) === 1);

    // Cosmic blue is the only appearance. A browser left over from the days when
    // a visitor could choose still carries cft-appearance, so this proves the
    // stored value is no longer read: the page stays on the night sky.
    await page.mouse.move(700, 700);
    await page.waitForTimeout(500);
    await page.evaluate(() => localStorage.setItem('cft-appearance', 'light'));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.nav-links a', { timeout: 20000 });
    check('a stale light preference is ignored', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark');
    await page.evaluate(() => localStorage.removeItem('cft-appearance'));
    await page.locator('.nav-links a[href="/about"]').first().hover();
    await page.waitForSelector('.mm-panel', { timeout: 5000 });
    await page.waitForTimeout(300);
    const panelColor = await page.locator('.mm-panel .mm-item').first().evaluate((el) => {
      const cs = getComputedStyle(el);
      return { color: cs.color, bg: getComputedStyle(el.closest('.mm-panel')).backgroundColor };
    });
    check('the panel stays a cosmic band', panelColor.bg === 'rgb(21, 12, 41)', `${panelColor.bg} / ${panelColor.color}`);
    const contrast = await page.locator('.mm-panel .mm-item').first().evaluate((el) => {
      // The token colours arrive as whatever CSS color space the palette uses,
      // so a canvas is asked to normalise them to reds/greens/blues.
      const ctx = document.createElement('canvas').getContext('2d');
      const rgb = (value) => {
        ctx.fillStyle = '#000';
        ctx.fillStyle = value;
        const normalized = ctx.fillStyle;
        const hex = normalized.match(/^#([0-9a-f]{6})$/i);
        if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16));
        const nums = normalized.match(/[\d.]+/g);
        return nums ? nums.slice(0, 3).map(Number) : null;
      };
      const lum = (parts) => {
        const [r, g, b] = parts.map((v) => {
          const c = v / 255;
          return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const fg = rgb(getComputedStyle(el).color);
      const bg = rgb(getComputedStyle(el.closest('.mm-panel')).backgroundColor);
      if (!fg || !bg) return { ratio: 0, raw: getComputedStyle(el).color };
      const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a);
      return { ratio: Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100, raw: getComputedStyle(el).color };
    });
    check('panel links stay readable', contrast.ratio >= 4.5, `${contrast.ratio}:1 (${contrast.raw})`);
    await page.screenshot({ path: path.join(shots, 'panel-cosmic-only.png') });

    // A short laptop is where the 35% cap actually bites, so every panel is
    // re-measured at 1100x720: it must still hold the ratio and either fit
    // inside the cap or be scrollable, never silently cut a destination off.
    await page.setViewportSize({ width: 1100, height: 720 });
    await page.waitForTimeout(400);
    for (const to of TRIGGERS) {
      const key = to.slice(1);
      await page.locator(`.nav-links a[href="${to}"]`).first().hover();
      await page.waitForSelector('.mm-panel', { timeout: 5000 });
      await page.waitForTimeout(350);
      const narrow = await measure(page);
      check(`720px ${key}: width under 37%`, narrow.wPct <= 37.5, `${narrow.wPct}% (${narrow.w} of ${narrow.vw})`);
      check(`720px ${key}: height under 50%`, narrow.hPct <= 50.5, `${narrow.hPct}% (${narrow.h} of ${narrow.vh})`);
      check(`720px ${key}: inside the viewport`, narrow.x >= 0 && narrow.x + narrow.w <= narrow.vw, `x=${narrow.x} w=${narrow.w}`);
      check(`720px ${key}: heading stays inside the panel`, narrow.titleVisible);
      check(`720px ${key}: the gold action stays inside the panel`, narrow.ctaVisible);
      check(`720px ${key}: the list fits with no scroller`, narrow.listFits && !narrow.listScrolls, `fits ${narrow.listFits}, scrolls ${narrow.listScrolls}`);
      if (key === 'courses') await page.screenshot({ path: path.join(shots, 'narrow-desktop.png') });
      await page.mouse.move(550, 500);
      await page.waitForTimeout(320);
    }

    // A phone has no hover, so the panels must stay hidden there and the
    // hamburger list remains the only navigation.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);
    await page.locator('.nav-links a[href="/courses"]').first().hover({ force: true }).catch(() => {});
    await page.waitForTimeout(300);
    const phonePanel = page.locator('.mm-panel');
    check('phone: no panel appears', (await phonePanel.count()) === 0 || !(await phonePanel.first().isVisible()), `${await phonePanel.count()} mounted`);
    await page.locator('.nav-toggle').click();
    await page.waitForTimeout(300);
    check('phone: the hamburger list still opens', await page.locator('.nav-links.open').isVisible());
    await page.screenshot({ path: path.join(shots, 'phone.png') });

    check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  } catch (error) {
    crashed = error;
  } finally {
    await browser.close().catch(() => {});
    server.close();
    if (crashed) console.error('HARNESS CRASHED:', crashed);
    console.log(`\n${pass} passed, ${fail} failed${crashed ? ', harness crashed' : ''}`);
    process.exit(fail || crashed ? 1 : 0);
  }
})();
