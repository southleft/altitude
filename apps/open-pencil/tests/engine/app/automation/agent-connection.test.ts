import { describe, expect, test } from 'bun:test'

import {
  AGENT_ACTIVITY_WINDOW_MS,
  resolveAgentConnectionStatus,
  type AgentConnectionInput
} from '@/app/automation/mcp/agent/status'

const NOW = 1_000_000_000

function status(overrides: Partial<AgentConnectionInput> = {}) {
  return resolveAgentConnectionStatus({
    supported: true,
    runtimeStatus: 'running',
    lastClientRequestAt: null,
    now: NOW,
    ...overrides
  })
}

describe('agent connection status', () => {
  test('builds without local MCP hosting are unavailable regardless of runtime state', () => {
    expect(status({ supported: false, lastClientRequestAt: NOW })).toBe('unavailable')
  })

  test('reflects a server that is not running', () => {
    expect(status({ runtimeStatus: 'idle' })).toBe('starting')
    expect(status({ runtimeStatus: 'starting' })).toBe('starting')
    expect(status({ runtimeStatus: 'stopped', lastClientRequestAt: NOW })).toBe('offline')
    expect(status({ runtimeStatus: 'error' })).toBe('offline')
  })

  test('a running server waits until a client request arrives', () => {
    expect(status()).toBe('waiting')
    expect(status({ lastClientRequestAt: NOW - 1_000 })).toBe('connected')
  })

  test('connection expires after the activity window', () => {
    expect(status({ lastClientRequestAt: NOW - AGENT_ACTIVITY_WINDOW_MS })).toBe('connected')
    expect(status({ lastClientRequestAt: NOW - AGENT_ACTIVITY_WINDOW_MS - 1 })).toBe('waiting')
  })
})
