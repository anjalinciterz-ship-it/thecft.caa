// Proves the audiobook list on the two book pages is one card per recording:
// violet play button, "Audio Track N" title, the CFT subtitle, and a transport
// bar that shows its own length before anything is clicked. Also proves the
// button starts its own recording, silences whichever one was playing, and
// flips to the pause glyph.
// Run from cft-frontend against the dev stack: node tests/browser/audiobook-cards.mjs
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const WEB = process.env.CFT_CARDS_WEB || 'http://127.0.0.1:5180';
const shots = fileURLToPath(new URL('./shots/', import.meta.url));
const BOOKS = [
  { slug: 'the-secret-of-creation', cards: 8, labels: ['Book 1', 'Book 2'] },
  { slug: 'caught-in-the-act', cards: 9, labels: [] },
];

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  :: ${detail}` : ''}`);
};

const STATE = () => Array.from(document.querySelectorAll('.audio-card')).map((card) => {
  const a = card.querySelector('audio');
  return { id: card.querySelector('h3').textContent, paused: a.paused, t: Math.round(a.currentTime * 10) / 10 };
});

const playing = (page, i) => page.waitForFunction((index) => {
  const a = document.querySelectorAll('.audio-card audio')[index];
  return a && !a.paused && a.currentTime > 0.4;
}, i, { timeout: 15000 }).catch(() => {});

async function auditBook(browser, { slug, cards, labels }) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(`${WEB}/books/${slug}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.audio-card', { timeout: 15000 });
  check(`${slug}: ${cards} track cards`, (await page.locator('.audio-card').count()) === cards);
  const foundLabels = await page.locator('.audio-group-label').allTextContents();
  check(`${slug}: group labels read ${labels.join(' + ') || 'nothing'}`, JSON.stringify(foundLabels) === JSON.stringify(labels), JSON.stringify(foundLabels));

  const look = await page.evaluate(() => {
    const card = document.querySelector('.audio-card');
    const btn = card.querySelector('.audio-card-btn');
    const audio = card.querySelector('audio');
    return {
      btnBg: getComputedStyle(btn).backgroundColor,
      title: card.querySelector('h3').textContent,
      note: card.querySelector('.audio-card-copy p').textContent,
      card: Math.round(card.getBoundingClientRect().width),
      bar: Math.round(audio.getBoundingClientRect().width),
    };
  });
  check(`${slug}: violet play button`, look.btnBg === 'rgb(93, 42, 145)', look.btnBg);
  check(`${slug}: numbered recording title`, look.title === 'Audio Track 1', look.title);
  check(`${slug}: subtitle copy`, look.note === 'Listen to this teaching from The Centre for Transformation', look.note);
  check(`${slug}: transport bar fills the card`, look.bar >= look.card - 45, `${look.bar} of ${look.card}`);

  await page.waitForFunction(() => document.querySelector('.audio-card audio').duration > 0, null, { timeout: 20000 }).catch(() => {});
  const lengths = await page.evaluate(() => Array.from(document.querySelectorAll('.audio-card audio')).map((a) => Math.round(a.duration)));
  check(`${slug}: every card knows its own length`, lengths.every((d) => d > 0), JSON.stringify(lengths));

  await page.locator('.audio-card').nth(1).locator('.audio-card-btn').click();
  await playing(page, 1);
  let state = await page.evaluate(STATE);
  check(`${slug}: the button starts its recording`, state[1].paused === false && state[1].t > 0, JSON.stringify(state[1]));
  const glyph = await page.locator('.audio-card').nth(1).locator('.audio-card-btn path').getAttribute('d');
  check(`${slug}: the button flips to pause`, glyph.startsWith('M9.5'), glyph);

  await page.locator('.audio-card').nth(4).locator('.audio-card-btn').click();
  await playing(page, 4);
  state = await page.evaluate(STATE);
  check(`${slug}: a second card takes over`, state[4].paused === false, JSON.stringify(state[4]));
  check(`${slug}: the first card goes quiet`, state[1].paused === true, JSON.stringify(state[1]));

  await page.locator('.audio-card').nth(4).locator('.audio-card-btn').click();
  await page.waitForTimeout(400);
  state = await page.evaluate(STATE);
  check(`${slug}: the button pauses its recording`, state[4].paused === true, JSON.stringify(state[4]));
  check(`${slug}: no console errors`, errors.length === 0, errors.slice(0, 3).join(' | '));

  await page.locator('.cq-audio-wrap').screenshot({ path: `${shots}audiobook-cards-${slug}.png` });
  await ctx.close();
}

const browser = await chromium.launch({ channel: 'msedge' });
for (const book of BOOKS) await auditBook(browser, book);

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto(`${WEB}/books/caught-in-the-act`, { waitUntil: 'networkidle' });
await page.waitForSelector('.audio-card');
const first = await page.locator('.audio-card').first().boundingBox();
const vw = await page.evaluate(() => document.documentElement.clientWidth);
check('mobile: cards fit the viewport', first.width > 200 && first.width < vw, `${first.width} of ${vw}`);
await page.locator('.audio-card').nth(1).locator('.audio-card-btn').tap();
await playing(page, 1);
check('mobile: the button plays', (await page.evaluate(STATE))[1].paused === false);
await ctx.close();
await browser.close();

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
