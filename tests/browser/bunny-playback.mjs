// Proves the signed Bunny embed really plays for a real account, outside the app shell.
// Run with: node tests/browser/bunny-playback.mjs   (needs the dev stack on :5000 and vite on :5180)
import { chromium } from '@playwright/test';

const WEB = process.env.CFT_PLAYBACK_WEB || 'http://127.0.0.1:5180';
const EMAIL = process.env.CFT_PLAYBACK_EMAIL || 'browser.student@verify.test';
const PASSWORD = process.env.CFT_PLAYBACK_PASSWORD || 'BrowserVerify2026';

const results = [];
const check = (name, pass, detail = '') => {
  results.push(pass);
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const browser = await chromium.launch({ channel: 'msedge', args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const media = [];
page.on('response', (res) => {
  if (/b-cdn\.net/.test(res.url())) media.push({ status: res.status(), token: /token=/i.test(res.url()), url: res.url() });
});

const api = (path, options = {}) => page.evaluate(async ([p, o]) => {
  const csrf = o.method && o.method !== 'GET'
    ? (await fetch('/api/v1/auth/csrf', { credentials: 'include' }).then((r) => r.json())).data.csrfToken
    : null;
  const res = await fetch(`/api/v1${p}`, {
    ...o,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(csrf ? { 'x-csrf-token': csrf } : {}), ...(o.headers || {}) }
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}, [path, options]);

let sessionId = '';
try {
  await page.goto(`${WEB}/login`, { waitUntil: 'domcontentloaded' });
  const signedIn = await api('/auth/login', { method: 'POST', body: JSON.stringify({ identifier: EMAIL, password: PASSWORD }) });
  check('the student signs in', signedIn.status === 200, String(signedIn.status));

  const catalog = await api('/courses');
  const course = (catalog.body.data.courses || catalog.body.data.items || []).find((c) => /accelerator/i.test(c.slug || ''));
  const mine = await api(`/student/courses/${encodeURIComponent(course.id)}`);
  const lessons = (mine.body.data.course?.curriculum || mine.body.data.curriculum || []).flatMap((m) => m.lessons || []);
  const target = lessons.find((l) => l.hasVideo && !l.locked) || lessons.find((l) => l.hasVideo);
  console.log(`course ${course?.slug} · lesson ${target?.title || 'NONE'} (${target?.id || '-'}) of ${lessons.length}`);
  const issued = await api(`/video/lessons/${target.id}/playback`, { method: 'POST' });
  sessionId = issued.body?.data?.playback?.sessionId || '';
  const playbackUrl = issued.body?.data?.playback?.playbackUrl;
  check('the server issues a signed embed link', issued.status === 200 && /token=[a-f\d]{64}&expires=\d+/.test(playbackUrl || ''),
    playbackUrl ? playbackUrl.slice(0, 110) : `${issued.status} ${JSON.stringify(issued.body?.error || issued.body)}`);

  if (playbackUrl) {
    await page.goto(playbackUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    check('Bunny opens the embed instead of a 403', !/403|Forbidden/i.test(await page.title()), await page.title());

    const box = await page.locator('body').boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.45);
    await page.waitForTimeout(6000);

    const state = await page.evaluate(() => {
      const find = (root) => {
        const direct = root.querySelector?.('video');
        if (direct) return direct;
        for (const el of root.querySelectorAll?.('*') || []) {
          if (el.shadowRoot) { const inner = find(el.shadowRoot); if (inner) return inner; }
        }
        return null;
      };
      const video = find(document);
      return video
        ? { seconds: Number(video.currentTime.toFixed(1)), duration: Math.round(video.duration), paused: video.paused, error: video.error?.code || null }
        : null;
    });
    check('the lesson really plays', Boolean(state) && state.seconds > 0 && state.paused === false && !state.error, JSON.stringify(state));
    check('the lesson files come off a signed CDN link',
      media.length > 1 && media.every((m) => [200, 206].includes(m.status) && m.token),
      `${media.length} cdn responses, ${media.filter((m) => [200, 206].includes(m.status)).length} ok · ${[...new Set(media.map((m) => m.status))].join('/')}`);

    await page.screenshot({ path: new URL('./shots/90-bunny-direct-playback.png', import.meta.url).pathname }).catch(() => {});
  }
} finally {
  if (sessionId) {
    await page.goto(`${WEB}/login`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await api(`/video/playback/${sessionId}`, { method: 'DELETE' }).catch(() => {});
  }
  await browser.close();
}

const failed = results.filter((r) => !r).length;
console.log(`${results.length - failed}/${results.length} playback checks passed`);
process.exit(failed ? 1 : 0);
