import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const WEB = process.env.CFT_WEB || 'http://127.0.0.1:5180';
const API = process.env.CFT_API || 'http://127.0.0.1:5000/api/v1';
const shots = fileURLToPath(new URL('./shots/', import.meta.url));

// Give the demo student a real purchase so the purchased-course grid renders
// instead of the empty state. Mock payments auto-confirm on the local stack.
const enroll = async () => {
  const jar = new Map();
  const send = async (path, init = {}) => {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; '), ...(init.headers || {}) }
    });
    for (const raw of res.headers.getSetCookie?.() || []) {
      const [pair] = raw.split(';');
      const [k, v] = pair.split('=');
      jar.set(k.trim(), v);
    }
    return res.json().catch(() => null);
  };
  const csrf = await send('/auth/csrf');
  const auth = { 'x-csrf-token': csrf.data.csrfToken };
  await send('/auth/login', { method: 'POST', headers: auth, body: JSON.stringify({ identifier: 'browser.student@verify.test', password: 'BrowserVerify2026' }) });
  const catalog = await send('/courses?limit=20');
  const course = (catalog.data?.courses || []).find((c) => /accelerator/i.test(c.title)) || catalog.data?.courses?.[0];
  if (!course) return 'no course in catalog';
  const started = await send('/cart/checkout', { method: 'POST', headers: { ...auth, 'Idempotency-Key': `dash-shots-${course.id}` }, body: JSON.stringify({ items: [{ productId: course.id, quantity: 1 }] }) });
  for (let i = 0; i < 20; i++) {
    const mine = await send('/student/courses?limit=60');
    if (mine.data?.courses?.some((c) => c.accessActive)) return `enrolled: ${course.title}`;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return `not enrolled (${started?.data?.status || 'unknown'})`;
};
console.log(await enroll());

const browser = await chromium.launch({ channel: 'msedge' });

const login = async (page) => {
  await page.goto(`${WEB}/login?next=%2Fdashboard`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Password' }).click();
  await page.getByLabel('Email, mobile number or username').fill('browser.student@verify.test');
  await page.getByLabel('Password', { exact: true }).fill('BrowserVerify2026');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('**/dashboard', { timeout: 20000 });
  await page.waitForSelector('.db-nav', { timeout: 15000 });
  await page.waitForTimeout(1500);
};

const report = [];
const routes = [['home', '/dashboard'], ['explore', '/dashboard/explore'], ['courses', '/dashboard/courses'], ['calls', '/dashboard/calls'], ['orders', '/dashboard/orders']];
for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await login(page);
  for (const [route, path] of (name === 'desktop' ? routes : [['home', '/dashboard']])) {
    await page.goto(`${WEB}${path}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1800);
    const info = await page.evaluate(() => {
      const box = (el) => (el ? el.getBoundingClientRect() : null);
      const topbar = document.querySelector('.db-topbar');
      return {
        url: location.pathname,
        topbarHeight: topbar?.getBoundingClientRect().height,
        navLinks: [...document.querySelectorAll('.db-nav a')].map((a) => ({ text: a.textContent.trim(), active: a.classList.contains('active'), box: box(a) })),
        visit: box(document.querySelector('.db-visit')),
        actions: box(document.querySelector('.db-topbar-actions')),
        search: box(document.querySelector('.db-search')),
        sidebar: document.querySelectorAll('.db-sidebar').length,
        mainLeft: box(document.querySelector('.db-main'))?.left,
        headings: [...document.querySelectorAll('.db-section-title h2, .db-page-heading h1')].map((h) => h.textContent),
        tiles: document.querySelectorAll('.db-course-tile').length,
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      };
    });
    report.push({ name, route, ...info });
    await page.screenshot({ path: `${shots}95-dash-${name}${route === 'home' ? '' : `-${route}`}.png`, fullPage: true });
  }
  await context.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 1));
