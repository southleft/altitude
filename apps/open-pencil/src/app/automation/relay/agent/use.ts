import { useTimeoutFn } from '@vueuse/core'
import { computed, onScopeDispose, readonly, shallowRef } from 'vue'

import { relaySetupCommands, type RelaySetupCommands } from '@/app/automation/mcp/agent/setup'

import { relayKeyService } from '../key'
import { relayRuntime } from '../state'

/** A revealed key hides itself again after this long. */
const REVEAL_DURATION_MS = 60_000

export type RelayCommandKind = keyof RelaySetupCommands

/**
 * Connect AI controls for the hosted relay. The key is resolved only for the
 * moment it is copied or while the user keeps it revealed, and is dropped when
 * the owning scope is disposed.
 */
export function useRelayAgentControls(mcpURL: string) {
  const revealedKey = shallowRef<string | null>(null)
  // Invalidates reveals that resolve after the key was replaced or hidden.
  let revision = 0
  const autoHide = useTimeoutFn(hide, REVEAL_DURATION_MS, { immediate: false })

  function hide(): void {
    revision++
    autoHide.stop()
    revealedKey.value = null
  }

  async function reveal(): Promise<void> {
    const request = ++revision
    const key = await relayKeyService.resolve()
    if (request !== revision) return
    revealedKey.value = key
    if (key) autoHide.start()
  }

  /** The full command for copying; null when no key is stored. */
  async function commandFor(kind: RelayCommandKind): Promise<string | null> {
    const key = await relayKeyService.resolve()
    return key ? relaySetupCommands(mcpURL, key)[kind] : null
  }

  /** Create the first key, or replace the current one (old agent configs stop working). */
  async function issueKey(): Promise<boolean> {
    hide()
    const { issueRelayKey } = await import('../runtime')
    return issueRelayKey()
  }

  onScopeDispose(hide)

  return {
    mcpURL,
    revealedKey: readonly(revealedKey),
    keyConfigured: computed(() => relayRuntime.key === 'configured'),
    busy: computed(() => relayRuntime.busy),
    keyError: computed(() => relayRuntime.keyError),
    lastRequestAt: computed(() => relayRuntime.lastRequestAt),
    reveal,
    hide,
    commandFor,
    issueKey
  }
}

export type RelayAgentControls = ReturnType<typeof useRelayAgentControls>
