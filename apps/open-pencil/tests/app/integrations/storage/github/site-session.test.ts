import { beforeEach, describe, expect, test } from 'bun:test'

import type { GitHubIdentity } from '@/app/integrations/storage/github/identity'
import {
  GITHUB_SITE_REQUEST_HEADER,
  GITHUB_TOKEN_REF
} from '@/app/integrations/storage/github/provider'
import {
  endSiteSession,
  signInFromSiteSession,
  type SiteSessionServices
} from '@/app/integrations/storage/github/site-session'
import { MemoryCredentialStore } from '@/app/settings/credentials/memory'
import { createCredentialServices } from '@/app/settings/credentials/services'

import { FakeGitHub } from '#tests/helpers/github/fake'

const ORIGIN = 'https://altitude.pages.dev'
const BASE = '/open-pencil/'
const SESSION_URL = `${ORIGIN}/open-pencil/auth/github/session`

type SiteRequest = { url: string; init: RequestInit }

function harness(respond: (request: SiteRequest) => Response) {
  const github = new FakeGitHub()
  const store = new MemoryCredentialStore()
  const { manager, resolver } = createCredentialServices(store)
  const requests: SiteRequest[] = []
  const navigations: string[] = []
  const identities: Array<GitHubIdentity | null> = []
  let redirectAllowed = true
  const services: SiteSessionServices = {
    manager,
    fetch: github.fetch,
    setIdentity: (identity) => identities.push(identity),
    hosted: true,
    siteFetch: async (url, init) => {
      const request = { url, init }
      requests.push(request)
      return respond(request)
    },
    base: BASE,
    origin: ORIGIN,
    here: () => '/open-pencil/share/abc?x=1',
    navigate: (url) => navigations.push(url),
    claimSignInRedirect: () => {
      const allowed = redirectAllowed
      redirectAllowed = false
      return allowed
    }
  }
  return { github, manager, resolver, requests, navigations, identities, services }
}

const session = (extra: Record<string, unknown> = {}) =>
  Response.json({
    login: 'octo',
    id: 7,
    avatar: 'https://avatars.example/octo',
    permission: 'push',
    ...extra
  })

const headerOf = (request: SiteRequest | undefined) =>
  new Headers(request?.init.headers).get(GITHUB_SITE_REQUEST_HEADER)

describe('signing in from the hosted site session', () => {
  let site: ReturnType<typeof harness>

  beforeEach(async () => {
    site = harness(({ init }) =>
      new Headers(init.headers).get(GITHUB_SITE_REQUEST_HEADER) === '1'
        ? session({ token: 'gho_site' })
        : session()
    )
    await site.github.init()
  })

  test('stores the session token and sets the identity when nothing is stored', async () => {
    const result = await signInFromSiteSession(site.services)
    expect(result.status).toBe('signed-in')
    expect(site.requests).toHaveLength(1)
    expect(site.requests[0]?.url).toBe(SESSION_URL)
    expect(headerOf(site.requests[0])).toBe('1')
    expect(site.requests[0]?.init.credentials).toBe('same-origin')
    expect(await site.resolver.resolve(GITHUB_TOKEN_REF)).toBe('gho_site')
    expect(site.identities).toEqual([
      {
        id: 7,
        login: 'octo',
        name: 'Octo Cat',
        avatarURL: 'https://avatars.example/octo',
        method: 'oauth'
      }
    ])
    expect(site.navigations).toEqual([])
  })

  test('keeps an existing credential and never asks for the token', async () => {
    await site.manager.set(GITHUB_TOKEN_REF, 'ghp_personal')
    const result = await signInFromSiteSession(site.services)
    expect(result.status).toBe('already-signed-in')
    expect(headerOf(site.requests[0])).toBeNull()
    expect(await site.resolver.resolve(GITHUB_TOKEN_REF)).toBe('ghp_personal')
    expect(site.identities).toEqual([])
  })

  test('does nothing outside the hosted build', async () => {
    const result = await signInFromSiteSession({ ...site.services, hosted: false })
    expect(result.status).toBe('unavailable')
    expect(site.requests).toEqual([])
  })

  test('an ended site session sends the page to sign-in once', async () => {
    const ended = harness(() => Response.json({ error: 'unauthenticated' }, { status: 401 }))
    expect((await signInFromSiteSession(ended.services)).status).toBe('signed-out')
    expect((await signInFromSiteSession(ended.services)).status).toBe('signed-out')
    expect(ended.navigations).toEqual([
      `${ORIGIN}/open-pencil/auth/github/start?return_to=%2Fopen-pencil%2Fshare%2Fabc%3Fx%3D1`
    ])
    expect(await ended.resolver.resolve(GITHUB_TOKEN_REF)).toBeNull()
  })

  test('no session endpoint (development server, password fallback) is not an error', async () => {
    for (const response of [
      () => new Response('<!doctype html>', { headers: { 'Content-Type': 'text/html' } }),
      () => Response.json({ error: 'not found' }, { status: 404 }),
      () => new Response('Unauthorized', { status: 401 }),
      () => Response.json({ login: 'octo' })
    ]) {
      const other = harness(response)
      expect((await signInFromSiteSession(other.services)).status).toBe('unavailable')
      expect(other.navigations).toEqual([])
      expect(await other.resolver.resolve(GITHUB_TOKEN_REF)).toBeNull()
    }
    const offline = harness(() => {
      throw new TypeError('offline')
    })
    expect((await signInFromSiteSession(offline.services)).status).toBe('unavailable')
  })

  test('a token GitHub rejects is not stored', async () => {
    site.github.failures.push({ pattern: /\/user$/, status: 401 })
    const result = await signInFromSiteSession(site.services)
    expect(result.status).toBe('unavailable')
    expect(await site.resolver.resolve(GITHUB_TOKEN_REF)).toBeNull()
    expect(site.identities).toEqual([])
  })
})

describe('ending the site session', () => {
  test('posts the guarded logout and leaves for the signed-out page', async () => {
    const site = harness(() => new Response(null, { status: 303 }))
    expect(await endSiteSession(site.services)).toBe(true)
    expect(site.requests[0]?.url).toBe(`${ORIGIN}/open-pencil/auth/github/logout`)
    expect(site.requests[0]?.init.method).toBe('POST')
    expect(site.requests[0]?.init.redirect).toBe('manual')
    expect(headerOf(site.requests[0])).toBe('1')
    expect(site.navigations).toEqual([`${ORIGIN}/open-pencil/auth/github/signed-out`])
  })

  test('stays put where there is no site session', async () => {
    const missing = harness(() => new Response('Not found.', { status: 404 }))
    expect(await endSiteSession(missing.services)).toBe(false)
    expect(missing.navigations).toEqual([])
    const desktop = harness(() => new Response(null, { status: 303 }))
    expect(await endSiteSession({ ...desktop.services, hosted: false })).toBe(false)
    expect(desktop.requests).toEqual([])
  })
})
