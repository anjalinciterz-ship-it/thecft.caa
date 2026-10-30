import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mediaStream } from './dev/media-stream.js';

export default defineConfig({
  plugins: [react(), mediaStream(fileURLToPath(new URL('../media', import.meta.url)))],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: process.env.CFT_DEV_API_TARGET || 'http://127.0.0.1:5000', changeOrigin: true },
    },
  },
});
