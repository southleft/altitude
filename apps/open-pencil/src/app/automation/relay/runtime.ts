/**
 * Hosted relay runtime. Loaded lazily (idle startup or a Connect AI action) so
 * the relay client stays off the critical path.
 */
import { ALL_TOOLS, CODEGEN_PROMPT } from '@open-pencil/core/tools'

import { makeFigmaFromStore } from '@/app/automation/bridge/figma-factory'
import { createAutomationCommandHandlers } from '@/app/automation/bridge/handlers'
import { disabledMCPTools } from '@/app/automation/mcp/preferences'
import type { EditorStore } from '@/app/editor/active-store'

import { isRelayToolEnabled } from './catalog'
import { connectRelay, type RelayConnection } from './client'
import { isRelayMode, relayEndpoints } from './config'
import { createRelayToolHost } from './host'
import { relayKeyService } from './key'
import { relayRuntime } from './state'
import { relayToolDefinitions } from './tools'

let connection: RelayConnection | null = null
let activeStore: (() => EditorStore) | null = null
let removeFocusListeners: (() => void) | null = null
/** Status callbacks from a replaced connection must not overwrite the current one. */
let generation = 0

function isTabFocused(): boolean {
  return document.visibilityState === 'visible' && document.hasFocus()
}

/** The same command handlers, targeting, and execution path as the local MCP bridge. */
function createAppToolHost(getStore: () => EditorStore) {
  const { handleRequest } = createAutomationCommandHandlers(makeFigmaFromStore)
  const disabled = () => new Set(disabledMCPTools.value)
  return createRelayToolHost({
    listTools: () => relayToolDefinitions(ALL_TOOLS, disabled()),
    isToolEnabled: (name) => isRelayToolEnabled(ALL_TOOLS, disabled(), name),
    runCommand: (command, args) => handleRequest(getStore(), command, args),
    codegenPrompt: () => CODEGEN_PROMPT
  })
}

function listenForFocus(report: (focused: boolean) => void): () => void {
  const update = () => report(isTabFocused())
  window.addEventListener('focus', update)
  window.addEventListener('blur', update)
  document.addEventListener('visibilitychange', update)
  return () => {
    window.removeEventListener('focus', update)
    window.removeEventListener('blur', update)
    document.removeEventListener('visibilitychange', update)
  }
}

function disconnect(): void {
  generation++
  removeFocusListeners?.()
  removeFocusListeners = null
  connection?.disconnect()
  connection = null
  relayRuntime.socket = 'idle'
}

function connect(): void {
  disconnect()
  if (!relayEndpoints || !activeStore) return
  const host = createAppToolHost(activeStore)
  const current = generation
  connection = connectRelay({
    connectURL: relayEndpoints.connectURL,
    resolveKey: () => relayKeyService.resolve(),
    handle: (method, params) => host.handle(method, params),
    onStatus: (status) => {
      if (generation === current) relayRuntime.socket = status
    },
    onAgentRequest: () => {
      relayRuntime.lastRequestAt = Date.now()
    },
    isFocused: isTabFocused,
    appVersion: __OPENPENCIL_APP_VERSION__
  })
  const linked = connection
  removeFocusListeners = listenForFocus((focused) => linked.reportFocus(focused))
}

async function refreshKeyStatus(): Promise<void> {
  try {
    relayRuntime.key = await relayKeyService.status()
  } catch {
    relayRuntime.key = 'unavailable'
  }
}

/** Link this tab to the relay when a key exists. Safe to call more than once. */
export async function startRelayRuntime(getStore: () => EditorStore): Promise<void> {
  if (!isRelayMode()) return
  activeStore = getStore
  await refreshKeyStatus()
  if (relayRuntime.key === 'configured' && activeStore === getStore) connect()
}

export function stopRelayRuntime(): void {
  activeStore = null
  disconnect()
}

/**
 * Create the key, or replace it. Replacing disconnects agents configured with
 * the old key; the tab reconnects with the new one.
 */
export async function issueRelayKey(): Promise<boolean> {
  relayRuntime.busy = true
  relayRuntime.keyError = false
  try {
    await relayKeyService.issue()
    relayRuntime.lastRequestAt = null
    await refreshKeyStatus()
    if (relayRuntime.key === 'configured') connect()
    return true
  } catch {
    relayRuntime.keyError = true
    return false
  } finally {
    relayRuntime.busy = false
  }
}
