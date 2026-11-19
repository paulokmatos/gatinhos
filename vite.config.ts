/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { manifest } from './src/manifest.ts';

import pkg from './package.json' with { type: 'json' };

const buildDate = new Date().toISOString().slice(0, 10);

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(`${pkg.version} · ${buildDate}`) },
  base: '/gatinhos/',
  worker: { format: 'es' },
  plugins: [
    VitePWA({
      // 'prompt': a versão nova é baixada em segundo plano e só entra em uso quando o app vai para segundo plano
      // ou na próxima abertura (nunca recarrega no meio de uma partida). Ver src/ui/pwa.ts.
      registerType: 'prompt',
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
