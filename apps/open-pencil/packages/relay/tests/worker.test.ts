import { describe, expect, test } from 'bun:test'

import { constantTimeEqual, hashKey } from '../src/auth'
import { isAllowedOrigin, parseAllowedOrigins } from '../src/origins'
import { RELAY_ERROR_CODES, RELAY_MAX_FRAME_BYTES, relaySubprotocols } from '../src/protocol'
import { handleRequest } from '../src/worker'
import { answer, createNamespace, KEY, mcpRequest, OTHER_KEY } from './support'

describe('relay worker', () => {
  test('health check', async () => {
    const { env } = createNamespace()
    const response = await handleRequest(new Request('https://relay.example/health'), env)
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('ok')
  })

  test('rejects missing and malformed keys with a JSON-RPC error', async () => {
    const { env } = createNamespace()
    for (const key of [null, 'short', `${'k'.repeat(43)}!`]) {
      const response = await handleRequest(
        mcpRequest({ jsonrpc: '2.0', id: 1, method: 'ping' }, { key }),
        env
      )
      expect(response.status).toBe(401)
      expect(response.headers.get('WWW-Authenticate')).toContain('Bearer')
      expect(await response.json()).toMatchObject({
        error: { code: RELAY_ERROR_CODES.unauthorized }
      })
    }
  })

  test('answers initialize without a tab and forwards tools/list to the tab for that key', async () => {
    const { env, hubFor } = createNamespace()
    const init = await handleRequest(
      mcpRequest({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
      env
    )
    expect(init.headers.get('Content-Type')).toContain('application/json')
    expect(await init.json()).toMatchObject({ result: { serverInfo: { name: 'open-pencil' } } })

    const keyHash = await hashKey(KEY)
    const { hub, connect } = hubFor(keyHash)
    const tab = connect(keyHash)
    const pending = handleRequest(mcpRequest({ jsonrpc: '2.0', id: 2, method: 'tools/list' }), env)
    await answer(tab, hub, { tools: [{ name: 'get_selection', inputSchema: { type: 'object' } }] })
    expect(await (await pending).json()).toMatchObject({
      id: 2,
      result: { tools: [{ name: 'get_selection' }] }
    })
  })

  test('different keys reach different objects', async () => {
    const { env, hubFor } = createNamespace()
    const keyHash = await hashKey(KEY)
    hubFor(keyHash).connect(keyHash)
    const response = await handleRequest(
      mcpRequest(
        { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'x' } },
        { key: OTHER_KEY }
      ),
      env
    )
    expect(await response.json()).toMatchObject({ error: { code: RELAY_ERROR_CODES.noTab } })
  })

  test('notifications are accepted with 202 and no body', async () => {
    const { env } = createNamespace()
    const response = await handleRequest(
      mcpRequest({ jsonrpc: '2.0', method: 'notifications/initialized' }),
      env
    )
    expect(response.status).toBe(202)
    expect(await response.text()).toBe('')
  })

  test('rejects oversized bodies and unparsable JSON', async () => {
    const { env } = createNamespace()
    const big = await handleRequest(mcpRequest('x'.repeat(RELAY_MAX_FRAME_BYTES + 1)), env)
    expect(big.status).toBe(413)
    const invalid = await handleRequest(mcpRequest('{not json'), env)
    expect(invalid.status).toBe(400)
    expect(await invalid.json()).toMatchObject({ error: { code: RELAY_ERROR_CODES.parseError } })
  })

  test('GET and DELETE are not supported by this stateless server', async () => {
    const { env } = createNamespace()
    for (const method of ['GET', 'DELETE']) {
      const response = await handleRequest(
        new Request('https://relay.example/mcp', {
          method,
          headers: { Authorization: `Bearer ${KEY}` }
        }),
        env
      )
      expect(response.status).toBe(405)
    }
  })

  test('browser origins must be allowlisted; preflight gets CORS headers', async () => {
    const { env } = createNamespace()
    const blocked = await handleRequest(
      mcpRequest({ jsonrpc: '2.0', id: 1, method: 'ping' }, { origin: 'https://evil.example' }),
      env
    )
    expect(blocked.status).toBe(403)
    const preflight = await handleRequest(
      new Request('https://relay.example/mcp', {
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:6274' }
      }),
      env
    )
    expect(preflight.status).toBe(204)
    expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:6274')
  })

  test('tab connections need an upgrade, an allowed origin, and a key subprotocol', async () => {
    const { env } = createNamespace()
    const connect = (headers: Record<string, string>) =>
      handleRequest(new Request('https://relay.example/connect', { headers }), env)
    expect((await connect({})).status).toBe(426)
    const offered = relaySubprotocols(KEY).join(', ')
    expect(
      (
        await connect({
          Upgrade: 'websocket',
          Origin: 'https://evil.example',
          'Sec-WebSocket-Protocol': offered
        })
      ).status
    ).toBe(403)
    expect(
      (
        await connect({
          Upgrade: 'websocket',
          Origin: 'https://altitude.pages.dev',
          'Sec-WebSocket-Protocol': 'open-pencil-relay.v1'
        })
      ).status
    ).toBe(401)
    const accepted = await connect({
      Upgrade: 'websocket',
      Origin: 'https://feat-x.altitude.pages.dev',
      'Sec-WebSocket-Protocol': offered
    })
    expect(accepted.status).toBe(200)
    // The key never travels past the Worker.
    expect(accepted.headers.get('x-protocol')).toBe('none')
  })
})

describe('origins and keys', () => {
  test('origin patterns', () => {
    const allowed = parseAllowedOrigins(undefined)
    expect(isAllowedOrigin('https://altitude.pages.dev', allowed)).toBe(true)
    expect(isAllowedOrigin('https://my-branch.altitude.pages.dev', allowed)).toBe(true)
    expect(isAllowedOrigin('https://altitude.pages.dev.evil.example', allowed)).toBe(false)
    expect(isAllowedOrigin('http://altitude.pages.dev', allowed)).toBe(false)
    expect(isAllowedOrigin('http://localhost:1420', allowed)).toBe(true)
    expect(isAllowedOrigin('https://open-pencil.localhost', allowed)).toBe(true)
    expect(isAllowedOrigin(null, allowed)).toBe(false)
    expect(isAllowedOrigin('null', allowed)).toBe(false)
    expect(parseAllowedOrigins('https://a.example/, https://b.example')).toEqual([
      'https://a.example',
      'https://b.example'
    ])
  })

  test('digests compare in constant time and differ per key', async () => {
    const digest = await hashKey(KEY)
    expect(digest).toMatch(/^[0-9a-f]{64}$/)
    expect(constantTimeEqual(digest, await hashKey(KEY))).toBe(true)
    expect(constantTimeEqual(digest, await hashKey(OTHER_KEY))).toBe(false)
    expect(constantTimeEqual(digest, digest.slice(1))).toBe(false)
  })
})
