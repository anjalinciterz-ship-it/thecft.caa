/* His complaint was structural, so this harness measures structure:
   1. the photograph is an absolutely positioned layer that covers the whole
      frame (it is never a block in the document flow under the copy),
   2. all four slides measure the SAME height at the same viewport,
   3. nothing in the slide spills past the frame,
   4. the words sit on pixels dark enough to read.
   Run after `npm run build`. One server-owning harness at a time. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dist = path.join(root, 'dist');
const shots = path.join(root, 'tests', 'browser', 'shots', 'hero-layers');
const PORT = Number(process.env.CFT_HERO_PORT || 4181);
const WEB = `http://127.0.0.1:${PORT}`;
fs.mkdirSync(shots, { recursive: true });

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const pick = (p) => (fs.existsSync(p) && fs.statSync(p).isFile() ? p : null);
  const file =
    pick(path.join(dist, urlPath)) ||
    (path.extname(urlPath) ? null : pick(path.join(dist, 'index.html'))) ||
    pick(path.join(dist, urlPath, 'index.html'));
  if (!file) {
    res.writeHead(404).end('nope');
    return;
  }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

let pass = 0;
let fail = 0;
const check = (label, ok, detail = '') => {
  if (ok) pass += 1;
  else fail += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  [${detail}]` : ''}`);
};

// Phone, tablet and the desktop break he listed, plus one tall desktop.
const VIEWPORTS = [
  { w: 320, h: 700 }, { w: 360, h: 800 }, { w: 375, h: 812 }, { w: 390, h: 844 },
  { w: 414, h: 896 }, { w: 430, h: 932 }, { w: 768, h: 1024 }, { w: 820, h: 1180 },
  { w: 912, h: 1366 }, { w: 1024, h: 768 }, { w: 1440, h: 900 },
];
const KEYS = ['guidance', 'cosmic', 'lake', 'path'];
const CONTENT = '.hero-eyebrow,.hero-copy h1,.hero-lead,.hero-actions,.hero-features,.hero-cred,.hero-note,.hero-quote,.hero-planks,.hero-footnote';

/* Everything about one slide, in page pixels. */
const measure = (page) =>
  page.evaluate((SEL) => {
    const stage = document.querySelector('.hero-stage');
    const active = document.querySelector('.hero-slide.is-active');
    const r = (el) => {
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height, top: b.top, bottom: b.bottom, left: b.left, right: b.right };
    };
    const art = active.querySelector('.hero-art');
    // The frame is a <picture> now, so the file, its fit and its position live
    // on the img inside it.
    const artImg = active.querySelector('.hero-art img') || art;
    const portrait = active.querySelector('.hero-portrait');
    const veil = active.querySelector('.hero-veil');
    const pieces = active.querySelector('.hero-pieces');
    const dots = document.querySelector('.hero-dots');
    const boxes = [...active.querySelectorAll(SEL)].map((el) => ({ sel: el.className.split(' ')[0] || el.tagName, ...r(el) }));
    const cs = getComputedStyle(art);
    const stageCS = getComputedStyle(stage);
    return {
      key: active.dataset.slide,
      stage: r(stage),
      stageH: r(stage).h,
      slide: r(active),
      art: { ...r(art), position: cs.position, fit: getComputedStyle(artImg).objectFit, pos: getComputedStyle(artImg).objectPosition, nw: artImg.naturalWidth, nh: artImg.naturalHeight },
      portrait: portrait ? r(portrait) : null,
      veil: { display: getComputedStyle(veil).display, bg: getComputedStyle(veil).backgroundImage.slice(0, 60) },
      pieces: pieces ? { ...r(pieces), display: getComputedStyle(pieces).display } : null,
      dots: r(dots),
      boxes,
      contentTop: Math.min(...boxes.map((b) => b.top)),
      contentBottom: Math.max(...boxes.map((b) => b.bottom)),
      docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      stageRatio: stageCS.aspectRatio,
      // Where the words actually sit, for the legibility pass, with the colour
      // they are painted in: a 55% alpha tagline is not the cream it names.
      text: {
        h1: { ...r(active.querySelector('.hero-copy h1')), c: getComputedStyle(active.querySelector('.hero-copy h1')).color },
        lead: { ...r(active.querySelector('.hero-lead')), c: getComputedStyle(active.querySelector('.hero-lead')).color },
        actions: r(active.querySelector('.hero-actions')),
        footnote: { ...r(active.querySelector('.hero-footnote')), c: getComputedStyle(active.querySelector('.hero-footnote')).color },
      },
    };
  }, CONTENT);

