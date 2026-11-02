# The Centre for Transformation — frontend

Single-page marketing and member site for The Centre for Transformation (courses, books,
journeys, blog, testimonials, FAQ, connect) built with Vite, React and React Router.

## Stack

- Vite 5 + React 18 (JavaScript, no TypeScript)
- react-router-dom 6 for client-side routing
- No UI framework: design tokens and page bands live in `src/styles/global.css`
- Playwright for the end-to-end suite, `node --test` for unit tests

## Commands

```
npm install       # install dependencies
npm run dev       # local dev server
npm run build     # production output in dist/
npm run preview   # serve dist/ locally
npm run test:unit # unit tests (no backend needed)
npm run test:e2e  # Playwright suite (needs the API running)
```

`npm test` runs both; without a backend, use `npm run test:unit`.

## Layout

```
src/components    header, footer, cards, shared UI
src/pages         one file per route
src/data          content used when the API is unavailable
src/lib           API client, auth, catalog, blog, appearance
src/styles        global.css (tokens + every page band), appearance.css (Ivory theme)
public/images     static artwork
public/_redirects SPA fallback: /* -> /index.html 200
```

## Backend

All requests are relative to `/api/v1` (see `src/lib/api.js`), so the frontend expects the
API on the same origin as the site. Without it, public pages render from `src/data` and the
member areas show a readable "session unavailable" state.

## Deploy

`dist/` is the artifact. It must keep the SPA fallback rule (`/* -> /index.html 200`) so
deep links such as `/blog/the-moments-that-quietly-change-your-life` resolve, and it needs
`/api/v1` proxied to the backend on the same host.
