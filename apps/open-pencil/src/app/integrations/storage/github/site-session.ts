import { useSessionStorage } from '@vueuse/core'
import * as v from 'valibot'

import { appCredentialServices } from '@/app/settings/credentials/app'
import type { CredentialManager } from '@/app/settings/credentials/types'
import { IS_TAURI } from '@/constants'

import { connectGitHubToken, type GitHubAccountServices } from './account'
import type { GitHubFetch } from './client'
import { githubIdentity, type GitHubIdentity } from './identity'
import {
  GITHUB_SITE_LOGOUT_PATH,
  GITHUB_SITE_REQUEST_HEADER,
  GITHUB_SITE_SESSION_PATH,
  GITHUB_SITE_SIGNED_OUT_PATH,
  GITHUB_SITE_START_PATH,
  GITHUB_TOKEN_REF
} from './provider'

/**
 * The hosted editor's site session (the Pages middleware at the Altitude root gates
 * `/open-pencil/` behind GitHub sign-in). Signing in to the site already authorized
 * GitHub, so the app takes that token through the same-origin session endpoint instead of
 * opening a second popup. Desktop and local development have no such endpoint and keep
 * the popup and personal access token flows.
 */

const SiteSessionSchema = v.object({
  login: v.string(),
  id: v.number(),
  avatar: v.string(),
  permission: v.picklist(['pull', 'push', 'admin']),
  token: v.optional(v.pipe(v.string(), v.minLength(1)))
})

const UnauthenticatedSchema = v.object({ error: v.literal('unauthenticated') })

/** Do not bounce to sign-in again within this window (cookies blocked, clock skew). */
const SIGN_IN_REDIRECT_COOLDOWN_MS = 60_000
const lastSignInRedirect = useSessionStorage('open-pencil:github:site-sign-in-redirect', 0)

export type SiteSession =
  | { kind: 'session'; login: string; token: string | null }
  | { kind: 'signed-out' }
  | { kind: 'unavailable' }

export type SiteSessionSignIn =
  | { status: 'signed-in'; identity: GitHubIdentity }
  | { status: 'already-signed-in' }
  | { status: 'signed-out' }
  | { status: 'unavailable' }

export interface SiteSessionServices extends GitHubAccountServices {
  manager: CredentialManager
  /** False on desktop and in development builds, where no site session exists. */
  hosted: boolean
  /** Same-origin requests to the site's auth routes. */
  siteFetch: GitHubFetch
  base: string
  origin: string
  /** The current path and query, to come back to after signing in. */
  here(): string
  navigate(url: string): void
  /** Whether a sign-in redirect may happen now; records it when it may. */
  claimSignInRedirect(): boolean
}

export function siteAuthURL(path: string, base: string, origin: string): string {
  return new URL(path, new URL(base, origin)).toString()
}

function claimSignInRedirect(): boolean {
  if (Date.now() - lastSignInRedirect.value < SIGN_IN_REDIRECT_COOLDOWN_MS) return false
  lastSignInRedirect.value = Date.now()
  return true
}

function defaultServices(): SiteSessionServices {
  return {
    manager: appCredentialServices.manager,
    setIdentity: (identity) => {
      githubIdentity.value = identity
    },
    hosted: !IS_TAURI && import.meta.env.PROD,
    siteFetch: (input, init) => fetch(input, init),
    base: import.meta.env.BASE_URL,
    origin: window.location.origin,
    here: () => window.location.pathname + window.location.search,
    navigate: (url) => window.location.assign(url),
    claimSignInRedirect
  }
}

async function readJSON(response: Response): Promise<unknown> {
  if (!(response.headers.get('Content-Type') ?? '').includes('application/json')) return null
  return response.json().catch(() => null)
}

/**
 * Who the site session belongs to. The token is requested only when `withToken`; the
 * response is never cached and the token is handed straight to the credential manager.
 */
export async function readSiteSession(
  services: Pick<SiteSessionServices, 'siteFetch' | 'base' | 'origin'>,
  withToken: boolean
): Promise<SiteSession> {
  let response: Response
  try {
    response = await services.siteFetch(
      siteAuthURL(GITHUB_SITE_SESSION_PATH, services.base, services.origin),
      {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: withToken ? { [GITHUB_SITE_REQUEST_HEADER]: '1' } : {}
      }
    )
  } catch {
    return { kind: 'unavailable' }
  }
  const body = await readJSON(response)
  if (response.status === 401 && v.is(UnauthenticatedSchema, body)) return { kind: 'signed-out' }
  if (!response.ok) return { kind: 'unavailable' }
  const parsed = v.safeParse(SiteSessionSchema, body)
  if (!parsed.success) return { kind: 'unavailable' }
  return { kind: 'session', login: parsed.output.login, token: parsed.output.token ?? null }
}

/**
 * On startup in the hosted editor: when no GitHub credential is stored yet, store the site
 * session's token through the credential manager and set the identity. When the site
 * session has ended (a page served from the offline cache), send the page to sign-in.
 */
export async function signInFromSiteSession(
  services: SiteSessionServices = defaultServices()
): Promise<SiteSessionSignIn> {
  if (!services.hosted) return { status: 'unavailable' }
  try {
    const stored = await services.manager.status(GITHUB_TOKEN_REF)
    const session = await readSiteSession(services, stored === 'missing')
    if (session.kind === 'signed-out') {
      if (services.claimSignInRedirect()) {
        const start = new URL(siteAuthURL(GITHUB_SITE_START_PATH, services.base, services.origin))
        start.searchParams.set('return_to', services.here())
        services.navigate(start.toString())
      }
      return { status: 'signed-out' }
    }
    if (session.kind === 'unavailable') return { status: 'unavailable' }
    if (stored !== 'missing') return { status: 'already-signed-in' }
    if (!session.token) return { status: 'unavailable' }
    const identity = await connectGitHubToken(session.token, 'oauth', services)
    return { status: 'signed-in', identity }
  } catch {
    // GitHub or the credential store failed; Settings still offers the manual flows.
    return { status: 'unavailable' }
  }
}

/**
 * End the site session too, then leave for the signed-out page. Returns false (and stays
 * on the page) where there is no site session to end.
 */
export async function endSiteSession(
  services: Pick<
    SiteSessionServices,
    'hosted' | 'siteFetch' | 'base' | 'origin' | 'navigate'
  > = defaultServices()
): Promise<boolean> {
  if (!services.hosted) return false
  let response: Response
  try {
    response = await services.siteFetch(
      siteAuthURL(GITHUB_SITE_LOGOUT_PATH, services.base, services.origin),
      {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        redirect: 'manual',
        headers: { [GITHUB_SITE_REQUEST_HEADER]: '1' }
      }
    )
  } catch {
    return false
  }
  // A 303 to the signed-out page; `redirect: 'manual'` makes it opaque in browsers.
  if (response.type !== 'opaqueredirect' && response.status !== 303) return false
  services.navigate(siteAuthURL(GITHUB_SITE_SIGNED_OUT_PATH, services.base, services.origin))
  return true
}
