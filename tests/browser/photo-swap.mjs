// Verifies the real-photograph image pass: every swapped slot loads, nothing
// protected changed, and the About lightbox works. Run with:
//   node tests/browser/photo-swap.mjs     (from the cft-frontend directory)
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const shots = path.join(here, 'shots');
const WEB = process.env.CFT_PHOTO_WEB || 'http://127.0.0.1:5180';

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

await mkdir(shots, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });

const requested = new Set();
const broken = [];
page.on('response', (response) => {
  const url = response.url();
  if (/\.(webp|png|jpe?g|gif)$/i.test(url)) {
    requested.add(url.replace(WEB, ''));
    if (response.status() >= 400) broken.push(`${response.status()} ${url.replace(WEB, '')}`);
  }
});
page.on('requestfailed', (request) => {
  if (/\.(webp|png|jpe?g|gif)$/i.test(request.url())) broken.push(`FAILED ${request.url().replace(WEB, '')}`);
});

const shot = async (name, selector) => {
  if (selector) await page.locator(selector).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: !selector });
};

// 1 — Home: the four journey polaroids and the Wisdom Call circle.
await page.goto(`${WEB}/`, { waitUntil: 'networkidle' });
await page.locator('.jy-band').scrollIntoViewIfNeeded();
await page.waitForTimeout(900);
const journeySrcs = await page.locator('.jy-polaroid img').evaluateAll((nodes) => nodes.map((n) => ({ src: n.currentSrc, box: n.getBoundingClientRect().width })));
check('Home shows the four new journey photographs', journeySrcs.length === 4 && journeySrcs.every((s) => s.src.includes('/images/photos/')), journeySrcs.map((s) => s.src.split('/').pop()).join(', '));
check('Every journey photograph actually painted', journeySrcs.every((s) => s.box > 100), `widths ${journeySrcs.map((s) => Math.round(s.box)).join('/')}`);
await page.locator('.jy-band').screenshot({ path: path.join(shots, '96-home-journeys.png') });

await page.locator('.wc2').scrollIntoViewIfNeeded();
await page.waitForTimeout(900);
const wc = await page.locator('.wc2-photo img').getAttribute('src');
check('Home Wisdom Call uses the new meditation photo', wc.includes('/images/photos/wisdom-call.webp'), wc);
await page.locator('.wc2').screenshot({ path: path.join(shots, '96-home-wisdom-call.png') });

// 2 — Nothing protected moved.
const protectedOnes = ['/images/site/hero-banner.webp', '/images/site/zalah-facilitator.jpg', '/images/site/wednesday-call.webp', '/images/books/secret-of-creation-front.webp', '/images/courses/accelerator-banner.webp'];
await page.goto(`${WEB}/books`, { waitUntil: 'networkidle' });
await page.goto(`${WEB}/courses`, { waitUntil: 'networkidle' });
await page.goto(`${WEB}/connect`, { waitUntil: 'networkidle' });
const missing = protectedOnes.filter((src) => ![...requested].some((url) => url.includes(src)));
check('Books, courses, hero, portrait and the Wisdom Call poster are untouched', missing.length === 0, missing.join(', ') || 'all still requested');
const retired = ['/images/journeys/', '/images/site/wisdom-meditation-2x', '/images/site/meditation-concept', '/images/site/auth-arch', '/images/site/auth-beach', '/images/blog/from-stress', '/images/blog/art-of-letting-go', '/images/blog/spiritual-burnout'];
const stillUsed = retired.filter((src) => [...requested].some((url) => url.includes(src)));
check('No AI image from the retired set is still requested', stillUsed.length === 0, stillUsed.join(', ') || 'none');

// 3 — Journey detail pages.
for (const slug of ['consciousness', 'self-discovery', 'inner-peace', 'purpose']) {
  await page.goto(`${WEB}/journey/${slug}`, { waitUntil: 'networkidle' });
  const hero = await page.locator('.jy-art').first();
  const ok = await hero.evaluate((node) => node.complete && node.naturalWidth > 0 && node.getBoundingClientRect().height < 720);
  check(`/journey/${slug} hero loads the real photo inside the band`, ok, await hero.getAttribute('src'));
  await page.locator('.cq-hero, .cq-band').first().screenshot({ path: path.join(shots, `96-journey-${slug}.png`) });
}

