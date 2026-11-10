// Full responsive audit: every route at phone, tablet and desktop widths,
// measured rather than eyeballed. Each pass reports horizontal overflow,
// elements painted past the viewport, tap targets under 44px, text clipped by
// its own box, type under 11px, controls covered by something else, and images
// stretched beyond their own pixels.
//
//   node tests/browser/responsive-audit.mjs
//   CFT_RP_WIDTHS=390,1440 node tests/browser/responsive-audit.mjs
//   CFT_RP_ROUTES=/admin,/admin/media node tests/browser/responsive-audit.mjs
//   (route names work with or without the leading slash; see keep() below)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(here, '..', '..');
const WEB_PORT = Number(process.env.CFT_RP_WEB_PORT || 5187);
const WEB = `http://127.0.0.1:${WEB_PORT}`;
process.env.CFT_DEV_STACK_PORT = String(process.env.CFT_RP_API_PORT || 5007);
process.env.CFT_DEV_STACK_FRONTEND = WEB;

const { startDevStack, funnelUser } = await import('../../../backend/scripts/dev-stack.mjs');

const ALL_WIDTHS = [
  { tag: '390', width: 390, height: 844, touch: true },
  { tag: '768', width: 768, height: 1024, touch: true },
  { tag: '1024', width: 1024, height: 768, touch: true },
  { tag: '1440', width: 1440, height: 900, touch: false },
  { tag: '1920', width: 1920, height: 1080, touch: false },
];
const widths = (process.env.CFT_RP_WIDTHS || ALL_WIDTHS.map((w) => w.tag).join(','))
  .split(',').map((t) => ALL_WIDTHS.find((w) => w.tag === t.trim())).filter(Boolean);

const publicRoutes = [
  '/', '/about', '/courses', '/course/accelerator', '/course/mindlife', '/course/sa1',
  '/journey/consciousness', '/journey/self-discovery', '/journey/inner-peace', '/journey/purpose',
  '/books', '/books/the-secret-of-creation', '/books/the-big-three', '/books/caught-in-the-act',
  '/blog', '/blog/you-are-allowed-to-slow-down', '/testimonials', '/connect', '/wisdom-call',
  '/faq', '/login', '/signup', '/forgot-password', '/privacy', '/terms', '/checkout',
];
const studentRoutes = [
  '/dashboard', '/dashboard/welcome', '/dashboard/courses', '/dashboard/explore',
  '/dashboard/calls', '/dashboard/orders', '/dashboard/notifications', '/dashboard/live-classes',
];
const adminRoutes = [
  '/admin', '/admin/students', '/admin/courses', '/admin/programs', '/admin/media', '/admin/blog',
  '/admin/orders', '/admin/discounts', '/admin/schedule', '/admin/bookings', '/admin/live-classes',
  '/admin/cms', '/admin/settings', '/admin/audit', '/admin/contact', '/admin/moderation', '/admin/platform',
];

// A comma-separated route list narrows the crawl for a cheap re-run after a
// single fix; each role only keeps the routes that belong to it. Git Bash
// rewrites the first entry of a value that looks like an absolute POSIX path,
// so CFT_RP_ROUTES=/admin arrives as C:/Program Files/Git/admin. Matching the
// tail of each entry keeps both shell styles working, and a route written
// without its leading slash is accepted too.
const only = (process.env.CFT_RP_ROUTES || '').split(',').map((v) => v.trim()).filter(Boolean);
const keep = (list) => (only.length
  ? list.filter((r) => only.some((w) => w === r || `/${w}` === r || w.endsWith(r)))
  : list);

