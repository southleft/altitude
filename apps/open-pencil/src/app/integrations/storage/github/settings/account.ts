import { tryOnMounted, tryOnScopeDispose } from '@vueuse/core'
import { computed, ref, shallowRef, type Ref } from 'vue'

import { appCredentialServices } from '@/app/settings/credentials/app'
import type { CredentialStatus } from '@/app/settings/credentials/types'
import { IS_TAURI } from '@/constants'

import { connectGitHubToken, signInWithGitHub, signOutOfGitHub } from '../account'
import { GitHubAPIError, type GitHubErrorKind } from '../client'
import { githubIdentity } from '../identity'
import { GitHubOAuthError } from '../oauth'
import { GITHUB_TOKEN_REF } from '../provider'

export type GitHubAccountFailure =
  | { source: 'oauth'; reason: GitHubOAuthError['reason'] }
  | { source: 'api'; kind: GitHubErrorKind | 'unknown'; resetAt: Date | null }

function describe(error: unknown): GitHubAccountFailure {
  if (error instanceof GitHubOAuthError) return { source: 'oauth', reason: error.reason }
  if (error instanceof GitHubAPIError) {
    return { source: 'api', kind: error.kind, resetAt: error.resetAt }
  }
  return { source: 'api', kind: 'unknown', resetAt: null }
}

const defaultServices = {
  status: () => appCredentialServices.manager.status(GITHUB_TOKEN_REF),
  signIn: signInWithGitHub,
  connectToken: (token: string) => connectGitHubToken(token, 'token'),
  signOut: () => signOutOfGitHub()
}

/**
 * Sign-in state for Settings. The personal access token draft is the only secret held
 * here, and it is cleared as soon as it is stored or the section closes.
 */
export function useGitHubAccountSettings(
  tokenDraft: Ref<string>,
  services: typeof defaultServices = defaultServices
) {
  const tokenStatus = ref<CredentialStatus | null>(null)
  const operation = ref<'oauth' | 'token' | 'sign-out' | null>(null)
  const failure = shallowRef<GitHubAccountFailure | null>(null)
  let controller: AbortController | null = null
  let disposed = false
  // A function, so checks after an await are not narrowed away by earlier ones.
  const isDisposed = () => disposed

  async function refreshStatus() {
    try {
      const status = await services.status()
      if (!isDisposed()) tokenStatus.value = status
    } catch {
      if (!isDisposed()) tokenStatus.value = 'unavailable'
    }
  }

  tryOnMounted(() => void refreshStatus())
  tryOnScopeDispose(() => {
    disposed = true
    controller?.abort()
    tokenDraft.value = ''
  })

  async function run(kind: 'oauth' | 'token' | 'sign-out', task: () => Promise<unknown>) {
    if (operation.value || isDisposed()) return false
    operation.value = kind
    failure.value = null
    try {
      await task()
      return true
    } catch (error) {
      if (!isDisposed() && !(error instanceof GitHubOAuthError && error.reason === 'cancelled')) {
        failure.value = describe(error)
      }
      return false
    } finally {
      operation.value = null
      controller = null
      if (!isDisposed()) await refreshStatus()
    }
  }

  return {
    identity: githubIdentity,
    tokenStatus,
    signedIn: computed(() => tokenStatus.value === 'configured' && githubIdentity.value !== null),
    /** The hosted web app can run the OAuth Functions; desktop and local dev use a token. */
    oauthAvailable: !IS_TAURI,
    operation,
    failure,
    signIn() {
      controller = new AbortController()
      const signal = controller.signal
      return run('oauth', () => services.signIn(signal))
    },
    cancelSignIn() {
      controller?.abort()
    },
    async connectToken() {
      const token = tokenDraft.value.trim()
      if (!token) return false
      const connected = await run('token', () => services.connectToken(token))
      if (connected) tokenDraft.value = ''
      return connected
    },
    signOut() {
      return run('sign-out', () => services.signOut())
    }
  }
}
