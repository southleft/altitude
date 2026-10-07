import { describe, expect, test } from 'bun:test'

import { relaySetupCommands } from '@/app/automation/mcp/agent/setup'
import { resolveRelayAgentStatus } from '@/app/automation/mcp/agent/status'
import { parseRelayURL } from '@/app/automation/relay/config'
import { generateRelayKey } from '@/app/automation/relay/key'

describe('hosted relay setup', () => {
  test('relay URLs: HTTPS anywhere, HTTP only on loopback, /mcp accepted', () => {
    expect(parseRelayURL('https://relay.example.workers.dev')).toEqual({
      mcpURL: 'https://relay.example.workers.dev/mcp',
      connectURL: 'wss://relay.example.workers.dev/connect'
    })
    expect(parseRelayURL('https://relay.example.workers.dev/mcp/')).toEqual({
      mcpURL: 'https://relay.example.workers.dev/mcp',
      connectURL: 'wss://relay.example.workers.dev/connect'
    })
    expect(parseRelayURL('http://127.0.0.1:8787')?.connectURL).toBe('ws://127.0.0.1:8787/connect')
    expect(parseRelayURL('http://relay.example')).toBeNull()
    expect(parseRelayURL('https://user:pass@relay.example')).toBeNull()
    expect(parseRelayURL('')).toBeNull()
    expect(parseRelayURL(undefined)).toBeNull()
  })

  test('keys are 32 random bytes in base64url', () => {
    const key = generateRelayKey()
    expect(key).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(generateRelayKey()).not.toBe(key)
  })

  test('the Claude Code command is one line with user scope and the bearer header', () => {
    const { claudeCode, clientConfig } = relaySetupCommands('https://relay.example/mcp', 'KEY')
    expect(claudeCode).toBe(
      'claude mcp add --scope user --transport http open-pencil https://relay.example/mcp --header "Authorization: Bearer KEY"'
    )
    expect(claudeCode).not.toContain('\n')
    expect(JSON.parse(clientConfig)).toEqual({
      mcpServers: {
        'open-pencil': {
          type: 'http',
          url: 'https://relay.example/mcp',
          headers: { Authorization: 'Bearer KEY' }
        }
      }
    })
  })

  test('status follows the key, the socket, and agent activity', () => {
    const base = {
      key: 'configured' as const,
      socket: 'open' as const,
      lastRequestAt: null,
      now: 1e9
    }
    expect(resolveRelayAgentStatus({ ...base, key: null })).toBe('starting')
    expect(resolveRelayAgentStatus({ ...base, key: 'missing' })).toBe('setup')
    expect(resolveRelayAgentStatus({ ...base, key: 'unavailable' })).toBe('offline')
    expect(resolveRelayAgentStatus({ ...base, socket: 'connecting' })).toBe('starting')
    expect(resolveRelayAgentStatus({ ...base, socket: 'closed' })).toBe('offline')
    expect(resolveRelayAgentStatus(base)).toBe('waiting')
    expect(resolveRelayAgentStatus({ ...base, lastRequestAt: 1e9 - 1000 })).toBe('connected')
    expect(resolveRelayAgentStatus({ ...base, lastRequestAt: 1e9 - 16 * 60_000 })).toBe('waiting')
  })
})
