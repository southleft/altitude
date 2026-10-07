/**
 * Worker front door: authenticates, enforces origins and sizes, and routes
 * each connection key to its own Durable Object. Kept free of Workers-only
 * globals so `bun test` can drive it with a fake namespace.
 */
import { bearerKey, hashKey } from './auth'
import { jsonRPCError } from './mcp'
import { isAllowedOrigin, parseAllowedOrigins } from './origins'
import { keyFromSubprotocols, RELAY_ERROR_CODES, RELAY_MAX_FRAME_BYTES } from './protocol'

/** Header carrying the key digest from the Worker to its Durable Object. */
export const KEY_HASH_HEADER = 'x-open-pencil-key-hash'

export interface RelayStub {
  fetch(request: Request): Promise<Response>
}

/** The subset of `DurableObjectNamespace` the Worker uses. */
export interface RelayNamespace {
  idFromName(name: string): unknown
  get(id: unknown): RelayStub
}

export interface RelayEnv {
  RELAY: RelayNamespace
  /** Comma-separated origins; see `DEFAULT_ALLOWED_ORIGINS`. */
  ALLOWED_ORIGINS?: string
  RELAY_TIMEOUT_MS?: string
  RELAY_RATE_BURST?: string
  RELAY_RATE_PER_SECOND?: string
}

const CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Authorization, Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id, Mcp-Protocol-Version',
  'Access-Control-Max-Age': '600'
}

function corsHeaders(origin: string | null, allowed: readonly string[]): Record<string, string> {
  if (!origin || !isAllowedOrigin(origin, allowed)) return {}
  return { ...CORS_HEADERS, 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }
}

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers }
  })
}

function stubFor(env: RelayEnv, keyHash: string): RelayStub {
  return env.RELAY.get(env.RELAY.idFromName(keyHash))
}

async function readBody(request: Request): Promise<string | null> {
  const declared = Number(request.headers.get('Content-Length') ?? '0')
  if (declared > RELAY_MAX_FRAME_BYTES) return null
  const buffer = await request.arrayBuffer()
  if (buffer.byteLength > RELAY_MAX_FRAME_BYTES) return null
  return new TextDecoder().decode(buffer)
}

async function handleMCP(request: Request, env: RelayEnv, allowed: string[]): Promise<Response> {
  const origin = request.headers.get('Origin')
  const cors = corsHeaders(origin, allowed)
  // Browsers always send Origin; reject pages that are not on the allowlist.
  if (origin && !isAllowedOrigin(origin, allowed)) {
    return json(jsonRPCError(null, RELAY_ERROR_CODES.invalidRequest, 'Origin not allowed'), 403)
  }
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

  const key = bearerKey(request.headers.get('Authorization'))
  if (!key) {
    return json(
      jsonRPCError(
        null,
        RELAY_ERROR_CODES.unauthorized,
        'Missing or invalid connection key. Copy the command from Connect AI in the hosted OpenPencil editor; it includes an "Authorization: Bearer <key>" header.'
      ),
      401,
      { ...cors, 'WWW-Authenticate': 'Bearer realm="open-pencil"' }
    )
  }

  if (request.method === 'GET' || request.method === 'DELETE') {
    // Stateless server: no SSE stream and no sessions to terminate.
    return new Response(null, { status: 405, headers: { ...cors, Allow: 'POST, OPTIONS' } })
  }
  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers: { ...cors, Allow: 'POST, OPTIONS' } })
  }

  const body = await readBody(request)
  if (body === null) {
    return json(
      jsonRPCError(null, RELAY_ERROR_CODES.tooLarge, 'Request body exceeds the 8 MB limit'),
      413,
      cors
    )
  }
  const keyHash = await hashKey(key)
  const forwarded = new Request('https://relay.internal/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', [KEY_HASH_HEADER]: keyHash },
    body
  })
  const response = await stubFor(env, keyHash).fetch(forwarded)
  const headers = new Headers(response.headers)
  for (const [name, value] of Object.entries(cors)) headers.set(name, value)
  return new Response(response.body, { status: response.status, headers })
}

async function handleConnect(
  request: Request,
  env: RelayEnv,
  allowed: string[]
): Promise<Response> {
  if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
    return new Response('Expected a WebSocket upgrade', { status: 426 })
  }
  if (!isAllowedOrigin(request.headers.get('Origin'), allowed)) {
    return new Response('Origin not allowed', { status: 403 })
  }
  const key = keyFromSubprotocols(request.headers.get('Sec-WebSocket-Protocol'))
  if (!key) return new Response('Missing or invalid connection key', { status: 401 })
  const keyHash = await hashKey(key)
  // The key token must not travel further than this Worker.
  const headers = new Headers({ Upgrade: 'websocket', [KEY_HASH_HEADER]: keyHash })
  const forwarded = new Request('https://relay.internal/connect', { headers })
  return stubFor(env, keyHash).fetch(forwarded)
}

export async function handleRequest(request: Request, env: RelayEnv): Promise<Response> {
  const url = new URL(request.url)
  const allowed = parseAllowedOrigins(env.ALLOWED_ORIGINS)
  switch (url.pathname) {
    case '/health':
      return new Response('ok', { headers: { 'Content-Type': 'text/plain' } })
    case '/mcp':
      return handleMCP(request, env, allowed)
    case '/connect':
      return handleConnect(request, env, allowed)
    default:
      return new Response('Not found', { status: 404 })
  }
}
