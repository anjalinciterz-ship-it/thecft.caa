import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from './api';
import {
  blogCategories,
  categoryLabel,
  loadBody as loadStaticBody,
  hasBody as hasStaticBody,
  posts as staticPosts,
  postMeta,
  readingMinutes,
} from '../data/blog';

/**
 * The library is server-first so the admin can publish without a code change,
 * but the shipped essays stay visible when the API is unreachable: a stalled
 * backend must not empty the reading room.
 */
const BlogContext = createContext(null);

function toRow(article) {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    // The public API calls a topic a section; the library has always called it
    // a category, and the filter chips are keyed that way.
    category: article.section,
    series: article.series || null,
    part: article.part ?? null,
    dek: article.dek || '',
    image: article.cover?.url || null,
    coverAlt: article.cover?.alt || article.title,
    date: article.publishedAt,
    readingMinutes: article.readingMinutes ?? null,
    tags: article.tags || [],
    authorName: article.authorName || null,
    remote: true,
  };
}

function mergeRows(remote) {
  if (!remote) return staticPosts;
  const bySlug = new Map(remote.map((row) => [row.slug, row]));
  // Republishing an archive essay under its old slug replaces the placeholder.
  const replaced = staticPosts.map((row) => bySlug.get(row.slug) || row);
  const known = new Set(staticPosts.map((row) => row.slug));
  return [...remote.filter((row) => !known.has(row.slug)), ...replaced];
}

const bodyCache = new Map();

function loadRemoteBody(slug) {
  if (!bodyCache.has(slug)) {
    bodyCache.set(
      slug,
      apiRequest(`/articles/${encodeURIComponent(slug)}`)
        .then((data) => data?.article?.body || '')
        .catch(() => {
          // A failure must not be remembered: retry on the next visit.
          bodyCache.delete(slug);
          return '';
        }),
    );
  }
  return bodyCache.get(slug);
}

export function BlogProvider({ children }) {
  const [state, setState] = useState({ articles: null, loading: true, error: '' });

  useEffect(() => {
    const controller = new AbortController();
    apiRequest('/articles?limit=200', { signal: controller.signal })
      .then((data) => setState({ articles: Array.isArray(data?.articles) ? data.articles : [], loading: false, error: '' }))
      .catch((failure) => {
        if (failure.code !== 'ABORTED') setState({ articles: null, loading: false, error: failure.message || '' });
      });
    return () => controller.abort();
  }, []);

  const rows = useMemo(() => mergeRows(state.articles?.map(toRow)), [state.articles]);

  const value = useMemo(() => {
    const hasBody = (row) => Boolean(row?.remote) || (row ? hasStaticBody(row.slug) : false);
    return {
      rows,
      categories: blogCategories,
      categoryLabel,
      postMeta,
      source: state.articles ? 'server' : 'static',
      loading: state.loading,
      error: state.error,
      getPost: (slug) => rows.find((row) => row.slug === slug) || null,
      hasBody,
      loadBody: (row) => (row?.remote ? loadRemoteBody(row.slug) : loadStaticBody(row.slug)),
      // Same topic, and never a dead end: an article with a body beats an
      // archive stub that only points off-site.
      related: (row, count = 3) =>
        rows
          .filter((candidate) => candidate.slug !== row.slug && candidate.category === row.category)
          .sort((a, b) => Number(hasBody(b)) - Number(hasBody(a)))
          .slice(0, count),
      // The server already counted its own words; the shipped essays are
      // measured from the markdown that arrives with them.
      minutesFor: (row, body) => (row?.remote ? row.readingMinutes : body ? readingMinutes(body) : null),
    };
  }, [rows, state]);

  return <BlogContext.Provider value={value}>{children}</BlogContext.Provider>;
}

export function useBlog() {
  const context = useContext(BlogContext);
  if (!context) throw new Error('useBlog must be used inside BlogProvider');
  return context;
}
