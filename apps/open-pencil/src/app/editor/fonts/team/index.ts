import { shallowRef, watch } from 'vue'

import { fontManager } from '@open-pencil/core/text'

import { GitHubAPIError, type GitHubETagCache } from '@/app/integrations/storage/github/client'
import { githubIdentity } from '@/app/integrations/storage/github/identity'
import {
  githubPreferences,
  readGitHubPreferences
} from '@/app/integrations/storage/github/preferences'
import { resolveGitHubClient } from '@/app/integrations/storage/github/runtime'

import { createIDBTeamFontCache, createMemoryTeamFontCache } from './cache'
import {
  createGitHubTeamFontLibrary,
  teamFontsFolderURL,
  type GitHubTeamFontLibrary,
  type TeamFontLibraryStatus
} from './library'

export { teamFontsFolderURL, TEAM_FONTS_FOLDER } from './library'
export type { TeamFontLibraryState, TeamFontLibraryStatus } from './library'

function currentLocation() {
  const { owner, repo, branch } = readGitHubPreferences()
  return { owner, repo, branch }
}

/** The latest team font library status, for the font report and picker. */
export const teamFontStatus = shallowRef<TeamFontLibraryStatus>({
  state: 'idle',
  location: currentLocation(),
  faceCount: 0,
  skipped: [],
  fromCache: false,
  resetAt: null
})

let library: GitHubTeamFontLibrary | null = null

/** Where people add team fonts for the configured repository. */
export function teamFontsRepositoryURL(): string {
  return teamFontsFolderURL(teamFontStatus.value.location)
}

/**
 * Connect the font manager to `fonts/` in the version-control repository. Listing and
 * downloads use the signed-in GitHub account; signing in or out, or pointing version
 * control at another repository, rebuilds the listing.
 */
export function installTeamFontLibrary(): GitHubTeamFontLibrary {
  if (library) return library
  const etags: GitHubETagCache = new Map()
  const created = createGitHubTeamFontLibrary({
    async resolveClient(signal) {
      try {
        return await resolveGitHubClient(undefined, signal, etags)
      } catch (error) {
        if (error instanceof GitHubAPIError && error.kind === 'unauthorized') return null
        throw error
      }
    },
    location: currentLocation,
    cache:
      typeof indexedDB === 'undefined' ? createMemoryTeamFontCache() : createIDBTeamFontCache(),
    onStatus: (status) => {
      teamFontStatus.value = status
    }
  })
  library = created
  fontManager.setTeamFontLibrary(created)
  watch(
    [() => githubIdentity.value?.id ?? null, githubPreferences],
    () => {
      etags.clear()
      created.invalidate()
    },
    { deep: true }
  )
  return created
}

/** Rebuild the team font listing now, for an explicit refresh. */
export async function refreshTeamFonts(): Promise<void> {
  await library?.refresh()
}
