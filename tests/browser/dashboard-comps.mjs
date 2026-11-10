// The two dashboard comps Vaibhav attached on 2026-11-06, in a browser: the
// community welcome page for a member who owns nothing, the learning home for a
// member who owns a program, and the topbar that decides which one is "Home".
// Run with: node tests/browser/dashboard-comps.mjs   (from the cft-frontend directory)
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(here, '..', '..');
const shots = path.join(here, 'shots');
const WEB_PORT = Number(process.env.CFT_COMPS_WEB_PORT || 5184);
const WEB = `http://127.0.0.1:${WEB_PORT}`;
process.env.CFT_DEV_STACK_PORT = String(process.env.CFT_COMPS_API_PORT || 5004);
process.env.CFT_DEV_STACK_FRONTEND = WEB;

const { startDevStack, funnelUser } = await import('../../../backend/scripts/dev-stack.mjs');

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail.slice(0, 200)}` : ''}`);
};

await mkdir(shots, { recursive: true });
const stack = await startDevStack({ quiet: true });
const api = stack.apiOrigin;

const vite = spawn(process.execPath, [path.join(webDir, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '127.0.0.1', '--port', String(WEB_PORT), '--strictPort'], {
  cwd: webDir,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, CFT_DEV_API_TARGET: api }
});
let viteLog = '';
vite.stdout.on('data', (b) => { viteLog += b.toString(); });
vite.stderr.on('data', (b) => { viteLog += b.toString(); });
let viteReady = false;
for (let attempt = 0; attempt < 60; attempt += 1) {
  viteReady = await fetch(WEB).then((r) => r.ok).catch(() => false);
  if (viteReady) break;
  await new Promise((resolve) => setTimeout(resolve, 500));
}
if (!viteReady) {
  console.log(`FAIL  dev server answered on ${WEB} — ${viteLog.slice(-400)}`);
  vite.kill('SIGTERM');
  await stack.stop();
  process.exit(1);
}

const browser = await chromium.launch({ channel: 'msedge' });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const consoleErrors = [];
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', (error) => consoleErrors.push(String(error.message)));

const shot = (name) => page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: true }).catch(() => {});
const text = (selector) => page.locator(selector).first().innerText().catch(() => null);
const count = (selector) => page.locator(selector).count();
const attr = (selector, name) => page.locator(selector).first().getAttribute(name).catch(() => null);
// Compares a list of strings against the comp's wording, so a rename shows up as
// one line rather than a stack of near-misses.
const list = async (label, selector, expected) => {
  const actual = (await page.locator(selector).allInnerTexts()).map((value) => value.replace(/\s+/g, ' ').trim());
  return check(label, JSON.stringify(actual) === expected, actual.join(' · '));
};
const hrefs = async (label, selector, expected) => check(label, JSON.stringify(await page.locator(selector).evaluateAll((links) => links.map((link) => link.getAttribute('href')))) === expected, expected);

