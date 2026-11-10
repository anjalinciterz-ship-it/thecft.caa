// Proves the audiobooks play from the BUILT bundle served the way Netlify serves
// it (real file first, SPA fallback for everything else). The dev server has its
// own /media plugin, so a dev run proves nothing about the deploy.
// Run from cft-frontend: node tests/browser/audiobook-live.mjs
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(here, '..', '..', 'dist');
const PORT = Number(process.env.CFT_AUDIO_WEB_PORT || 4188);
const WEB = `http://127.0.0.1:${PORT}`;
const TYPES = { '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.ico': 'image/x-icon' };

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${String(detail).slice(0, 200)}` : ''}`);
};

// Netlify's actual behaviour: a file that exists is served, and the /* → /index.html
// 200 rule only catches the paths that have no file. That fallback is what made
// the missing audio look like a success, so the harness has to repeat it.
const server = http.createServer(async (req, res) => {
  const rel = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/+/, '');
  const send = (file, type) => {
    stat(file)
      .then((info) => {
        const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
        res.setHeader('Content-Type', type);
        res.setHeader('Accept-Ranges', 'bytes');
        if (range && (range[1] || range[2])) {
          const start = range[1] ? Number(range[1]) : Math.max(0, info.size - Number(range[2]));
          const end = range[1] && range[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1;
          res.statusCode = 206;
          res.setHeader('Content-Range', `bytes ${start}-${end}/${info.size}`);
          res.setHeader('Content-Length', String(end - start + 1));
          return createReadStream(file, { start, end }).pipe(res);
        }
        res.setHeader('Content-Length', String(info.size));
        return createReadStream(file).pipe(res);
      })
      .catch(() => { res.statusCode = 404; res.end('not found'); });
  };
  const file = path.join(dist, rel);
  const info = rel ? await stat(file).catch(() => null) : null;
  if (info?.isFile()) return send(file, TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream');
  return send(path.join(dist, 'index.html'), 'text/html');
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const browser = await chromium.launch({ channel: 'msedge', args: ['--autoplay-policy=no-user-gesture-required'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const mediaHits = [];
page.on('response', (res) => {
  if (/\.mp3(\?|$)/i.test(res.url())) mediaHits.push(`${res.status()} ${res.headers()['content-type'] || ''} ${res.url().slice(-40)}`);
});

try {
  await page.goto(`${WEB}/books/the-secret-of-creation`, { waitUntil: 'networkidle' });
  const first = page.getByRole('button', { name: /Part One · Track 1/i }).first();
  check('the audiobook track list renders', await first.isVisible().catch(() => false));

  const hit = page.waitForResponse((r) => /\.mp3/i.test(r.url()), { timeout: 20000 });
  await first.click();
  const res = await hit;
  const type = res.headers()['content-type'] || '';
  check('the track is served as audio, not as the SPA page', type.includes('audio/mpeg'), `${res.status()} ${type}`);

  const player = page.locator('audio.media-audio');
  await player.waitFor({ timeout: 10000 });
  const read = () => player.evaluate((el) => ({
    duration: el.duration,
    seconds: el.currentTime,
    state: el.readyState,
    error: el.error ? `${el.error.code}` : null,
    src: el.currentSrc
  }));

  await page.waitForTimeout(2500);
  let now = await read();
  check('the player knows the real length', Number.isFinite(now.duration) && now.duration > 60, JSON.stringify(now));

  await player.evaluate((el) => { el.muted = true; return el.play().then(() => true).catch((e) => String(e)); });
  await page.waitForTimeout(3000);
  now = await read();
  check('sound actually advances', now.seconds > 1 && now.state >= 3, JSON.stringify(now));

  const seekTo = await player.evaluate(async (el) => {
    const target = Math.min(120, el.duration - 5);
    el.currentTime = target;
    await new Promise((r) => el.addEventListener('seeked', r, { once: true }));
    return { target, landed: el.currentTime };
  });
  check('seeking works, which needs byte-range support', Math.abs(seekTo.landed - seekTo.target) < 2, JSON.stringify(seekTo));

  await page.getByRole('button', { name: /Part One · Track 3/i }).first().click();
  await page.waitForTimeout(2500);
  const next = await read();
  check('a second track loads and plays', Number.isFinite(next.duration) && next.duration > 60, JSON.stringify(next));

  const book2 = await fetch(`${WEB}/media/${encodeURIComponent('Book 2 – CAUGHT in the ACT')}/${encodeURIComponent('5-Audio-Track.mp3')}`, { headers: { Range: 'bytes=0-0' } });
  check('the second book is published too', (book2.headers.get('content-type') || '').includes('audio/mpeg'), `${book2.status} ${book2.headers.get('content-type')} ${book2.headers.get('content-range')}`);
  await book2.body?.cancel();

  check('every media response was audio', mediaHits.length > 0 && mediaHits.every((h) => /^20[06] audio/.test(h)), mediaHits.slice(0, 3).join(' || '));
  await page.screenshot({ path: path.join(here, 'shots', 'audiobook-playing.png') }).catch(() => {});
} catch (error) {
  check('audiobooks played without a crash', false, String(error?.message || error).slice(0, 300));
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} audiobook checks passed`);
  process.exit(failed ? 1 : 0);
}
