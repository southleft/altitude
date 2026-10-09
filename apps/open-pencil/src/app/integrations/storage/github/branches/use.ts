import { tryOnScopeDispose } from '@vueuse/core'
import { computed, shallowRef, watch } from 'vue'

import { GitHubAPIError, type GitHubClient } from '../client'
import {
  describeGitHubFailure,
  type GitHubDocumentFailure,
  type GitHubDocumentSession
} from '../document/session'
import { probeGitHubDocument, type GitHubRepositoryLocation } from '../repository'
import { resolveGitHubClient } from '../runtime'
import type { GitHubBranch } from '../schemas'
import { validBranchName } from './name'
import {
  changedPages,
  findPullRequest,
  openPullRequest,
  pullRequestBody,
  pullRequestTitle,
  type GitHubPullRequestSummary
} from './pulls'

export interface GitHubBranchServices {
  resolveClient(): Promise<GitHubClient>
  /** Replace the open document with its version on `location.branch` and bind it. */
  load(location: GitHubRepositoryLocation, path: string): Promise<void>
  hasUnsavedChanges(): boolean
  documentName(): string
  pageNames(): string[]
}

export type GitHubBranchOutcome =
  | { kind: 'done' }
  | { kind: 'dirty' }
  | { kind: 'missing'; branch: string; head: string }
  | { kind: 'invalid' }
  | { kind: 'stale' }
  | { kind: 'busy' }
  | { kind: 'failed'; failure: GitHubDocumentFailure }

export type GitHubPullRequestDraft = { title: string; body: string }

function failed(error: unknown): GitHubBranchOutcome {
  return { kind: 'failed', failure: describeGitHubFailure(error) }
}

/**
 * Branches and pull requests of one GitHub-bound document. Operations return outcomes for
 * the UI to present; results that arrive after the document changed are dropped.
 */
