// The closing "What you can expect" row now uses the badge art he supplied:
// three loaded seals, their labels only in the art (never doubled as live text),
// and the supporting line still real copy.
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const WEB = process.env.CFT_WEB || 'http://127.0.0.1:4181';
const shots = fileURLToPath(new URL('./shots/', import.meta.url));
const results = [];
const check = (name, pass, detail) => results.push({ name, pass, detail });
const browser = await chromium.launch({ channel: 'msedge' });

const probe = () => {
  const row = document.querySelector('.cx-props');
  const badges = [...row.querySelectorAll('.cx-p-badge')];
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return `${Math.round(r.width)}x${Math.round(r.height)}`;
  };
  return {
    // The old glyph-icon markup must be gone, not merely hidden.
    oldIcons: row.querySelectorAll('.cx-p-ico').length,
    srcs: badges.map((b) => b.getAttribute('src')),
    alts: badges.map((b) => b.getAttribute('alt')),
    loaded: badges.every((b) => b.complete && b.naturalWidth > 0),
    badgeBox: badges.length ? box(badges[0]) : 'none',
    rowBox: box(row),
    // The badge paints its own label, so the live text must carry only the
    // supporting line. Any title found in textContent means it prints twice.
    titlesDoubled: /Personal Growth|Personal Guidance|Meaningful Conversations|A Supportive Community/i.test(
      [...row.querySelectorAll('.cx-p-txt')].map((x) => x.textContent).join(' '),
    ),
    notes: [...row.querySelectorAll('.cx-p-txt')].map((x) => x.textContent.trim()),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
};

const want = ['value-badge-personal-growth.png', 'value-badge-meaningful-conversations.png', 'value-badge-supportive-community.png'];

for (const [label, w, h] of [['1440', 1440, 900], ['390', 390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: label === '390', hasTouch: label === '390' });
  const page = await ctx.newPage();
  await page.goto(`${WEB}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.cx-props .cx-p-badge', { timeout: 20000 });
  await page.locator('.cx-props').scrollIntoViewIfNeeded();
  // The seals are lazy, so scrolling is only step one — wait for the decodes
  // rather than a fixed nap, or a slow frame reads as a broken image.
  await page.waitForFunction(
    () => [...document.querySelectorAll('.cx-props .cx-p-badge')].every((x) => x.complete && x.naturalWidth > 0),
    null,
    { timeout: 15000 },
  ).catch(() => {});
  await page.waitForTimeout(400);
  const s = await page.evaluate(probe);
  check(`${label}: three badges, the glyph icons gone`, s.srcs.length === 3 && s.oldIcons === 0, `${s.srcs.length} badges · ${s.oldIcons} old icons`);
  check(`${label}: his three seals, in order`, s.srcs.every((x, i) => x.endsWith(want[i])), s.srcs.join(' · '));
  check(`${label}: every seal actually loads`, s.loaded, String(s.loaded));
  check(`${label}: the badge label is not doubled as live text`, s.titlesDoubled === false, s.notes.join(' · '));
  check(`${label}: each seal names itself for screen readers`, s.alts.join('|') === 'Personal Growth|Meaningful Conversations|A Supportive Community', s.alts.join(' · '));
  const size = parseInt(s.badgeBox, 10);
  check(`${label}: the seal is big enough to read its own label`, size >= 90, `badge ${s.badgeBox}, row ${s.rowBox}`);
  check(`${label}: no horizontal overflow`, s.overflow === false, String(s.overflow));
  const box = await page.locator('.cx-props').boundingBox();
  await page.screenshot({
    path: `${shots}97-cxprops-${label}.png`,
    clip: { x: 0, y: Math.max(0, box.y - 24), width: w, height: Math.min(box.height + 48, h) },
  });
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}  — ${r.detail}`);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exitCode = 1;
