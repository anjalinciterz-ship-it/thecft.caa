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
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${String(detail).slice(0, 240)}` : ''}`);
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
  if (/\/media\//.test(res.url())) mediaHits.push(`${res.status()} ${res.headers()['content-type'] || ''} ${res.url().slice(-46)}`);
});

// Every track on a page: its own card asks the browser for the file header and
// then for the duration, without downloading the whole recording.
const readAll = () => page.evaluate(async () => {
  const cards = [...document.querySelectorAll('.audio-card')];
  return Promise.all(cards.map(async (card) => {
    const el = card.querySelector('audio');
    const title = card.querySelector('h3')?.textContent?.trim() || '?';
    let head = { status: 0, type: '' };
    try {
      const r = await fetch(el.src, { headers: { Range: 'bytes=0-1' } });
      head = { status: r.status, type: r.headers.get('content-type') || '' };
    } catch (error) { head = { status: -1, type: String(error) }; }
    const duration = await new Promise((resolve) => {
      const done = (value) => resolve(value);
      el.addEventListener('loadedmetadata', () => done(el.duration), { once: true });
      el.addEventListener('error', () => done(`error ${el.error?.code}`), { once: true });
      el.preload = 'metadata';
      el.load();
      setTimeout(() => done('timeout'), 20000);
    });
    return { title, src: el.currentSrc || el.src, head, duration };
  }));
});

try {
  for (const slug of ['the-secret-of-creation', 'caught-in-the-act']) {
    await page.goto(`${WEB}/books/${slug}`, { waitUntil: 'networkidle' });
    const tracks = await readAll();
    check(`${slug}: the track list renders`, tracks.length > 0, `${tracks.length} cards`);
    const served = tracks.filter((t) => t.head.status === 206 && t.head.type.includes('audio/mpeg'));
    check(`${slug}: every file is served as audio, not as the SPA page`, served.length === tracks.length,
      tracks.filter((t) => !served.includes(t)).map((t) => `${t.title} ${t.head.status} ${t.head.type}`).slice(0, 3).join(' || '));
    const timed = tracks.filter((t) => Number.isFinite(t.duration) && t.duration > 60);
    check(`${slug}: every player knows its real length`, timed.length === tracks.length,
      tracks.filter((t) => !timed.includes(t)).map((t) => `${t.title} ${JSON.stringify(t.duration)}`).slice(0, 3).join(' || '));
    console.log(`      ${slug} lengths: ${tracks.map((t) => `${t.title} ${Math.round((Number(t.duration) || 0) / 60)}min`).join(', ')}`);

    if (slug === 'the-secret-of-creation') {
      const first = page.locator('.audio-card').first();
      await first.getByRole('button', { name: /^Play / }).click();
      const player = first.locator('audio');
      await player.evaluate((el) => { el.muted = true; });
      await page.waitForTimeout(3500);
      const played = await player.evaluate((el) => ({ seconds: el.currentTime, state: el.readyState }));
      check('sound actually advances', played.seconds > 1 && played.state >= 3, JSON.stringify(played));

      const seekTo = await player.evaluate(async (el) => {
        const target = Math.min(120, el.duration - 5);
        el.currentTime = target;
        await new Promise((r) => el.addEventListener('seeked', r, { once: true }));
        return { target, landed: el.currentTime };
      });
      check('seeking works, which needs byte-range support', Math.abs(seekTo.landed - seekTo.target) < 2, JSON.stringify(seekTo));

      const second = page.locator('.audio-card').nth(2);
      await second.getByRole('button', { name: /^Play / }).click();
      await page.waitForTimeout(2500);
      const both = await page.evaluate(() => {
        const cards = [...document.querySelectorAll('.audio-card audio')];
        return { playing: cards.filter((el) => !el.paused).length, quiet: cards.filter((el) => el.paused || el.currentTime === 0).length };
      });
      check('starting a track silences the one before it', both.playing === 1, JSON.stringify(both));
      await page.screenshot({ path: path.join(here, 'shots', 'audiobook-playing.png') }).catch(() => {});
    }
  }

  check('every media response was audio', mediaHits.length > 0 && mediaHits.every((h) => /^20[06] audio/.test(h)), mediaHits.filter((h) => !/^20[06] audio/.test(h)).slice(0, 3).join(' || '));
} catch (error) {
  check('audiobooks played without a crash', false, String(error?.message || error).slice(0, 300));
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} audiobook checks passed`);
  process.exit(failed ? 1 : 0);
}
