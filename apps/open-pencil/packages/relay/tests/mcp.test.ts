import { describe, expect, test } from 'bun:test'

import { handleMCPBody, negotiateProtocolVersion, type MCPBackend } from '../src/mcp'
import { RELAY_ERROR_CODES } from '../src/protocol'

const unreachable: MCPBackend = {
  forward: async () => {
    throw new Error('must not forward')
  }
}

describe('MCP JSON-RPC handling', () => {
  test('initialize negotiates the protocol version and advertises tools', async () => {
    const response = await handleMCPBody(
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't' } }
      },
      unreachable
    )
    expect(response).toMatchObject({
      id: 1,
      result: {
        protocolVersion: '2025-06-18',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'open-pencil' }
      }
    })
  })

  test('falls back to the latest version for unknown requests', () => {
    expect(negotiateProtocolVersion('1999-01-01')).toBe('2025-11-25')
    expect(negotiateProtocolVersion(undefined)).toBe('2025-11-25')
  })

  test('notifications and client responses get no answer', async () => {
    expect(
      await handleMCPBody({ jsonrpc: '2.0', method: 'notifications/initialized' }, unreachable)
    ).toBeNull()
    expect(await handleMCPBody({ jsonrpc: '2.0', id: 3, result: {} }, unreachable)).toBeNull()
  })

  test('ping, unknown methods, invalid messages, and batches', async () => {
    expect(await handleMCPBody({ jsonrpc: '2.0', id: 'p', method: 'ping' }, unreachable)).toEqual({
      jsonrpc: '2.0',
      id: 'p',
      result: {}
    })
    expect(
      await handleMCPBody({ jsonrpc: '2.0', id: 2, method: 'resources/list' }, unreachable)
    ).toMatchObject({ error: { code: RELAY_ERROR_CODES.methodNotFound } })
    expect(await handleMCPBody({ id: 2, method: 'ping' }, unreachable)).toMatchObject({
      id: null,
      error: { code: RELAY_ERROR_CODES.invalidRequest }
    })
    const batch = await handleMCPBody(
      [
        { jsonrpc: '2.0', id: 1, method: 'ping' },
        { jsonrpc: '2.0', method: 'notifications/initialized' }
      ],
      unreachable
    )
    expect(batch).toEqual([{ jsonrpc: '2.0', id: 1, result: {} }])
  })

  test('tools/call requires a name before anything is forwarded', async () => {
    expect(
      await handleMCPBody({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: {} }, unreachable)
    ).toMatchObject({ error: { code: RELAY_ERROR_CODES.invalidParams } })
  })
})
