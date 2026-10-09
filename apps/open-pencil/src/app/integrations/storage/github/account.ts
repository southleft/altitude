import { appCredentialServices } from '@/app/settings/credentials/app'
import type { CredentialManager } from '@/app/settings/credentials/types'

import { createGitHubClient, type GitHubFetch } from './client'
import { githubIdentity, identityFromUser, type GitHubIdentity } from './identity'
import {
  createOAuthState,
  githubOAuthStartURL,
  GitHubOAuthError,
  waitForGitHubOAuthToken
} from './oauth'
import { GITHUB_TOKEN_REF } from './provider'

export interface GitHubAccountServices {
  manager: CredentialManager
  fetch?: GitHubFetch
  setIdentity(identity: GitHubIdentity | null): void
}

const defaultServices: GitHubAccountServices = {
  manager: appCredentialServices.manager,
  setIdentity: (identity) => {
    githubIdentity.value = identity
  }
}

/** Check a token against `/user`, then store it; the token is never kept anywhere else. */
export async function connectGitHubToken(
  token: string,
  method: GitHubIdentity['method'],
  services: GitHubAccountServices = defaultServices
): Promise<GitHubIdentity> {
  const trimmed = token.trim()
  const user = await createGitHubClient({
    token: trimmed,
    fetch: services.fetch
  }).getAuthenticatedUser()
  await services.manager.set(GITHUB_TOKEN_REF, trimmed)
  const identity = identityFromUser(user, method)
  services.setIdentity(identity)
  return identity
}

/** Hosted web flow: a popup through the Pages Functions; resolves once the token is stored. */
export async function signInWithGitHub(
  signal?: AbortSignal,
  services: GitHubAccountServices = defaultServices
): Promise<GitHubIdentity> {
  const state = createOAuthState()
  const popup = window.open(
    githubOAuthStartURL(state, import.meta.env.BASE_URL, window.location.origin),
    'open-pencil-github-oauth',
    'popup,width=640,height=760'
  )
  if (!popup) {
    throw new GitHubOAuthError('popup-blocked', 'The browser blocked the GitHub sign-in window.')
  }
  try {
    const token = await waitForGitHubOAuthToken({
      state,
      popup,
      origin: window.location.origin,
      target: window,
      signal
    })
    return await connectGitHubToken(token, 'oauth', services)
  } finally {
    popup.close()
  }
}

/** Forget the token here. Revoking the authorization itself happens in GitHub settings. */
export async function signOutOfGitHub(
  services: GitHubAccountServices = defaultServices
): Promise<void> {
  await services.manager.clear(GITHUB_TOKEN_REF)
  services.setIdentity(null)
}