// Measured inside the page. `opts.tap` (phone/tablet) and `opts.cover` are the
// two expensive passes, so desktop skips the tap sizes but keeps coverage.
const audit = (opts) => {
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const path = (el) => {
    const bit = (n) => (n && n.tagName ? `${n.tagName.toLowerCase()}${n.className && typeof n.className === 'string' ? `.${n.className.trim().split(/\s+/).slice(0, 2).join('.')}` : ''}` : '?');
    return `${bit(el.parentElement)} > ${bit(el)}`;
  };
  const box = (el) => el.getBoundingClientRect();
  const shown = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.02) return false;
    const r = box(el);
    return r.width > 0 && r.height > 0;
  };
  const inScroller = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n);
      // A JS-driven strip (testimonials, blog peek, the Instagram marquee)
      // clips with overflow:hidden and slides with scrollLeft, so its cards
      // legitimately sit outside the viewport.
      if (/(auto|scroll|hidden|clip)/.test(cs.overflowX) && n.scrollWidth > n.clientWidth + 2) return true;
      if (n.classList && n.classList.contains('hero-stage')) return true; // the hero crops on purpose
    }
    return false;
  };
  const hasOwnText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
  // A link that is part of a sentence is not a tap target: it is text, and it
  // would have to be 44px tall to be flagged. Only controls that are styled as
  // controls (their own box, background, border or padding) are measured.
  const isProseLink = (el) => {
    if (el.tagName !== 'A' || !el.getAttribute('href')) return false;
    const cs = getComputedStyle(el);
    if (cs.display !== 'inline') return false;
    const painted = (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') || parseFloat(cs.paddingTop) > 2 || parseFloat(cs.borderTopWidth) > 0;
    return !painted;
  };

  const out = {
    title: (document.querySelector('h1,h2')?.textContent || document.title || '').trim().slice(0, 40),
    overflow: document.documentElement.scrollWidth > vw + 1,
    overflowBy: document.documentElement.scrollWidth - vw,
    past: [],
    tap: [],
    clipped: [],
    ellipsis: 0,
    tiny: [],
    stretched: [],
    covered: [],
    blank: false,
  };
  if (document.body.innerText.replace(/\s/g, '').length < 40) {
    out.blank = true;
    // A blank report is useless without knowing what did paint: the URL the
    // router ended on and the short text that did survive tell the two cases
    // (redirected away vs painted an empty shell) apart immediately.
    out.blankNote = `${location.pathname}${location.search} · "${document.body.innerText.trim().slice(0, 90)}" · ${document.querySelectorAll('body *').length} nodes`;
  }

  for (const el of document.querySelectorAll('body *')) {
    if (!shown(el) || inScroller(el)) continue;
    const r = box(el);
    if (r.right > vw + 2 || r.left < -2) {
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed' || r.right > vw + 2) out.past.push(`${path(el)} ${Math.round(r.width)}x${Math.round(r.height)} at x ${Math.round(r.left)}–${Math.round(r.right)}`);
    }
    if (el.tagName === 'IMG' && el.naturalWidth > 0 && r.width > el.naturalWidth * 1.2) {
      // Which candidate the browser actually picked is the whole diagnosis:
      // a srcSet that lies about an intrinsic width buys exactly this bug.
      out.stretched.push(`${path(el)} shown ${Math.round(r.width)}px from ${el.naturalWidth}px ${String(el.currentSrc).replace(location.origin, '')}`);
    }
    if (hasOwnText(el)) {
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size < 11) out.tiny.push(`${path(el)} ${size}px "${el.textContent.trim().slice(0, 26)}"`);
      const cs = getComputedStyle(el);
      if (cs.overflowX !== 'visible' && el.scrollWidth > el.clientWidth + 2) {
        if (cs.textOverflow === 'ellipsis') out.ellipsis += 1;
        else out.clipped.push(`${path(el)} text ${el.scrollWidth}px in ${el.clientWidth}px`);
      }
    }
    if (opts.tap) {
      const interactive = el.matches('a[href],button,input,select,textarea,summary,[role=button],[role=tab],[role=checkbox]') && !isProseLink(el);
      // A caption that merely points at a field via `for` is not a tap target
      // of its own: the field is measured separately, and demanding 44px of
      // text above it would be padding for padding's sake. Only a label that
      // wraps the control, or stands in for one that is hidden, needs room.
      const wrapsControl = el.matches('label') && el.control
        && (el.contains(el.control) || !shown(el.control));
      if ((interactive || wrapsControl) && !el.disabled) {
        const kind = el.getAttribute('type');
        if (kind !== 'hidden') {
          const label = (el.getAttribute('aria-label') || el.textContent || el.value || kind || '').trim().slice(0, 28);
          // A tick box is meant to be small. What has to be hittable with a
          // thumb is the row it lives in, so boxes are measured through their
          // label instead of being asked to grow into a forty-four square.
          if (kind === 'checkbox' || kind === 'radio') {
            const row = el.closest('label') || el.parentElement;
            const rr = row ? box(row) : null;
            if (rr && (rr.height < 44 || rr.width < 44)) out.tap.push(`${path(row)} ${Math.round(rr.width)}x${Math.round(rr.height)} "${label}" (box in row)`);
          } else if (r.height < 44 || r.width < 44) out.tap.push(`${path(el)} ${Math.round(r.width)}x${Math.round(r.height)} "${label}"`);
        }
      }
    }
  }

  if (opts.cover) {
    const targets = [...document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea')]
      .filter((el) => shown(el) && !inScroller(el) && !isProseLink(el))
      .filter((el) => { const r = box(el); return r.top < vh && r.bottom > 0; })
      .slice(0, 30);
    const sticky = document.querySelector('header.site-header, .db-topbar');
    for (const el of targets) {
      // Hit-testing only works on what is actually on screen. elementFromPoint
      // is viewport-relative, so a control parked under the fold would report
      // whatever happens to be painted at that y instead.
      //
      // The scroll has to be instant: with the site's smooth scroll behaviour
      // an animated scroll is still in flight when the box is measured, so the
      // rect and the hit test disagree and every control near the top of a page
      // looks occluded. It also has to clear the sticky header, because the
      // audit's own scroll-margin-top parks the element right behind it and the
      // header would then be reported as covering a perfectly reachable link.
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      const bar = sticky ? Math.ceil(sticky.getBoundingClientRect().bottom) : 0;
      if (box(el).top < bar + 4) {
        window.scrollTo({ top: window.scrollY + (box(el).top - bar - 12), behavior: 'instant' });
      }
      const r = box(el);
      if (r.top < 0 || r.bottom > vh) continue;
      const hit = document.elementFromPoint(Math.min(Math.max(r.left + r.width / 2, 1), vw - 1), Math.min(Math.max(r.top + r.height / 2, 1), vh - 1));
      if (!hit || hit === el || el.contains(hit) || hit.contains(el)) continue;
      if (hit.tagName === 'HTML' || hit === document.body) continue;
      out.covered.push(`${path(el)} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 22)}" is covered by ${path(hit)}`);
    }
    window.scrollTo(0, 0);
  }
  return out;
};

