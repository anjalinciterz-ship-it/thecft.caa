// Hero animation checks: the word reveal must replay every time a slide takes
// the stage (it used to run once at page load, while the slide was still
// hidden), and since 2026-11-06 all four slides are composed the same way: a
// text-free photograph filling the frame with live words over it. This also
// measures the scrim, so the copy side stays dark enough to read while the
// subject side keeps the photograph's own light.
import { chromium } from 'playwright';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const WEB = process.env.CFT_WEB || 'http://127.0.0.1:4181';
const shots = fileURLToPath(new URL('./shots/', import.meta.url));
const results = [];
const check = (name, pass, detail) => results.push({ name, pass, detail });
const titles = ['guidance', 'cosmic', 'lake', 'path'];
const STAGE = { width: 1440, height: 680 };

const probe = () => {
  const slides = [...document.querySelectorAll('.hero-slide')];
  const idx = slides.findIndex((s) => s.classList.contains('is-active'));
  const slide = slides[idx];
  const visible = (el) => !!(el && el.offsetParent !== null);

  const tokens = [...slide.querySelectorAll('.te-t')].filter(visible);
  const tokenAnims = tokens.flatMap((t) => t.getAnimations());
  const times = tokenAnims.map((a) => a.currentTime ?? -1);
  const art = slide.querySelector('.hero-art');

  return {
    idx,
    keys: slides.map((s) => s.querySelector('.hero-art')?.getAttribute('src') || '?'),
    tokenCount: tokens.length,
    running: tokenAnims.filter((a) => a.playState === 'running').length,
    // The stagger tops out around 2.9s, so a fresh run always starts near zero.
    maxTime: times.length ? Math.round(Math.max(...times)) : null,
    allOpaque: tokens.length > 0 && tokens.every((t) => +getComputedStyle(t).opacity === 1),
    anyHidden: tokens.some((t) => +getComputedStyle(t).opacity < 0.5),
    artTransform: art ? getComputedStyle(art).transform : null,
    veilShown: visible(slide.querySelector('.hero-veil')),
    copyShown: visible(slide.querySelector('.hero-copy')),
    extrasShown: visible(slide.querySelector('.hero-cred')),
    zones: slide.querySelectorAll('.hero-zone').length,
    headline: (slide.querySelector('.hero-copy h1')?.textContent || '').trim().slice(0, 34),
    // Where the photograph and the words actually sit, as % of the slide.
    boxes: (() => {
      const sr = slide.getBoundingClientRect();
      const rect = (sel) => {
        const el = slide.querySelector(sel);
        if (!el || !visible(el)) return null;
        const r = el.getBoundingClientRect();
        return { l: +((r.left - sr.left) / sr.width * 100).toFixed(1), r: +((r.right - sr.left) / sr.width * 100).toFixed(1), b: +((r.bottom - sr.top) / sr.height * 100).toFixed(1) };
      };
      return { copy: rect('.hero-copy'), photo: rect('.hero-art') };
    })(),
  };
};

// Luminance of a band of the finished slide: the mean says whether white text
// will read over the copy side, the spread says whether the photograph is still
// being shown on the subject side rather than buried under a panel.
const band = async (page, x, width) => {
  const buf = await page.screenshot({ clip: { x, y: 70, width, height: 520 } });
  const { channels } = await sharp(buf).grayscale().stats();
  return { mean: Math.round((channels[0].mean / 255) * 100), spread: Math.round(channels[0].stdev) };
};

const dot = (page, i) => page.locator('.hero-dots .slider-dot').nth(i).click();
const settle = (page, ms = 4200) => page.waitForTimeout(ms);

