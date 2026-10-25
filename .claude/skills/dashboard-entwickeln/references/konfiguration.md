# Konfiguration – Kopiervorlagen (Plan)

Abgeleitet aus `E:\Coding\Space` (Dateien am 2026-10-24 gelesen). Mit „anpassen“ markierte Stellen sind AI-Pulse-spezifisch, der Rest ist wie in Space.

## package.json (Dashboard-Teil)

```json
{
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit -p tsconfig.app.json && vite build",
    "preview": "vite preview",
    "icons": "pwa-assets-generator"
  },
  "dependencies": {
    "@fontsource-variable/inter": "^5.3.0",
    "lucide-react": "^1.61.0",
    "react": "^19.3.1",
    "react-dom": "^19.3.1"
  },
  "devDependencies": {
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "@vite-pwa/assets-generator": "^2.0.0",
    "@vitejs/plugin-react": "^6.1.2",
    "typescript": "^7.0.2",
    "vite": "^8.3.5",
    "vite-plugin-pwa": "^2.0.0"
  }
}
```

- `typecheck` deckt laut Steckbrief `pipeline/`, `shared/`, `src/` und `worker/` ab (`shared/` steckt in `tsconfig.app.json` und in der Pipeline-Konfiguration). Beispiel: `tsc --noEmit -p tsconfig.app.json && tsc --noEmit -p tsconfig.test.json && tsc --noEmit -p tsconfig.pipeline.json && tsc --noEmit -p worker/tsconfig.json`. Abhängigkeiten der Pipeline stehen im Steckbrief.
- `build` prüft bewusst nur `src/` + `shared/` (`tsconfig.app.json`), nicht das ganze `typecheck`: `deploy.yml` baut bei jedem Daten-Push, ein Typfehler in `pipeline/` oder `worker/` darf frische Daten nicht blockieren (Skill `job-betrieb`, `references/workflows.md`). Das volle `npm run typecheck` läuft lokal vor jedem Code-Push.
- Weitere Pakete nur mit Grund: Jedes Kilobyte landet im Start-Bundle oder im Precache.

## tsconfig.app.json (src + shared)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "skipLibCheck": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vite/client", "vite-plugin-pwa/client"]
  },
  "include": ["src", "shared"],
  "exclude": ["src/**/*.test.ts"]
}
```

Abweichungen von Space: `allowImportingTsExtensions` (Importe mit `.ts`-Endung wie in der Pipeline), `erasableSyntaxOnly` (gleiche Regeln wie beim Node-Type-Stripping: kein `enum`, keine Parameter-Properties), `include` mit `shared`, kein `resolveJsonModule` (Daten nie importieren). `vite.config.ts` gehört wie in Space nicht in diese Konfiguration.

Tests (`src/**/*.test.ts`) sind ausgeschlossen: Der `types`-Filter lädt keine Node-Typen, `import … from 'node:test'` scheitert dann mit TS2591 (mit TS 7.0.2 geprüft). Sie bekommen eine eigene `tsconfig.test.json` mit denselben Optionen, aber `"types": ["node"]` (`@types/node` als devDependency) und `"include": ["src/**/*.test.ts"]`. TS 7.0.2 kennt `allowImportingTsExtensions` und `erasableSyntaxOnly` (geprüft: `enum` → TS1294).

`src/vite-env.d.ts` wie in Space:

```ts
/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string;
```

## vite.config.ts

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relative Pfade, damit die App unter skodex.github.io/ai-pulse/ läuft
  base: './',
  server: { port: 5175, strictPort: true, host: true }, // host: true = Test am Handy im WLAN
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
        theme_color: '#0f1115', // anpassen: Farbe der Kopfzeile
        background_color: '#0f1115', // anpassen
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
        globIgnores: [
          'data/**',
          '**/inter-cyrillic*.woff2',
          '**/inter-greek*.woff2',
          '**/inter-vietnamese*.woff2',
        ],
        runtimeCaching: [
          {
            // Wird als Quelltext in sw.js kopiert: keine Variablen aus dieser Datei verwenden
            urlPattern: ({ url }) =>
              url.origin === self.location.origin &&
              url.pathname.includes('/data/') &&
              url.pathname.endsWith('.json'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'aipulse-data',
              networkTimeoutSeconds: 4,
              fetchOptions: { cache: 'no-cache' }, // Pages sendet max-age=600
              expiration: { maxEntries: 60, maxAgeSeconds: 14 * 86400 },
            },
          },
        ],
      },
    }),
  ],
});
```

