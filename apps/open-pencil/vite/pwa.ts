import type { Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const STARTUP_MODULE = /[/\\]src[/\\]boot\.ts$/

/**
 * Records the JavaScript a first load executes: the HTML entry, the `boot` chunk that
 * `main.ts` imports once the support gate passes, and their static imports.
 */
function collectStartupChunks(startupChunks: Set<string>): Plugin {
  return {
    name: 'open-pencil-pwa-startup-chunks',
    apply: 'build',
    generateBundle(_options, bundle) {
      startupChunks.clear()
      const chunks = new Map<string, { imports: string[] }>()
      const pending: string[] = []
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue
        chunks.set(output.fileName, output)
        if (output.isEntry || STARTUP_MODULE.test(output.facadeModuleId ?? '')) {
          pending.push(output.fileName)
        }
      }
      for (let fileName = pending.pop(); fileName; fileName = pending.pop()) {
        if (startupChunks.has(fileName)) continue
        startupChunks.add(fileName)
        pending.push(...(chunks.get(fileName)?.imports ?? []))
      }
    }
  }
}

export function openPencilPwaPlugin(base = '/') {
  const startupChunks = new Set<string>()
  return [
    collectStartupChunks(startupChunks),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: false },
      workbox: {
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,wasm,png,svg,ico,ttf,webmanifest}'],
        // Precache what an offline first load runs. Lazily loaded chunks (exporters, the
        // code editor, language grammars, workers) are cached the first time they load.
        manifestTransforms: [
          (entries) => ({
            manifest: entries.filter(
              (entry) => !entry.url.endsWith('.js') || startupChunks.has(entry.url)
            ),
            warnings: []
          })
        ],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/[^/]+\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'open-pencil-lazy-chunks',
              expiration: { maxEntries: 300 }
            }
          }
        ],
        navigateFallback: `${base}index.html`
      },
      manifest: {
        name: 'OpenPencil',
        short_name: 'OpenPencil',
        description: 'Open-source design editor',
        display: 'standalone',
        orientation: 'any',
        start_url: base,
        scope: base,
        theme_color: '#1e1e1e',
        background_color: '#1e1e1e',
        categories: ['design', 'productivity'],
        icons: [
          { src: `${base}brand/pwa-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: `${base}brand/pwa-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: `${base}brand/pwa-maskable-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ]
}
