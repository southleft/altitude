import { RelayHub, respondToMCP, type HubSocket, type HubState } from '../src/hub'
import { DEFAULT_LIMITS, type RelayLimits } from '../src/limits'
import type { RelayRequestFrame } from '../src/protocol'
import { KEY_HASH_HEADER, type RelayEnv, type RelayNamespace } from '../src/worker'

export const KEY = 'k'.repeat(43)
export const OTHER_KEY = 'o'.repeat(43)

export class FakeSocket implements HubSocket {
  sent: string[] = []
  closed: { code?: number; reason?: string } | null = null
  private attachment: unknown = null
  constructor(private readonly hubSockets: Set<FakeSocket>) {}

  send(data: string) {
    if (this.closed) throw new Error('closed')
    this.sent.push(data)
  }
  close(code?: number, reason?: string) {
    this.closed = { code, reason }
    this.hubSockets.delete(this)
  }
  serializeAttachment(value: unknown) {
    this.attachment = structuredClone(value)
  }
  deserializeAttachment() {
    return this.attachment
  }
  frames(): unknown[] {
    return this.sent.map((data) => JSON.parse(data) as unknown)
  }
  requests(): RelayRequestFrame[] {
    return this.frames().filter(
      (frame): frame is RelayRequestFrame =>
        typeof frame === 'object' &&
        frame !== null &&
        (frame as { type?: unknown }).type === 'request'
    )
  }
  lastRequest(): RelayRequestFrame {
    const request = this.requests().at(-1)
    if (!request) throw new Error('No request sent to this socket')
    return request
  }
}

export function createHub(limits: Partial<RelayLimits> = {}, now: () => number = Date.now) {
  const sockets = new Set<FakeSocket>()
  const storage = new Map<string, unknown>()
  const state: HubState = {
    getWebSockets: () => [...sockets],
    storage: {
      get: async (key: string) => storage.get(key),
      put: async (key: string, value: unknown) => {
        storage.set(key, value)
      }
    }
  }
  let counter = 0
  const hub = new RelayHub(state, {
    ...DEFAULT_LIMITS,
    ...limits,
    now,
    createId: () => `req-${++counter}`
  })
  function connect(keyHash: string): FakeSocket {
    const socket = new FakeSocket(sockets)
    sockets.add(socket)
    hub.attach(socket, keyHash)
    return socket
  }
  return { hub, sockets, storage, connect }
}

/** Answer the most recent request on `socket` once it arrives. */
export async function answer(socket: FakeSocket, hub: RelayHub, result: unknown) {
  await waitFor(() => socket.requests().some((request) => !request.id.startsWith('refresh:')))
  const request = socket.requests().findLast((r) => !r.id.startsWith('refresh:'))
  if (!request) throw new Error('No request')
  await hub.handleTabMessage(socket, JSON.stringify({ type: 'response', id: request.id, result }))
  return request
}

export async function waitFor(check: () => boolean, timeoutMs = 1000) {
  const started = Date.now()
  while (!check()) {
    if (Date.now() - started > timeoutMs) throw new Error('Timed out waiting for condition')
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 1)
    })
  }
}

/** A namespace whose stubs answer `/mcp` through real hubs, one per key digest. */
export function createNamespace(limits: Partial<RelayLimits> = {}) {
  const hubs = new Map<string, ReturnType<typeof createHub>>()
  function hubFor(keyHash: string) {
    let entry = hubs.get(keyHash)
    if (!entry) {
      entry = createHub(limits)
      hubs.set(keyHash, entry)
    }
    return entry
  }
  const namespace: RelayNamespace = {
    idFromName: (name) => name,
    get: (id) => ({
      fetch: async (request: Request) => {
        const keyHash = request.headers.get(KEY_HASH_HEADER) ?? ''
        if (keyHash !== id) throw new Error('Routed to the wrong object')
        const url = new URL(request.url)
        if (url.pathname === '/mcp') return respondToMCP(hubFor(keyHash).hub, keyHash, request)
        return new Response('upgrade accepted', {
          headers: { 'x-protocol': request.headers.get('Sec-WebSocket-Protocol') ?? 'none' }
        })
      }
    })
  }
  const env: RelayEnv = { RELAY: namespace }
  return { env, hubFor, hubs }
}

export function mcpRequest(body: unknown, init: { key?: string | null; origin?: string } = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream'
  }
  const key = init.key === undefined ? KEY : init.key
  if (key) headers.Authorization = `Bearer ${key}`
  if (init.origin) headers.Origin = init.origin
  return new Request('https://relay.example/mcp', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body)
  })
}
