// The 2026-11-16 dashboard course-page batch, in a browser, for all five courses:
// the breadcrumb is a button, the class label reads once and in words, the three
// welcome cards share one height, the feather sits in the shell, and the intro
// video stops queueing its three requests one after another.
//
//   node tests/browser/course-page-pass.mjs
//   CFT_PASS_SHOTS=D:/some/dir node tests/browser/course-page-pass.mjs
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(here, '..', '..');
const shots = process.env.CFT_PASS_SHOTS || path.join(here, 'shots', 'course-page-pass');
const WEB_PORT = Number(process.env.CFT_PASS_WEB_PORT || 5188);
const WEB = `http://127.0.0.1:${WEB_PORT}`;
process.env.CFT_DEV_STACK_PORT = String(process.env.CFT_PASS_API_PORT || 5008);
process.env.CFT_DEV_STACK_FRONTEND = WEB;

const { startDevStack, funnelUser } = await import('../../../backend/scripts/dev-stack.mjs');

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail.slice(0, 220)}` : ''}`);
};

await mkdir(shots, { recursive: true });
const stack = await startDevStack({ quiet: true });

// The course page only shows its lesson rows, welcome cards and player to a
// member who owns the teaching, so the seeded student is granted everything.
const { Course, Entitlement, User } = await import('../../../backend/src/models/index.js');
const student = await User.findOne({ email: funnelUser.student.email });
const courses = await Course.find({ publicationStatus: 'published' }).sort({ title: 1 });
for (const course of courses) {
  await Entitlement.findOneAndUpdate(
    { student: student._id, course: course._id },
    { $set: { status: 'active', source: 'admin_grant', accessUntil: null, revokedAt: null, revokedBy: null, revokeReason: null },
      $setOnInsert: { grantedAt: new Date() } },
    { upsert: true, setDefaultsOnInsert: true }
  );
}
console.log(`granted ${courses.length} courses to ${funnelUser.student.email}`);

const vite = spawn(process.execPath, [path.join(webDir, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '127.0.0.1', '--port', String(WEB_PORT), '--strictPort'], {
  cwd: webDir,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, CFT_DEV_API_TARGET: stack.apiOrigin }
});
let viteLog = '';
vite.stdout.on('data', (b) => { viteLog += b.toString(); });
vite.stderr.on('data', (b) => { viteLog += b.toString(); });
let ready = false;
for (let attempt = 0; attempt < 80; attempt += 1) {
  ready = await fetch(WEB).then((r) => r.ok).catch(() => false);
  if (ready) break;
  await new Promise((resolve) => setTimeout(resolve, 500));
}
if (!ready) {
  console.log(`FAIL  dev server never answered on ${WEB} — ${viteLog.slice(-400)}`);
  vite.kill('SIGTERM');
  await stack.stop();
  process.exit(1);
}

const browser = await chromium.launch({ channel: 'msedge' });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const noise = [];
page.on('console', (msg) => { if (msg.type() === 'error') noise.push(msg.text()); });
page.on('pageerror', (error) => noise.push(String(error.message)));

const timeline = [];
const delivered = [];
page.on('request', (request) => {
  const url = new URL(request.url());
  if (!url.pathname.startsWith('/api/')) return;
  timeline.push({ at: Date.now(), method: request.method(), path: url.pathname });
});
// Strict mode mounts every effect twice and the first copy aborts, so a doubled
// request proves nothing. Only a response that actually landed was fetched.
page.on('response', (response) => {
  const url = new URL(response.url());
  if (!url.pathname.startsWith('/api/')) return;
  delivered.push({ at: Date.now(), method: response.request().method(), path: url.pathname, status: response.status() });
});

