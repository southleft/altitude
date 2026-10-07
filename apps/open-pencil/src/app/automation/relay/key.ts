import { encodeBase64 } from '@open-pencil/core/bytes'

import { appCredentialServices } from '@/app/settings/credentials/app'
import { credentialRef } from '@/app/settings/credentials/reference'
import type { CredentialServices } from '@/app/settings/credentials/services'
import type { CredentialStatus } from '@/app/settings/credentials/types'

/** Stable reference for the hosted relay connection key. */
export const RELAY_KEY_CREDENTIAL = credentialRef('open-pencil-relay', 'connection-key')

const KEY_BYTES = 32

/** A fresh bearer key: 32 random bytes, base64url without padding (43 characters). */
export function generateRelayKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(KEY_BYTES))
  return encodeBase64(bytes, 'base64url').replace(/=+$/, '')
}

/**
 * The key lives only in the credential store. Callers resolve it for the
 * moment they need it (connecting, copying, revealing) and do not retain it.
 */
export function createRelayKeyService(services: CredentialServices = appCredentialServices) {
  return {
    status: (): Promise<CredentialStatus> => services.manager.status(RELAY_KEY_CREDENTIAL),
    resolve: (): Promise<string | null> => services.resolver.resolve(RELAY_KEY_CREDENTIAL),
    /** Create or replace the key. Replacing it invalidates every agent using the old one. */
    async issue(): Promise<void> {
      await services.manager.set(RELAY_KEY_CREDENTIAL, generateRelayKey())
    }
  }
}

export type RelayKeyService = ReturnType<typeof createRelayKeyService>

export const relayKeyService = createRelayKeyService()