const settle = async () => {
  await page.waitForSelector('.db-nav', { timeout: 20000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(900);
};

// The seeded student starts with nothing, which is exactly the comp-1 member.
await page.goto(`${WEB}/login?next=%2Fdashboard`, { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: 'Password' }).click();
await page.getByLabel('Email, mobile number or username').fill(funnelUser.student.email);
await page.getByLabel('Password', { exact: true }).fill(funnelUser.student.password);
await page.getByRole('button', { name: 'Sign In' }).click();
await page.waitForURL(/\/dashboard/, { timeout: 25000 }).catch(() => {});
await settle();

// 1. Comp 1 — the community welcome page owns a member with no program yet.
check('signing in with nothing owned lands on the welcome page', /\/dashboard\/welcome$/.test(page.url()), page.url());
check('welcome hero greets the community', (await text('.db-hero h1'))?.includes('Welcome to the CFT Community.'), await text('.db-hero h1'));
check('welcome hero carries the gold tagline', (await text('.db-hero-tag'))?.includes('A beautiful journey begins'), await text('.db-hero-tag'));
check('welcome hero has both buttons', (await count('.db-hero-actions a')) === 2, `${await count('.db-hero-actions a')} buttons`);
check('the signpost photograph paints the hero', await page.locator('.db-hero-art').evaluate((img) => img.complete && img.naturalWidth > 200).catch(() => false));
check('three Discover What’s Next cards', (await count('.db-next-card')) === 3, `${await count('.db-next-card')} cards`);
await list('the three cards match the comp', '.db-next-card h3', '["Explore Programs","Read Books","Join an Event"]');
check('each card has its wave band', (await count('.db-wave')) === 3, `${await count('.db-wave')} waves`);
check('the whole card is the link', await page.locator('.db-next-card').first().evaluate((card) => {
  const link = card.querySelector('.db-next-link');
  const after = getComputedStyle(link, ':after');
  return after.position === 'absolute' && after.inset !== 'auto';
}));
await hrefs('card links go where the comp says', '.db-next-card .db-next-link', '["/dashboard/explore","/books","/dashboard/calls?tab=classes"]');
// The comp puts the icon beside the title, and the photograph along the bottom
// of the event card — both are things a CSS cascade can undo silently.
check('the icon sits beside the card title', await page.locator('.db-next-card').first().evaluate((card) => {
  const chip = card.querySelector('.db-chip').getBoundingClientRect();
  const title = card.querySelector('h3').getBoundingClientRect();
  return chip.right < title.left && Math.abs(chip.top - title.top) < 40;
}).catch(() => false));
check('the hero headline stays on one line', await page.locator('.db-hero h1').evaluate((h1) => h1.getBoundingClientRect().height < 70).catch(() => false), await page.locator('.db-hero h1').evaluate((h1) => `${Math.round(h1.getBoundingClientRect().height)}px at ${Math.round(h1.getBoundingClientRect().width)}px wide`).catch(() => ''));
await shot('01-welcome-1440');

// 2. The shared shell: four labels, Home pointing at the page in use.
const navLabels = (await page.locator('.db-nav a').allInnerTexts()).map((label) => label.replace(/\s+/g, ' ').trim());
check('topbar has the comp’s four labels', JSON.stringify(navLabels) === '["Home","My Learning","Explore Programs","Events"]', navLabels.join(' · '));
check('Home points at the welcome page', (await attr('.db-nav a:nth-child(1)', 'href')) === '/dashboard/welcome', await attr('.db-nav a:nth-child(1)', 'href'));
check('Home is the active label', await page.locator('.db-nav a.active').first().innerText().then((label) => label.trim() === 'Home').catch(() => false), await text('.db-nav a.active'));
check('Visit Website is a pill', await page.locator('.db-visit').evaluate((el) => Number.parseInt(getComputedStyle(el).borderRadius, 10) >= 20).catch(() => false));
check('Events opens live classes', (await attr('.db-nav a:nth-child(4)', 'href')) === '/dashboard/calls', await attr('.db-nav a:nth-child(4)', 'href'));

// 3. Comp 2 — the same member, now with the Accelerator and some progress.
const { User, Course, Lesson, LessonProgress, Entitlement } = await import('../../../backend/src/models/index.js');
const student = await User.findOne({ email: funnelUser.student.email });
const course = await Course.findOne({ title: /accelerator/i });
await Entitlement.create({ student: student._id, course: course._id, source: 'purchase', status: 'active' });

await page.goto(`${WEB}/dashboard`, { waitUntil: 'domcontentloaded' });
await settle();
check('owning a program keeps /dashboard on the learning home', /\/dashboard$/.test(page.url()), page.url());
check('member hero greets by first name', (await text('.db-hero h1'))?.trim() === 'Welcome back, Browser.', await text('.db-hero h1'));
check('the learning card names the program', (await text('.db-learn h3'))?.includes('Consciousness Accelerator'), await text('.db-learn h3'));
check('the card has real artwork', await page.locator('.db-learn-art img').evaluate((img) => img.complete && img.naturalWidth > 200).catch(() => false));

const lessons = await Lesson.find({ course: course._id, publicationStatus: 'published' }).select('_id').limit(3);
const totalLessons = await Lesson.countDocuments({ course: course._id, publicationStatus: 'published' });
const expectedPercent = Math.round((lessons.length / totalLessons) * 100);
await LessonProgress.insertMany(lessons.map((lesson) => ({ student: student._id, lesson: lesson._id, course: course._id, completed: true, completedAt: new Date() })));
await page.reload({ waitUntil: 'domcontentloaded' });
await settle();
// The card quotes the catalog rather than the comp's sample numbers, so this
// reads the same counts the server has and expects the card to agree.
check(`the card counts all ${totalLessons} published lessons`, (await text('.db-learn-meta'))?.replace(/\s+/g, ' ').includes(`${totalLessons} lessons`), (await text('.db-learn-meta'))?.replace(/\s+/g, ' '));
check(`progress reads ${expectedPercent}% complete`, (await text('.db-learn-progress span')) === `${expectedPercent}% Complete`, await text('.db-learn-progress span'));
check('the bar matches the number', (await attr('.db-learn-progress progress', 'value')) === String(expectedPercent), await attr('.db-learn-progress progress', 'value'));
check('a part-finished program offers Resume', (await text('.db-learn > .db-button-plum'))?.includes('Resume Learning'), await text('.db-learn > .db-button-plum'));
check('the Wisdom Call card is beside it', (await text('.db-event h3'))?.includes('Wednesday'), await text('.db-event h3'));
check('the event photograph lies along the card bottom', await page.locator('.db-event-art').evaluate((img) => {
  const band = img.getBoundingClientRect();
  const card = img.parentElement.getBoundingClientRect();
  return getComputedStyle(img).position === 'absolute' && Math.abs(band.bottom - card.bottom) < 2;
}).catch(() => false));
check('event card lists cadence and time', (await text('.db-event ul'))?.replace(/\s+/g, ' ').includes('Every Wednesday'), (await text('.db-event ul'))?.replace(/\s+/g, ' '));
check('two mini cards under the program', (await count('.db-mini-card')) === 2, `${await count('.db-mini-card')} mini cards`);
await list('mini cards are Read Books and Visit Website', '.db-mini-card h3', '["Read Books","Visit Website"]');
check('Home points back at /dashboard now', (await attr('.db-nav a:nth-child(1)', 'href')) === '/dashboard', await attr('.db-nav a:nth-child(1)', 'href'));
await shot('02-member-1440');

// 4. The gold ink, not the gold paint, carries text on the ivory surfaces.
const ink = await page.evaluate(() => {
  const colour = (sel) => { const el = document.querySelector(sel); return el ? getComputedStyle(el).color : null; };
  return { tag: colour('.db-hero-tag'), link: colour('.db-next-link') || colour('.db-learn-meta svg'), eyebrow: colour('.db-learn-copy .db-eyebrow'), button: colour('.db-button-plum') };
});
check('gold text uses the readable gold ink', ink.tag === 'rgb(138, 106, 31)' && ink.eyebrow === 'rgb(138, 106, 31)', JSON.stringify(ink));
check('the plum button carries white text', ink.button === 'rgb(255, 255, 255)', ink.button);

// 5. Navigation still reaches the pages behind the new labels.
await page.getByRole('link', { name: /^My Learning$/ }).click();
await settle();
check('My Learning opens the library', /\/dashboard\/courses$/.test(page.url()) && (await count('.db-course-tile')) >= 1, `${page.url()} · ${await count('.db-course-tile')} tiles`);
await page.getByRole('link', { name: /^Events$/ }).click();
await settle();
check('Events opens calls & bookings', /\/dashboard\/calls/.test(page.url()), page.url());
await page.getByRole('link', { name: /^Home$/ }).click();
await settle();
check('Home returns to the learning home', /\/dashboard$/.test(page.url()), page.url());

// 6. Both pages at the widths the client checks.
await page.goto(`${WEB}/dashboard/welcome`, { waitUntil: 'domcontentloaded' });
await settle();
await page.setViewportSize({ width: 820, height: 1180 });
await page.waitForTimeout(500);
await shot('03-welcome-820');
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
await shot('04-welcome-390');
check('welcome cards stack to one column on a phone', await page.locator('.db-next-grid').evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length === 1).catch(() => false));
check('nothing overflows the phone viewport', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), await page.evaluate(() => `${document.documentElement.scrollWidth}/${window.innerWidth}`));
await page.goto(`${WEB}/dashboard`, { waitUntil: 'domcontentloaded' });
await settle();
await shot('05-member-390');
check('member page fits the phone too', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), await page.evaluate(() => `${document.documentElement.scrollWidth}/${window.innerWidth}`));
const navBoxes = await page.locator('.db-nav a').evaluateAll((links) => links.map((link) => link.getBoundingClientRect()));
check('the four nav labels keep their own space on a phone', navBoxes.every((box, i) => i === 0 || (box.left >= navBoxes[i - 1].right + 2 && Math.abs(box.top - navBoxes[i - 1].top) < 2)), navBoxes.map((box) => `${Math.round(box.left)}–${Math.round(box.right)}`).join(' · '));

const noise = consoleErrors.filter((line) => !/favicon|Download the React DevTools|net::ERR|Failed to load resource/i.test(line));
check('no console errors', noise.length === 0, noise.slice(0, 3).join(' | '));

await browser.close();
vite.kill('SIGTERM');
await stack.stop();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
