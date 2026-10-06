/// <reference types="vite/client" />

/**
 * URL of a file in the app's `public/` folder, honouring Vite's `base` so the app works
 * when served from a sub-path (for example `/open-pencil/`).
 *
 * `import.meta.env` must be read directly: Vite replaces that expression at build time,
 * but a runtime probe such as `'env' in import.meta` is false in the browser bundle and
 * would silently fall back to `/`. Outside Vite (Bun, Node) it is absent or lacks
 * `BASE_URL`, which also means `/`.
 */
export function publicAssetURL(file: string): string {
  // Typed as always present, but undefined outside Vite.
  const env = import.meta.env as Partial<ImportMetaEnv> | undefined
  const base = env?.BASE_URL ?? '/'
  const prefix = base === '/' ? '' : base.replace(/\/$/, '')
  return `${prefix}/${file.replace(/^\//, '')}`
}