// These ports are fixed so the harness can proxy the API, which means two runs
// cannot overlap: the second one's shutdown stops the server the first is still
// crawling, and every remaining route is then audited as Chrome's
// connection-refused page, which produces fifty phantom defects instead of any
// real ones. Refuse to start rather than report that.
const taken = await fetch(`${WEB}/`).then(() => true).catch(() => false);
if (taken) { console.log(`FAIL something already answers on ${WEB}; another audit is using these ports`); process.exit(1); }
const stack = await startDevStack({ quiet: true });
fs.mkdirSync(path.join(here, 'shots'), { recursive: true });
const viteLog = fs.openSync(path.join(here, 'shots', 'responsive-audit-vite.log'), 'w');
const vite = spawn(process.execPath, [path.join(webDir, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '127.0.0.1', '--port', String(WEB_PORT), '--strictPort'], {
  cwd: webDir,
  stdio: ['ignore', viteLog, viteLog],
  env: { ...process.env, CFT_DEV_API_TARGET: stack.apiOrigin },
});
const up = () => fetch(`${WEB}/`).then((r) => r.ok).catch(() => false);
// Vite re-optimizes its dependency cache on the first start after a config or
// lockfile change and restarts the server while doing it. A single successful
// probe can land in the window before that restart, which then makes every
// route read Chrome's "connection refused" page instead of the app. Two
// consecutive probes half a second apart survive it.
let ready = false;
for (let i = 0; i < 60 && !ready; i += 1) {
  const first = await up();
  await new Promise((res) => setTimeout(res, 500));
  ready = first && (await up());
  if (!ready) await new Promise((res) => setTimeout(res, 500));
}
if (!ready) { vite.kill('SIGTERM'); await stack.stop(); console.log(`FAIL dev server never answered on ${WEB} (see shots/responsive-audit-vite.log)`); process.exit(1); }

const browser = await chromium.launch({ channel: 'msedge' });
const signIn = async (email, password) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${WEB}/login?next=%2Fdashboard`, { waitUntil: 'domcontentloaded' });
  await p.getByRole('button', { name: 'Password' }).click();
  await p.getByLabel('Email, mobile number or username').fill(email);
  await p.getByLabel('Password', { exact: true }).fill(password);
  await p.getByRole('button', { name: 'Sign In' }).click();
  await p.waitForURL(/\/dashboard|\/admin/, { timeout: 25000 }).catch(() => {});
  const state = await ctx.storageState();
  await ctx.close();
  return state;
};
const student = await signIn(funnelUser.student.email, funnelUser.student.password);
const admin = await signIn(funnelUser.admin.email, funnelUser.admin.password);

const findings = [];
const errors = [];
const run = async (w, list, state, as) => {
  const ctx = await browser.newContext({
    viewport: { width: w.width, height: w.height },
    isMobile: !!w.touch,
    hasTouch: !!w.touch,
    deviceScaleFactor: 1,
    ...(state ? { storageState: state } : {}),
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${w.tag} ${as} ${page.url()} — ${String(e).slice(0, 160)}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/429/.test(m.text())) errors.push(`${w.tag} ${as} ${page.url()} — ${m.text().slice(0, 160)}`); });
  // The audit walks every route in one session, which trips the API's rate
  // limiter on purpose; a 429 here is the harness, not the site.
  page.on('response', (r) => {
    const status = r.status();
    if (status < 400 || status === 429) return;
    if (r.request().resourceType() === 'fetch' || r.request().resourceType() === 'xhr') return;
    errors.push(`${w.tag} ${as} ${page.url()} — HTTP ${status} on ${r.url().replace(/^http:\/\/127\.0\.0\.1:\d+/, '')}`);
  });
  page.on('requestfailed', (rq) => {
    if (rq.failure() && /ERR_ABORTED/.test(rq.failure().errorText || '')) return;
    errors.push(`${w.tag} ${as} ${page.url()} — failed ${rq.resourceType()} ${rq.url().replace(/^http:\/\/127\.0\.0\.1:\d+/, '')}`);
  });
  for (const route of list) {
    // Never audit the browser's own error page. If the server does not come
    // back, stop the run: continuing turns one lost process into two hundred
    // phantom defects, because Chrome's error page has its own buttons, its own
    // 10px text and its own layout, and every one of them gets reported.
    for (let i = 0; i < 20 && !(await up()); i += 1) await new Promise((res) => setTimeout(res, 500));
    if (!(await up())) {
      console.log(`\nFAIL dev server stopped answering at ${w.tag} ${as} ${route}; the rest of the run would only measure Chrome's error page.`);
      await browser.close(); vite.kill('SIGTERM'); await stack.stop(); process.exit(1);
    }
    await page.goto(`${WEB}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    // Every route component is a lazy chunk, so a dev server that has not
    // compiled one yet leaves the Suspense fallback on screen for a second or
    // two after the document loads. Measuring then reports a real page as
    // blank, so wait for readable content before judging the layout.
    await page.waitForFunction(
      () => document.body.innerText.replace(/\s/g, '').length > 40,
      undefined,
      { timeout: 9000, polling: 250 },
    ).catch(() => {});
    await page.waitForTimeout(500);
    // Scroll the page so lazy images, reveal animations and sticky states all
    // exist before the geometry is read, then come back to the top.
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.9;
      for (let y = 0; y < document.body.scrollHeight; y += step) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 120));
    }).catch(() => {});
    const res = await page.evaluate(audit, { tap: w.tag !== '1440' && w.tag !== '1920', cover: w.tag === '390' || w.tag === '1440' }).catch((e) => ({ error: String(e) }));
    findings.push({ width: w.tag, as, route, ...res });
    const bad = res.overflow || (res.past || []).length || (res.clipped || []).length || (res.tiny || []).length || (res.stretched || []).length || (res.tap || []).length || (res.covered || []).length || res.blank;
    console.log(`${bad ? 'ISSUE' : 'ok   '} ${w.tag} ${as.padEnd(7)} ${route}${res.overflow ? ` · overflow ${res.overflowBy}px` : ''}${res.past?.length ? ` · ${res.past.length} past edge` : ''}${res.tap?.length ? ` · ${res.tap.length} small tap` : ''}${res.clipped?.length ? ` · ${res.clipped.length} clipped` : ''}${res.tiny?.length ? ` · ${res.tiny.length} tiny text` : ''}${res.stretched?.length ? ` · ${res.stretched.length} upscaled` : ''}${res.covered?.length ? ` · ${res.covered.length} covered` : ''}${res.blank ? ' · BLANK' : ''}`);
  }
  await ctx.close();
};

for (const w of widths) {
  await run(w, keep(publicRoutes), null, 'anon');
  await run(w, keep(studentRoutes), student, 'student');
  await run(w, keep(adminRoutes), admin, 'admin');
}

fs.writeFileSync(path.join(here, 'shots', 'responsive-audit.json'), JSON.stringify({ findings, errors }, null, 1));
await browser.close();
vite.kill('SIGTERM');
await stack.stop();

const flat = [];
for (const f of findings) {
  for (const [key, list] of Object.entries({ past: f.past, tap: f.tap, clipped: f.clipped, tiny: f.tiny, stretched: f.stretched, covered: f.covered })) {
    for (const line of list || []) flat.push({ key, where: f, line });
  }
  if (f.overflow) flat.push({ key: 'overflow', where: f, line: `${f.overflowBy}px` });
  if (f.blank) flat.push({ key: 'blank', where: f, line: f.blankNote || 'no readable text' });
}
console.log(`\n${findings.length} page passes · ${flat.length} findings · ${errors.length} console errors`);

// The same selector on forty routes is one bug, not forty. Group by the element
// path (everything before the measured numbers) and show where it bites.
const groups = new Map();
for (const { key, where, line } of flat) {
  const shape = `${key} ${line.replace(/\d+x\d+|at x [-\d–]+|\d+px|"[^"]*"/g, '').replace(/\s+/g, ' ').trim()}`;
  const g = groups.get(shape) || { count: 0, routes: new Set(), examples: [] };
  g.count += 1;
  g.routes.add(`${where.width} ${where.route}`);
  if (g.examples.length < 2) g.examples.push(`${where.width} ${where.route}: ${line}`);
  groups.set(shape, g);
}
const ranked = [...groups.entries()].sort((a, b) => b[1].count - a[1].count);
for (const [shape, g] of ranked) {
  console.log(`\n${String(g.count).padStart(4)}x  ${shape}`);
  console.log(`      ${[...g.routes].slice(0, 6).join(' · ')}${g.routes.size > 6 ? ` · +${g.routes.size - 6} more` : ''}`);
  for (const e of g.examples) console.log(`      e.g. ${e.slice(0, 150)}`);
}
if (errors.length) {
  const byUrl = new Map();
  for (const e of errors) {
    const shape = e.replace(/^\d+ \w+ \S+ — /, '');
    byUrl.set(shape, (byUrl.get(shape) || 0) + 1);
  }
  console.log('\n--- console / network errors ---');
  for (const [shape, n] of [...byUrl.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(`${n}x  ${shape.slice(0, 170)}`);
}
