import { shallowRef } from 'vue'

import type { Editor } from '@open-pencil/core/editor'
import {
  DocumentJSONSnapshotStaleError,
  writeDocumentJSONOffThread,
  type HashedDocumentJSONSnapshot
} from '@open-pencil/core/io/formats/document-json'

import { isDraftBranch } from '../branches/name'
import {
  ensureDraftPullRequest,
  findPullRequest,
  markReadyForReview,
  type GitHubPullRequestSummary
} from '../branches/pulls'
import { GitHubAPIError, type GitHubClient, type GitHubErrorKind } from '../client'
import { readGitHubPreferences, type GitHubPreferences } from '../preferences'
import {
  allocateGitHubDocumentPath,
  commitGitHubDocument,
  GitHubOversizeError,
  localBlobSHAs,
  oversizeGitHubFiles,
  sameDocumentFiles,
  type GitHubDocumentBinding,
  type GitHubFileSizeWarning,
  type GitHubOversizeFile
} from '../repository'
import { resolveGitHubClient } from '../runtime'
import {
  currentDraftPolicy,
  resolveDraftTarget,
  restartDraftBranch,
  type GitHubDraftPolicy
} from './draft'
import { autosaveCommitMessage, commitMessage, defaultCommitMessage } from './message'

export type GitHubDocumentFailure = {
  kind: GitHubErrorKind | 'unknown'
  message: string
  resetAt: Date | null
  /** Files GitHub would refuse, when that is why the commit failed. */
  oversize?: readonly GitHubOversizeFile[]
}

/** Who started an operation: the user asked, or autosave ran in the background. */
export type GitHubOperationOrigin = 'user' | 'autosave'

export type GitHubDocumentStatus =
  | { phase: 'idle' }
  | {
      phase: 'working'
      operation: 'commit' | 'overwrite' | 'publish'
      origin: GitHubOperationOrigin
    }
  | {
      phase: 'conflict'
      paths: string[]
      remoteCommitSHA: string
      origin: GitHubOperationOrigin
    }
  | { phase: 'failed'; failure: GitHubDocumentFailure; origin: GitHubOperationOrigin }

export type GitHubCommitNotice = {
  /** The branch had newer commits; this commit was replayed on top of them. */
  rebased: boolean
  warnings: GitHubFileSizeWarning[]
}

/** What one background autosave did, for the scheduler. */
export type GitHubAutosaveResult =
  | { kind: 'committed' }
  /** The content matches the last commit; nothing was sent. */
  | { kind: 'unchanged' }
  | { kind: 'failed'; failure: GitHubDocumentFailure }
  /** A conflict needs the user's decision; autosave waits for it. */
  | { kind: 'blocked' }
  /** Another operation is running or the document is not bound. */
  | { kind: 'skipped' }

export type GitHubPullRequestActivity =
  | { phase: 'idle' }
  | { phase: 'working'; operation: 'refresh' | 'open' | 'ready' }
  | { phase: 'failed'; failure: GitHubDocumentFailure }

/** What a document session needs from its editor session. */
export interface GitHubDocumentHost {
  editor: {
    readonly graph: Editor['graph']
    stopMotion(): void
    populateAllPages(): Promise<boolean>
    onEditorEvent(event: 'graph:replaced', handler: () => void): () => void
    /** A drag or scrub is live; background snapshots give way to it. */
    isInteractiveEditing?(): boolean
  }
  state: { documentName: string; sceneVersion: number }
  captureRevision(): number
  /** A commit persisted this revision: mark it saved and release its recovery snapshot. */
  markPersisted(revision: number, version: number): Promise<void>
}

export interface GitHubDocumentServices {
  resolveClient(): Promise<GitHubClient>
  preferences(): GitHubPreferences
  /**
   * The draft-branch policy, or null to commit to the bound branch as it is: autosave is
   * off or nobody is signed in.
   */
  draftPolicy?(): GitHubDraftPolicy | null
  /**
   * Writes and hashes the document; a worker in the browser. With `isStale`, the graph is
   * copied in slices and the write stops with `DocumentJSONSnapshotStaleError` if it
   * becomes true; without it, the graph is copied at once.
   */
  writeSnapshot?(
    graph: Editor['graph'],
    name: string,
    isStale?: () => boolean
  ): Promise<HashedDocumentJSONSnapshot>
}

