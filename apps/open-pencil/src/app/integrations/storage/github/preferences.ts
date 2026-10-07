import { useLocalStorage } from '@vueuse/core'

/** Where documents live: `<owner>/<repo>@<branch>:<folder>/<document-slug>/`. */
export type GitHubPreferences = {
  owner: string
  repo: string
  branch: string
  folder: string
}

export const GITHUB_DEFAULT_PREFERENCES: Readonly<GitHubPreferences> = {
  owner: 'southleft',
  repo: 'altitude-designs',
  branch: 'main',
  folder: 'documents'
}

const storedPreferences = useLocalStorage<GitHubPreferences>(
  'open-pencil:storage:github:preferences',
  { ...GITHUB_DEFAULT_PREFERENCES },
  { mergeDefaults: true }
)

/** A repository folder path without leading, trailing or repeated slashes. */
export function normalizeRepositoryFolder(folder: string): string {
  return folder
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .join('/')
}

export function readGitHubPreferences(): GitHubPreferences {
  return { ...GITHUB_DEFAULT_PREFERENCES, ...storedPreferences.value }
}

export function writeGitHubPreferences(preferences: GitHubPreferences): void {
  storedPreferences.value = {
    owner: preferences.owner.trim(),
    repo: preferences.repo.trim(),
    branch: preferences.branch.trim(),
    folder: normalizeRepositoryFolder(preferences.folder)
  }
}

export const githubPreferences = storedPreferences
