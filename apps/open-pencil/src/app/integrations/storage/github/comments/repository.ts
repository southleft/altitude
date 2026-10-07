import { GitHubAPIError, type GitHubClient } from '../client'
import type { GitHubRepositoryLocation } from '../repository'
import { issueLabelNames, type GitHubIssue, type GitHubIssueComment } from '../schemas'
import {
  COMMENT_LABEL,
  commentBody,
  commentTitle,
  documentLabel,
  parseAnchor,
  stripAnchor,
  type CommentAnchor
} from './anchor'

export type CommentAuthor = { login: string; avatarURL: string; url: string | null }

export type CommentThread = {
  number: number
  url: string
  title: string
  /** Markdown without the anchor block. */
  body: string
  state: 'open' | 'closed'
  author: CommentAuthor | null
  createdAt: string
  updatedAt: string
  replyCount: number
  /** Null when the body has no valid anchor: listed, but without a pin. */
  anchor: CommentAnchor | null
}

export type CommentReply = {
  id: number
  url: string
  body: string
  author: CommentAuthor | null
  createdAt: string
}

const LABEL_COLORS: Record<string, string> = { [COMMENT_LABEL]: '9747ff' }
const DOCUMENT_LABEL_COLOR = 'c5def5'

function author(user: GitHubIssue['user']): CommentAuthor | null {
  return user ? { login: user.login, avatarURL: user.avatar_url, url: user.html_url ?? null } : null
}

export function threadFromIssue(issue: GitHubIssue): CommentThread {
  return {
    number: issue.number,
    url: issue.html_url,
    title: issue.title,
    body: stripAnchor(issue.body),
    state: issue.state,
    author: author(issue.user),
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    replyCount: issue.comments ?? 0,
    anchor: parseAnchor(issue.body)
  }
}

export function replyFromComment(comment: GitHubIssueComment): CommentReply {
  return {
    id: comment.id,
    url: comment.html_url,
    body: stripAnchor(comment.body),
    author: author(comment.user),
    createdAt: comment.created_at
  }
}

/**
 * Create the labels comments need when the repository lacks them. `known` remembers labels
 * already checked, so each is looked up once per session. A label created concurrently
 * (422) counts as present.
 */
export async function ensureCommentLabels(
  client: GitHubClient,
  location: GitHubRepositoryLocation,
  labels: readonly string[],
  known: Set<string>
): Promise<void> {
  for (const name of labels) {
    const key = `${location.owner}/${location.repo}:${name}`
    if (known.has(key)) continue
    const existing = await client.getLabel(location.owner, location.repo, name)
    if (!existing) {
      try {
        await client.createLabel(location.owner, location.repo, {
          name,
          color: LABEL_COLORS[name] ?? DOCUMENT_LABEL_COLOR,
          description:
            name === COMMENT_LABEL ? 'Design comment from OpenPencil' : 'OpenPencil document'
        })
      } catch (error) {
        if (!(error instanceof GitHubAPIError && error.kind === 'validation')) throw error
      }
    }
    known.add(key)
  }
}

/** Comment threads of one document: issues labelled for it whose anchor names it. */
export async function listCommentThreads(
  client: GitHubClient,
  location: GitHubRepositoryLocation,
  input: { documentPath: string; slug: string; includeResolved: boolean }
): Promise<CommentThread[]> {
  const issues = await client.listIssues(location.owner, location.repo, {
    labels: [COMMENT_LABEL, documentLabel(input.slug)],
    state: input.includeResolved ? 'all' : 'open'
  })
  return (
    issues
      .filter((issue) => issueLabelNames(issue).includes(COMMENT_LABEL))
      .map(threadFromIssue)
      // Another document with the same slug in a different folder shares the label.
      .filter((thread) => !thread.anchor || thread.anchor.doc === input.documentPath)
  )
}

/** Open pull request from `branch`, if any: comments mention it. */
async function openPullRequestNumber(
  client: GitHubClient,
  location: GitHubRepositoryLocation
): Promise<number | null> {
  try {
    const pulls = await client.listPullRequestsForBranch(
      location.owner,
      location.repo,
      location.branch
    )
    return pulls.find((pull) => pull.state === 'open')?.number ?? null
  } catch (error) {
    if (error instanceof GitHubAPIError && error.kind !== 'rate-limited') return null
    throw error
  }
}

export async function createCommentThread(
  client: GitHubClient,
  location: GitHubRepositoryLocation,
  input: {
    text: string
    anchor: CommentAnchor
    slug: string
    pageName: string
    nodeName: string | null
    fallbackTitle: string
    knownLabels: Set<string>
  }
): Promise<CommentThread> {
  const labels = [COMMENT_LABEL, documentLabel(input.slug)]
  await ensureCommentLabels(client, location, labels, input.knownLabels)
  const pullRequest = await openPullRequestNumber(client, location)
  const issue = await client.createIssue(location.owner, location.repo, {
    title: commentTitle(input.text, input.fallbackTitle),
    body: commentBody({
      text: input.text,
      anchor: input.anchor,
      pageName: input.pageName,
      nodeName: input.nodeName,
      pullRequest
    }),
    labels
  })
  return threadFromIssue(issue)
}

export async function listCommentReplies(
  client: GitHubClient,
  location: GitHubRepositoryLocation,
  number: number
): Promise<CommentReply[]> {
  const comments = await client.listIssueComments(location.owner, location.repo, number)
  return comments.map(replyFromComment)
}

export async function replyToCommentThread(
  client: GitHubClient,
  location: GitHubRepositoryLocation,
  number: number,
  text: string
): Promise<CommentReply> {
  return replyFromComment(
    await client.createIssueComment(location.owner, location.repo, number, text.trim())
  )
}

export async function setCommentThreadResolved(
  client: GitHubClient,
  location: GitHubRepositoryLocation,
  number: number,
  resolved: boolean
): Promise<CommentThread> {
  return threadFromIssue(
    await client.setIssueState(location.owner, location.repo, number, resolved ? 'closed' : 'open')
  )
}
