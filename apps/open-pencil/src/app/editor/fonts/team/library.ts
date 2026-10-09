import {
  buildTeamFontCatalog,
  checkFontBytes,
  parseTeamFontManifest,
  readFontFileNames,
  TEAM_FONT_MANIFEST_FILE,
  TEAM_FONT_MAX_BYTES,
  type FontFileNames,
  type TeamFontFace,
  type TeamFontFile,
  type TeamFontLibrary,
  type TeamFontManifest,
  type TeamFontSkippedFile
} from '@open-pencil/core/text'

import { gitBlobSHA } from '@/app/integrations/storage/github/blob-sha'
import { GitHubAPIError, type GitHubClient } from '@/app/integrations/storage/github/client'
import type { GitHubRepositoryLocation } from '@/app/integrations/storage/github/repository'

import type { TeamFontCache } from './cache'

/** Repository folder that holds the team's font files. */
export const TEAM_FONTS_FOLDER = 'fonts'
/** A listing is reused this long before GitHub is asked again (ETags make re-asking cheap). */
export const TEAM_FONT_LISTING_TTL_MS = 10 * 60 * 1000
const MAX_MANIFEST_BYTES = 256 * 1024

export type TeamFontLibraryState =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'empty'
  | 'signed-out'
  | 'forbidden'
  | 'rate-limited'
  | 'offline'

export interface TeamFontLibraryStatus {
  state: TeamFontLibraryState
  location: GitHubRepositoryLocation
  faceCount: number
  skipped: TeamFontSkippedFile[]
  /** True when the faces come from the cached listing because GitHub could not be reached. */
  fromCache: boolean
  /** When GitHub's rate limit resets, if it said. */
  resetAt: Date | null
}

export interface GitHubTeamFontServices {
  /** A client with the signed-in token, or null when nobody is signed in. */
  resolveClient(signal?: AbortSignal): Promise<GitHubClient | null>
  location(): GitHubRepositoryLocation
  cache: TeamFontCache
  readNames?: (bytes: ArrayBuffer) => Promise<FontFileNames | null>
  now?: () => number
  onStatus?: (status: TeamFontLibraryStatus) => void
}

export interface GitHubTeamFontLibrary extends TeamFontLibrary {
  status(): TeamFontLibraryStatus
  /** Forget the in-memory listing, for example after signing in or changing repository. */
  invalidate(): void
  /** Rebuild the listing now. */
  refresh(signal?: AbortSignal): Promise<TeamFontFace[]>
}

function locationKey(location: GitHubRepositoryLocation): string {
  return `${location.owner}/${location.repo}@${location.branch}`
}

/** `https://github.com/<owner>/<repo>/tree/<branch>/fonts`, where people add font files. */
export function teamFontsFolderURL(location: GitHubRepositoryLocation): string {
  const segments = [location.owner, location.repo, 'tree', location.branch, TEAM_FONTS_FOLDER]
  return `https://github.com/${segments.map(encodeURIComponent).join('/')}`
}

function failureState(error: unknown): TeamFontLibraryState {
  if (!(error instanceof GitHubAPIError)) return 'offline'
  switch (error.kind) {
    case 'not-found':
      return 'empty'
    case 'unauthorized':
      return 'signed-out'
    case 'forbidden':
      return 'forbidden'
    case 'rate-limited':
      return 'rate-limited'
    default:
      return 'offline'
  }
}

/**
 * Team fonts from `fonts/` in the document repository (`southleft/altitude-designs` by
 * default), read through the signed-in GitHub account.
 *
 * Listing goes through the contents API with ETags; bytes come from the Git blob API as
 * raw media and are checked against their blob SHA, the size cap and font magic bytes
 * before anything uses them. Bytes and the last listing persist in IndexedDB keyed by
 * blob SHA, so reopening needs no download and works offline. The token only ever travels
 * in the `Authorization` header of requests to api.github.com.
 */
