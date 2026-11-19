/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { manifest } from './src/manifest.ts';

export default defineConfig({
  base: '/gatinhos/',
  worker: { format: 'es' },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      // inclui o Worker do gerador no cache offline
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        // fontes do Google (Baloo 2 / Nunito) ficam em cache para o modo offline
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
      manifest,
    }),
  ],
  test: { include: ['tests/**/*.test.ts'], testTimeout: 120000 },
});