const defaultServices: GitHubDocumentServices = {
  resolveClient: () => resolveGitHubClient(),
  preferences: readGitHubPreferences,
  draftPolicy: currentDraftPolicy
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

type CommitRequest = {
  message?: string
  overwrite?: boolean
  origin: GitHubOperationOrigin
}

type CommitResult = 'committed' | 'unchanged' | 'conflict' | 'stale'

/**
 * GitHub version control for one open document. The binding augments the document's
 * source: a local file handle or path stays as it is, and the recovery snapshot keeps
 * protecting edits until a commit of that revision succeeds.
 *
 * With a draft policy, commits aimed at the base branch go to the document's draft branch
 * and the first one opens a draft pull request into the base branch.
 */
export function createGitHubDocumentSession(
  host: GitHubDocumentHost,
  services: GitHubDocumentServices = defaultServices
) {
  const binding = shallowRef<GitHubDocumentBinding | null>(null)
  const status = shallowRef<GitHubDocumentStatus>({ phase: 'idle' })
  const notice = shallowRef<GitHubCommitNotice | null>(null)
  /** The pull request from the bound branch, once looked up or opened. */
  const pullRequest = shallowRef<GitHubPullRequestSummary | null>(null)
  const pullRequestActivity = shallowRef<GitHubPullRequestActivity>({ phase: 'idle' })
  // The "save to GitHub" hint after a file save is shown once per document.
  let saveHintShown = false
  // Bumped whenever the document changes identity, so late results cannot land on it.
  let generation = 0
  // Bumped when the bound branch changes, so pull request results stay with their branch.
  let branchGeneration = 0
  const draftPolicy = () => services.draftPolicy?.() ?? null
  const writeSnapshot = (graph: Editor['graph'], name: string, isStale?: () => boolean) =>
    services.writeSnapshot
      ? services.writeSnapshot(graph, name, isStale)
      : writeDocumentJSONOffThread(graph, { name, isStale })

  function resetBranchState() {
    branchGeneration++
    pullRequest.value = null
    pullRequestActivity.value = { phase: 'idle' }
  }

  // Opening another document into this tab replaces the graph; the binding goes with it.
  const stopGraphWatch = host.editor.onEditorEvent('graph:replaced', () => {
    generation++
    binding.value = null
    status.value = { phase: 'idle' }
    notice.value = null
    saveHintShown = false
    resetBranchState()
  })

  function busy(): boolean {
    return status.value.phase === 'working'
  }

  /**
   * Write the current revision. The graph is copied in slices so a large document never
   * blocks input; an edit during the copy abandons it. Autosave then waits for the next
   * quiet moment, while an explicit commit copies the newer revision in one step.
   */
  async function snapshot(origin: GitHubOperationOrigin) {
    host.editor.stopMotion()
    await host.editor.populateAllPages()
    const capture = () => ({
      revision: host.captureRevision(),
      version: host.state.sceneVersion,
      name: host.state.documentName
    })
    const first = capture()
    // Content revisions only: selection and viewport changes do not invalidate a copy.
    const changed = () => host.captureRevision() !== first.revision
    const isStale =
      origin === 'autosave'
        ? () => changed() || (host.editor.isInteractiveEditing?.() ?? false)
        : changed
    try {
      return { ...first, files: await writeSnapshot(host.editor.graph, first.name, isStale) }
    } catch (error) {
      if (origin === 'autosave' || !(error instanceof DocumentJSONSnapshotStaleError)) throw error
    }
    const retry = capture()
    return { ...retry, files: await writeSnapshot(host.editor.graph, retry.name) }
  }

  /** Open (or find) the draft pull request of a draft branch; never fails the commit. */
  async function syncDraftPullRequest(
    client: GitHubClient,
    target: GitHubDocumentBinding,
    name: string,
    pages: readonly string[]
  ) {
    const policy = draftPolicy()
    if (!policy || !isDraftBranch(target.branch, target.path, policy.login)) return
    const current = pullRequest.value
    if (current && (current.state === 'draft' || current.state === 'open')) return
    const token = branchGeneration
    pullRequestActivity.value = { phase: 'working', operation: 'open' }
    try {
      const outcome = await ensureDraftPullRequest(client, target, {
        base: policy.base,
        documentName: name,
        documentPath: target.path,
        pages
      })
      if (token !== branchGeneration) return
      pullRequest.value = outcome.pullRequest
      pullRequestActivity.value = { phase: 'idle' }
    } catch (error) {
      if (token === branchGeneration) {
        pullRequestActivity.value = { phase: 'failed', failure: describeGitHubFailure(error) }
      }
    }
  }

  async function commitBinding(
    current: GitHubDocumentBinding,
    request: CommitRequest,
    token: number
  ): Promise<CommitResult> {
    const { revision, version, name, files } = await snapshot(request.origin)
    // Refuse before writing anything: GitHub rejects the whole commit for one oversized blob.
    const oversize = oversizeGitHubFiles(files)
    if (oversize.length > 0) throw new GitHubOversizeError(oversize)
    if (token !== generation) return 'stale'
    const autosave = request.origin === 'autosave'
    // Autosave compares the local blob manifest first: an unchanged document costs no request.
    if (autosave && sameDocumentFiles(current.files, await localBlobSHAs(files))) {
      await host.markPersisted(revision, version)
      status.value = { phase: 'idle' }
      return 'unchanged'
    }
    const client = await services.resolveClient()
    const policy = draftPolicy()
    const target = await resolveDraftTarget(client, current, policy)
    if (token !== generation) return 'stale'
    const created = Object.keys(current.files).length === 0
    const commitTo = (location: GitHubDocumentBinding) =>
      commitGitHubDocument(client, location, files, {
        overwrite: request.overwrite,
        message: (paths) =>
          autosave
            ? autosaveCommitMessage(name, files.pages, paths)
            : commitMessage(
                request.message,
                defaultCommitMessage(name, files.pages, paths, created)
              )
      })
    let outcome: Awaited<ReturnType<typeof commitTo>>
    try {
      outcome = await commitTo(target.binding)
    } catch (error) {
      // The draft branch was deleted after its pull request merged: start it again.
      const restarted = await restartDraftBranch(client, target.binding, policy, error)
      if (!restarted) throw error
      resetBranchState()
      outcome = await commitTo(restarted)
    }
    if (token !== generation) return 'stale'
    if (outcome.kind === 'conflict') {
      status.value = {
        phase: 'conflict',
        paths: outcome.paths,
        remoteCommitSHA: outcome.remoteCommitSHA,
        origin: request.origin
      }
      return 'conflict'
    }
    if (outcome.binding.branch !== current.branch) resetBranchState()
    binding.value = outcome.binding
    notice.value =
      outcome.kind === 'committed' && (outcome.rebased || outcome.warnings.length > 0)
        ? { rebased: outcome.rebased, warnings: outcome.warnings }
        : null
    await host.markPersisted(revision, version)
    status.value = { phase: 'idle' }
    if (outcome.kind === 'committed') {
      void syncDraftPullRequest(
        client,
        outcome.binding,
        name,
        files.pages.map((page) => page.name)
      )
    }
    return outcome.kind
  }

  async function runCommit(request: CommitRequest): Promise<CommitResult | 'failed' | 'busy'> {
    const current = binding.value
    if (!current || busy()) return 'busy'
    const token = ++generation
    status.value = {
      phase: 'working',
      operation: request.overwrite ? 'overwrite' : 'commit',
      origin: request.origin
    }
    try {
      return await commitBinding(current, request, token)
    } catch (error) {
      if (token !== generation) return 'stale'
      // An edit arrived while autosave was copying the document: try again when quiet.
      if (error instanceof DocumentJSONSnapshotStaleError) {
        status.value = { phase: 'idle' }
        return 'stale'
      }
      status.value = {
        phase: 'failed',
        failure: describeGitHubFailure(error),
        origin: request.origin
      }
      return 'failed'
    }
  }

  /** Commit the current revision; false when nothing was committed (see `status`). */
  async function commit(options: { message?: string; overwrite?: boolean } = {}) {
    const result = await runCommit({ ...options, origin: 'user' })
    return result === 'committed' || result === 'unchanged'
  }

  /**
   * Background commit for the autosave scheduler: skips an unchanged document without a
   * request, waits on a conflict, and never commits over one.
   */
  async function autosave(): Promise<GitHubAutosaveResult> {
    if (!binding.value || busy()) return { kind: 'skipped' }
    if (status.value.phase === 'conflict') return { kind: 'blocked' }
    const result = await runCommit({ origin: 'autosave' })
    switch (result) {
      case 'committed':
        return { kind: 'committed' }
      case 'unchanged':
        return { kind: 'unchanged' }
      case 'conflict':
        return { kind: 'blocked' }
      case 'failed': {
        const current = status.value
        return current.phase === 'failed'
          ? { kind: 'failed', failure: current.failure }
          : { kind: 'skipped' }
      }
      default:
        return { kind: 'skipped' }
    }
  }

  /** Commit this document to a new folder in the configured repository. */
  async function publish(name: string, message?: string) {
    if (busy()) return false
    const previous = binding.value
    const token = ++generation
    status.value = { phase: 'working', operation: 'publish', origin: 'user' }
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
      const committed = await commitBinding(draft, { message, origin: 'user' }, token)
      if (committed === 'conflict' && token === generation) {
        // The folder was taken meanwhile; publishing again picks the next free name.
        binding.value = previous
        status.value = {
          phase: 'failed',
          failure: { kind: 'conflict', message: 'Document folder already exists', resetAt: null },
          origin: 'user'
        }
      }
      return committed === 'committed' || committed === 'unchanged'
    } catch (error) {
      if (token === generation) {
        binding.value = previous
        status.value = { phase: 'failed', failure: describeGitHubFailure(error), origin: 'user' }
      }
      return false
    }
  }

  /** Look up the bound branch's pull request (none on the base branch). */
  async function refreshPullRequest(): Promise<void> {
    const current = binding.value
    if (!current || current.branch === services.preferences().branch) return
    if (pullRequestActivity.value.phase === 'working') return
    const token = branchGeneration
    pullRequestActivity.value = { phase: 'working', operation: 'refresh' }
    try {
      const found = await findPullRequest(await services.resolveClient(), current)
      if (token !== branchGeneration) return
      pullRequest.value = found
      pullRequestActivity.value = { phase: 'idle' }
    } catch (error) {
      if (token === branchGeneration) {
        pullRequestActivity.value = { phase: 'failed', failure: describeGitHubFailure(error) }
      }
    }
  }

  /** Take the draft pull request out of draft so reviewers and design checks pick it up. */
  async function readyForReview(): Promise<boolean> {
    const current = binding.value
    const pull = pullRequest.value
    if (!current || pull?.state !== 'draft') return false
    if (pullRequestActivity.value.phase === 'working') return false
    const token = branchGeneration
    pullRequestActivity.value = { phase: 'working', operation: 'ready' }
    try {
      const ready = await markReadyForReview(await services.resolveClient(), current, pull)
      if (token !== branchGeneration) return false
      pullRequest.value = ready
      pullRequestActivity.value = { phase: 'idle' }
      return true
    } catch (error) {
      if (token === branchGeneration) {
        pullRequestActivity.value = { phase: 'failed', failure: describeGitHubFailure(error) }
      }
      return false
    }
  }

  return {
    binding,
    status,
    notice,
    pullRequest,
    pullRequestActivity,
    /** Adopt a binding after this document was loaded from GitHub. */
    bind(next: GitHubDocumentBinding | null) {
      generation++
      binding.value = next
      status.value = { phase: 'idle' }
      notice.value = null
      resetBranchState()
    },
    commit,
    autosave,
    publish,
    refreshPullRequest,
    readyForReview,
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
      resetBranchState()
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
      resetBranchState()
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
      branchGeneration++
      stopGraphWatch()
    }
  }
}

export type GitHubDocumentSession = ReturnType<typeof createGitHubDocumentSession>
