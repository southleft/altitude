import { appCredentialServices } from '@/app/settings/credentials/app'
import type { CredentialResolver } from '@/app/settings/credentials/types'

import { createGitHubClient, GitHubAPIError, type GitHubClient, type GitHubFetch } from './client'
import { GITHUB_TOKEN_REF } from './provider'

export interface GitHubRuntimeServices {
  resolver: CredentialResolver
  fetch?: GitHubFetch
}

const defaultServices: GitHubRuntimeServices = { resolver: appCredentialServices.resolver }

/** A client for one operation; the token is resolved now and lives only in that client. */
export async function resolveGitHubClient(
  services: GitHubRuntimeServices = defaultServices,
  signal?: AbortSignal
): Promise<GitHubClient> {
  const token = await services.resolver.resolve(GITHUB_TOKEN_REF)
  if (!token) throw new GitHubAPIError('unauthorized', 'Sign in to GitHub to continue.')
  return createGitHubClient({ token, fetch: services.fetch, signal })
}
