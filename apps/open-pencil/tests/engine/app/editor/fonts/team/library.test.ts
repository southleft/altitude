import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

import { gitBlobSHA } from '@open-pencil/core/io/formats/document-json'

import { createMemoryTeamFontCache, type TeamFontCache } from '@/app/editor/fonts/team/cache'
import {
  createGitHubTeamFontLibrary,
  teamFontsFolderURL,
  type TeamFontLibraryStatus
} from '@/app/editor/fonts/team/library'
import { createGitHubClient, GitHubAPIError } from '@/app/integrations/storage/github/client'

import { createGitHubRoutes } from '#tests/helpers/github/routes'
import { testPath } from '#tests/helpers/paths'

const LOCATION = { owner: 'southleft', repo: 'altitude-designs', branch: 'main' }
const CONTENTS = /^\/repos\/southleft\/altitude-designs\/contents\/fonts\?ref=main$/
const BLOB = /^\/repos\/southleft\/altitude-designs\/git\/blobs\/([0-9a-f]+)$/

const OTF = new Uint8Array(readFileSync(testPath('fixtures/fonts/NotoSansCJK-Test.otf')))
const TTF = new Uint8Array(readFileSync(testPath('fixtures/fonts/NotoNaskhArabic-Regular.ttf')))

type Routes = ReturnType<typeof createGitHubRoutes>

/** A scripted `fonts/` folder whose blobs answer the raw media type. */
async function repository(files: Record<string, Uint8Array>) {
  const api = createGitHubRoutes()
  const blobs = new Map<string, Uint8Array>()
  const entries: Array<{ type: string; name: string; path: string; sha: string; size: number }> = []
  for (const [name, bytes] of Object.entries(files)) {
    const sha = await gitBlobSHA(bytes)
    blobs.set(sha, bytes)
    entries.push({ type: 'file', name, path: `fonts/${name}`, sha, size: bytes.byteLength })
  }
  api.on('GET', CONTENTS, () => Response.json(entries))
  api.on('GET', BLOB, (_request, match) => {
    const bytes = blobs.get(match[1])
    if (!bytes) return Response.json({ message: 'Not Found' }, { status: 404 })
    return new Response(bytes, { headers: { 'content-length': String(bytes.byteLength) } })
  })
  return { api, entries }
}

function library(api: Routes, options: { signedIn?: boolean; cache?: TeamFontCache } = {}) {
  const statuses: TeamFontLibraryStatus[] = []
  const cache = options.cache ?? createMemoryTeamFontCache()
  const created = createGitHubTeamFontLibrary({
    resolveClient: async () =>
      options.signedIn === false
        ? null
        : createGitHubClient({ token: 'secret-token', fetch: api.fetch }),
    location: () => LOCATION,
    cache,
    onStatus: (status) => statuses.push(status)
  })
  return { fonts: created, statuses, cache }
}

