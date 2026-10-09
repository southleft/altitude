import { shallowRef } from 'vue'

import type { Editor } from '@open-pencil/core/editor'
import { writeDocumentJSON } from '@open-pencil/core/io/formats/document-json'

import { GitHubAPIError, type GitHubClient, type GitHubErrorKind } from '../client'
import { readGitHubPreferences, type GitHubPreferences } from '../preferences'
import {
  allocateGitHubDocumentPath,
  commitGitHubDocument,
  GitHubOversizeError,
  oversizeGitHubFiles,
  type GitHubDocumentBinding,
  type GitHubFileSizeWarning,
  type GitHubOversizeFile
} from '../repository'
import { resolveGitHubClient } from '../runtime'
import { commitMessage, defaultCommitMessage } from './message'

export type GitHubDocumentFailure = {
  kind: GitHubErrorKind | 'unknown'
  message: string
  resetAt: Date | null
  /** Files GitHub would refuse, when that is why the commit failed. */
  oversize?: readonly GitHubOversizeFile[]
}

export type GitHubDocumentStatus =
  | { phase: 'idle' }
  | { phase: 'working'; operation: 'commit' | 'overwrite' | 'publish' }
  | { phase: 'conflict'; paths: string[]; remoteCommitSHA: string }
  | { phase: 'failed'; failure: GitHubDocumentFailure }

export type GitHubCommitNotice = {
  /** The branch had newer commits; this commit was replayed on top of them. */
  rebased: boolean
  warnings: GitHubFileSizeWarning[]
}

/** What a document session needs from its editor session. */
export interface GitHubDocumentHost {
  editor: {
    readonly graph: Editor['graph']
    stopMotion(): void
    populateAllPages(): Promise<boolean>
    onEditorEvent(event: 'graph:replaced', handler: () => void): () => void
  }
  state: { documentName: string; sceneVersion: number }
  captureRevision(): number
  /** A commit persisted this revision: mark it saved and release its recovery snapshot. */
  markPersisted(revision: number, version: number): Promise<void>
}

export interface GitHubDocumentServices {
  resolveClient(): Promise<GitHubClient>
  preferences(): GitHubPreferences
}

const defaultServices: GitHubDocumentServices = {
  resolveClient: () => resolveGitHubClient(),
  preferences: readGitHubPreferences
}

export function describeGitHubFailure(error: unknown): GitHubDocumentFailure {
  if (error instanceof GitHubOversizeError) {
    return { kind: error.kind, message: error.message, resetAt: null, oversize: error.files }
  }
  if (error instanceof GitHubAPIError) {
    return { kind: error.kind, message: error.message, resetAt: error.resetAt }
  }
  return {
    kind: 'unknown',
    message: error instanceof Error ? error.message : String(error),
    resetAt: null
  }
}

/**
 * GitHub version control for one open document. The binding augments the document's
 * source: a local file handle or path stays as it is, and the recovery snapshot keeps
 * protecting edits until a commit of that revision succeeds.
 */
