import { isTauri } from '@/app/tauri/env'

export interface RelayEndpoints {
  /** Streamable HTTP MCP endpoint agents register. */
  mcpURL: string
  /** WebSocket endpoint this tab connects to. */
  connectURL: string
}

function isLoopback(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname.endsWith('.localhost')
  )
}

/**
 * Parse the build-time relay URL (`VITE_OPENPENCIL_RELAY_URL`). HTTPS is
 * required except on loopback hosts used with `wrangler dev`. A trailing
 * `/mcp` is accepted so the variable can hold the URL agents use.
 */
export function parseRelayURL(value: string | undefined): RelayEndpoints | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }
  const secure = url.protocol === 'https:'
  if (!secure && !(url.protocol === 'http:' && isLoopback(url.hostname))) return null
  if (url.username || url.password || url.search || url.hash) return null
  const path = url.pathname.replace(/\/+$/, '').replace(/\/mcp$/, '')
  const base = `${url.origin}${path}`
  return {
    mcpURL: `${base}/mcp`,
    connectURL: `${secure ? 'wss' : 'ws'}://${url.host}${path}/connect`
  }
}

export const relayEndpoints = parseRelayURL(import.meta.env.VITE_OPENPENCIL_RELAY_URL)

/**
 * The hosted relay replaces local MCP in browser builds that were given a relay
 * URL. The desktop app keeps its local server.
 */
export function isRelayMode(): boolean {
  return relayEndpoints !== null && !isTauri()
}
