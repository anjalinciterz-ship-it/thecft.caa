import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import CMSBlocks, { safeCMSUrl } from '../components/CMSBlocks';
import { RequestState, useDashboardResource } from '../components/DashboardUI';
import '../styles/cms.css';

function useCMSMetadata(page) {
  const seo = page?.seo || {};
  const title = seo.title || page?.title;
  const description = seo.description || '';
  const image = safeCMSUrl(seo.ogImage, { asset: true });
  const canonical = safeCMSUrl(seo.canonicalUrl, { asset: true });
  const noIndex = Boolean(seo.noIndex);
  const path = page?.isHomepage ? '/' : `/pages/${encodeURIComponent(page?.slug || '')}`;
  useEffect(() => {
    if (!title) return undefined;
    const oldTitle = document.title;
    const cleanups = [];
    document.title = title;
    const tag = (selector, tagName, attributes) => {
      let element = document.head.querySelector(selector);
      const existing = Boolean(element);
      const previous = element ? [...element.attributes].map(({ name, value }) => [name, value]) : [];
      if (!element) { element = document.createElement(tagName); document.head.appendChild(element); }
      for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
      cleanups.push(() => {
        if (!existing) element.remove();
        else { for (const attribute of [...element.attributes]) element.removeAttribute(attribute.name); for (const [name, value] of previous) element.setAttribute(name, value); }
      });
    };
    const absolute = (url) => new URL(url, window.location.origin).href;
    tag('meta[name="description"]', 'meta', { name: 'description', content: description });
    tag('meta[name="robots"]', 'meta', { name: 'robots', content: noIndex ? 'noindex,nofollow' : 'index,follow' });
    tag('meta[property="og:title"]', 'meta', { property: 'og:title', content: title });
    tag('meta[property="og:description"]', 'meta', { property: 'og:description', content: description });
    tag('meta[property="og:image"]', 'meta', { property: 'og:image', content: image ? absolute(image) : '' });
    tag('meta[property="og:url"]', 'meta', { property: 'og:url', content: absolute(canonical || path) });
    tag('link[rel="canonical"]', 'link', { rel: 'canonical', href: absolute(canonical || path) });
    return () => { document.title = oldTitle; cleanups.reverse().forEach((cleanup) => cleanup()); };
  }, [title, description, image, canonical, noIndex, path]);
}

/** API public page shape only. Never substitutes blocks from an admin draft. */
export function CMSPublishedPage({ page }) {
  useCMSMetadata(page?.status === 'published' ? page : null);
  if (!page || page.status !== 'published') return null;
  const blocks = Array.isArray(page.blocks) ? page.blocks : [];
  const hasHero = blocks.some((block) => block.type === 'hero' && block.visible !== false);
  return <article className={`cms-public-page cms-template-${['blocks', 'landing', 'legal'].includes(page.template) ? page.template : 'blocks'}`} aria-label={page.title}>
    {!hasHero && <header className="cms-page-title"><p className="cms-eyebrow">The Centre for Transformation</p><h1>{page.title}</h1></header>}
    <CMSBlocks blocks={blocks} />
  </article>;
}

export default function CMSPage() {
  const { slug } = useParams();
  const resource = useDashboardResource(slug ? `/pages/${encodeURIComponent(slug)}` : null);
  if (resource.error?.status === 404 || (!resource.loading && !resource.error && !resource.data?.page)) return <div className="cms-public-state"><h1>Page not found</h1><p>This page is not available. Only published pages can be viewed here.</p><Link to="/" className="cms-button cms-button-gold">Return home</Link></div>;
  return <div className="cms-public-page"><RequestState resource={resource}><CMSPublishedPage page={resource.data?.page} /></RequestState></div>;
}

/** Wrap the existing homepage: <CMSHome fallback={<ExistingHome />} />.
 * The legacy homepage is used only when no CMS homepage is published, never as
 * a replacement for a saved draft or an unnoticed network failure. */
export function CMSHome({ fallback = null }) {
  const resource = useDashboardResource('/pages/home');
  if (!resource.loading && !resource.error && !resource.data?.page) return fallback;
  return <div className="cms-public-page"><RequestState resource={resource}><CMSPublishedPage page={resource.data?.page} /></RequestState></div>;
}