const lum = (px) => {
  const s = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * s(px[0] / 255) + 0.7152 * s(px[1] / 255) + 0.0722 * s(px[2] / 255);
};
const ratio = (a, b) => {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
};

/* The pixels behind a text block, with the words themselves hidden, so the
   number is the artwork plus its scrim rather than the ink. */
async function bgUnder(page, box) {
  const tag = await page.addStyleTag({ content: '.hero-copy,.hero-planks,.hero-pieces,.hero-dots{visibility:hidden!important}' });
  const buf = await page.screenshot({
    clip: { x: Math.max(0, box.x), y: Math.max(0, box.y), width: Math.max(4, box.w), height: Math.max(4, box.h) },
  });
  await tag.evaluate((el) => el.remove());
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const px = [];
  for (let i = 0; i < data.length; i += info.channels) px.push([data[i], data[i + 1], data[i + 2]]);
  const ranked = px.map((p, i) => [lum(p), i]).sort((a, b) => a[0] - b[0]);
  const at = (p) => ranked[Math.min(ranked.length - 1, Math.floor(ranked.length * p))];
  return { p10: at(0.1)[0], p50: at(0.5)[0], p90: at(0.9)[0], rgb90: px[at(0.9)[1]] };
}

/* The glyph is painted with its own alpha over the brightest pixels it lands
   on, and that rendered colour is what the eye compares. */
const inkOver = (cssColor, bgRgb) => {
  const [r, g, b, a = 1] = cssColor.match(/[\d.]+/g).map(Number);
  return lum([a * r + (1 - a) * bgRgb[0], a * g + (1 - a) * bgRgb[1], a * b + (1 - a) * bgRgb[2]]);
};

