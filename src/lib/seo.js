import { useEffect } from 'react';

const setMeta = (attr, key, content) => {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

export function usePageMeta({ title, description, path, jsonLd }) {
  const ld = jsonLd ? JSON.stringify(jsonLd) : null;
  useEffect(() => {
    const prevTitle = document.title;
    if (title) document.title = title;
    if (description) setMeta('name', 'description', description);

    let link = document.head.querySelector('link[rel="canonical"]');
    if (path) {
      if (!link) {
        link = document.createElement('link');
        link.rel = 'canonical';
        document.head.appendChild(link);
      }
      link.href = window.location.origin + path;
    }

    let script = document.getElementById('page-jsonld');
    if (ld) {
      if (!script) {
        script = document.createElement('script');
        script.id = 'page-jsonld';
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = ld;
    } else if (script) {
      script.remove();
    }

    return () => {
      document.title = prevTitle;
      const s = document.getElementById('page-jsonld');
      if (s) s.remove();
    };
  }, [title, description, path, ld]);
}

export const courseJsonLd = (c) => ({
  '@context': 'https://schema.org',
  '@type': 'Course',
  name: c.name,
  description: c.short,
  provider: {
    '@type': 'Organization',
    name: 'The Centre for Transformation',
    sameAs: 'https://thecft.ca',
  },
  offers: {
    '@type': 'Offer',
    price: c.price,
    priceCurrency: String(c.currency || 'USD').toUpperCase(),
    url: 'https://thecft.ca/course/' + c.id,
    availability: 'https://schema.org/InStock',
  },
});