// The screen opens on the email-code form, so the password fields only exist
// once the Password tab is pressed.
await page.goto(`${WEB}/login?next=%2Fdashboard`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.au-methods button', { timeout: 20000 });
await page.locator('.au-methods button', { hasText: 'Password' }).click();
await page.waitForSelector('#au-identifier', { timeout: 15000 });
await page.fill('#au-identifier', funnelUser.student.email);
await page.fill('#au-password', funnelUser.student.password);
await Promise.all([
  page.waitForURL(/\/dashboard/, { timeout: 30000 }).catch(() => {}),
  page.locator('.au-submit, button[type=submit]').first().click()
]);

// 1. The shell: feather in the topbar and the footer, and the new legal line.
await page.goto(`${WEB}/dashboard/courses`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.db-nav', { timeout: 20000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: path.join(shots, 'shell-top.png') }).catch(() => {});
const painted = (selector) => page.locator(selector).first().evaluate((img) => img.complete && img.naturalWidth > 200).catch(() => false);
check('the feather paints in the dashboard topbar', await painted('.db-brand > .db-crest'));
check('the feather paints in the dashboard footer', await painted('.db-footer > .db-crest'));
const legal = (await page.locator('.db-footer-legal').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
check('the footer carries the full rights line', /The Centre for Transformation © \d{4} \(copyright\)/.test(legal)
  && /All rights reserved to The Centre for Transformation/.test(legal)
  && /Developed by Vaibhav/.test(legal), legal);
check('the footer no longer reads Transform · Learn · Grow · Belong', !/Grow/.test(legal) && !/Belong/.test(legal), legal);
const made = await page.locator('.db-footer-legal .db-made').getAttribute('href').catch(() => null);
check('Developed by Vaibhav links to the developer site', made === 'https://vaibhavbuilds.space/', String(made));
const footerSize = await page.locator('.db-footer-legal').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
check('the footer rights line is at least 11px', footerSize >= 11, `${footerSize}px`);
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(shots, 'shell-footer.png') }).catch(() => {});
await page.evaluate(() => window.scrollTo(0, 0));

// 2. Every owned course page.
const slugs = await page.$$eval('a[href*="/dashboard/courses/"]', (links) => [...new Set(links
  .map((link) => link.getAttribute('href').split('/').filter(Boolean).pop())
  .filter((slug) => slug && slug !== 'courses'))]);
check('all five teachings are in the member library', slugs.length === 5, slugs.join(', '));

const style = (selector) => page.locator(selector).first().evaluate((el) => {
  const cs = getComputedStyle(el);
  const box = el.getBoundingClientRect();
  return { fs: parseFloat(cs.fontSize), fw: Number(cs.fontWeight), radius: cs.borderRadius,
    border: cs.borderTopWidth, background: cs.backgroundColor, minH: parseFloat(cs.minHeight),
    w: Math.round(box.width), h: Math.round(box.height), text: el.innerText.replace(/\s+/g, ' ').trim() };
});

for (const slug of slugs) {
  timeline.length = 0;
  delivered.length = 0;
  const started = Date.now();
  await page.goto(`${WEB}/dashboard/courses/${slug}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.db-class-row', { timeout: 25000 });
  await page.waitForTimeout(4000);
  // Captured before the probes. Autoplay scrolls the player on screen, so the
  // shot of the page top has to scroll back up itself.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(shots, `${slug}-top.png`) }).catch(() => {});

  const back = await style('.db-back');
  check(`${slug}: the breadcrumb is a button`, back.border !== '0px' && back.radius !== '0px' && back.h >= 44 && back.fs >= 15,
    `${back.w}x${back.h}px, ${back.fs}px/${back.fw}, radius ${back.radius}`);
  check(`${slug}: the breadcrumb still goes back to My Courses`,
    await page.locator('.db-back').getAttribute('href') === '/dashboard/courses');

  const cards = await page.locator('.db-community-card').evaluateAll((nodes) => nodes.map((el) => {
    const paragraphs = [...el.querySelectorAll('p')];
    return { h: Math.round(el.getBoundingClientRect().height),
      head: parseFloat(getComputedStyle(el.querySelector('h3')).fontSize),
      // A card may carry its copy as one intro paragraph or as item lines, so
      // the check reads every paragraph it actually has.
      body: Math.min(...paragraphs.map((p) => parseFloat(getComputedStyle(p).fontSize))),
      bodyWeight: paragraphs.map((p) => Number(getComputedStyle(p).fontWeight)).sort((a, b) => a - b)[0] };
  }));
  const heights = cards.map((card) => card.h);
  check(`${slug}: all three cards hold the course page open to one height`, cards.length === 3
    && Math.max(...heights) - Math.min(...heights) <= 2, heights.join(' / '));
  check(`${slug}: the card headings and copy are larger`, cards.every((card) => card.head >= 24 && card.body >= 14),
    cards.map((card) => `h${card.head}/p${card.body}${card.bodyWeight ? `w${card.bodyWeight}` : ''}`).join(' · '));

  const heads = await page.locator('.db-class-head').allInnerTexts();
  const clean = heads.map((value) => value.replace(/\s+/g, ' ').trim());
  check(`${slug}: no class label carries a figure`, clean.every((value) => !/\d/.test(value)), clean.slice(0, 6).join(' · '));
  const duplicated = clean.filter((value, index) => index > 0 && clean[index - 1] === value);
  check(`${slug}: no label repeats itself`, duplicated.length === 0, duplicated.join(' · ') || 'none');
  const lessonCount = await page.locator('.db-class-row').count();
  check(`${slug}: every lesson still gets its own row`, lessonCount >= 4, `${lessonCount} rows`);

  const open = await style('.db-open-lesson');
  check(`${slug}: Open lesson is a button now`, open.border !== '0px' && open.radius !== '0px' && open.h >= 44 && open.fs >= 14,
    `${open.w}x${open.h}px, ${open.fs}px/${open.fw}`);

  // The player asks for the lesson, the signed token and the controls script
  // together, and no longer re-fetches the curriculum the page already holds.
  const curriculumLoads = delivered.filter((entry) => /\/api\/v1\/student\/courses\//.test(entry.path));
  check(`${slug}: the curriculum is fetched once for the page`, curriculumLoads.length === 1, `${curriculumLoads.length} loads`);
  const lessonGet = timeline.find((entry) => /\/api\/v1\/student\/lessons\/[^/]+$/.test(entry.path));
  const tokenPost = timeline.find((entry) => /\/api\/v1\/video\/lessons\/.+\/playback$/.test(entry.path));
  const tokenLoads = delivered.filter((entry) => /\/api\/v1\/video\/lessons\/.+\/playback$/.test(entry.path) && entry.status < 500);
  check(`${slug}: the intro video authorizes itself with no click`, Boolean(tokenPost), tokenPost ? `+${tokenPost.at - started}ms, ${tokenLoads.length} live session(s)` : 'no playback request');
  if (lessonGet && tokenPost) {
    check(`${slug}: the token is asked for alongside the lesson, not after it`,
      Math.abs(tokenPost.at - lessonGet.at) < 400, `${Math.abs(tokenPost.at - lessonGet.at)}ms apart`);
  }
  // A full page shot of a 35-row curriculum is unreadable, so the two regions
  // he asked about are also captured at viewport size.
  await page.locator('.db-class').first().scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(shots, `${slug}-classes.png`) }).catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(shots, `${slug}-full.png`), fullPage: true }).catch(() => {});
}

// 3. A phone still reaches every lesson.
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${WEB}/dashboard/courses/spiritual-awakening-1`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.db-class-row', { timeout: 25000 });
await page.waitForTimeout(2500);
const phone = await page.evaluate(() => ({
  overflow: document.documentElement.scrollWidth - window.innerWidth,
  row: (() => {
    const el = document.querySelector('.db-class-row');
    return { h: Math.round(el.getBoundingClientRect().height), wrapped: el.getBoundingClientRect().height > 70 };
  })(),
  back: Math.round(document.querySelector('.db-back').getBoundingClientRect().height),
  footerH: Math.round(document.querySelector('.db-footer').getBoundingClientRect().height)
}));
check('the phone page has no sideways overflow', phone.overflow <= 0, `${phone.overflow}px`);
check('the phone class row keeps a full-size label and button', phone.row.h >= 44, JSON.stringify(phone.row));
check('the phone breadcrumb keeps its tap height', phone.back >= 44, `${phone.back}px`);
await page.screenshot({ path: path.join(shots, 'phone-full.png'), fullPage: true }).catch(() => {});
await page.locator('.db-class').first().scrollIntoViewIfNeeded().catch(() => {});
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(shots, 'phone-classes.png') }).catch(() => {});

const real = noise.filter((line) => !/player.mediadelivery|mediadelivery.net|net::ERR_FAILED|Failed to load resource/.test(line));
check('no page errors outside the missing video provider keys', real.length === 0, real.join(' | '));

await browser.close();
vite.kill('SIGTERM');
await stack.stop();
const passed = results.filter((entry) => entry.pass).length;
console.log(`\n${passed}/${results.length} checks passed`);
console.log(`screenshots in ${shots}`);
process.exit(passed === results.length ? 0 : 1);
