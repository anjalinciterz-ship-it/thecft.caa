/* Cosmic blue only, and no quote glyph on the testimonial cards.
   Serves the built bundle on 4181 and walks the public routes. */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), '../..');
const PORT = 4181;
const BASE = `http://127.0.0.1:${PORT}`;
const shots = path.join(ROOT, 'tests', 'browser', 'shots');
mkdirSync(shots, { recursive: true });

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitForServer(url, tries = 60) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch { /* not up yet */ }
    await sleep(500);
  }
  throw new Error(`server never answered at ${url}`);
}

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
  cwd: ROOT,
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true,
});
server.stdout.on('data', () => {});
server.stderr.on('data', (d) => process.stderr.write(`[preview] ${d}`));

const ROUTES = ['/', '/testimonials', '/about', '/courses', '/course/self-awareness-1', '/books', '/blog', '/faqs', '/connect', '/events', '/privacy'];
const QUOTE_ROUTES = ['/', '/testimonials', '/about'];

let browser;
try {
  await waitForServer(BASE);
  browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });

  // 1. The switch is gone and cosmic blue is what every page opens with.
  for (const route of ROUTES) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(route === '/' ? 1800 : 900);
    const state = await page.evaluate(() => ({
      theme: document.documentElement.dataset.theme,
      scheme: document.documentElement.style.colorScheme,
      switches: document.querySelectorAll('.ft-theme').length,
      words: /switch to (lighter|cosmic|darker)/i.test(document.body.innerText),
      marks: document.querySelectorAll('.t-mark, .ts-mark').length,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    }));
    check(`${route} opens on cosmic blue`, state.theme === 'dark', `data-theme=${state.theme} color-scheme=${state.scheme || '(unset)'}`);
    check(`${route} has no theme switch`, state.switches === 0 && !state.words, `${state.switches} button(s), wording ${state.words ? 'found' : 'absent'}`);
    check(`${route} has no stray horizontal scroll`, state.overflow <= 0, `${state.overflow}px`);
    if (QUOTE_ROUTES.includes(route)) check(`${route} has no quote glyph`, state.marks === 0, `${state.marks} mark(s)`);
  }

  // 2. A browser that still remembers the old choice is not stuck in light.
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('cft-appearance', 'light'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const stale = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    stored: localStorage.getItem('cft-appearance'),
    bg: getComputedStyle(document.body).backgroundColor,
  }));
  check('a stored light preference is ignored', stale.theme === 'dark', `stored=${stale.stored} data-theme=${stale.theme}`);
  check('the page still paints on plum', stale.bg !== 'rgb(255, 250, 240)' && stale.bg !== 'rgb(248, 245, 239)', stale.bg);
  await page.evaluate(() => localStorage.removeItem('cft-appearance'));

  // 3. The home testimonial card: no glyph, and the quote sits where it should.
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.locator('.ts-card.is-center').scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  const homeCard = await page.locator('.ts-card.is-center').evaluate((el) => {
    const card = el.getBoundingClientRect();
    const first = el.querySelector('.ts-quote p').getBoundingClientRect();
    return {
      text: el.innerText.trim(),
      gap: Math.round(first.top - card.top),
      glyph: /[“”]/.test(el.querySelector('.ts-quote').innerText[0] + el.querySelector('.ts-quote').innerText.slice(-1)),
      mark: !!el.querySelector('.ts-mark'),
    };
  });
  check('home card leads with the quote itself', homeCard.gap > 20 && homeCard.gap < 90, `${homeCard.gap}px from the top edge`);
  check('home card carries no quote mark', !homeCard.glyph, JSON.stringify(homeCard.text.slice(0, 40)));
  const shotEl = async (selector, name) => {
    const el = page.locator(selector).first();
    if (await el.count()) await el.screenshot({ path: path.join(shots, name) });
    else check(`screenshot target ${selector} exists`, false);
  };
  await shotEl('.ts-band', '130-home-testimonials-cosmic.png');

  // 4. The testimonials page card, and the dialog it opens.
  await page.goto(`${BASE}/testimonials`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const wallCount = await page.locator('.t-card').count();
  check('the testimonials wall still renders its cards', wallCount > 3, `${wallCount} cards`);
  const pageCard = await page.locator('.t-card').first().evaluate((el) => {
    const card = el.getBoundingClientRect();
    const first = el.querySelector('.t-body p').getBoundingClientRect();
    return { gap: Math.round(first.top - card.top), mark: !!el.querySelector('.t-mark'), lead: el.querySelector('.t-body p').innerText[0] };
  });
  check('testimonials card leads with the quote itself', pageCard.gap > 16 && pageCard.gap < 70, `${pageCard.gap}px from the top edge`);
  check('testimonials card carries no quote mark', !pageCard.mark && pageCard.lead !== '“', `starts with ${JSON.stringify(pageCard.lead)}`);
  await shotEl('.t-wall', '131-testimonials-page-cosmic.png');

  await page.locator('.t-card').first().click();
  await page.waitForSelector('.t-dialog', { timeout: 8000 });
  await page.waitForTimeout(700);
  const dialog = await page.locator('.t-dialog').evaluate((el) => ({
    mark: !!el.querySelector('.t-mark'),
    lead: el.querySelector('.t-body p').innerText[0],
  }));
  check('the full-story dialog carries no quote mark', !dialog.mark && dialog.lead !== '“', `starts with ${JSON.stringify(dialog.lead)}`);
  await shotEl('.t-dialog', '132-testimonial-dialog-cosmic.png');
  await page.keyboard.press('Escape');

  // 5. Phone width, where the glyph used to sit in a cream circle.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  await page.locator('.ts-card.is-center').scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  const phone = await page.evaluate(() => ({
    marks: document.querySelectorAll('.ts-mark, .t-mark').length,
    theme: document.documentElement.dataset.theme,
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  }));
  check('phone: no quote glyph', phone.marks === 0, `${phone.marks} mark(s)`);
  check('phone: cosmic blue', phone.theme === 'dark');
  check('phone: no sideways scroll', phone.overflow <= 0, `${phone.overflow}px`);
  await page.screenshot({ path: path.join(shots, '133-home-testimonials-phone.png') });
  await page.goto(`${BASE}/testimonials`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.locator('.t-card').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(shots, '134-testimonials-phone.png') });

  // 6. The footer, where the switch used to hang.
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.locator('.site-footer').scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await shotEl('.site-footer', '135-footer-cosmic-no-switch.png');
  const follow = await page.locator('.ft-follow').evaluate((el) => ({
    words: el.innerText.trim().replace(/\s+/g, ' '),
    buttons: el.querySelectorAll('button').length,
    icons: el.querySelectorAll('.ft-socials a').length,
  }));
  check('the follow column is the heading and the social marks', follow.buttons === 0 && follow.icons > 2 && /^Follow Us/i.test(follow.words), `"${follow.words}" / ${follow.buttons} button(s) / ${follow.icons} icons`);
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
  await sleep(1200);
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
