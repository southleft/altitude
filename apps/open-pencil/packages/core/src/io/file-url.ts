const WINDOWS_DRIVE_PATH = /^\/[A-Za-z]:\//

/**
 * Filesystem path for a `file:` URL, matching Node's `fileURLToPath` for drive and POSIX
 * paths without importing `node:url` into browser-shipped modules. The URL pathname of
 * a Windows file keeps a leading slash (`/D:/…`) that the filesystem rejects.
 */
export function filePathFromURL(url: URL): string {
  const path = decodeURIComponent(url.pathname)
  if (url.host && url.host !== 'localhost') return `//${url.host}${path}`
  return WINDOWS_DRIVE_PATH.test(path) ? path.slice(1) : path
}
