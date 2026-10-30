import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from './api';
import { courses as staticCourses } from '../data/courses';

// The catalog lives on the server so a new offering needs no code change, but
// public pages still fall back to the shipped content when the API is
// unreachable: a stalled backend must not take the marketing site down.
const CatalogContext = createContext({ offerings: staticCourses, source: 'static', loading: false, error: '' });

function mergeRow(staticRow, offered) {
  if (!staticRow) return offered;
  const next = { ...staticRow };
  for (const [key, value] of Object.entries(offered)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value) && !value.length && Array.isArray(next[key]) && next[key].length) continue;
    next[key] = value;
  }
  next.id = staticRow.id;
  next.slug = offered.slug || staticRow.slug;
  next.price = offered.priceMinor === undefined ? staticRow.price : offered.priceMinor / 100;
  next.currency = offered.currency || staticRow.currency || 'USD';
  return next;
}

function mergeCatalog(offerings) {
  if (!Array.isArray(offerings)) return null;
  const byId = new Map(staticCourses.map((row) => [row.id, row]));
  const bySlug = new Map(staticCourses.map((row) => [row.slug, row]));
  const rows = [];
  offerings.forEach((offered, index) => {
    const staticRow = byId.get(offered.id) || byId.get(offered.slug) || bySlug.get(offered.slug) || bySlug.get(offered.id);
    // Known offerings keep the marketing order visitors know; anything the
    // admin published later is appended in the order the server returned.
    rows.push({ row: mergeRow(staticRow, offered), order: staticRow ? staticCourses.indexOf(staticRow) : staticCourses.length + index });
  });
  rows.sort((a, b) => a.order - b.order);
  const merged = rows.map((item) => item.row);
  for (const row of staticCourses) {
    if (!merged.some((item) => item && item.id === row.id)) merged.push(row);
  }
  return merged;
}

/** Offerings resolve by the same references the server accepts. */
export function findOffering(offerings, ref) {
  const value = String(ref || '');
  if (!value) return null;
  return (offerings || []).find((item) => item && (item.id === value || item.slug === value || item.productId === value || item.legacyId === value)) || null;
}

/** Money is formatted from the offering's own currency, never assumed. */
export function formatMoney(amount, currency) {
  const code = String(currency || 'USD').toUpperCase();
  const value = Number(amount || 0);
  try {
    const parts = new Intl.NumberFormat('en-US', { style: 'currency', currency: code, minimumFractionDigits: Number.isInteger(value) ? 0 : 2 }).formatToParts(value);
    const symbol = parts.find((part) => part.type === 'currency')?.value || '';
    const digits = parts.filter((part) => part.type !== 'currency').map((part) => part.value).join('');
    return { symbol, amount: `${symbol}${digits}`, code };
  } catch {
    return { symbol: '', amount: String(value), code };
  }
}

/** Every public price on the site is {amount} {CODE}; free offerings say so. */
export function OfferingPrice({ offering, className = 'cq-price' }) {
  const price = formatMoney(offering.price, offering.currency);
  return (
    <span className={className}>
      {offering.isFree || !offering.price ? 'No cost' : <>{price.amount} <em>{price.code}</em></>}
    </span>
  );
}

export function CatalogProvider({ children }) {
  const [state, setState] = useState({ offerings: staticCourses, source: 'static', loading: true, error: '' });

  useEffect(() => {
    const controller = new AbortController();
    apiRequest('/offerings?limit=60', { signal: controller.signal })
      .then(({ offerings }) => {
        const merged = mergeCatalog(offerings);
        setState(merged
          ? { offerings: merged, source: 'server', loading: false, error: '' }
          : { offerings: staticCourses, source: 'static', loading: false, error: 'The catalog response was unreadable, so the shipped content is shown.' });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ offerings: staticCourses, source: 'static', loading: false, error: 'Showing the shipped catalog: the server catalog was unreachable.' });
      });
    return () => controller.abort();
  }, []);

  const value = useMemo(() => state, [state]);
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  return useContext(CatalogContext);
}