// 4 — About: the replaced approach image plus the new mosaic and lightbox.
await page.goto(`${WEB}/about`, { waitUntil: 'networkidle' });
await page.locator('.ab-approach-art').scrollIntoViewIfNeeded();
await page.waitForTimeout(700);
await page.locator('.ab-approach-art').screenshot({ path: path.join(shots, '96-about-approach.png') });
const approach = await page.locator('.ab-approach-art img').getAttribute('src');
check('About teaching-approach image is the real photograph', approach === '/images/photos/practice-morning.webp', approach);

await page.locator('.ab-mosaic').scrollIntoViewIfNeeded();
await page.waitForTimeout(900);
await page.locator('.ab-mosaic-band').screenshot({ path: path.join(shots, '96-about-mosaic.png') });
const tiles = await page.locator('.ab-tile').count();
check('About photo mosaic renders eight tiles', tiles === 8, `${tiles} tiles`);

await page.locator('.ab-tile').first().click();
const dialogOpen = await page.getByRole('dialog').isVisible();
check('Selecting a tile opens the full-size viewer', dialogOpen);
const bigSrc = await page.locator('.ab-light-box img').getAttribute('src');
const bigPainted = await page.locator('.ab-light-box img').evaluate((node) => node.complete && node.naturalWidth > 0);
check('The viewer shows the same photograph, painted', bigSrc === '/images/photos/signpost.webp' && bigPainted, `${bigSrc}`);
await page.screenshot({ path: path.join(shots, '96-about-lightbox.png') });
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(400);
const after = await page.locator('.ab-light-box img').getAttribute('src');
check('Arrow key moves to the next photograph', after === '/images/photos/horizon-back.webp', after);
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
check('Escape closes the viewer', (await page.getByRole('dialog').count()) === 0);
const focusBack = await page.evaluate(() => document.activeElement?.classList.contains('ab-tile'));
check('Focus returns to the tile that opened it', focusBack);

// 5 — Auth pages and the blog list.
for (const [route, expect] of [['/login', '/images/photos/mountain-sit.webp'], ['/signup', '/images/photos/fog-pier.webp']]) {
  await page.goto(`${WEB}${route}`, { waitUntil: 'networkidle' });
  const src = await page.locator('.au-hero-img').getAttribute('src');
  check(`${route} uses a real photograph`, src === expect, src);
  await page.locator('.au-hero').screenshot({ path: path.join(shots, `96-auth${route}.png`) });
}
// The three archive posts that used AI art sit deep in the paginated list.
const blogPhotos = [];
for (let n = 1; n <= 4; n += 1) {
  await page.goto(`${WEB}/blog?page=${n}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  blogPhotos.push(...(await page.locator('img').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('src')))).filter((src) => src && src.includes('/images/photos/')));
}
check('Blog covers use the new photographs', blogPhotos.length >= 3, [...new Set(blogPhotos)].join(', '));
await page.goto(`${WEB}/blog`, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.screenshot({ path: path.join(shots, '96-blog.png'), fullPage: true });

// 6 — Mobile pass over the two busiest bands.
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${WEB}/`, { waitUntil: 'networkidle' });
await page.locator('.jy-band').scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
check('No horizontal overflow on mobile after the swap', overflow === false);
await page.locator('.jy-band').screenshot({ path: path.join(shots, '96-mobile-journeys.png') });
await page.goto(`${WEB}/about`, { waitUntil: 'networkidle' });
await page.locator('.ab-mosaic').scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
await page.locator('.ab-mosaic-band').screenshot({ path: path.join(shots, '96-mobile-mosaic.png') });

check('No broken image requests anywhere', broken.length === 0, broken.slice(0, 8).join(' | '));
await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exitCode = 1;
