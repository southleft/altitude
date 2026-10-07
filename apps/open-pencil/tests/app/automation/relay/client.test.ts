import { describe, expect, test } from 'bun:test'

import { RELAY_ERROR_CODES, RELAY_SUBPROTOCOL } from '@open-pencil/relay/protocol'

import {
  connectRelay,
  relayReconnectDelay,
  type RelayClientOptions,
  type RelaySocket,
  type RelaySocketStatus
} from '@/app/automation/relay/client'

const KEY = 'k'.repeat(43)

class FakeSocket implements RelaySocket {
  readyState = 0
  sent: unknown[] = []
  closedWith: number | undefined
  onopen: RelaySocket['onopen'] = null
  onmessage: RelaySocket['onmessage'] = null
  onclose: RelaySocket['onclose'] = null
  onerror: RelaySocket['onerror'] = null
  constructor(
    readonly url: string,
    readonly protocols: string[]
  ) {}
  send(data: string) {
    this.sent.push(JSON.parse(data))
  }
  close(code = 1000) {
    this.closedWith = code
    this.readyState = 3
    this.onclose?.({ code })
  }
  open() {
    this.readyState = 1
    this.onopen?.({})
  }
  receive(frame: unknown) {
    this.onmessage?.({ data: JSON.stringify(frame) })
  }
  drop() {
    this.readyState = 3
    this.onclose?.({ code: 1006 })
  }
}

async function settle(ms = 5) {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

function harness(overrides: Partial<RelayClientOptions> = {}) {
  const sockets: FakeSocket[] = []
  const statuses: RelaySocketStatus[] = []
  const agentRequests: string[] = []
  const handled: { method: string; params: unknown }[] = []
  const connection = connectRelay({
    connectURL: 'wss://relay.example/connect',
    resolveKey: async () => KEY,
    handle: async (method, params) => {
      handled.push({ method, params })
      return { result: { tools: [] } }
    },
    onStatus: (status) => statuses.push(status),
    onAgentRequest: (method) => agentRequests.push(method),
    isFocused: () => true,
    createSocket: (url, protocols) => {
      const socket = new FakeSocket(url, protocols)
      sockets.push(socket)
      return socket
    },
    reconnectDelay: () => 1,
    ...overrides
  })
  return { connection, sockets, statuses, agentRequests, handled }
}

describe('relay client', () => {
  test('offers the key only as a subprotocol token and says hello on open', async () => {
    const { sockets, statuses, connection } = harness()
    await settle()
    const [socket] = sockets
    expect(socket.url).toBe('wss://relay.example/connect')
    expect(socket.protocols).toEqual([RELAY_SUBPROTOCOL, `op-key.${KEY}`])
    socket.open()
    expect(socket.sent[0]).toEqual({ type: 'hello', focused: true })
    socket.receive({ type: 'welcome', timeoutMs: 60000, maxFrameBytes: 8 })
    expect(statuses.at(-1)).toBe('open')
    connection.reportFocus(false)
    expect(socket.sent.at(-1)).toEqual({ type: 'focus', focused: false })
    connection.disconnect()
  })

  test('answers forwarded requests; relay refreshes are not agent activity', async () => {
    const { sockets, agentRequests, handled, connection } = harness()
    await settle()
    const [socket] = sockets
    socket.open()
    socket.receive({ type: 'request', id: 'r1', method: 'tools/list', params: {} })
    socket.receive({ type: 'request', id: 'refresh:x', method: 'tools/list', params: {} })
    await settle()
    expect(handled).toHaveLength(2)
    expect(agentRequests).toEqual(['tools/list'])
    expect(socket.sent).toContainEqual({ type: 'response', id: 'r1', result: { tools: [] } })
    connection.disconnect()
  })

  test('replaces results that exceed the frame limit with an error', async () => {
    const { sockets, connection } = harness({
      handle: async () => ({ result: 'x'.repeat(9 * 1024 * 1024) })
    })
    await settle()
    const [socket] = sockets
    socket.open()
    socket.receive({ type: 'request', id: 'big', method: 'tools/call', params: { name: 'a' } })
    await settle(20)
    expect(socket.sent.at(-1)).toMatchObject({
      type: 'response',
      id: 'big',
      error: { code: RELAY_ERROR_CODES.tooLarge }
    })
    connection.disconnect()
  })

  test('reconnects after an unexpected close and stops after disconnect', async () => {
    const { sockets, statuses, connection } = harness()
    await settle()
    sockets[0].open()
    sockets[0].drop()
    expect(statuses.at(-1)).toBe('closed')
    await settle(20)
    expect(sockets).toHaveLength(2)
    connection.disconnect()
    expect(sockets[1].closedWith).toBe(1000)
    await settle(20)
    expect(sockets).toHaveLength(2)
  })

  test('does not connect without a key', async () => {
    const { sockets, statuses } = harness({ resolveKey: async () => null })
    await settle()
    expect(sockets).toHaveLength(0)
    expect(statuses).toEqual(['connecting', 'closed'])
  })

  test('ignores malformed relay frames', async () => {
    const { sockets, handled, connection } = harness()
    await settle()
    sockets[0].open()
    sockets[0].onmessage?.({ data: 'not json' })
    sockets[0].receive({ type: 'request', id: 'x', method: 'resources/list' })
    await settle()
    expect(handled).toEqual([])
    connection.disconnect()
  })

  test('backoff grows exponentially with jitter and caps at 30 s', () => {
    expect(relayReconnectDelay(0, () => 0)).toBe(500)
    expect(relayReconnectDelay(0, () => 0.999)).toBeLessThanOrEqual(1000)
    expect(relayReconnectDelay(3, () => 0)).toBe(4000)
    expect(relayReconnectDelay(20, () => 0.999)).toBeLessThanOrEqual(30_000)
  })
})
