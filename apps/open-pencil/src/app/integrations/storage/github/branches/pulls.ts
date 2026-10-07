import { PAGES_DIRECTORY, uniqueSlugs } from '@open-pencil/core/io/formats/document-json'

import type { GitHubClient } from '../client'
import type { GitHubRepositoryLocation } from '../repository'
import type { GitHubPullRequest, GitHubReview } from '../schemas'

export type GitHubPullRequestState = 'open' | 'draft' | 'merged' | 'closed'
export type GitHubReviewDecision = 'approved' | 'changes-requested' | 'commented' | null

export type GitHubPullRequestSummary = {
  number: number
  url: string
  title: string
  state: GitHubPullRequestState
  review: GitHubReviewDecision
  base: string
}

export function pullRequestState(pull: GitHubPullRequest): GitHubPullRequestState {
  if (pull.merged_at) return 'merged'
  if (pull.state === 'closed') return 'closed'
  return pull.draft ? 'draft' : 'open'
}

/** Each reviewer's latest decisive review wins; any outstanding change request blocks. */
export function reviewDecision(reviews: readonly GitHubReview[]): GitHubReviewDecision {
  const latest = new Map<string, string>()
  for (const review of reviews) {
    const login = review.user?.login
    if (!login || review.state === 'PENDING') continue
    const previous = latest.get(login)
    // A later comment does not undo an earlier approval or change request.
    if (review.state === 'COMMENTED' && previous && previous !== 'COMMENTED') continue
    latest.set(login, review.state)
  }
  const states = new Set(latest.values())
  if (states.has('CHANGES_REQUESTED')) return 'changes-requested'
  if (states.has('APPROVED')) return 'approved'
  if (states.has('COMMENTED')) return 'commented'
  return null
}

function summarize(
  pull: GitHubPullRequest,
  review: GitHubReviewDecision
): GitHubPullRequestSummary {
  return {
    number: pull.number,
    url: pull.html_url,
    title: pull.title,
    state: pullRequestState(pull),
    review,
    base: pull.base.ref
  }
}

/**
 * The newest pull request from `location.branch`, open ones first, with its review
 * decision when it is open (one extra request). Null when the branch has none.
 */
export async function findPullRequest(
  client: GitHubClient,
  location: GitHubRepositoryLocation
): Promise<GitHubPullRequestSummary | null> {
  const pulls = await client.listPullRequestsForBranch(
    location.owner,
    location.repo,
    location.branch
  )
  const pull = pulls.find((candidate) => candidate.state === 'open') ?? pulls.at(0)
  if (!pull) return null
  const review =
    pull.state === 'open'
      ? reviewDecision(
          await client.listPullRequestReviews(location.owner, location.repo, pull.number)
        )
      : null
  return summarize(pull, review)
}

export async function openPullRequest(
  client: GitHubClient,
  location: GitHubRepositoryLocation,
  input: { title: string; body: string; base: string; draft: boolean }
): Promise<GitHubPullRequestSummary> {
  const pull = await client.createPullRequest(location.owner, location.repo, {
    title: input.title.trim(),
    body: input.body,
    head: location.branch,
    base: input.base,
    draft: input.draft
  })
  return summarize(pull, null)
}

/** Page file paths (relative to the document folder) to page names, as the writer names them. */
export function pageFilePaths(pageNames: readonly string[]): Map<string, string> {
  const slugs = uniqueSlugs(pageNames, 'page')
  return new Map(pageNames.map((name, index) => [`${PAGES_DIRECTORY}/${slugs[index]}.json`, name]))
}

/**
 * Names of the pages of the document at `documentPath` that differ between `base` and the
 * branch, from GitHub's comparison. Other changed files are counted, not named.
 */
export async function changedPages(
  client: GitHubClient,
  location: GitHubRepositoryLocation,
  base: string,
  documentPath: string,
  pageNames: readonly string[]
): Promise<{ pages: string[]; otherFiles: number }> {
  const comparison = await client.compare(location.owner, location.repo, base, location.branch)
  const pagesByPath = pageFilePaths(pageNames)
  const prefix = `${documentPath}/`
  const pages = new Set<string>()
  let otherFiles = 0
  for (const file of comparison.files ?? []) {
    if (!file.filename.startsWith(prefix)) continue
    const relative = file.filename.slice(prefix.length).replace(/\.source\.json$/, '.json')
    const page = pagesByPath.get(relative)
    if (page !== undefined) pages.add(page)
    else otherFiles++
  }
  return { pages: [...pages], otherFiles }
}

/**
 * Pull request body: the document, its changed pages and a note that it came from the
 * editor. Repository content, so English like commit messages.
 */
export function pullRequestBody(input: {
  documentName: string
  documentPath: string
  pages: readonly string[]
  otherFiles: number
  description: string
}): string {
  const description = input.description.trim()
  const lines: string[] = description ? [description, ''] : []
  lines.push(`**Document:** ${input.documentName} (\`${input.documentPath}\`)`, '')
  if (input.pages.length > 0) {
    lines.push('**Changed pages**', '', ...input.pages.map((page) => `- ${page}`), '')
  } else {
    lines.push('No page changes detected.', '')
  }
  if (input.otherFiles > 0) {
    lines.push(`Also changed: ${input.otherFiles} other document file(s).`, '')
  }
  lines.push('_Opened from OpenPencil._')
  return lines.join('\n')
}

/** Default pull request title for a document branch. */
export function pullRequestTitle(documentName: string): string {
  return `Update ${documentName.trim() || 'Untitled'}`
}