let crashed = null;
try {
  await new Promise((res) => server.listen(PORT, '127.0.0.1', res));
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage();

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.goto(`${WEB}/`, { waitUntil: 'load' });
    await page.waitForSelector('.hero-stage');
    // Hovering the stage pauses the 4s rotation so the slide under test stays.
    await page.mouse.move(Math.round(vp.w / 2), Math.round(vp.h / 2));
    const tag = `${vp.w}x${vp.h}`;
    const results = [];
    for (let i = 0; i < KEYS.length; i += 1) {
      await page.locator('.hero-dots .slider-dot').nth(i).click();
      await page.waitForTimeout(1300);
      const m = await measure(page);
      results.push(m);

      // 1. the background layer
      check(`${tag} ${m.key}: art is an absolute layer`, m.art.position === 'absolute', m.art.position);
      check(
        `${tag} ${m.key}: art covers the frame`,
        m.art.top <= m.stage.top + 1 && m.art.bottom >= m.stage.bottom - 1 &&
          m.art.left <= m.stage.left + 1 && m.art.right >= m.stage.right - 1,
        `art ${Math.round(m.art.top)}-${Math.round(m.art.bottom)} vs frame ${Math.round(m.stage.top)}-${Math.round(m.stage.bottom)}`,
      );
      check(`${tag} ${m.key}: art is not in the flow`, !(m.art.top > m.stage.top + 2 && m.art.h < m.stage.h - 2));
      check(`${tag} ${m.key}: scrim painted`, m.veil.display !== 'none' && /gradient/.test(m.veil.bg), m.veil.bg.slice(0, 26));
      // 3. nothing spills
      check(
        `${tag} ${m.key}: content fits the frame`,
        m.contentBottom <= m.slide.bottom + 1 && m.contentTop >= m.slide.top - 1,
        `content ${Math.round(m.contentTop)}-${Math.round(m.contentBottom)} in ${Math.round(m.slide.top)}-${Math.round(m.slide.bottom)}`,
      );
      check(`${tag} ${m.key}: buttons inside`, m.text.actions.bottom <= m.slide.bottom - 8, `btn bottom ${Math.round(m.text.actions.bottom)}`);
      check(`${tag} ${m.key}: no sideways overflow`, m.docOverflow <= 0, `overflow ${m.docOverflow}px`);
      if (m.pieces && m.pieces.display !== 'contents') {
        check(
          `${tag} ${m.key}: cards inside the frame`,
          m.pieces.bottom <= m.slide.bottom - 6 && m.pieces.top >= m.slide.top,
          `pieces ${Math.round(m.pieces.top)}-${Math.round(m.pieces.bottom)}`,
        );
      }
      if (i === 0 || vp.w <= 430 || (vp.w >= 768 && vp.w <= 912)) {
        await page.screenshot({ path: path.join(shots, `${tag}-${m.key}.png`) });
      }
    }
    // 2. one shared height
    const heights = results.map((r) => Math.round(r.stageH * 10) / 10);
    const spread = Math.max(...heights) - Math.min(...heights);
    check(`${tag}: all four slides share one height`, spread <= 1, heights.join(' / '));
    const floor = vp.w <= 700 ? 760 : vp.w <= 1000 ? 800 : 0;
    if (floor) check(`${tag}: height respects the ${floor}px floor`, heights[0] >= floor - 1, `${heights[0]}px`);
    const cap = vp.w > 700 && vp.w <= 1000 ? 900 : 0;
    if (cap) check(`${tag}: tablet height capped at ${cap}px`, heights[0] <= cap + 1, `${heights[0]}px`);

    // 4. legibility of the words over the artwork
    if ([320, 390, 430, 820, 1440].includes(vp.w)) {
      const vh = page.viewportSize().height;
      for (let i = 0; i < KEYS.length; i += 1) {
        await page.locator('.hero-dots .slider-dot').nth(i).click();
        await page.waitForTimeout(700);
        const m = results[i];
        for (const name of ['h1', 'lead', 'footnote']) {
          const box = m.text[name];
          if (box.h < 6) continue;
          // A 320x700 phone shows the hero taller than its own screen, so the
          // blocks below the fold are measured on the next size up instead.
          if (box.top < 0 || box.bottom > vh - 2) {
            console.log(`SKIP  ${tag} ${m.key}: ${name} below the fold`);
            continue;
          }
          const bg = await bgUnder(page, box);
          const worst = [bg.p10, bg.p50, bg.p90]
            .map((l) => ratio(inkOver(box.c, bg.rgb90), l))
            .sort((a, b) => a - b)[0];
          check(`${tag} ${m.key}: ${name} readable`, worst >= 3.4, `${worst.toFixed(2)}:1 (bg L ${bg.p10.toFixed(3)}-${bg.p90.toFixed(3)}, ${box.c})`);
        }
      }
    }
    console.log(`${tag} heights: ${heights.join(' / ')}  stage ratio: ${results[0].stageRatio}`);
  }

  // Desktop keeps the composition he approved: the image's own box, no crop.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${WEB}/`, { waitUntil: 'load' });
  await page.waitForSelector('.hero-stage');
  const d = await measure(page);
  check('desktop: stage keeps its 1824/862 box', Math.abs(d.stageH - (d.stage.w * 862) / 1824) < 2, `${Math.round(d.stageH)}px`);
  check('desktop: guidance slice is uncropped', d.art.nw / d.art.nh > 2 && Math.abs(d.art.h - d.stage.h) < 1, `${d.art.nw}x${d.art.nh}`);

  await browser.close();
} catch (e) {
  crashed = e;
} finally {
  server.close();
  if (crashed) {
    console.error('HARNESS CRASHED:', crashed);
    process.exit(1);
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
