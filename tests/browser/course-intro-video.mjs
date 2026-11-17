// Proves the five public course pages each carry an intro film directly under
// "What This Program Is For", for a visitor who has never signed in. The films
// come from Bunny's referrer-locked pull zone as plain HLS, so this also proves
// the browser referrer is enough to get them playing. The $299 collection has no
// film of its own and shares the $199 accelerator's.
// Run from cft-frontend against the dev stack: node tests/browser/course-intro-video.mjs
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const WEB = process.env.CFT_INTRO_WEB || 'http://127.0.0.1:5180';
const shots = fileURLToPath(new URL('./shots/', import.meta.url));
const CDN = 'https://vz-a25c3a97-92c.b-cdn.net';
const COURSES = [
  { id: 'accelerator', guid: '4d259eb2-4d10-4f1c-9202-47c90fba7ac4' },
  { id: 'mindlife', guid: '4d259eb2-4d10-4f1c-9202-47c90fba7ac4' },
  { id: 'sa1', guid: '981721b9-ca89-43c5-8e89-c723d281fe4d' },
  { id: 'sa2', guid: 'e3562118-c57a-47ae-8115-4c939dc79f1e' },
  { id: 'complete', guid: 'a407fe46-51b1-49fb-a851-2f3c24ae6bce' },
];

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  :: ${detail}` : ''}`);
};

const browser = await chromium.launch({ channel: 'msedge' });
// No storage state on purpose: this is the logged-out visitor's view.
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

for (const { id, guid } of COURSES) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  const failedRequests = [];
  page.on('requestfailed', (r) => failedRequests.push(`${r.url()} ${r.failure()?.errorText}`));
  const blocked = [];
  page.on('response', (r) => { if (r.url().startsWith(CDN) && r.status() >= 400) blocked.push(`${r.status()} ${r.url()}`); });
  const fromCdn = [];
  page.on('request', (r) => { if (r.url().startsWith(CDN)) fromCdn.push(r.url()); });

  await page.goto(`${WEB}/course/${id}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.cq-intro-video video', { timeout: 15000 });

  const order = await page.evaluate(() => {
    const bands = Array.from(document.querySelectorAll('section.cq-band'));
    const at = (heading) => bands.findIndex((b) => Array.from(b.querySelectorAll('h1,h2')).some((h) => h.textContent.trim() === heading));
    return { purpose: at('What This Program Is For'), intro: at('Watch the Introduction'), fit: at('Who This Course Is For') };
  });
  check(`${id}: intro sits under the purpose section`, order.intro === order.purpose + 1 && order.fit === order.intro + 1, JSON.stringify(order));

  const src = await page.evaluate(() => ({
    poster: document.querySelector('.cq-intro-video video').getAttribute('poster'),
    label: document.querySelector('.cq-intro-video [role="region"]')?.getAttribute('aria-label'),
  }));
  check(`${id}: poster from the same video`, src.poster === `${CDN}/${guid}/thumbnail.jpg`, String(src.poster));
  check(`${id}: names the course`, src.label.includes(id) || src.label.length > 8, String(src.label));

  const width = await page.evaluate(() => Math.round(document.querySelector('.cq-intro-video').getBoundingClientRect().width));
  check(`${id}: the frame fills the page column`, width >= 700 && width <= 820, `${width}px`);

  await page.locator('.cq-intro-video').scrollIntoViewIfNeeded();
  await page.locator('.cq-intro-video .hx-poster').click();
  await page.waitForFunction(() => {
    const v = document.querySelector('.cq-intro-video video');
    return v && !v.paused && v.currentTime > 0.8;
  }, null, { timeout: 30000 }).catch(() => {});
  check(`${id}: pulls this course's film from the CDN`, fromCdn.includes(`${CDN}/${guid}/playlist.m3u8`), fromCdn.slice(0, 2).join(' | '));
  const played = await page.evaluate(() => {
    const v = document.querySelector('.cq-intro-video video');
    return { paused: v.paused, t: Math.round(v.currentTime * 10) / 10, d: Math.round(v.duration || 0), w: v.videoWidth };
  });
  check(`${id}: starts playing for a logged-out visitor`, played.paused === false && played.t > 0, JSON.stringify(played));
  check(`${id}: picture actually decodes`, played.w > 0 && played.d > 0, JSON.stringify(played));

  await page.locator('.cq-intro-video').screenshot({ path: `${shots}course-intro-${id}.png` }).catch(() => {});
  check(`${id}: nothing from the CDN was refused`, blocked.length === 0, blocked.slice(0, 2).join(' | '));
  check(`${id}: no console errors`, errors.length === 0, errors.slice(0, 3).join(' | '));
  await page.close();
}

await ctx.close();
await browser.close();
const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