export function useGitHubBranches(
  session: GitHubDocumentSession,
  services: Partial<GitHubBranchServices> &
    Pick<GitHubBranchServices, 'load' | 'hasUnsavedChanges' | 'documentName' | 'pageNames'>
) {
  const resolveClient = services.resolveClient ?? (() => resolveGitHubClient())
  const branches = shallowRef<GitHubBranch[] | null>(null)
  const defaultBranch = shallowRef<string | null>(null)
  const pullRequest = shallowRef<GitHubPullRequestSummary | null>(null)
  const loading = shallowRef(false)
  const working = shallowRef(false)
  const failure = shallowRef<GitHubDocumentFailure | null>(null)
  let generation = 0
  let disposed = false

  const binding = computed(() => session.binding.value)
  const identity = computed(() => {
    const current = binding.value
    return current ? `${current.owner}/${current.repo}@${current.branch}:${current.path}` : null
  })

  // A different document or branch: everything listed for the old one is stale.
  watch(identity, () => {
    generation++
    branches.value = null
    pullRequest.value = null
    failure.value = null
  })
  tryOnScopeDispose(() => {
    disposed = true
    generation++
  })

  const isCurrent = (token: number) => !disposed && token === generation
  const onDefaultBranch = computed(
    () => !!binding.value && binding.value.branch === (defaultBranch.value ?? binding.value.branch)
  )

  /** Load the branch list, the default branch and this branch's pull request. */
  async function refresh(): Promise<void> {
    const current = binding.value
    if (!current) return
    const token = generation
    loading.value = true
    failure.value = null
    try {
      const client = await resolveClient()
      const [repository, listed] = await Promise.all([
        client.getRepository(current.owner, current.repo),
        client.listBranches(current.owner, current.repo)
      ])
      const pull =
        current.branch === repository.default_branch ? null : await findPullRequest(client, current)
      if (!isCurrent(token)) return
      defaultBranch.value = repository.default_branch
      branches.value = listed.toSorted((first, second) => {
        if (first.name === repository.default_branch) return -1
        if (second.name === repository.default_branch) return 1
        return first.name.localeCompare(second.name)
      })
      pullRequest.value = pull
    } catch (error) {
      if (isCurrent(token)) failure.value = describeGitHubFailure(error)
    } finally {
      if (isCurrent(token)) loading.value = false
    }
  }

  async function run(operation: (token: number) => Promise<GitHubBranchOutcome>) {
    if (working.value || session.status.value.phase === 'working') return { kind: 'busy' as const }
    const token = generation
    working.value = true
    try {
      return await operation(token)
    } catch (error) {
      return isCurrent(token) ? failed(error) : { kind: 'stale' as const }
    } finally {
      working.value = false
    }
  }

  /** Create `name` from the bound branch's head and commit there from now on. */
  function createBranch(name: string): Promise<GitHubBranchOutcome> {
    return run(async (token) => {
      const current = binding.value
      const branch = name.trim()
      if (!current || !validBranchName(branch)) return { kind: 'invalid' }
      const client = await resolveClient()
      const head = await client.getBranchHead(current.owner, current.repo, current.branch)
      await client.createBranch(current.owner, current.repo, branch, head)
      if (!isCurrent(token)) return { kind: 'stale' }
      session.moveToBranch(branch)
      branches.value = null
      pullRequest.value = null
      return { kind: 'done' }
    })
  }

  /**
   * Load this document's version on `branch`. Unsaved edits block unless `discard`; a
   * branch without the document reports `missing` so it can be created there instead.
   */
  function switchBranch(branch: string, discard = false): Promise<GitHubBranchOutcome> {
    return run(async (token) => {
      const current = binding.value
      if (!current || branch === current.branch) return { kind: 'done' }
      if (!discard && services.hasUnsavedChanges()) return { kind: 'dirty' }
      const location = { owner: current.owner, repo: current.repo, branch }
      const probe = await probeGitHubDocument(await resolveClient(), location, current.path)
      if (!isCurrent(token)) return { kind: 'stale' }
      if (!probe.exists) return { kind: 'missing', branch, head: probe.head }
      await services.load(location, current.path)
      return { kind: 'done' }
    })
  }

  /** Commit this document to a branch that does not have it yet, on the next commit. */
  function adoptOnBranch(branch: string, head: string) {
    session.retarget(branch, head)
  }

  /** Delete a merged branch (never the default branch or the bound one). */
  function deleteBranch(branch: string): Promise<GitHubBranchOutcome> {
    return run(async (token) => {
      const current = binding.value
      if (!current || branch === current.branch || branch === defaultBranch.value) {
        return { kind: 'invalid' }
      }
      await (await resolveClient()).deleteBranch(current.owner, current.repo, branch)
      if (!isCurrent(token)) return { kind: 'stale' }
      branches.value = branches.value?.filter((item) => item.name !== branch) ?? null
      return { kind: 'done' }
    })
  }

  /** Title and body offered for a new pull request: the pages changed against the base. */
  async function pullRequestDraft(): Promise<GitHubPullRequestDraft> {
    const current = binding.value
    const title = pullRequestTitle(services.documentName())
    if (!current || !defaultBranch.value) return { title, body: '' }
    let pages: string[] = []
    let otherFiles = 0
    try {
      const changed = await changedPages(
        await resolveClient(),
        current,
        defaultBranch.value,
        current.path,
        services.pageNames()
      )
      pages = changed.pages
      otherFiles = changed.otherFiles
    } catch (error) {
      // The summary is a convenience; a failed comparison leaves it empty.
      if (!(error instanceof GitHubAPIError)) throw error
    }
    return {
      title,
      body: pullRequestBody({
        documentName: services.documentName(),
        documentPath: current.path,
        pages,
        otherFiles,
        description: ''
      })
    }
  }

  function createPullRequest(input: {
    title: string
    body: string
    draft: boolean
  }): Promise<GitHubBranchOutcome> {
    return run(async (token) => {
      const current = binding.value
      const base = defaultBranch.value
      if (!current || !base || current.branch === base || !input.title.trim()) {
        return { kind: 'invalid' }
      }
      const pull = await openPullRequest(await resolveClient(), current, { ...input, base })
      if (!isCurrent(token)) return { kind: 'stale' }
      pullRequest.value = pull
      return { kind: 'done' }
    })
  }

  return {
    branches,
    defaultBranch,
    pullRequest,
    loading,
    working,
    failure,
    onDefaultBranch,
    refresh,
    createBranch,
    switchBranch,
    adoptOnBranch,
    deleteBranch,
    pullRequestDraft,
    createPullRequest
  }
}

export type GitHubBranches = ReturnType<typeof useGitHubBranches>
