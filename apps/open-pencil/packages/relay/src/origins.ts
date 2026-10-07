/**
 * Origins allowed to open the tab WebSocket (and to call `/mcp` from a browser).
 * Entries are exact origins or `scheme://*.host` wildcards; `:*` matches any port.
 */
export const DEFAULT_ALLOWED_ORIGINS = [
  'https://altitude.pages.dev',
  'https://*.altitude.pages.dev',
  'http://localhost:*',
  'http://127.0.0.1:*',
  'https://*.localhost'
] as const

export function parseAllowedOrigins(value: string | undefined): string[] {
  const entries = (value ?? '')
    .split(',')
    .map((entry) => entry.trim().replace(/\/+$/, ''))
    .filter(Boolean)
  return entries.length > 0 ? entries : [...DEFAULT_ALLOWED_ORIGINS]
}

function matchesPattern(origin: URL, pattern: string): boolean {
  const match = /^(https?):\/\/(\*\.)?([^/:]+)(?::(\d+|\*))?$/.exec(pattern)
  if (!match) return false
  const [, scheme, wildcard, host, port] = match
  if (origin.protocol !== `${scheme}:`) return false
  // `:*` matches any port, including the default; no port means the default only.
  if (port !== '*' && (port || '') !== origin.port) return false
  if (wildcard) return origin.hostname.endsWith(`.${host}`)
  return origin.hostname === host
}

export function isAllowedOrigin(origin: string | null, allowed: readonly string[]): boolean {
  if (!origin) return false
  let parsed: URL
  try {
    parsed = new URL(origin)
  } catch {
    return false
  }
  if (parsed.origin !== origin) return false
  return allowed.some((pattern) => matchesPattern(parsed, pattern))
}