export function createGitHubTeamFontLibrary(
  services: GitHubTeamFontServices
): GitHubTeamFontLibrary {
  const now = services.now ?? (() => Date.now())
  const readNames = services.readNames ?? readFontFileNames
  let listing: { key: string; faces: TeamFontFace[]; fetchedAt: number } | null = null
  let pending: { key: string; promise: Promise<TeamFontFace[]> } | null = null
  const downloads = new Map<string, Promise<ArrayBuffer | null>>()
  let generation = 0
  let current: TeamFontLibraryStatus = {
    state: 'idle',
    location: services.location(),
    faceCount: 0,
    skipped: [],
    fromCache: false,
    resetAt: null
  }

  function setStatus(next: Partial<TeamFontLibraryStatus>) {
    current = { ...current, ...next }
    services.onStatus?.(current)
  }

  async function verifiedBytes(
    client: GitHubClient,
    location: GitHubRepositoryLocation,
    file: TeamFontFile,
    maxBytes: number
  ): Promise<ArrayBuffer> {
    const bytes = await client.getBlobRaw(location.owner, location.repo, file.version, maxBytes)
    if ((await gitBlobSHA(new Uint8Array(bytes))) !== file.version) {
      throw new GitHubAPIError('invalid-response', `Content of ${file.path} does not match`)
    }
    return bytes
  }

  /** Font bytes from the cache, or downloaded, verified and cached. Null when invalid. */
  async function fontBytes(
    client: GitHubClient | null,
    location: GitHubRepositoryLocation,
    file: TeamFontFile
  ): Promise<ArrayBuffer | null> {
    const cached = await services.cache.readBlob(file.version)
    if (cached) return cached.bytes
    if (!client) return null
    let download = downloads.get(file.version)
    if (!download) {
      download = (async () => {
        const bytes = await verifiedBytes(client, location, file, TEAM_FONT_MAX_BYTES)
        if (!checkFontBytes(bytes).ok) return null
        await services.cache.writeBlob({ sha: file.version, bytes, cachedAt: now() })
        return bytes
      })().finally(() => downloads.delete(file.version))
      downloads.set(file.version, download)
    }
    return download
  }

  async function namesFor(
    client: GitHubClient,
    location: GitHubRepositoryLocation,
    file: TeamFontFile
  ): Promise<FontFileNames | null> {
    const cached = await services.cache.readBlob(file.version)
    if (cached?.names !== undefined) return cached.names
    const bytes = await fontBytes(client, location, file)
    if (!bytes) return null
    const names = await readNames(bytes)
    await services.cache.writeBlob({ sha: file.version, bytes, names, cachedAt: now() })
    return names
  }

  async function readManifest(
    client: GitHubClient,
    location: GitHubRepositoryLocation,
    file: TeamFontFile
  ): Promise<TeamFontManifest | null> {
    try {
      const bytes = await verifiedBytes(client, location, file, MAX_MANIFEST_BYTES)
      return parseTeamFontManifest(JSON.parse(new TextDecoder().decode(bytes)))
    } catch (error) {
      if (error instanceof GitHubAPIError && error.kind === 'rate-limited') throw error
      console.warn(`Ignoring unreadable ${TEAM_FONTS_FOLDER}/${TEAM_FONT_MANIFEST_FILE}:`, error)
      return null
    }
  }

  async function build(
    client: GitHubClient,
    location: GitHubRepositoryLocation
  ): Promise<{ faces: TeamFontFace[]; skipped: TeamFontSkippedFile[] }> {
    const entries = await client.listDirectory(
      location.owner,
      location.repo,
      TEAM_FONTS_FOLDER,
      location.branch
    )
    const files: TeamFontFile[] = entries
      .filter((entry) => entry.type === 'file')
      .map((entry) => ({ path: entry.path, size: entry.size, version: entry.sha }))
    const manifestFile = files.find(
      (file) => file.path === `${TEAM_FONTS_FOLDER}/${TEAM_FONT_MANIFEST_FILE}`
    )
    const manifest = manifestFile ? await readManifest(client, location, manifestFile) : null
    return buildTeamFontCatalog({
      files,
      manifest,
      readNames: (file) => namesFor(client, location, file)
    })
  }

  async function refresh(signal?: AbortSignal): Promise<TeamFontFace[]> {
    const location = services.location()
    const key = locationKey(location)
    if (pending?.key === key) return pending.promise
    const startedGeneration = generation
    const promise = (async (): Promise<TeamFontFace[]> => {
      setStatus({ state: 'loading', location })
      const client = await services.resolveClient(signal).catch(() => null)
      if (!client) {
        listing = { key, faces: [], fetchedAt: now() }
        setStatus({ state: 'signed-out', faceCount: 0, skipped: [], fromCache: false })
        return []
      }
      try {
        const catalog = await build(client, location)
        if (startedGeneration === generation) {
          listing = { key, faces: catalog.faces, fetchedAt: now() }
        }
        await services.cache.writeListing({ key, ...catalog, fetchedAt: now() })
        setStatus({
          state: catalog.faces.length > 0 ? 'ready' : 'empty',
          faceCount: catalog.faces.length,
          skipped: catalog.skipped,
          fromCache: false,
          resetAt: null
        })
        return catalog.faces
      } catch (error) {
        signal?.throwIfAborted()
        const state = failureState(error)
        const resetAt = error instanceof GitHubAPIError ? error.resetAt : null
        if (state === 'empty' || state === 'signed-out' || state === 'forbidden') {
          // The folder is gone or this account cannot read it: nothing to offer.
          listing = { key, faces: [], fetchedAt: now() }
          if (state === 'empty') {
            await services.cache.writeListing({ key, faces: [], skipped: [], fetchedAt: now() })
          }
          setStatus({ state, faceCount: 0, skipped: [], fromCache: false, resetAt })
          return []
        }
        // Rate limited or offline: keep serving the last listing this device saw.
        const persisted = await services.cache.readListing(key)
        const faces = persisted?.faces ?? []
        listing = { key, faces, fetchedAt: now() }
        setStatus({
          state,
          faceCount: faces.length,
          skipped: persisted?.skipped ?? [],
          fromCache: persisted !== null,
          resetAt
        })
        return faces
      }
    })().finally(() => {
      if (pending?.promise === promise) pending = null
    })
    pending = { key, promise }
    return promise
  }

  return {
    get label() {
      return services.location().repo
    },

    async listFaces(signal?: AbortSignal): Promise<TeamFontFace[]> {
      const key = locationKey(services.location())
      if (listing?.key === key && now() - listing.fetchedAt < TEAM_FONT_LISTING_TTL_MS) {
        return listing.faces
      }
      if (listing?.key !== key) {
        // First use for this location: serve the persisted listing while GitHub is asked.
        const persisted = await services.cache.readListing(key)
        if (persisted && persisted.faces.length > 0) {
          listing = { key, faces: persisted.faces, fetchedAt: 0 }
          void refresh().catch(() => undefined)
          return persisted.faces
        }
      }
      return refresh(signal)
    },

    async loadFace(face: TeamFontFace, signal?: AbortSignal): Promise<ArrayBuffer | null> {
      const location = services.location()
      try {
        const cached = await services.cache.readBlob(face.file.version)
        if (cached) return cached.bytes
        const client = await services.resolveClient(signal)
        return await fontBytes(client, location, face.file)
      } catch (error) {
        signal?.throwIfAborted()
        const state = failureState(error)
        if (state === 'rate-limited') {
          setStatus({ state, resetAt: error instanceof GitHubAPIError ? error.resetAt : null })
        }
        console.warn(`Team font ${face.file.path} could not be loaded:`, error)
        return null
      }
    },

    status: () => current,

    invalidate() {
      generation++
      listing = null
      pending = null
      setStatus({ state: 'idle', location: services.location() })
    },

    refresh
  }
}
