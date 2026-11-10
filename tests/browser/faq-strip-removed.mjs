// The three-item value row under the Home FAQ band is gone, and nothing around
// it broke: the accordion, the Visit-The-FAQ-Page button and the band's spacing.
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const WEB = process.env.CFT_WEB || 'http://127.0.0.1:4181';
const shots = fileURLToPath(new URL('./shots/', import.meta.url));
const results = [];
const check = (name, pass, detail) => results.push({ name, pass, detail });
const browser = await chromium.launch({ channel: 'msedge' });

const probe = () => {
  const band = document.querySelector('.faq-band');
  const list = band?.querySelector('.faq-list');
  const btn = band?.querySelector('.faq-all');
  const r = (el) => (el ? el.getBoundingClientRect() : null);
  return {
    band: !!band,
    foot: !!band?.querySelector('.faq-foot'),
    stripText: (band?.textContent || '').includes('For Your Journey')
      || (band?.textContent || '').includes('You Can Trust'),
    items: band?.querySelectorAll('.faq-item').length || 0,
    firstQ: (band?.querySelector('.faq-q')?.textContent || '').trim().slice(0, 40),
    btn: !!btn && btn.offsetHeight > 20,
    btnHref: btn?.getAttribute('href'),
    // The last painted thing in the band must be the button, with real space
    // below it — a band that collapsed its bottom padding would read as broken.
    gapBelow: band && r(list) ? Math.round(r(band).bottom - r(btn).bottom) : -1,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
};

for (const [label, w, h] of [['1440', 1440, 900], ['390', 390, 844]]) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    isMobile: label === '390',
    hasTouch: label === '390',
  });
  const page = await ctx.newPage();
  await page.goto(`${WEB}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.faq-band .faq-item', { timeout: 20000 });
  await page.locator('.faq-band').scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  const s = await page.evaluate(probe);
  check(`${label}: value row removed from the FAQ band`, s.foot === false && s.stripText === false, `faq-foot ${s.foot} · strip copy ${s.stripText}`);
  check(`${label}: FAQ accordion and its questions survive`, s.items > 0 && s.firstQ.length > 8, `${s.items} items · "${s.firstQ}"`);
  check(`${label}: Visit The FAQ Page button still there`, s.btn && s.btnHref === '/faq', `${s.btn} → ${s.btnHref}`);
  check(`${label}: band keeps space below the button`, s.gapBelow > 24, `${s.gapBelow}px below the button`);
  check(`${label}: no horizontal overflow`, s.overflow === false, String(s.overflow));
  const band = await page.locator('.faq-band').boundingBox();
  await page.screenshot({
    path: `${shots}99-faq-${label}.png`,
    clip: { x: 0, y: Math.max(0, band.y), width: w, height: Math.min(band.height, 1600) },
  });
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}  — ${r.detail}`);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exitCode = 1;
