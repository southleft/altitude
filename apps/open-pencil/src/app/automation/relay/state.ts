import { reactive } from 'vue'

import type { CredentialStatus } from '@/app/settings/credentials/types'

import type { RelaySocketStatus } from './client'

/**
 * Observable relay state. Kept apart from the runtime so the Connect AI
 * button can read it without loading the relay client and tool registry.
 */
export interface RelayRuntimeState {
  /** `null` until the credential store has been checked. */
  key: CredentialStatus | null
  socket: RelaySocketStatus | 'idle'
  /** When an agent request last reached this tab through the relay. */
  lastRequestAt: number | null
  /** A key operation is in flight. */
  busy: boolean
  /** A key operation failed; Connect AI shows recovery guidance. */
  keyError: boolean
}

export const relayRuntime = reactive<RelayRuntimeState>({
  key: null,
  socket: 'idle',
  lastRequestAt: null,
  busy: false,
  keyError: false
})
