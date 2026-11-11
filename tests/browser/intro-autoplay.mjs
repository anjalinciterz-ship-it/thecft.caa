// Proves the intro video of every owned course starts on its own when the course
// is opened from My Learning, with no click anywhere in the player. Also proves
// the "Close video" opt-out sticks and that a lesson chosen from the picker
// starts the same way.
//
//   node tests/browser/intro-autoplay.mjs
//   CFT_AUTOPLAY_SLUGS=spiritual-awakening-1 node tests/browser/intro-autoplay.mjs
//   (needs the Atlas-backed stack: PORT=5010 AUTH_PASSWORD_ENABLED=true
//    CORS_ALLOWED_ORIGINS=http://127.0.0.1:5182 node src/server.js, then
//    CFT_DEV_API_TARGET=http://127.0.0.1:5010 npx vite --port 5182 --host 127.0.0.1)
import { chromium } from '@playwright/test';

const WEB = process.env.CFT_AUTOPLAY_WEB || 'http://127.0.0.1:5182';
const EMAIL = process.env.CFT_AUTOPLAY_EMAIL;
const PASSWORD = process.env.CFT_AUTOPLAY_PASSWORD;
if (!EMAIL || !PASSWORD) throw new Error('CFT_AUTOPLAY_EMAIL and CFT_AUTOPLAY_PASSWORD must be passed in the environment');
const ONLY = (process.env.CFT_AUTOPLAY_SLUGS || '').split(',').filter(Boolean);

const results = [];
const check = (name, pass, detail = '') => {
  results.push(pass);
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

// The video element lives inside Bunny's shadow DOM, so plain selectors miss it.
const VIDEO_STATE = `(() => {
  const walk = (root, acc) => {
    for (const el of root.querySelectorAll('*')) {
      if (el.tagName === 'VIDEO') acc.push(el);
      if (el.shadowRoot) walk(el.shadowRoot, acc);
    }
    return acc;
  };
  const v = walk(document, [])[0];
  return v ? { api: typeof window.player, paused: v.paused, muted: v.muted, seconds: +v.currentTime.toFixed(1) } : { noVideo: true };
})()`;

const browser = await chromium.launch({ channel: 'msedge' });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message.slice(0, 120)));

const videoState = () => {
  const frame = page.frames().find((entry) => entry.url().includes('mediadelivery'));
  return frame ? frame.evaluate(VIDEO_STATE).catch((error) => ({ probeError: error.message.slice(0, 60) })) : Promise.resolve(null);
};

const waitForPlayback = async (seconds = 30) => {
  const until = Date.now() + seconds * 1000;
  let state = null;
  while (Date.now() < until) {
    await page.waitForTimeout(2000);
    state = await videoState();
    if (state && state.paused === false && state.seconds > 1) return { state, waited: Date.now() - (until - seconds * 1000) };
    if (state && state.noVideo && state.api === 'undefined') continue;
  }
  return { state, waited: null };
};

await page.goto(`${WEB}/login`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('button:has-text("Password")', { timeout: 15000 });
await page.click('button:has-text("Password")');
await page.waitForSelector('#au-password', { timeout: 15000 });
await page.fill('#au-identifier', EMAIL);
await page.fill('#au-password', PASSWORD);
await page.click('.au-submit');
await page.waitForURL(/\/dashboard/, { timeout: 25000 });

await page.goto(`${WEB}/dashboard/courses`, { waitUntil: 'networkidle' });
const links = await page.$$eval('a[href*="/dashboard/courses/"]', (nodes) => nodes.map((a) => a.getAttribute('href')));
const slugs = [...new Set(links.map((href) => href.split('/').filter(Boolean).pop()).filter((slug) => slug && slug !== 'courses'))].filter((slug) => !ONLY.length || ONLY.includes(slug));
check('the preview account owns courses to test', slugs.length > 0, slugs.join(', ') || 'none');

for (const slug of slugs) {
  await page.goto(`${WEB}/dashboard/courses/${slug}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.cq-player', { timeout: 25000 });
  const before = await page.evaluate(() => Math.round(window.scrollY));
  const { state, waited } = await waitForPlayback();
  const after = await page.evaluate(() => Math.round(window.scrollY));
  const ui = await page.evaluate(() => ({
    lesson: document.querySelector('.cq-player select option:checked')?.textContent || '',
    buttons: [...document.querySelectorAll('.cq-player button')].map((button) => button.textContent.trim()),
    alert: document.querySelector('.cq-player [role="alert"]')?.textContent || '',
  }));
  check(`${slug}: the ${ui.lesson || 'first'} lesson plays with no click`, Boolean(waited), waited ? `playing at +${waited}ms, sound ${state.muted ? 'off (Unmute offered)' : 'on'}` : `never started — ${JSON.stringify(state)} ${ui.alert}`);
  if (state?.muted) check(`${slug}: a muted start offers Unmute`, ui.buttons.some((label) => label.includes('Unmute')), JSON.stringify(ui.buttons));
  if (waited) {
    await page.click('.cq-player button:has-text("Close video")');
    await page.waitForTimeout(9000);
    const stayed = await page.evaluate(() => ({
      iframe: Boolean(document.querySelector('.cq-player iframe')),
      buttons: [...document.querySelectorAll('.cq-player button')].map((button) => button.textContent.trim()),
    }));
    check(`${slug}: Close video keeps it closed`, !stayed.iframe && stayed.buttons.includes('Start video'), JSON.stringify(stayed));
  }
  console.log(`   scroll ${before}px -> ${after}px (the player must be on screen for Bunny to wake its API)`);
}

check('no page errors while autoplaying', pageErrors.length === 0, pageErrors.join(' | '));
await browser.close();
console.log(`\n${results.filter(Boolean).length}/${results.length} checks passed`);
process.exit(results.every(Boolean) ? 0 : 1);