const browser = await chromium.launch({ channel: 'msedge' });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(`${WEB}/`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.hero-stage .hero-slide', { timeout: 20000 });
await page.mouse.move(4, 4);
await page.waitForTimeout(250);

// 1. First paint: the opening slide animates as it arrives.
const open = await page.evaluate(probe);
check('the opening slide animates on load', open.idx === 0 && open.running > 0, `${titles[open.idx]} · ${open.running}/${open.tokenCount} tokens running at ${open.maxTime}ms`);

// 2. Cosmic slide: the word reveal plays when it takes the stage.
await dot(page, 1);
await page.waitForTimeout(350);
const cosmicEarly = await page.evaluate(probe);
check('the cosmic slide starts its word reveal on activation', cosmicEarly.idx === 1 && cosmicEarly.running > 0 && cosmicEarly.maxTime < 1200, `${cosmicEarly.running}/${cosmicEarly.tokenCount} tokens running, up to ${cosmicEarly.maxTime}ms in`);
await page.screenshot({ path: `${shots}99-anim-cosmic-mid.png`, clip: { x: 0, y: 0, width: STAGE.width, height: STAGE.height } });
await settle(page);
const cosmicLate = await page.evaluate(probe);
check('the cosmic reveal finishes with every word readable', cosmicLate.allOpaque && cosmicLate.anyHidden === false, `${cosmicLate.tokenCount} tokens, all opaque ${cosmicLate.allOpaque}`);
await page.screenshot({ path: `${shots}99-anim-cosmic-settled.png`, clip: { x: 0, y: 0, width: STAGE.width, height: STAGE.height } });

// 3. Same slide again: the reveal restarts instead of staying finished.
await dot(page, 0);
await page.waitForTimeout(1400);
await dot(page, 1);
await page.waitForTimeout(300);
const replay = await page.evaluate(probe);
check('revisiting a slide restarts its reveal', replay.idx === 1 && replay.running > 0 && replay.maxTime < 900, `max ${replay.maxTime}ms into the stagger on the second visit`);

// 4. Every slide in turn: the same reveal, no matter what is behind it.
for (const i of [2, 3, 0]) {
  await dot(page, i);
  await page.waitForTimeout(350);
  const s = await page.evaluate(probe);
  check(`slide ${i + 1} (${titles[i]}) animates as it becomes active`, s.running > 0 && s.maxTime < 1200 && s.idx === i, `${s.running}/${s.tokenCount} tokens running at up to ${s.maxTime}ms`);
  await settle(page);
  const done = await page.evaluate(probe);
  check(`slide ${i + 1} (${titles[i]}) ends with every word readable`, done.allOpaque && done.anyHidden === false, `${done.tokenCount} tokens, all opaque ${done.allOpaque}`);
  await page.screenshot({ path: `${shots}99-anim-${titles[i]}-settled.png`, clip: { x: 0, y: 0, width: STAGE.width, height: STAGE.height } });
}

// 5. Auto-rotation (no clicking) has to animate too, not just the dots.
await dot(page, 0);
// The dot click leaves the pointer inside the stage, which pauses the rotation,
// so it has to move off before auto-advance can be observed.
await page.mouse.move(4, 4);
let flipped = -1;
for (let waited = 0; waited < 9000 && flipped < 0; waited += 200) {
  await page.waitForTimeout(200);
  const now = await page.evaluate(() => [...document.querySelectorAll('.hero-slide')].findIndex((s) => s.classList.contains('is-active')));
  if (now !== 0) flipped = now;
}
await page.waitForTimeout(120);
const auto = await page.evaluate(probe);
check('auto-rotation animates the slide it lands on', auto.idx === flipped && auto.running > 0, `landed on ${titles[auto.idx]} and caught ${auto.running}/${auto.tokenCount} tokens at ${auto.maxTime}ms`);

// 6. Desktop photographs: full-bleed, live words over them, no hotspot layer,
//    and a scrim that darkens the copy without burying the subject.
for (const i of [0, 2, 3]) {
  await dot(page, i);
  await page.waitForTimeout(350);
  const live = await page.evaluate(probe);
  check(`${titles[i]}: copy is live text over the photo and animates`, live.copyShown && live.running > 0, `copy shown ${live.copyShown} · ${live.running}/${live.tokenCount} tokens running · "${live.headline}"`);
  check(`${titles[i]}: the photograph fills the frame`, live.boxes.photo && live.boxes.photo.l < 0.6 && live.boxes.photo.r > 99.4, `photo spans ${live.boxes.photo?.l}%–${live.boxes.photo?.r}%`);
  check(`${titles[i]}: no hotspot links are left over the artwork`, live.zones === 0 && live.veilShown, `hotspots ${live.zones} · veil shown ${live.veilShown}`);
  await page.screenshot({ path: `${shots}99-live-${titles[i]}-mid.png`, clip: { x: 0, y: 0, width: STAGE.width, height: STAGE.height } });
  await settle(page);
  const s = await page.evaluate(probe);
  check(`${titles[i]}: every word ends up readable`, s.allOpaque, `${s.tokenCount} tokens, all opaque ${s.allOpaque}`);
  const copyBand = await band(page, 80, 700);
  const subjectBand = await band(page, 900, 540);
  check(`${titles[i]}: the copy side is dark enough for white text`, copyBand.mean < 90, `mean luminance ${copyBand.mean}`);
  check(`${titles[i]}: the subject side still shows the photograph`, subjectBand.spread > 40, `luminance spread ${subjectBand.spread} around mean ${subjectBand.mean}`);
  await page.screenshot({ path: `${shots}99-live-${titles[i]}.png`, clip: { x: 0, y: 0, width: STAGE.width, height: STAGE.height } });
}

// 7. The cosmic slide keeps its own composition: cred, wisdom card and quote.
await dot(page, 1);
await settle(page);
const cosmic = await page.evaluate(probe);
check('the cosmic slide still carries its cred, card and quote', cosmic.extrasShown && cosmic.copyShown, `cred ${cosmic.extrasShown} · copy ${cosmic.copyShown}`);
await context.close();

// 8. Phones re-type every slide's words, so those animate as well.
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const p = await phone.newPage();
await p.goto(`${WEB}/`, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('.hero-slide', { timeout: 20000 });
await p.waitForTimeout(600);
for (const i of [2, 3]) {
  await p.locator('.hero-dots .slider-dot').nth(i).click();
  // There is no hover on a phone, so focus a CTA instead: that pauses the
  // rotation the same way and keeps the slide on screen while it settles.
  await p.locator('.hero-slide.is-active .hero-actions .btn').first().focus();
  await p.waitForTimeout(350);
  const s = await p.evaluate(probe);
  check(`phone ${titles[i]}: re-typed words animate on arrival`, s.idx === i && s.running > 0 && s.maxTime < 1200, `${s.running}/${s.tokenCount} tokens running, up to ${s.maxTime}ms`);
  await p.waitForTimeout(4200);
  const done = await p.evaluate(probe);
  check(`phone ${titles[i]}: every word ends up readable`, done.allOpaque, `${done.tokenCount} tokens opaque ${done.allOpaque}`);
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(250);
  await p.screenshot({ path: `${shots}99-anim-${titles[i]}-phone.png`, clip: { x: 0, y: 0, width: 390, height: 844 } });
}
await phone.close();

// 9. Reduced motion: nothing animates and nothing is left invisible.
const calm = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const c = await calm.newPage();
await c.goto(`${WEB}/`, { waitUntil: 'domcontentloaded' });
await c.waitForSelector('.hero-slide', { timeout: 20000 });
await c.waitForTimeout(400);
const calmOpen = await c.evaluate(probe);
check('reduced motion still shows the photo slide copy', calmOpen.copyShown && calmOpen.running === 0 && calmOpen.allOpaque, `copy shown ${calmOpen.copyShown} · ${calmOpen.tokenCount} tokens opaque ${calmOpen.allOpaque}`);
await c.locator('.hero-dots .slider-dot').nth(1).click();
await c.waitForTimeout(600);
const calmCosmic = await c.evaluate(probe);
check('reduced motion still shows every cosmic word', calmCosmic.running === 0 && calmCosmic.allOpaque, `${calmCosmic.running} running · ${calmCosmic.tokenCount} tokens opaque ${calmCosmic.allOpaque}`);
await c.locator('.hero-dots .slider-dot').nth(3).click();
await c.waitForTimeout(600);
const calmPath = await c.evaluate(probe);
check('reduced motion leaves the artwork untransformed', calmPath.running === 0 && calmPath.allOpaque && ['none', 'matrix(1, 0, 0, 1, 0, 0)'].includes(calmPath.artTransform), `transform ${calmPath.artTransform} · opaque ${calmPath.allOpaque}`);
await calm.close();

check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | ') || 'clean');

await browser.close();
const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}  — ${r.detail}`);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exitCode = 1;
