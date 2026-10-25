import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relative Pfade, damit die App unter skodex.github.io/ai-pulse/ läuft
  base: './',
  server: { port: 5175, strictPort: true, host: true },
  preview: { port: 4175, strictPort: true },
  // Nur die package.json-Version – nie etwas, das sich je Lauf ändert (sonst neuer SW bei jedem Deploy)
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.1.0') },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'logo.svg'],
      manifest: {
        name: 'AI Pulse',
        short_name: 'AI Pulse',
        description: 'Die wichtigsten KI-News auf Deutsch, nach Wichtigkeit sortiert.',
        lang: 'de',
        theme_color: '#0d1220',
        background_color: '#0d1220',
        display: 'standalone',
        orientation: 'any',
        start_url: './',
        scope: './',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Daten nie vorab cachen; von Inter nur latin + latin-ext (deckt ä ö ü ß ab)
        globIgnores: ['data/**', '**/inter-cyrillic*.woff2', '**/inter-greek*.woff2', '**/inter-vietnamese*.woff2'],
        runtimeCaching: [
          {
            // Wird als Quelltext in sw.js kopiert: keine Variablen aus dieser Datei verwenden
            urlPattern: ({ url }) => url.origin === self.location.origin && url.pathname.includes('/data/') && url.pathname.endsWith('.json'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'aipulse-data',
              networkTimeoutSeconds: 4,
              fetchOptions: { cache: 'no-cache' },
              expiration: { maxEntries: 60, maxAgeSeconds: 14 * 86400 },
            },
          },
        ],
      },
    }),
  ],
});