export function createGitHubDocumentSession(
  host: GitHubDocumentHost,
  services: GitHubDocumentServices = defaultServices
) {
  const binding = shallowRef<GitHubDocumentBinding | null>(null)
  const status = shallowRef<GitHubDocumentStatus>({ phase: 'idle' })
  const notice = shallowRef<GitHubCommitNotice | null>(null)
  // The "save to GitHub" hint after a file save is shown once per document.
  let saveHintShown = false
  // Bumped whenever the document changes identity, so late results cannot land on it.
  let generation = 0

  // Opening another document into this tab replaces the graph; the binding goes with it.
  const stopGraphWatch = host.editor.onEditorEvent('graph:replaced', () => {
    generation++
    binding.value = null
    status.value = { phase: 'idle' }
    notice.value = null
    saveHintShown = false
  })

  function busy(): boolean {
    return status.value.phase === 'working'
  }

  async function snapshot() {
    host.editor.stopMotion()
    await host.editor.populateAllPages()
    const revision = host.captureRevision()
    const version = host.state.sceneVersion
    const name = host.state.documentName
    return { revision, version, name, files: writeDocumentJSON(host.editor.graph, { name }) }
  }

  async function commitBinding(
    current: GitHubDocumentBinding,
    options: { message?: string; overwrite?: boolean },
    token: number
  ): Promise<boolean> {
    const { revision, version, name, files } = await snapshot()
    // Refuse before writing anything: GitHub rejects the whole commit for one oversized blob.
    const oversize = oversizeGitHubFiles(files)
    if (oversize.length > 0) throw new GitHubOversizeError(oversize)
    const client = await services.resolveClient()
    const created = Object.keys(current.files).length === 0
    const outcome = await commitGitHubDocument(client, current, files, {
      overwrite: options.overwrite,
      message: (paths) =>
        commitMessage(options.message, defaultCommitMessage(name, files.pages, paths, created))
    })
    if (token !== generation) return false
    if (outcome.kind === 'conflict') {
      status.value = {
        phase: 'conflict',
        paths: outcome.paths,
        remoteCommitSHA: outcome.remoteCommitSHA
      }
      return false
    }
    binding.value = outcome.binding
    notice.value =
      outcome.kind === 'committed' && (outcome.rebased || outcome.warnings.length > 0)
        ? { rebased: outcome.rebased, warnings: outcome.warnings }
        : null
    await host.markPersisted(revision, version)
    status.value = { phase: 'idle' }
    return true
  }

  /** Commit the current revision; false when nothing was committed (see `status`). */
  async function commit(options: { message?: string; overwrite?: boolean } = {}) {
    const current = binding.value
    if (!current || busy()) return false
    const token = ++generation
    status.value = { phase: 'working', operation: options.overwrite ? 'overwrite' : 'commit' }
    try {
      return await commitBinding(current, options, token)
    } catch (error) {
      if (token === generation)
        status.value = { phase: 'failed', failure: describeGitHubFailure(error) }
      return false
    }
  }

  /** Commit this document to a new folder in the configured repository. */
  async function publish(name: string, message?: string) {
    if (busy()) return false
    const previous = binding.value
    const token = ++generation
    status.value = { phase: 'working', operation: 'publish' }
    try {
      const preferences = services.preferences()
      const client = await services.resolveClient()
      const location = {
        owner: preferences.owner,
        repo: preferences.repo,
        branch: preferences.branch
      }
      const { path, head } = await allocateGitHubDocumentPath(
        client,
        location,
        preferences.folder,
        name
      )
      if (token !== generation) return false
      host.state.documentName = name.trim() || host.state.documentName
      const draft: GitHubDocumentBinding = {
        ...location,
        path,
        commitSHA: head,
        committedAt: null,
        files: {}
      }
      const committed = await commitBinding(draft, { message }, token)
      if (!committed && token === generation) {
        // The folder was taken meanwhile; publishing again picks the next free name.
        binding.value = previous
        status.value = {
          phase: 'failed',
          failure: { kind: 'conflict', message: 'Document folder already exists', resetAt: null }
        }
      }
      return committed
    } catch (error) {
      if (token === generation) {
        binding.value = previous
        status.value = { phase: 'failed', failure: describeGitHubFailure(error) }
      }
      return false
    }
  }

  return {
    binding,
    status,
    notice,
    /** Adopt a binding after this document was loaded from GitHub. */
    bind(next: GitHubDocumentBinding | null) {
      generation++
      binding.value = next
      status.value = { phase: 'idle' }
      notice.value = null
    },
    commit,
    publish,
    /**
     * Point the binding at another branch without reloading: after creating the branch
     * from this one, the document and its merge base are unchanged.
     */
    moveToBranch(branch: string) {
      const current = binding.value
      if (!current || busy()) return
      generation++
      binding.value = { ...current, branch }
      status.value = { phase: 'idle' }
      notice.value = null
    },
    /**
     * Keep this document but commit it to `branch`, where it does not exist yet: the next
     * commit writes every file on top of `head`.
     */
    retarget(branch: string, head: string) {
      const current = binding.value
      if (!current || busy()) return
      generation++
      binding.value = { ...current, branch, commitSHA: head, committedAt: null, files: {} }
      status.value = { phase: 'idle' }
      notice.value = null
    },
    /** True the first time it is called for the current document, then false. */
    claimSaveHint() {
      if (saveHintShown) return false
      saveHintShown = true
      return true
    },
    dismiss() {
      if (!busy()) status.value = { phase: 'idle' }
      notice.value = null
    },
    dispose() {
      generation++
      stopGraphWatch()
    }
  }
}

export type GitHubDocumentSession = ReturnType<typeof createGitHubDocumentSession>
