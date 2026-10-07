import { describe, expect, test } from 'bun:test'

import { NO_TAB_MESSAGE } from '../src/hub'
import { RELAY_CLOSE, RELAY_ERROR_CODES, RELAY_MAX_FRAME_BYTES } from '../src/protocol'
import { answer, createHub, waitFor } from './support'

const HASH = 'a'.repeat(64)
const OTHER_HASH = 'b'.repeat(64)

function call(id: number, name = 'get_selection') {
  return { jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: {} } }
}

describe('relay hub', () => {
  test('welcomes a tab and forwards tools/call to it', async () => {
    const { hub, connect } = createHub()
    const tab = connect(HASH)
    expect(tab.frames()[0]).toMatchObject({ type: 'welcome', maxFrameBytes: RELAY_MAX_FRAME_BYTES })

    const pending = hub.handleMCP(HASH, call(7))
    const request = await answer(tab, hub, { content: [{ type: 'text', text: 'ok' }] })
    expect(request).toMatchObject({
      method: 'tools/call',
      params: { name: 'get_selection', arguments: {} }
    })
    expect(await pending).toEqual({
      status: 200,
      body: { jsonrpc: '2.0', id: 7, result: { content: [{ type: 'text', text: 'ok' }] } }
    })
  })

  test('reports an actionable error when no tab is connected', async () => {
    const { hub } = createHub()
    const result = await hub.handleMCP(HASH, call(1))
    expect(result.body).toEqual({
      jsonrpc: '2.0',
      id: 1,
      error: { code: RELAY_ERROR_CODES.noTab, message: NO_TAB_MESSAGE }
    })
  })

  test('serves the last tool list while no tab is connected', async () => {
    const { hub, connect, sockets } = createHub()
    const tab = connect(HASH)
    const list = hub.handleMCP(HASH, { jsonrpc: '2.0', id: 1, method: 'tools/list' })
    await answer(tab, hub, { tools: [{ name: 'get_selection', inputSchema: {} }] })
    await list
    sockets.clear()
    const cached = await hub.handleMCP(HASH, { jsonrpc: '2.0', id: 2, method: 'tools/list' })
    expect(cached.body).toMatchObject({ id: 2, result: { tools: [{ name: 'get_selection' }] } })
  })

  test('refreshes the tool cache when a tab says hello', async () => {
    const { hub, connect, storage } = createHub()
    const tab = connect(HASH)
    await hub.handleTabMessage(tab, JSON.stringify({ type: 'hello', focused: true }))
    const refresh = tab.requests().find((request) => request.id.startsWith('refresh:'))
    expect(refresh?.method).toBe('tools/list')
    await hub.handleTabMessage(
      tab,
      JSON.stringify({ type: 'response', id: refresh?.id, result: { tools: [] } })
    )
    expect(storage.get('tools-list')).toEqual({ tools: [] })
  })

  test('times out when the tab does not answer', async () => {
    const { hub, connect } = createHub({ timeoutMs: 20 })
    connect(HASH)
    const result = await hub.handleMCP(HASH, call(3))
    expect(result.body).toMatchObject({ id: 3, error: { code: RELAY_ERROR_CODES.timeout } })
  })

  test('fails in-flight requests when the tab disconnects', async () => {
    const { hub, connect } = createHub()
    const tab = connect(HASH)
    const pending = hub.handleMCP(HASH, call(4))
    await waitFor(() => tab.requests().length > 0)
    tab.close(1001)
    hub.handleTabClose(tab)
    expect((await pending).body).toMatchObject({ id: 4, error: { code: RELAY_ERROR_CODES.noTab } })
  })

  test('routes to the focused tab, then the most recently active one', async () => {
    let clock = 1000
    const { hub, connect } = createHub({}, () => clock)
    const first = connect(HASH)
    clock++
    const second = connect(HASH)
    expect(hub.selectTab(HASH)).toBe(second)

    clock++
    await hub.handleTabMessage(first, JSON.stringify({ type: 'focus', focused: true }))
    expect(hub.selectTab(HASH)).toBe(first)

    clock++
    await hub.handleTabMessage(first, JSON.stringify({ type: 'focus', focused: false }))
    clock++
    await hub.handleTabMessage(second, JSON.stringify({ type: 'focus', focused: false }))
    // Neither is focused: the one that reported activity last wins.
    expect(hub.selectTab(HASH)).toBe(second)
  })

  test('never routes across keys', () => {
    const { hub, connect } = createHub()
    connect(OTHER_HASH)
    expect(hub.selectTab(HASH)).toBeNull()
  })

  test('ignores responses from a tab that was not asked', async () => {
    const { hub, connect } = createHub({ timeoutMs: 30 })
    const asked = connect(HASH)
    const other = connect(OTHER_HASH)
    const pending = hub.handleMCP(HASH, call(5))
    await waitFor(() => asked.requests().length > 0)
    const id = asked.lastRequest().id
    await hub.handleTabMessage(other, JSON.stringify({ type: 'response', id, result: 'forged' }))
    expect((await pending).body).toMatchObject({ error: { code: RELAY_ERROR_CODES.timeout } })
  })

  test('closes the socket on oversized, binary, or invalid frames', async () => {
    const { hub, connect } = createHub()
    const big = connect(HASH)
    await hub.handleTabMessage(big, 'x'.repeat(RELAY_MAX_FRAME_BYTES + 1))
    expect(big.closed?.code).toBe(RELAY_CLOSE.tooLarge)

    const binary = connect(HASH)
    await hub.handleTabMessage(binary, new ArrayBuffer(4))
    expect(binary.closed?.code).toBe(RELAY_CLOSE.invalidFrame)

    const invalid = connect(HASH)
    await hub.handleTabMessage(invalid, JSON.stringify({ type: 'response' }))
    expect(invalid.closed?.code).toBe(RELAY_CLOSE.invalidFrame)
  })

  test('rate-limits each key with a token bucket', async () => {
    let clock = 0
    const { hub } = createHub({ rateBurst: 2, ratePerSecond: 1 }, () => clock)
    const ping = { jsonrpc: '2.0', id: 1, method: 'ping' }
    expect((await hub.handleMCP(HASH, ping)).status).toBe(200)
    expect((await hub.handleMCP(HASH, ping)).status).toBe(200)
    const limited = await hub.handleMCP(HASH, ping)
    expect(limited.status).toBe(429)
    expect(limited.body).toMatchObject({ error: { code: RELAY_ERROR_CODES.rateLimited } })
    clock += 1000
    expect((await hub.handleMCP(HASH, ping)).status).toBe(200)
  })

  test('returns tab errors as JSON-RPC errors', async () => {
    const { hub, connect } = createHub()
    const tab = connect(HASH)
    const pending = hub.handleMCP(HASH, call(9))
    await waitFor(() => tab.requests().length > 0)
    await hub.handleTabMessage(
      tab,
      JSON.stringify({
        type: 'response',
        id: tab.lastRequest().id,
        error: { code: -32602, message: 'Unknown tool' }
      })
    )
    expect((await pending).body).toEqual({
      jsonrpc: '2.0',
      id: 9,
      error: { code: -32602, message: 'Unknown tool' }
    })
  })
})
