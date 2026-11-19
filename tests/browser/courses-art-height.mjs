/* Measures the five /courses showcase banners: what the browser actually lays
   out, and whether the drawn box matches the artwork's own aspect ratio (it
   must, the banners are never cropped). Run before and after a CSS change:
   node tests/browser/courses-art-height.mjs */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const WEB = process.env.CFT_WEB || 'http://127.0.0.1:5180';
const TAG = process.env.CFT_TAG || 'now';

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(`${WEB}/courses#programs`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
// Every banner is lazy below the first fold, so scroll the page to force decode.
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 500) {
    window.scrollTo({ top: y, behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 120));
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
});
await page.waitForTimeout(1500);

const rows = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('.cq-show').forEach((sec) => {
    const img = sec.querySelector('img.cq-art');
    const grid = sec.querySelector('.cq-show-grid');
    const body = sec.querySelector('.cq-show-body');
    const title = sec.querySelector('.cq-show-title');
    const cta = sec.querySelector('.cq-show-cta');
    if (!img) return;
    const r = img.getBoundingClientRect();
    const natural = img.naturalWidth / img.naturalHeight;
    const drawn = r.width / r.height;
    out.push({
      num: (sec.querySelector('.cq-num')?.textContent || '').trim(),
      title: (title?.textContent || '').trim().slice(0, 34),
      artW: Math.round(r.width),
      artH: Math.round(r.height),
      naturalW: img.naturalWidth,
      naturalH: img.naturalHeight,
      cropped: Math.abs(drawn - natural) / natural > 0.01,
      ratio: +drawn.toFixed(3),
      gridW: Math.round(grid.getBoundingClientRect().width),
      artShare: +(r.width / grid.getBoundingClientRect().width).toFixed(3),
      bodyW: Math.round(body.getBoundingClientRect().width),
      ctaWrapped: cta ? Math.round(cta.getBoundingClientRect().height) > 60 : null,
      sectionH: Math.round(sec.getBoundingClientRect().height),
      titleLines: title ? Math.round(title.getBoundingClientRect().height / parseFloat(getComputedStyle(title).lineHeight)) : null
    });
  });
  return out;
});

console.log(`viewport 1440 · tag ${TAG}`);
console.table(rows.map(({ num, title, artW, artH, ratio, cropped, artShare, bodyW, ctaWrapped, sectionH, titleLines }) => ({ num, title, artW, artH, ratio, cropped, artShare, bodyW, ctaWrapped, sectionH, titleLines })));

const tall = rows.reduce((a, b) => (b.artH > a.artH ? b : a), rows[0] || {});
console.log(`tallest banner: ${tall.title} at ${tall.artW}x${tall.artH}`);
console.log(`any cropped: ${rows.some((r) => r.cropped)} · any CTA wrap: ${rows.some((r) => r.ctaWrapped)}`);

await page.screenshot({ path: path.join(here, 'shots', `courses-art-${TAG}.png`), fullPage: true });

await page.setViewportSize({ width: 1920, height: 1080 });
await page.waitForTimeout(900);
const wide = await page.evaluate(() => [...document.querySelectorAll('.cq-show img.cq-art')].map((i) => `${Math.round(i.getBoundingClientRect().width)}x${Math.round(i.getBoundingClientRect().height)}`));
console.log(`viewport 1920: ${wide.join(' · ')}`);

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(900);
const phone = await page.evaluate(() => [...document.querySelectorAll('.cq-show img.cq-art')].map((i) => `${Math.round(i.getBoundingClientRect().width)}x${Math.round(i.getBoundingClientRect().height)}`));
console.log(`phone 390: ${phone.join(' · ')}`);
console.log(`phone overflow: ${await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)}`);

await browser.close();
