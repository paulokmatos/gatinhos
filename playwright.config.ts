import { defineConfig, devices } from '@playwright/test';

// Testes de interface (rodam local: `npm run test:e2e`). Usam o Chrome do sistema e o build de produção
// (service worker incluído). O que depende do iPhone de verdade segue manual (docs/REGRAS.md, seção 5).
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4173/gatinhos/', trace: 'retain-on-failure' },
  webServer: { command: 'npm run build && npm run preview -- --port 4173 --strictPort', url: 'http://localhost:4173/gatinhos/', reuseExistingServer: true, timeout: 120_000 },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    { name: 'celular', use: { ...devices['Pixel 7'], channel: 'chrome' } },
  ],
});
