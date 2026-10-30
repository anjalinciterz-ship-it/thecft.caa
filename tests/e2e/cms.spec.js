import { randomUUID } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import { test, expect, signIn, api } from './fixtures.js';
import { User, CMSPage, CMSRevision, Article } from '../../../backend/src/models/index.js';

const actionStatus = (page) => page.locator('p.cms-admin-notice[role="status"]');
const blockStatus = (page) => page.locator('p.cms-admin-unsaved[role="status"]');

async function createDraftPage(page, accounts, { slug }) {
  const title = `CMS Page ${slug}`;
  await page.goto('/admin/cms');
  await page.getByRole('button', { name: 'Create page', exact: true }).click();
  await page.getByLabel(/^Page title/).fill(title);
  await page.getByLabel(/^Page slug/).fill(slug);
  await page.getByRole('button', { name: 'Create draft page' }).click();
  await expect(page.locator('.db-content h1, .cms-admin h1').first()).toHaveText(title);
  return title;
}

async function addTextBlock(page, body) {
  await page.getByLabel('Block type').selectOption('text');
  await page.getByRole('button', { name: 'Add block', exact: true }).click();
  await expect(blockStatus(page)).toContainText('added');
  await page.getByLabel(/^Body/).fill(body);
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(actionStatus(page)).toContainText('Draft saved');
}

async function publishPage(page) {
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Publish page' }).click();
  await expect(actionStatus(page)).toContainText('Page published');
}

const uid = () => randomUUID().split('-')[0];

test('a CMS draft stays private, publishes on demand and survives a refresh', async ({ page, accounts }) => {
  const slug = `draft-proof-${uid()}`;
  await signIn(page, accounts.admin);
  await createDraftPage(page, accounts, { slug });
  await addTextBlock(page, 'Published only after an explicit publish action.');

  const stored = await CMSPage.findOne({ slug });
  expect(stored.status).toBe('draft');
  expect(stored.blocks[0].data.body).toContain('explicit publish action');

  await page.goto(`/pages/${slug}`);
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();

  await page.goto(`/admin/cms/${stored._id}`);
  await publishPage(page);
  await page.goto(`/pages/${slug}`);
  await expect(page.getByRole('article').filter({ hasText: 'Published only after an explicit publish action' })).toBeVisible();
  expect((await CMSPage.findOne({ slug })).status).toBe('published');

  await page.reload();
  await expect(page.getByRole('article').filter({ hasText: 'Published only after an explicit publish action' })).toBeVisible();
});

test('a saved draft never overwrites the published snapshot visitors see', async ({ page, accounts }) => {
  const slug = `snapshot-${uid()}`;
  await signIn(page, accounts.admin);
  await createDraftPage(page, accounts, { slug });
  await addTextBlock(page, 'First published sentence.');
  const stored = await CMSPage.findOne({ slug });
  await page.goto(`/admin/cms/${stored._id}`);
  await publishPage(page);

  await page.getByLabel(/^Body/).fill('A newer sentence that is only a draft.');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(actionStatus(page)).toContainText('Draft saved');

  await page.goto(`/pages/${slug}`);
  await expect(page.getByRole('article')).toContainText('First published sentence.');
  await expect(page.getByRole('article')).not.toContainText('only a draft');

  const publicPayload = await api(page, `/pages/${slug}`);
  expect(JSON.stringify(publicPayload)).not.toContain('only a draft');
  expect((await CMSPage.findOne({ slug })).hasUnpublishedChanges ?? true).toBe(true);
});

test('stored rich text cannot execute scripts on the public page', async ({ page, accounts }) => {
  const slug = `xss-${uid()}`;
  await signIn(page, accounts.admin);
  await createDraftPage(page, accounts, { slug });
  await addTextBlock(page, '<script>window.__cmsXss = "executed"</script><img src="x" onerror="window.__cmsXss = \'executed\'"><p>Safe paragraph text.</p>');
  const stored = await CMSPage.findOne({ slug });
  await page.goto(`/admin/cms/${stored._id}`);
  await publishPage(page);

  await page.goto(`/pages/${slug}`);
  await expect(page.getByRole('article')).toContainText('Safe paragraph text.');
  expect(await page.evaluate(() => window.__cmsXss)).toBeUndefined();
  expect(await page.locator('article script, article img[src="x"]').count()).toBe(0);
  const tags = await page.locator('article').evaluateAll((nodes) => Array.from(nodes[0].querySelectorAll('script,iframe,object,embed,svg,math')).length);
  expect(tags).toBe(0);
});

