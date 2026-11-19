export const manifest = {
  name: 'Gatinhos',
  short_name: 'Gatinhos',
  description: 'Puzzle de lógica: um gatinho por linha, coluna e cor.',
  lang: 'pt-BR',
  display: 'standalone' as const,
  orientation: 'portrait' as const,
  start_url: '/gatinhos/',
  scope: '/gatinhos/',
  background_color: '#EEF3EC',
  theme_color: '#2F6B5E',
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
