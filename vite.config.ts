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
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'] },
      manifest,
    }),
  ],
  test: { include: ['tests/**/*.test.ts'], testTimeout: 120000 },
});
