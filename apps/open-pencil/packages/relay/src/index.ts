/**
 * Cloudflare Worker entry for the hosted OpenPencil MCP relay.
 *
 *   agent ──Streamable HTTP MCP──▶ Worker ──▶ Durable Object (one per key) ◀──WebSocket── tab
 *
 * Routing, auth and limits live in `worker.ts` and `hub.ts`; this file binds
 * them to the Workers runtime (WebSocketPair, hibernation, storage).
 */
import { RelayHub, respondToMCP, type HubSocket, type HubState } from './hub'
import { readLimits } from './limits'
import { RELAY_PING_FRAME, RELAY_PONG_FRAME, RELAY_SUBPROTOCOL } from './protocol'
import { handleRequest, KEY_HASH_HEADER, type RelayEnv } from './worker'

export default {
  fetch(request: Request, env: RelayEnv): Promise<Response> {
    return handleRequest(request, env)
  }
} satisfies ExportedHandler<RelayEnv>

export class OpenPencilRelay implements DurableObject {
  private readonly hub: RelayHub

  constructor(
    private readonly ctx: DurableObjectState,
    env: RelayEnv
  ) {
    const state: HubState = {
      getWebSockets: () => ctx.getWebSockets(),
      storage: {
        get: (key) => ctx.storage.get(key),
        put: (key, value) => ctx.storage.put(key, value)
      }
    }
    this.hub = new RelayHub(state, readLimits(env))
    // Keep-alives are answered by the platform without waking a hibernated object.
    ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair(RELAY_PING_FRAME, RELAY_PONG_FRAME)
    )
  }

  async fetch(request: Request): Promise<Response> {
    const keyHash = request.headers.get(KEY_HASH_HEADER)
    if (!keyHash) return new Response('Forbidden', { status: 403 })
    const url = new URL(request.url)

    if (url.pathname === '/connect') {
      const pair = new WebSocketPair()
      const [client, server] = Object.values(pair) as [WebSocket, WebSocket]
      this.ctx.acceptWebSocket(server)
      this.hub.attach(server as HubSocket, keyHash)
      return new Response(null, {
        status: 101,
        webSocket: client,
        headers: { 'Sec-WebSocket-Protocol': RELAY_SUBPROTOCOL }
      })
    }

    if (url.pathname === '/mcp') return respondToMCP(this.hub, keyHash, request)

    return new Response('Not found', { status: 404 })
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    await this.hub.handleTabMessage(ws as HubSocket, message)
  }

  webSocketClose(ws: WebSocket, code: number): void {
    this.hub.handleTabClose(ws as HubSocket)
    // Complete the closing handshake; reserved codes cannot be sent back.
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CLOSING) {
      ws.close(code === 1005 || code === 1006 ? 1000 : code, 'Closed')
    }
  }

  webSocketError(ws: WebSocket): void {
    this.hub.handleTabClose(ws as HubSocket)
  }
}
