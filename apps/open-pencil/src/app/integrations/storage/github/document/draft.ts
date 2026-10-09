import { githubAutosaveEnabled } from '../autosave/preferences'
import { draftBranchName, isDraftBranch } from '../branches/name'
import { GitHubAPIError, type GitHubClient } from '../client'
import { githubIdentity } from '../identity'
import { readGitHubPreferences } from '../preferences'
import {
  probeGitHubDocument,
  type GitHubDocumentBinding,
  type GitHubRepositoryLocation
} from '../repository'

/** Who the draft branch belongs to and which branch it starts from. */
export type GitHubDraftPolicy = {
  /** Signed-in GitHub login; draft branches are per person. */
  login: string
  /** The configured base branch (default `main`); only commits aimed at it are redirected. */
  base: string
}

/** The current policy: autosave on and someone signed in, or null (commit in place). */
export function currentDraftPolicy(): GitHubDraftPolicy | null {
  const login = githubIdentity.value?.login
  if (!githubAutosaveEnabled.value || !login) return null
  return { login, base: readGitHubPreferences().branch }
}

export type GitHubDraftTarget = {
  binding: GitHubDocumentBinding
  /** True when this call created the draft branch. */
  created: boolean
}

/**
 * Where a commit of `current` goes. A document bound to the base branch commits to its
 * draft branch `design/<doc>/<login>` instead, created at the commit the document was
 * loaded from (so the branch differs only by this document's changes). Any other branch,
 * such as one the user created or switched to, is committed to as it is.
 */
export async function resolveDraftTarget(
  client: GitHubClient,
  current: GitHubDocumentBinding,
  policy: GitHubDraftPolicy | null
): Promise<GitHubDraftTarget> {
  if (!policy || current.branch !== policy.base) return { binding: current, created: false }
  const branch = draftBranchName(current.path, policy.login)
  let created = false
  try {
    await client.createBranch(current.owner, current.repo, branch, current.commitSHA)
    created = true
  } catch (error) {
    // The branch is already there (an earlier session or another tab): commit on top of it.
    if (!(error instanceof GitHubAPIError && error.kind === 'conflict')) throw error
  }
  return { binding: { ...current, branch }, created }
}

/**
 * After a commit to `target` failed with `error`: when that was the person's draft branch
 * and it no longer exists (deleted after its pull request merged), create it again from the
 * base branch head and return the binding to retry with. Otherwise null.
 *
 * The binding's file manifest stays: after a merge the base branch holds the same blobs, so
 * the retried commit carries only the changes made since.
 */
export async function restartDraftBranch(
  client: GitHubClient,
  target: GitHubDocumentBinding,
  policy: GitHubDraftPolicy | null,
  error: unknown
): Promise<GitHubDocumentBinding | null> {
  if (!(error instanceof GitHubAPIError && error.kind === 'not-found')) return null
  if (!policy || !isDraftBranch(target.branch, target.path, policy.login)) return null
  const head = await client.getBranchHead(target.owner, target.repo, policy.base)
  try {
    await client.createBranch(target.owner, target.repo, target.branch, head)
  } catch (createError) {
    if (!(createError instanceof GitHubAPIError && createError.kind === 'conflict')) {
      throw createError
    }
  }
  return { ...target, commitSHA: head }
}

/**
 * Where to open a document listed on `location.branch`: the signed-in person's draft
 * branch when it already holds the document (their autosaved work in progress), otherwise
 * the listed branch. Lookup failures fall back to the listed branch.
 */
export async function preferredDocumentLocation(
  client: GitHubClient,
  location: GitHubRepositoryLocation,
  path: string,
  policy: GitHubDraftPolicy | null
): Promise<GitHubRepositoryLocation> {
  if (!policy || location.branch !== policy.base) return location
  const draft = { ...location, branch: draftBranchName(path, policy.login) }
  try {
    return (await probeGitHubDocument(client, draft, path)).exists ? draft : location
  } catch {
    return location
  }
}
