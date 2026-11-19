// The phone number is out of the site, twice over: once off the contact page
// and once out of the navbar's "Talk with us" panel. This walks every public
// route and looks for either a dial link or the digits themselves, then
// photographs the panel it came out of.
//   node tests/browser/no-phone-number.mjs   (from the cft-frontend directory)
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(here, '..', '..');
const shots = path.join(here, 'shots');
const WEB_PORT = Number(process.env.CFT_PHONE_WEB_PORT || 4183);
const WEB = `http://127.0.0.1:${WEB_PORT}`;
const ROUTES = ['/', '/courses', '/course/accelerator', '/connect', '/about', '/testimonials', '/faq', '/blog', '/books', '/wisdom-call', '/journey', '/privacy', '/terms'];

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail.slice(0, 200)}` : ''}`);
};

const serve = spawn(process.execPath, [
  path.join(webDir, 'node_modules', 'vite', 'bin', 'vite.js'),
  'preview', '--host', '127.0.0.1', '--port', String(WEB_PORT), '--strictPort',
], { cwd: webDir, stdio: ['ignore', 'pipe', 'pipe'] });
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
  process.exit(1);
}

const browser = await chromium.launch({ channel: 'msedge' });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

// The legal pages quote contact details inside their clauses, and a crisis
// line beside them, so they are scanned for dial links only. Where their text
// still prints the site phone is reported for him to decide on, not failed.
const LEGAL = ['/privacy', '/terms'];

for (const route of ROUTES) {
  await page.goto(`${WEB}${route}`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(500);
  const found = await page.evaluate(() => ({
    dial: [...document.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute('href')),
    digits: (document.body.innerText.match(/\(?\d{3}[-.)]\s?\d{3}[-.]\d{4}/g) || []),
  }));
  check(`${route}: nothing on the page can dial out`, found.dial.length === 0, found.dial.join(','));
  if (LEGAL.includes(route)) {
    if (found.digits.length) console.log(`NOTE  ${route} still prints ${found.digits.join(', ')} in its clauses`);
    continue;
  }
  check(`${route}: no phone number anywhere on the page`, found.digits.length === 0, found.digits.join(', '));
}

// The panel itself, because a link the menu builds from data is exactly what
// the page text scan above cannot see until the menu is opened.
await page.goto(`${WEB}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
await page.locator('.nav-links a[href="/connect"]').first().hover();
await page.waitForTimeout(700);
const panel = await page.evaluate(() => {
  const open = [...document.querySelectorAll('.mm-compact')].find((el) => el.getBoundingClientRect().height > 0);
  if (!open) return null;
  return {
    title: open.querySelector('.mm-title')?.textContent?.trim() || null,
    links: [...open.querySelectorAll('a')].map((a) => ({ text: a.textContent.trim(), href: a.getAttribute('href') })),
  };
});
check('the Talk with us panel opens', !!panel && panel.title === 'Talk with us', panel?.title || 'panel not found');
check('the panel lists no dial link', !!panel && panel.links.every((l) => !/^tel:/.test(l.href || '')), panel?.links.map((l) => l.text).join(' | '));
await page.screenshot({ path: path.join(shots, '101-connect-panel.png') });

await browser.close();
serve.kill('SIGTERM');

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