Space hat zusätzlich `importScripts: ['push-sw.js']`, Wetter-, NASA- und Geocoding-Routen sowie `chunkSizeWarningLimit: 800` für three.js. All das hier **nicht** übernehmen.

## index.html

```html
<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>AI Pulse</title>
    <meta name="description" content="Die wichtigsten KI-News auf Deutsch, nach Wichtigkeit sortiert." />
    <meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff" />
    <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0f1115" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="AI Pulse" />
    <link rel="icon" href="./favicon.ico" sizes="48x48" />
    <link rel="icon" href="./logo.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="./apple-touch-icon-180x180.png" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Farben sind ein Vorschlag (hell `#ffffff`, dunkel `#0f1115`); sie müssen zu den CSS-Variablen in `base.css` passen.

## src/main.tsx

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource-variable/inter';
import './styles/base.css';
import './styles/components.css';
import App from './App.tsx';

registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

## pwa-assets.config.mjs

```js
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

const bg = { background: '#0f1115', fit: 'contain' }; // anpassen

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: bg },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: bg },
  },
  images: ['public/logo.svg'],
});
```

- `padding: 0` nur, wenn das Logo einen eigenen Hintergrund und Rand hat (so in Space); sonst die Preset-Werte lassen.
- `npm run icons` erzeugt in `public/`: `favicon.ico`, `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`. Diese Dateien committen; neu erzeugen nur, wenn sich das Logo ändert.

## src/lib/router.ts

1:1 aus Space übernehmen: `parse()` trennt `#/pfad?query` in `{ path, query: URLSearchParams }`, `useRoute()` hört auf `hashchange`, `navigate(path)` setzt `location.hash`. Für AI Pulse ergänzen:

- Beim Start einen leeren Hash oder `#/` per `location.replace('#/heute')` umleiten.
- Routen in `App.tsx` über `path.split('/')` auswerten (`['', 'kategorie', '<key>']`), `key` gegen `CATEGORY_KEYS` (`shared/categories.ts`) und die Briefing-`<id>` gegen das Regex aus SKILL.md prüfen (Pfad mit Jahresordner selbst bauen).

## src/config.ts

```ts
// Öffentliche Konstanten: nichts Geheimes, nichts, was sich je Lauf ändert
import type { Meta } from '../shared/types.ts';

// Einzige Quelle für REPO_URL, PAGES_URL, FEEDBACK_API_URL ist shared/config.ts (Steckbrief) – hier nur re-exportieren.
// FEEDBACK_API_URL: Phase 6 (Skill feedback-worker); VITE_FEEDBACK_URL überschreibt lokal
export { REPO_URL, PAGES_URL, FEEDBACK_API_URL } from '../shared/config.ts';

// Leer bis zur Entscheidung des Nutzers zu Impressum/Datenschutz – dann entfällt die Footer-Zeile
export const LEGAL_LINKS: { label: 'Impressum' | 'Datenschutz'; href: string }[] = [];

// Gilt, wenn meta.json fehlt oder keine credits liefert
export const CREDITS_FALLBACK: Meta['credits'] = [
  { name: 'LMArena Leaderboard-Dataset', url: 'https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset', license: 'CC-BY-4.0' },
  { name: 'Epoch AI', url: 'https://epoch.ai/benchmarks/use-this-data', license: 'CC-BY-4.0' },
  { name: 'Artificial Analysis (über OpenRouter)', url: 'https://artificialanalysis.ai/' },
  { name: 'OpenRouter', url: 'https://openrouter.ai/' },
  { name: 'Open Terms Archive', url: 'https://opentermsarchive.org/', license: 'ODC-By' },
];
```

`href` in `LEGAL_LINKS` ist entweder eine eigene Route (`#/impressum`) oder eine `https`-URL; andere Schemata nicht rendern.
