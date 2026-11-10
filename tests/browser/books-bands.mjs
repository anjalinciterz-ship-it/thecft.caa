// The two bands Vaibhav flagged on /Books (2026-11-06):
//  1. the children's meditation section, rebuilt as his two-part layout with
//     placeholder films (he has not sent the videos yet) and no Walk in the
//     Woods audio anywhere;
//  2. the About the Author paragraph, which was painted in a near-white meant
//     for dark bands and so vanished into the lavender mist.
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const WEB = process.env.CFT_WEB || 'http://127.0.0.1:5180';
const shots = fileURLToPath(new URL('./shots/', import.meta.url));
const results = [];
const check = (name, pass, detail) => results.push({ name, pass, detail });
const browser = await chromium.launch({ channel: 'msedge' });

const probe = () => {
  const parse = (c) => (c.match(/[\d.]+/g) || []).map(Number);
  const lum = (r, g, b) => {
    const f = (v) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  // Text with an alpha channel must be composited over what is actually behind
  // it first — a 72%-opaque near-white measures as nothing otherwise.
  const contrast = (color, bg) => {
    const a = parse(color), b = parse(bg);
    const alpha = a.length > 3 ? a[3] : 1;
    const mix = [0, 1, 2].map((i) => Math.round(a[i] * alpha + b[i] * (1 - alpha)));
    const l1 = lum(...mix), l2 = lum(...b);
    return Number(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2));
  };
  const behind = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const c = getComputedStyle(n).backgroundColor;
      if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c;
    }
    return 'rgb(255,255,255)';
  };
  const rect = (el) => {
    const r = el.getBoundingClientRect();
    return `${Math.round(r.width)}x${Math.round(r.height)}`;
  };

  const band = document.querySelector('.kids-meditation');
  const parts = [...document.querySelectorAll('.km-part')];
  const author = document.querySelector('.author-card p');

  return {
    eyebrow: (band?.querySelector('.cq-eyebrow')?.textContent || '').trim(),
    title: (band?.querySelector('.cq-h2')?.textContent || '').trim(),
    nums: parts.map((p) => (p.querySelector('.km-num')?.textContent || '').trim()),
    tags: parts.map((p) => (p.querySelector('.km-tag')?.textContent || '').trim()),
    headings: parts.map((p) => (p.querySelector('.km-part-title')?.textContent || '').trim()),
    // Stacked, not side-by-side: each part should own the width of the column.
    widths: parts.map((p) => rect(p.querySelector('.video-slot'))),
    stacked: parts.length === 2 && parts[1].getBoundingClientRect().top > parts[0].getBoundingClientRect().bottom,
    slots: parts.filter((p) => p.querySelector('.video-slot.is-empty')).length,
    // A placeholder must not leave a broken <video> pointing at a missing file.
    videos: document.querySelectorAll('.kids-meditation video').length,
    walkAudio: /walk in the woods/i.test(document.body.innerText),
    audioPlayers: document.querySelectorAll('.kids-meditation audio').length,
    authorColor: author ? getComputedStyle(author).color : 'none',
    authorContrast: author ? contrast(getComputedStyle(author).color, behind(author)) : 0,
    authorText: (author?.textContent || '').trim().slice(0, 42),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
};

for (const [label, w, h] of [['1440', 1440, 900], ['390', 390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: label === '390', hasTouch: label === '390' });
  const page = await ctx.newPage();
  await page.goto(`${WEB}/books`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.kids-meditation .km-part', { timeout: 20000 });
  await page.locator('.kids-meditation').scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  const s = await page.evaluate(probe);

  check(`${label}: the section is his two-part kids meditation`, s.eyebrow === 'A Special Meditation Experience' && s.title === 'A Kids Meditation by Zalah', `${s.eyebrow} / ${s.title}`);
  check(`${label}: Part 1 carries his "must watch" pill, Part 2 stays plain`, s.nums.join(',') === '01,02' && s.tags[0] === 'Must watch before meditating' && s.tags[1] === '', `${s.nums.join(',')} · ${JSON.stringify(s.tags)}`);
  check(`${label}: headings read as his screenshot`, s.headings.join(' | ') === 'Part 1: Introduction to the Meditation | Part 2: Start Your Meditation', s.headings.join(' | '));
  check(`${label}: the parts stack, each film full column width`, s.stacked && s.widths[0] === s.widths[1], s.widths.join(' vs '));
  check(`${label}: both films are placeholders, no broken players`, s.slots === 2 && s.videos === 0, `${s.slots} placeholders · ${s.videos} <video>`);
  check(`${label}: Walk in the Woods audio is gone`, s.walkAudio === false && s.audioPlayers === 0, `text ${s.walkAudio} · audio tags ${s.audioPlayers}`);
  check(`${label}: About the Author paragraph is readable`, s.authorContrast >= 4.5, `${s.authorColor} on the band = ${s.authorContrast}:1 · "${s.authorText}"`);
  check(`${label}: no horizontal overflow`, s.overflow === false, String(s.overflow));

  for (const [name, sel] of [['meditation', '.kids-meditation'], ['author', '.author-card']]) {
    const el = page.locator(sel).first();
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await el.screenshot({ path: `${shots}96-books-${name}-${label}.png` });
  }
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}  — ${r.detail}`);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exitCode = 1;
