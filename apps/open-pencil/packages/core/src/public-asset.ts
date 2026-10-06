/// <reference types="vite/client" />

/**
 * URL of a file in the app's `public/` folder, honouring Vite's `base` so the app works
 * when served from a sub-path (for example `/open-pencil/`).
 */
export function publicAssetURL(file: string): string {
  const base = 'env' in import.meta ? import.meta.env.BASE_URL : '/'
  const prefix = base === '/' ? '' : base.replace(/\/$/, '')
  return `${prefix}/${file.replace(/^\//, '')}`
}
