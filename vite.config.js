import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mediaStream } from './dev/media-stream.js';

export default defineConfig({
  /* The audiobooks live in /media at the repo root, deliberately outside public:
     Vite only copies public into dist, so 404MB of audio no longer rides in every
     build or deploy. The dev and preview plugins stream that folder at /media
     with byte ranges, so local playback is unchanged, and production points at a
     CDN through VITE_AUDIO_BASE. */
  plugins: [react(), mediaStream(fileURLToPath(new URL('./media', import.meta.url)))],
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
