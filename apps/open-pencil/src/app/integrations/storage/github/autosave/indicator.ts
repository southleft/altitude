import type { GitHubDocumentFailure, GitHubDocumentStatus } from '../document/session'
import type { GitHubDocumentBinding } from '../repository'
import type { AutosaveSchedulerState } from './scheduler'

/** What the saving chip shows for a document. */
export type GitHubSaveIndicator =
  /** Not in GitHub yet: the chip offers Save to GitHub. */
  | { kind: 'unpublished' }
  | { kind: 'unsaved' }
  | { kind: 'saving' }
  | { kind: 'committed'; committedAt: string | null; commitURL: string }
  /** Edits are kept in local recovery until GitHub is reachable again. */
  | { kind: 'offline'; retryAt: number | null }
  | { kind: 'failed'; failure: GitHubDocumentFailure | null; conflict: boolean }

export type GitHubSaveIndicatorKind = GitHubSaveIndicator['kind']

export type GitHubSaveIndicatorInput = {
  binding: GitHubDocumentBinding | null
  dirty: boolean
  status: GitHubDocumentStatus
  /** Null when autosave is off. */
  autosave: AutosaveSchedulerState | null
  online: boolean
}

export function commitURL(binding: GitHubDocumentBinding): string {
  const owner = encodeURIComponent(binding.owner)
  const repo = encodeURIComponent(binding.repo)
  return `https://github.com/${owner}/${repo}/commit/${binding.commitSHA}`
}

function isOffline(failure: GitHubDocumentFailure, online: boolean): boolean {
  return !online || failure.kind === 'network'
}

/**
 * The chip's state, in priority order: an operation in progress, a problem that needs
 * attention, edits not yet committed, then the last commit.
 */
export function githubSaveIndicator(input: GitHubSaveIndicatorInput): GitHubSaveIndicator {
  const { binding, dirty, status, autosave, online } = input
  if (status.phase === 'working') return { kind: 'saving' }
  if (autosave?.phase === 'running') return { kind: 'saving' }
  if (status.phase === 'conflict') return { kind: 'failed', failure: null, conflict: true }
  if (status.phase === 'failed') {
    if (dirty && binding && isOffline(status.failure, online)) {
      return { kind: 'offline', retryAt: autosave?.phase === 'backoff' ? autosave.retryAt : null }
    }
    if (dirty || !binding) return { kind: 'failed', failure: status.failure, conflict: false }
  }
  if (!binding) return { kind: 'unpublished' }
  if (dirty && !online) return { kind: 'offline', retryAt: null }
  if (dirty) return { kind: 'unsaved' }
  return { kind: 'committed', committedAt: binding.committedAt, commitURL: commitURL(binding) }
}