test('the backend refuses an unsafe block URL instead of storing it', async ({ page, accounts }) => {
  const slug = `unsafe-${uid()}`;
  await signIn(page, accounts.admin);
  const title = `CMS Page ${slug}`;
  const created = await api(page, '/admin/pages', { method: 'POST', body: { title, slug, template: 'blocks', blocks: [], navigation: { group: 'main', label: title, orderIndex: 5 }, seo: {} } });
  // The block envelope requires a stable `key`; omitting it made the PATCH die on
  // "key — Required" so the URL guard this test exists for was never reached.
  const block = (to) => ({ key: 'cta-trap', type: 'cta', visible: true, orderIndex: 0, data: { heading: 'Trap', body: 'Do not click.', primary: { label: 'Claim', to } } });
  const patch = async (to) => api(page, `/admin/pages/${created.page.id}`, {
    method: 'PATCH',
    body: { title, slug, template: 'blocks', blocks: [block(to)], navigation: { group: 'main', label: title, orderIndex: 5 }, seo: {}, expectedRevision: (await CMSPage.findOne({ slug })).revisionCount },
  });
  const before = JSON.stringify((await CMSPage.findOne({ slug })).toObject());

  const attempt = await patch('javascript:window.__cmsLink=1').catch((error) => error);
  expect(String(attempt.message || attempt)).toMatch(/safe|URL/i);

  const stored = await CMSPage.findOne({ slug });
  expect(JSON.stringify(stored.toObject())).toBe(before);
  expect(stored.blocks.length).toBe(0);
  expect(await page.evaluate(() => window.__cmsLink)).toBeUndefined();

  // The refusal is about the URL, not about the block: the identical block with a
  // root-relative link saves, so the guard above cannot be a shape error.
  await patch('/wisdom-call');
  const saved = await CMSPage.findOne({ slug });
  expect(saved.blocks).toHaveLength(1);
  expect(saved.blocks[0].data.primary.to).toBe('/wisdom-call');
});

