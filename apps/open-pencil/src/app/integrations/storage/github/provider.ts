import { credentialRef } from '@/app/settings/credentials/reference'
import type { CredentialRef } from '@/app/settings/credentials/types'

/**
 * GitHub version control for documents.
 *
 * Not a `storageProviderRegistry` entry: registry providers are interchangeable sync
 * backends for `.fig` bytes, while GitHub commits a JSON document folder with history and
 * conflict handling. It shares the storage domain's conventions instead: non-secret
 * preferences in settings storage, and one stable credential reference resolved at
 * operation time.
 */
export const GITHUB_PROVIDER_ID = 'github'

/** OAuth or personal access token; both are stored under the same reference. */
export const GITHUB_TOKEN_REF: CredentialRef = credentialRef(GITHUB_PROVIDER_ID, 'token')
export const GITHUB_CREDENTIAL_REFS: readonly CredentialRef[] = [GITHUB_TOKEN_REF]

/** OAuth scope: `repo` covers contents, pull requests and issues on private repositories. */
export const GITHUB_OAUTH_SCOPE = 'repo'

/** Hosted OAuth endpoints, relative to the app base (Cloudflare Pages Functions). */
export const GITHUB_OAUTH_START_PATH = 'auth/github/start'
export const GITHUB_OAUTH_MESSAGE_TYPE = 'open-pencil:github-oauth'

/** Hosted site session routes (the Pages middleware), relative to the app base. */
export const GITHUB_SITE_START_PATH = GITHUB_OAUTH_START_PATH
export const GITHUB_SITE_SESSION_PATH = 'auth/github/session'
export const GITHUB_SITE_LOGOUT_PATH = 'auth/github/logout'
export const GITHUB_SITE_SIGNED_OUT_PATH = 'auth/github/signed-out'
/** CSRF guard the middleware requires before it returns the token or ends the session. */
export const GITHUB_SITE_REQUEST_HEADER = 'X-OpenPencil-Request'

export const GITHUB_TOKEN_SETTINGS_URL = 'https://github.com/settings/personal-access-tokens/new'
export const GITHUB_APPLICATIONS_URL = 'https://github.com/settings/applications'
