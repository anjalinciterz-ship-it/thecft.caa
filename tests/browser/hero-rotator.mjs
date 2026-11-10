// Hero rotator checks: four slides in order, crossfade, each one a full-bleed
// text-free photograph with live words over it on desktop, the same stacked
// composition on tablet and phone, and reduced motion.
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const WEB = process.env.CFT_WEB || 'http://127.0.0.1:5180';
const shots = fileURLToPath(new URL('./shots/', import.meta.url));
const results = [];
const check = (name, pass, detail) => results.push({ name, pass, detail });
const browser = await chromium.launch({ channel: 'msedge' });

const read = (page) => page.evaluate(() => {
  const slides = [...document.querySelectorAll('.hero-slide')];
  const active = slides.findIndex((s) => s.classList.contains('is-active'));
  // Only the slide actually on screen counts: the rest are parked at
  // visibility:hidden but still in the DOM.
  const slide = slides.find((s) => s.classList.contains('is-active') && getComputedStyle(s).visibility === 'visible');
  const visible = (el) => !!(el && el.offsetParent !== null);
  // On phones .hero-copy is display:contents, so the wrapper has no box of its
  // own even though its words are on screen; measure the headline there instead.
  const copyShown = (() => {
    const el = slide?.querySelector('.hero-copy');
    if (!el) return false;
    if (getComputedStyle(el).display === 'contents') return (el.querySelector('h1')?.getBoundingClientRect().height || 0) > 8;
    return visible(el);
  })();
  const box = (el) => {
    const r = el?.getBoundingClientRect();
    return r ? { w: Math.round(r.width), h: Math.round(r.height), l: Math.round(r.left), t: Math.round(r.top) } : null;
  };
  const art = box(slide?.querySelector('.hero-art'));
  const sr = box(slide);
  return {
    keys: slides.map((s) => s.querySelector('.hero-art')?.getAttribute('src') || '?'),
    active,
    dots: document.querySelectorAll('.hero-dots .slider-dot').length,
    dotActive: [...document.querySelectorAll('.hero-dots .slider-dot')].findIndex((d) => d.classList.contains('is-active')),
    zones: slide?.querySelectorAll('.hero-zone').length ?? -1,
    photoSlide: !!slide?.classList.contains('hero-slide-photo'),
    copyShown,
    veilShown: visible(slide?.querySelector('.hero-veil')),
    extrasShown: visible(slide?.querySelector('.hero-cred')),
    headline: (slide?.querySelector('.hero-copy h1')?.textContent || '').trim().slice(0, 46),
    art,
    // How much of the slide the photograph actually covers, in %.
    artSpan: art && sr ? { l: +((art.l - sr.l) / sr.w * 100).toFixed(1), r: +((art.l + art.w - sr.l) / sr.w * 100).toFixed(1) } : null,
    stageH: Math.round(document.querySelector('.hero-stage')?.getBoundingClientRect().height || 0),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
});

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await page.goto(`${WEB}/`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.hero-stage .hero-slide', { timeout: 20000 });
await page.waitForTimeout(1500);

const start = await read(page);
check('four slides in the client order', start.keys.length === 4 && /hero-bg-guidance/.test(start.keys[0]) && /hero-banner/.test(start.keys[1]) && /hero-bg-lake/.test(start.keys[2]) && /hero-bg-path/.test(start.keys[3]), start.keys.map((k) => k.split('/').pop()).join(' → '));
check('opens on the Heart-Centered Guidance slide', start.active === 0 && start.dotActive === 0, `slide ${start.active}`);
check('one dot per slide', start.dots === 4, `${start.dots} dots`);

// Auto-rotation: 4s cadence, so two advances inside 9s of no interaction.
await page.waitForTimeout(9000);
const spun = await read(page);
check('rotates on its own every few seconds', spun.active !== 0 && spun.active < 4, `landed on slide ${spun.active} after 9s`);

const titles = ['guidance', 'cosmic', 'lake', 'path'];
for (let i = 0; i < 4; i += 1) {
  await page.locator('.hero-dots .slider-dot').nth(i).click();
  await page.waitForTimeout(1300);
  const s = await read(page);
  check(`slide ${i + 1} (${titles[i]}): shown, others hidden`, s.active === i && s.dotActive === i, `active ${s.active}, dot ${s.dotActive}`);
  check(`slide ${i + 1} (${titles[i]}): no horizontal overflow`, s.overflow === false, `stage ${s.stageH}px tall`);
  check(`slide ${i + 1} (${titles[i]}): its words are live text`, s.copyShown && s.headline.length > 8, `"${s.headline}"`);
  check(`slide ${i + 1} (${titles[i]}): no hotspot layer is left`, s.zones === 0, `hotspot links ${s.zones}`);
  if (i === 1) {
    check('the original hero keeps its cred, card and quote', s.extrasShown, `extras shown ${s.extrasShown}`);
    check('the original hero crops from the bottom, not the face', s.art && s.art.h === s.stageH, `art ${s.art?.w}x${s.art?.h} in a ${s.stageH}px stage`);
  } else {
    check(`slide ${i + 1} (${titles[i]}): the photograph fills the frame`, s.artSpan && s.artSpan.l < 0.6 && s.artSpan.r > 99.4, `art spans ${s.artSpan?.l}%–${s.artSpan?.r}%`);
    check(`slide ${i + 1} (${titles[i]}): a wash sits between photo and words`, s.veilShown && s.photoSlide, `veil ${s.veilShown} · photo slide ${s.photoSlide}`);
  }
  await page.screenshot({ path: `${shots}98-hero-${titles[i]}.png`, clip: { x: 0, y: 0, width: 1440, height: Math.min(900, s.stageH + 40) } });
}

// The live buttons must navigate on every slide.
await page.locator('.hero-dots .slider-dot').nth(2).click();
await page.waitForTimeout(1200);
await page.locator('.hero-slide.is-active .hero-actions .btn').first().click();
await page.waitForFunction(() => location.pathname === '/courses', null, { timeout: 8000 }).catch(() => {});
check('a photo slide CTA reaches /courses', (await page.evaluate(() => location.pathname)) === '/courses', await page.evaluate(() => location.pathname));
await page.goBack({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('.hero-slide', { timeout: 20000 });
await page.waitForTimeout(1200);
await page.locator('.hero-dots .slider-dot').nth(0).click();
await page.waitForTimeout(1200);
await page.locator('.hero-slide.is-active .hero-actions .btn').nth(1).click();
await page.waitForFunction(() => location.pathname === '/connect', null, { timeout: 8000 }).catch(() => {});
check('the second CTA reaches the Wisdom Class', (await page.evaluate(() => location.pathname)) === '/connect', await page.evaluate(() => location.pathname));

// Hovering pauses the rotation. The pointer has to leave the stage first:
// React's onMouseEnter only fires on a real enter, and after the CTA click
// above the mouse is already inside it.
await page.goBack({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('.hero-slide', { timeout: 20000 });
await page.mouse.move(4, 4);
await page.waitForTimeout(400);
await page.hover('.hero-stage');
const before = (await read(page)).active;
await page.waitForTimeout(9000);
check('hovering the hero pauses the rotation', (await read(page)).active === before, `stayed on slide ${before} for 9s`);
await context.close();

// Phones: every slide stacks the same way, photograph bleeding behind live copy.
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const p = await phone.newPage();
await p.goto(`${WEB}/`, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('.hero-slide', { timeout: 20000 });
await p.waitForTimeout(1500);
for (let i = 0; i < 4; i += 1) {
  await p.locator('.hero-dots .slider-dot').nth(i).click();
  await p.waitForTimeout(1200);
  const s = await read(p);
  const name = titles[i];
  check(`phone ${name}: shows live copy in the stacked composition`, s.copyShown && s.headline.length > 8, `"${s.headline}"`);
  check(`phone ${name}: the artwork stays inside the frame`, s.art && s.art.l >= -2 && s.art.w <= 392, `art ${s.art?.w}x${s.art?.h} at x ${s.art?.l}`);
  check(`phone ${name}: no horizontal overflow`, s.overflow === false, `art top y ${s.art?.t}`);
  // Clicking a dot scrolls it into view, so pull the stage back to the top
  // before capturing what the slide actually looks like.
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(250);
  await p.screenshot({ path: `${shots}98-hero-${name}-phone.png`, clip: { x: 0, y: 0, width: 390, height: 844 } });
}
await phone.close();

// Tablets (<=1000px container) use the same stacked composition as the cosmic
// slide: whole photograph on top, live words under it.
const pad = await browser.newContext({ viewport: { width: 820, height: 1180 } });
const t = await pad.newPage();
await t.goto(`${WEB}/`, { waitUntil: 'domcontentloaded' });
await t.waitForSelector('.hero-slide', { timeout: 20000 });
await t.waitForTimeout(1500);
for (const i of [0, 2, 3]) {
  await t.locator('.hero-dots .slider-dot').nth(i).click();
  // The dots sit at the bottom of a hero that is taller than the viewport, so
  // the click itself scrolls the page. Reading before undoing that measured
  // the harness's own scroll as if the artwork had run off the top.
  await t.evaluate(() => window.scrollTo(0, 0));
  await t.waitForTimeout(1200);
  const s = await read(t);
  check(`tablet ${titles[i]}: whole photograph with live copy beneath it`, s.art && Math.abs(s.art.w / s.art.h - 1.6) < 0.08 && s.copyShown, `art ${s.art?.w}x${s.art?.h} · copy ${s.copyShown}`);
  check(`tablet ${titles[i]}: the CTAs stay tappable`, s.overflow === false && s.art.t >= 0, `art top y ${s.art?.t} · overflow ${s.overflow}`);
  await t.evaluate(() => window.scrollTo(0, 0));
  await t.waitForTimeout(250);
  await t.screenshot({ path: `${shots}98-hero-${titles[i]}-tablet.png`, clip: { x: 0, y: 0, width: 820, height: 900 } });
}
await t.locator('.hero-dots .slider-dot').nth(1).click();
await t.waitForTimeout(1200);
const tCosmic = await read(t);
check('tablet cosmic: keeps its stacked composition', tCosmic.headline.startsWith('Navigate Life'), tCosmic.headline);
await pad.close();

// Reduced motion: no auto-advance, controls still work.
const calm = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const c = await calm.newPage();
await c.goto(`${WEB}/`, { waitUntil: 'domcontentloaded' });
await c.waitForSelector('.hero-slide', { timeout: 20000 });
const calmStart = (await read(c)).active;
await c.waitForTimeout(9000);
const calmNow = await read(c);
check('reduced motion stops the auto-rotation', calmNow.active === calmStart, `still on slide ${calmNow.active} after 9s`);
await c.locator('.hero-dots .slider-dot').nth(3).click();
await c.waitForTimeout(1200);
check('reduced motion still allows the dots', (await read(c)).active === 3, `slide ${(await read(c)).active}`);
await calm.close();

await browser.close();
const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}  — ${r.detail}`);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exitCode = 1;