const blobRequests = (api: Routes) => api.matching('GET', /\/git\/blobs\//)

describe('GitHub team font library', () => {
  test('lists fonts/ from the manifest and name tables', async () => {
    const manifest = new TextEncoder().encode(
      JSON.stringify({ fonts: [{ family: 'Agrandir', weight: 800, file: 'Agrandir.ttf' }] })
    )
    const { api } = await repository({
      'fonts.json': manifest,
      'Agrandir.ttf': TTF,
      'Noto.otf': OTF,
      'README.md': new TextEncoder().encode('# Team fonts')
    })
    const { fonts, statuses } = library(api)

    const faces = await fonts.listFaces()

    expect(faces.map((face) => [face.family, face.style])).toEqual([
      ['Agrandir', 'ExtraBold'],
      ['Noto Sans CJK SC', 'Regular']
    ])
    expect(fonts.label).toBe('altitude-designs')
    expect(statuses.at(-1)).toMatchObject({ state: 'ready', faceCount: 2, fromCache: false })
  })

  test('sends the token only in the Authorization header and asks for raw blobs', async () => {
    const { api } = await repository({ 'Noto.otf': OTF })
    const { fonts } = library(api)
    await fonts.listFaces()

    expect(api.requests.length).toBeGreaterThan(0)
    for (const request of api.requests) {
      expect(request.url.href).not.toContain('secret-token')
      expect(request.headers.authorization).toBe('Bearer secret-token')
    }
    expect(blobRequests(api)[0].headers.accept).toBe('application/vnd.github.raw+json')
  })

  test('downloads bytes once and serves later sessions from the cache', async () => {
    const { api } = await repository({ 'Noto.otf': OTF })
    const { fonts, cache } = library(api)
    const [face] = await fonts.listFaces()
    // Reading the name table already cached the bytes.
    expect(blobRequests(api)).toHaveLength(1)

    const loaded = await fonts.loadFace(face)
    expect(new Uint8Array(loaded ?? new ArrayBuffer(0))).toEqual(OTF)
    expect(blobRequests(api)).toHaveLength(1)

    // GitHub unreachable in a later session: the cached listing and bytes still work.
    const offline = createGitHubRoutes()
    offline.on('GET', CONTENTS, () => Response.json({ message: 'Bad gateway' }, { status: 502 }))
    const later = library(offline, { cache })
    const faces = await later.fonts.refresh()
    expect(faces.map((item) => item.family)).toEqual(['Noto Sans CJK SC'])
    expect(later.statuses.at(-1)).toMatchObject({ state: 'offline', fromCache: true })
    expect(await later.fonts.loadFace(faces[0])).not.toBeNull()
    expect(blobRequests(offline)).toHaveLength(0)
  })

  test('a missing fonts/ folder is an empty library', async () => {
    const api = createGitHubRoutes()
    api.on('GET', CONTENTS, () => Response.json({ message: 'Not Found' }, { status: 404 }))
    const { fonts, statuses } = library(api)

    expect(await fonts.listFaces()).toEqual([])
    expect(statuses.at(-1)?.state).toBe('empty')
  })

  test('signed out or unauthorized offers nothing', async () => {
    const api = createGitHubRoutes()
    const signedOut = library(api, { signedIn: false })
    expect(await signedOut.fonts.listFaces()).toEqual([])
    expect(signedOut.statuses.at(-1)?.state).toBe('signed-out')
    expect(api.requests).toHaveLength(0)

    api.on('GET', CONTENTS, () => Response.json({ message: 'Bad credentials' }, { status: 401 }))
    const revoked = library(api)
    expect(await revoked.fonts.listFaces()).toEqual([])
    expect(revoked.statuses.at(-1)?.state).toBe('signed-out')
  })

  test('rate limiting falls back to the last listing this device saw', async () => {
    const { api } = await repository({ 'Noto.otf': OTF })
    const cache = createMemoryTeamFontCache()
    await library(api, { cache }).fonts.listFaces()

    const limited = createGitHubRoutes()
    limited.on('GET', CONTENTS, () =>
      Response.json(
        { message: 'API rate limit exceeded' },
        {
          status: 403,
          headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1900000000' }
        }
      )
    )
    const { fonts, statuses } = library(limited, { cache })
    expect(await fonts.refresh()).toHaveLength(1)
    expect(statuses.at(-1)).toMatchObject({ state: 'rate-limited', fromCache: true })
    expect(statuses.at(-1)?.resetAt?.getTime()).toBe(1_900_000_000_000)
  })

  test('refuses bytes that do not match their blob SHA', async () => {
    const sha = await gitBlobSHA(OTF)
    const api = createGitHubRoutes()
    api.on('GET', CONTENTS, () =>
      Response.json([
        { type: 'file', name: 'Fake-Bold.ttf', path: 'fonts/Fake-Bold.ttf', sha, size: 17 }
      ])
    )
    api.on('GET', BLOB, () => new Response(new TextEncoder().encode('<html>login</html>')))
    const { fonts } = library(api)

    const [face] = await fonts.listFaces()
    // Unreadable bytes still list by file name, but never load.
    expect(face).toMatchObject({ family: 'Fake', style: 'Bold' })
    expect(await fonts.loadFace(face)).toBeNull()
  })

  test('raw blobs over the cap fail as too large', async () => {
    const api = createGitHubRoutes()
    api.on(
      'GET',
      BLOB,
      () => new Response(new Uint8Array(64), { headers: { 'content-length': '64' } })
    )
    const client = createGitHubClient({ token: 't', fetch: api.fetch })
    let failure: unknown = null
    try {
      await client.getBlobRaw('southleft', 'altitude-designs', 'abc', 10)
    } catch (error) {
      failure = error
    }
    expect(failure).toBeInstanceOf(GitHubAPIError)
    expect(failure instanceof GitHubAPIError && failure.kind).toBe('too-large')
  })

  test('links to the fonts folder of the configured branch', () => {
    expect(teamFontsFolderURL(LOCATION)).toBe(
      'https://github.com/southleft/altitude-designs/tree/main/fonts'
    )
  })
})