test('content managers reach the editor while students are turned away', async ({ page, accounts }) => {
  const manager = new User({ name: 'Content Manager Browser Member', email: `cm-${randomUUID()}@payments.test`, role: 'content_manager', emailVerified: true });
  await manager.setPassword(accounts.password);
  await manager.save();

  await signIn(page, manager);
  await page.goto('/admin/cms');
  await expect(page.getByRole('heading', { name: 'Pages & content' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create page', exact: true })).toBeVisible();

  await api(page, '/auth/logout', { method: 'POST' });
  await signIn(page, accounts.student);
  await page.goto('/admin/cms');
  await expect(page.getByRole('heading', { name: 'Staff access required' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create page' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Administration', exact: true })).toHaveCount(0);
});

test('restoring a revision returns earlier content without touching the live page', async ({ page, accounts }) => {
  const slug = `rev-${uid()}`;
  await signIn(page, accounts.admin);
  await createDraftPage(page, accounts, { slug });
  await addTextBlock(page, 'Revision one content.');
  const stored = await CMSPage.findOne({ slug });
  await page.goto(`/admin/cms/${stored._id}`);
  await publishPage(page);

  await page.getByLabel(/^Body/).fill('Revision two content.');
  await page.getByLabel('Revision note').fill('Second revision note for restore proof.');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(actionStatus(page)).toContainText('Draft saved');
  // Both publish and restore ask for a confirm; without accepting it Playwright
  // dismissed the dialog and the stale "Draft saved" notice was all that remained.
  await publishPage(page);
  const published = await CMSPage.findOne({ slug });
  // `publishedBlocks` is the snapshot visitors read; `blocks` is only the editable copy.
  expect(published.publishedBlocks?.[0]?.data?.body).toContain('Revision two content.');

  // Revision 1 is the empty page created by "Create draft page", so the revision
  // holding the first sentence has to be read from the stored snapshots rather
  // than assumed — restoring revision 1 would legitimately restore no blocks.
  const revisions = await CMSRevision.find({ page: stored._id }).sort({ revisionNumber: 1 }).lean();
  const firstNumber = revisions.find((revision) => JSON.stringify(revision.snapshot?.blocks ?? '').includes('Revision one content.'))?.revisionNumber;
  expect(firstNumber, `no stored revision holds the first sentence (${revisions.map((r) => r.revisionNumber).join(', ')})`).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Revisions' }).click();
  const restore = page.getByRole('button', { name: `Restore revision ${firstNumber}`, exact: true });
  await expect(restore).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await restore.click();
  await expect(actionStatus(page)).toContainText('Revision restored as a draft');

  const restored = await CMSPage.findOne({ slug });
  expect(restored.blocks[0].data.body).toContain('Revision one content.');
  expect(restored.publishedBlocks?.[0]?.data?.body).toContain('Revision two content.');

  await page.goto(`/pages/${slug}`);
  await expect(page.getByRole('article')).toContainText('Revision two content.', { timeout: 15000 });

  expect(revisions.length).toBeGreaterThanOrEqual(2);
});

test('the CMS list filters by publication status and the public page stays accessible', async ({ page, accounts }, testInfo) => {
  const slug = `filter-${uid()}`;
  await signIn(page, accounts.admin);
  await createDraftPage(page, accounts, { slug });
  await page.goto('/admin/cms');
  await page.getByLabel('Publication status').selectOption('draft');
  await expect(page.getByRole('row').filter({ hasText: `CMS Page ${slug}` })).toHaveCount(1);
  await page.reload();
  await page.getByLabel('Publication status').selectOption('published');
  await expect(page.getByRole('row').filter({ hasText: `CMS Page ${slug}` })).toHaveCount(0);

  const controls = await page.locator('button,a,input,select,textarea').evaluateAll((nodes) => nodes.map((node) => ({ tag: node.tagName, name: node.getAttribute('aria-label') || node.labels?.[0]?.textContent.trim() || node.textContent.trim(), disabled: !!node.disabled })));
  await testInfo.attach('cms-controls-inventory', { body: JSON.stringify({ path: '/admin/cms', controls }, null, 2), contentType: 'application/json' });
});

test('the CMS editor and a published public page pass the automated accessibility gate', async ({ page, accounts }, testInfo) => {
  const slug = `a11y-${uid()}`;
  await signIn(page, accounts.admin);
  await createDraftPage(page, accounts, { slug });
  await addTextBlock(page, 'Accessibility sample paragraph.');
  const stored = await CMSPage.findOne({ slug });
  await page.goto(`/admin/cms/${stored._id}`);
  let result = await new AxeBuilder({ page }).analyze();
  await testInfo.attach('accessibility-editor', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
  expect(result.violations.filter((item) => ['serious', 'critical'].includes(item.impact))).toEqual([]);

  await publishPage(page);
  await page.goto(`/pages/${slug}`);
  result = await new AxeBuilder({ page }).analyze();
  await testInfo.attach('accessibility-public', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
  expect(result.violations.filter((item) => ['serious', 'critical'].includes(item.impact))).toEqual([]);
});

// ------------------------------------------------------- Insights & Wisdom articles

// The editor repeats its save bar (top and bottom of the form), so the click is
// scoped to the first one.
const saveDraftButton = (page) => page.locator('.cms-admin-savebar').first().getByRole('button', { name: 'Save draft' });

const saveDraft = async (page) => {
  await saveDraftButton(page).click();
  await expect(actionStatus(page)).toContainText('Draft saved');
};

const confirmAnd = async (page, name) => {
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name, exact: true }).click();
};

const newArticle = async (page, title) => {
  await page.goto('/admin/blog');
  // Exact, because the empty-library state also offers "Write a new article".
  await page.getByRole('button', { name: 'New article', exact: true }).click();
  await page.getByLabel(/^Title/).fill(title);
  await page.getByRole('button', { name: 'Create article' }).click();
  await expect(page).toHaveURL(/\/admin\/blog\/[a-f\d]{24}$/);
};

const librarySlugs = async (page) => (await api(page, '/articles')).articles.map((item) => item.slug);

test('an article reaches the reading room only as a published snapshot, and unpublishing keeps the working copy', async ({ page, accounts }) => {
  const title = `Article Proof ${uid()}`;
  await signIn(page, accounts.admin);
  await newArticle(page, title);

  await page.getByLabel('Article body in markdown').fill('## Opening\n\nFirst published sentence.\n\nA second paragraph, so the body reads like an article.');
  await page.getByLabel(/^Revision note/).fill('Opening draft');
  await saveDraft(page);
  const draft = await Article.findOne({ title }).lean();
  expect(draft.status).toBe('draft');
  expect(await librarySlugs(page)).not.toContain(draft.slug);

  // Readiness is the server's decision, and the editor quotes its own message.
  await confirmAnd(page, 'Publish');
  await expect(page.getByRole('alert')).toContainText('Add a cover image before publishing.');
  expect(await librarySlugs(page)).not.toContain(draft.slug);

  await page.getByLabel('Cover URL').fill('/images/blog/daily-habits.jpg');
  await page.getByLabel('Alt text').fill('A practice desk with a journal and a cup of tea.');
  await confirmAnd(page, 'Publish');
  await expect(actionStatus(page)).toContainText('reading room');
  const published = await Article.findOne({ title }).lean();
  expect(published.status).toBe('published');
  expect(published.publishedAt).toBeTruthy();
  expect(published.publishedSnapshot.body).toContain('First published sentence.');
  expect(await librarySlugs(page)).toContain(published.slug);

  await page.goto(`/blog/${published.slug}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
  // Scoped to the body: the page also renders related-article cards.
  const reading = page.locator('.bl-article');
  await expect(reading).toContainText('First published sentence.');

  await page.goto(`/admin/blog/${published._id}`);
  await page.getByLabel('Article body in markdown').fill('## Opening\n\nSecond sentence that is not live yet.\n\nA second paragraph, so the body reads like an article.');
  await saveDraft(page);
  const edited = await Article.findOne({ title }).lean();
  expect(edited.body).toContain('Second sentence');
  expect(edited.publishedSnapshot.body).toContain('First published sentence');
  await expect(page.locator('.cms-admin')).toContainText('Saved changes are not yet published');
  await page.goto(`/blog/${published.slug}`);
  await expect(reading).toContainText('First published sentence.');
  await expect(reading).not.toContainText('Second sentence');

  await page.goto(`/admin/blog/${published._id}`);
  await confirmAnd(page, 'Unpublish');
  await expect(actionStatus(page)).toContainText('Unpublished');
  const hidden = await Article.findOne({ title }).lean();
  expect(hidden.status).toBe('unpublished');
  expect(hidden.body).toContain('Second sentence');
  expect(await librarySlugs(page)).not.toContain(hidden.slug);
  await page.goto(`/blog/${published.slug}`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('somewhere new');
});

test('an out-of-date editor cannot overwrite a save made in another window', async ({ page, accounts }) => {
  const title = `Revision Guard ${uid()}`;
  await signIn(page, accounts.admin);
  await newArticle(page, title);
  await page.getByLabel('Article body in markdown').fill('Saved from the first window.');
  await page.getByLabel(/^Revision note/).fill('First save');
  await saveDraft(page);
  const record = await Article.findOne({ title }).lean();

  const other = await page.context().newPage();
  await other.goto('/');
  await api(other, `/admin/articles/${record._id}`, { method: 'PATCH', body: { dek: 'Edited in the second window.', changeNote: 'Second window save', expectedRevision: record.revisionCount } });
  await other.close();

  await page.getByLabel('Article body in markdown').fill('This must not be written over the other window.');
  await saveDraftButton(page).click();
  await expect(page.getByRole('alert')).toContainText('This article changed elsewhere');
  const stored = await Article.findOne({ title }).lean();
  expect(stored.dek).toBe('Edited in the second window.');
  expect(stored.body).toContain('Saved from the first window.');
});
