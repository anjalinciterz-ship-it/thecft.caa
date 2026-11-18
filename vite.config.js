import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mediaStream } from './dev/media-stream.js';

export default defineConfig({
  /* The audiobooks live in /media at the repo root, tracked in git exactly once
     and never duplicated in public. The dev and preview servers stream that
     folder at /media with byte ranges, and every build copies it into dist, so
     the recordings ship inside the bundle and Netlify serves them as ordinary
     static files. */
  plugins: [react(), mediaStream(fileURLToPath(new URL('./media', import.meta.url)), fileURLToPath(new URL('./dist', import.meta.url)))],
  build: {
    rollupOptions: {
      output: {
        /* React and the router change far less often than the pages, so they
           live in one chunk a returning visitor keeps in cache across a deploy
           that only touches page code. */
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: process.env.CFT_DEV_API_TARGET || 'http://127.0.0.1:5000', changeOrigin: true },
    },
  },
});
