import type { DBSchema } from 'idb'

import type { FontFileNames, TeamFontFace, TeamFontSkippedFile } from '@open-pencil/core/text'

import { APP_DATABASE_NAMES, defineAppDatabase, openAppDatabase } from '@/app/storage/idb'

/** One library file, keyed by its Git blob SHA: a new commit of the file is a new entry. */
export interface TeamFontBlobRecord {
  sha: string
  bytes: ArrayBuffer
  /** Names read from the file; undefined until read, null when unreadable. */
  names?: FontFileNames | null
  cachedAt: number
}

/** The last catalog built for one repository location, for fast and offline starts. */
export interface TeamFontListingRecord {
  key: string
  faces: TeamFontFace[]
  skipped: TeamFontSkippedFile[]
  fetchedAt: number
}

export interface TeamFontCache {
  readBlob(sha: string): Promise<TeamFontBlobRecord | null>
  writeBlob(record: TeamFontBlobRecord): Promise<void>
  readListing(key: string): Promise<TeamFontListingRecord | null>
  writeListing(record: TeamFontListingRecord): Promise<void>
  clear(): Promise<void>
}

interface TeamFontDatabase extends DBSchema {
  blobs: { key: string; value: TeamFontBlobRecord }
  listings: { key: string; value: TeamFontListingRecord }
}

const teamFontDatabase = defineAppDatabase<TeamFontDatabase>({
  name: APP_DATABASE_NAMES.teamFonts,
  version: 1,
  callbacks: {
    upgrade(database) {
      if (!database.objectStoreNames.contains('blobs')) {
        database.createObjectStore('blobs', { keyPath: 'sha' })
      }
      if (!database.objectStoreNames.contains('listings')) {
        database.createObjectStore('listings', { keyPath: 'key' })
      }
    }
  }
})

/**
 * IndexedDB cache for team fonts (browser and desktop WebView). Failures read as misses so
 * a blocked or private-mode store only costs a network round trip.
 */
export function createIDBTeamFontCache(): TeamFontCache {
  let database: ReturnType<typeof openAppDatabase<TeamFontDatabase>> | null = null
  const open = () => {
    database ??= openAppDatabase(teamFontDatabase)
    return database
  }
  const quietly = async <T>(operation: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await operation()
    } catch {
      return fallback
    }
  }

  return {
    readBlob: (sha) => quietly(async () => (await (await open()).get('blobs', sha)) ?? null, null),
    writeBlob: (record) =>
      quietly(async () => {
        await (await open()).put('blobs', record)
      }, undefined),
    readListing: (key) =>
      quietly(async () => (await (await open()).get('listings', key)) ?? null, null),
    writeListing: (record) =>
      quietly(async () => {
        await (await open()).put('listings', record)
      }, undefined),
    clear: () =>
      quietly(async () => {
        const db = await open()
        await Promise.all([db.clear('blobs'), db.clear('listings')])
      }, undefined)
  }
}

/** In-memory cache for tests and environments without IndexedDB. */
export function createMemoryTeamFontCache(): TeamFontCache {
  const blobs = new Map<string, TeamFontBlobRecord>()
  const listings = new Map<string, TeamFontListingRecord>()
  return {
    readBlob: async (sha) => blobs.get(sha) ?? null,
    writeBlob: async (record) => {
      blobs.set(record.sha, record)
    },
    readListing: async (key) => listings.get(key) ?? null,
    writeListing: async (record) => {
      listings.set(record.key, record)
    },
    clear: async () => {
      blobs.clear()
      listings.clear()
    }
  }
}
