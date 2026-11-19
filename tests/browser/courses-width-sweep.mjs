/* Sweeps the /courses showcase rows across desktop widths and reports, per row,
   the banner box and whether the CTA row under the description still fits on
   one line. The banners are never cropped, so any height change here comes from
   the column, not from slicing the artwork. Run with:
   node tests/browser/courses-width-sweep.mjs */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const WEB = process.env.CFT_WEB || 'http://127.0.0.1:5180';
const WIDTHS = [1600, 1440, 1300, 1240, 1180, 1120, 1050, 980, 900, 760, 620, 480, 390];

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${WEB}/courses#programs`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 500) {
    window.scrollTo({ top: y, behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 100));
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
});
await page.waitForTimeout(1500);

const results = [];
for (const width of WIDTHS) {
  await page.setViewportSize({ width, height: 900 });
  await page.waitForTimeout(700);
  const info = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.cq-show')].map((sec) => {
      const img = sec.querySelector('img.cq-art');
      const cta = sec.querySelector('.cq-show-cta');
      const body = sec.querySelector('.cq-show-body');
      const r = img.getBoundingClientRect();
      const natural = img.naturalWidth / img.naturalHeight;
      const drawn = r.width / r.height;
      return {
        art: `${Math.round(r.width)}x${Math.round(r.height)}`,
        h: Math.round(r.height),
        cropped: Math.abs(drawn - natural) / natural > 0.01,
        wrapped: cta.getBoundingClientRect().height > 60,
        bodyW: Math.round(body.getBoundingClientRect().width),
        overflowX: [...body.querySelectorAll('*')].some((el) => el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== 'hidden' && el.children.length === 0)
      };
    });
    return {
      rows,
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      minBody: Math.min(...rows.map((r) => r.bodyW)),
      minArtH: Math.min(...rows.map((r) => r.h)),
      maxArtH: Math.max(...rows.map((r) => r.h))
    };
  });
  results.push({ width, ...info, uniform: r(info), r });
}

// The five banner files differ in aspect ratio by ~0.2%, so equal columns give
// heights that differ by a pixel; only a real spread is worth reporting.
function r(info) {
  return info.maxArtH - info.minArtH <= 2;
}

console.log('width  art heights (5 rows)          uniform  cropped  CTA wraps  narrowest body  page overflow');
for (const row of results) {
  console.log(
    `${String(row.width).padEnd(7)} ${row.rows.map((x) => x.art).join(' ').padEnd(34)} ${row.uniform ? 'yes    ' : `NO (${row.minArtH}-${row.maxArtH})`} ${row.rows.some((x) => x.cropped) ? 'YES     ' : 'no      '} ${row.rows.map((x) => (x.wrapped ? 'Y' : '.')).join('')}          ${String(row.minBody).padEnd(5)} ${row.pageOverflow ? 'YES' : 'no'}`
  );
}

const stacked = (w) => w <= 1080;
const bad = results.filter((x) => x.rows.some((y) => y.cropped) || x.pageOverflow || x.rows.some((y) => y.overflowX) || (!stacked(x.width) && x.rows.some((y) => y.wrapped)));
console.log(`\n${results.length - bad.length}/${results.length} widths clean`);
if (bad.length) console.log(bad.map((b) => `${b.width}px: ${b.rows.map((x) => `${x.art}${x.wrapped ? ' wrapped' : ''}${x.cropped ? ' cropped' : ''}${x.overflowX ? ' clipped' : ''}`).join(' ')}`).join('\n'));

await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(here, 'shots', 'courses-art-final.png'), fullPage: true });

await browser.close();
process.exit(bad.length ? 1 : 0);
