import * as v from 'valibot'

import { decodeBase64, encodeBase64 } from '@open-pencil/core/bytes'

import {
  BranchSchema,
  CompareSchema,
  IssueCommentSchema,
  IssueSchema,
  IssueSearchSchema,
  PullRequestSchema,
  RepositoryLabelSchema,
  ReviewSchema,
  type GitHubBranch,
  type GitHubIssue
} from './schemas'

/**
 * Typed GitHub REST client: the one place that talks to api.github.com.
 *
 * Every response is validated with Valibot before use. Callers pass a token resolved at
 * operation time; the client never stores it beyond its own lifetime. Git Data calls back
 * the commit flow; branch, pull request, issue and label calls back branches, pull requests
 * and comments.
 */

export const GITHUB_API_URL = 'https://api.github.com'
const API_VERSION = '2022-11-28'
const REQUEST_TIMEOUT_MS = 60_000
/** Listing endpoints return at most this many items per request. */
const PAGE_SIZE = 100
/** Stop following `Link: rel="next"` after this many pages. */
const MAX_PAGES = 10

export type GitHubErrorKind =
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'rate-limited'
  | 'conflict'
  | 'validation'
  | 'too-large'
  | 'network'
  | 'invalid-response'

export class GitHubAPIError extends Error {
  constructor(
    readonly kind: GitHubErrorKind,
    message: string,
    readonly status: number | null = null,
    /** When a rate limit resets, if GitHub said. */
    readonly resetAt: Date | null = null
  ) {
    super(message)
    this.name = 'GitHubAPIError'
  }
}

const UserSchema = v.object({
  id: v.number(),
  login: v.string(),
  name: v.nullish(v.string()),
  avatar_url: v.string(),
  html_url: v.string()
})

const RepositorySchema = v.object({
  full_name: v.string(),
  private: v.boolean(),
  default_branch: v.string(),
  html_url: v.string(),
  permissions: v.optional(
    v.object({ push: v.optional(v.boolean()), pull: v.optional(v.boolean()) })
  )
})

const RefSchema = v.object({
  ref: v.string(),
  object: v.object({ sha: v.string(), type: v.string() })
})

const CommitSchema = v.object({
  sha: v.string(),
  html_url: v.optional(v.string()),
  message: v.string(),
  tree: v.object({ sha: v.string() }),
  parents: v.array(v.object({ sha: v.string() })),
  committer: v.nullish(v.object({ date: v.optional(v.string()) }))
})

const TreeEntrySchema = v.object({
  path: v.string(),
  mode: v.string(),
  type: v.picklist(['blob', 'tree', 'commit']),
  sha: v.string(),
  size: v.optional(v.number())
})

const TreeSchema = v.object({
  sha: v.string(),
  tree: v.array(TreeEntrySchema),
  truncated: v.boolean()
})

const BlobSchema = v.object({
  sha: v.string(),
  size: v.number(),
  encoding: v.string(),
  content: v.string()
})

const CreatedSchema = v.object({ sha: v.string() })

const ErrorBodySchema = v.object({ message: v.optional(v.string()) })

const GraphQLResponseSchema = v.object({
  data: v.nullish(v.unknown()),
  errors: v.optional(v.array(v.object({ message: v.string(), type: v.optional(v.string()) })))
})

/** GraphQL error types that match a REST failure kind; anything else is a validation error. */
const GRAPHQL_ERROR_KINDS: Readonly<Record<string, GitHubErrorKind>> = {
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'not-found',
  RATE_LIMITED: 'rate-limited'
}

const ReadyForReviewSchema = v.object({
  markPullRequestReadyForReview: v.object({
    pullRequest: v.object({ number: v.number(), isDraft: v.boolean() })
  })
})

export type GitHubUser = v.InferOutput<typeof UserSchema>
export type GitHubRepository = v.InferOutput<typeof RepositorySchema>
export type GitHubCommit = v.InferOutput<typeof CommitSchema>
export type GitHubTreeEntry = v.InferOutput<typeof TreeEntrySchema>
export type GitHubTree = v.InferOutput<typeof TreeSchema>

export type GitHubTreeWrite = {
  path: string
  mode: '100644'
  type: 'blob'
  /** `null` deletes the path. */
  sha: string | null
}

export type GitHubFetch = (input: string, init: RequestInit) => Promise<Response>

/** Conditional-request cache: a 304 costs no rate limit and returns the stored body. */
export type GitHubETagCache = Map<string, { etag: string; body: unknown }>

export interface GitHubClientOptions {
  token: string
  fetch?: GitHubFetch
  baseURL?: string
  signal?: AbortSignal
  /** Reuse GET responses through ETags; owned by the caller and shared across clients. */
  etags?: GitHubETagCache
}

export type GitHubIssueState = 'open' | 'closed' | 'all'

export type GitHubPullRequestInput = {
  title: string
  body: string
  head: string
  base: string
  draft: boolean
}

export type GitHubLabelInput = { name: string; color: string; description?: string }

/** The `rel="next"` URL of a `Link` header, if any. */
export function nextPageURL(link: string | null): string | null {
  if (!link) return null
  for (const part of link.split(',')) {
    const match = /<([^>]+)>\s*;\s*rel="next"/.exec(part)
    if (match) return match[1]
  }
  return null
}

function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/')
}

function repoPath(owner: string, repo: string): string {
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
}

async function errorMessage(response: Response): Promise<string> {
  // A body that is not JSON falls through to the status text.
  const body: unknown = await response.json().catch(() => null)
  const parsed = v.safeParse(ErrorBodySchema, body)
  if (parsed.success && parsed.output.message) return parsed.output.message
  return response.statusText || `HTTP ${response.status}`
}

async function toError(response: Response): Promise<GitHubAPIError> {
  const message = await errorMessage(response)
  const remaining = response.headers.get('x-ratelimit-remaining')
  const reset = Number(response.headers.get('x-ratelimit-reset'))
  const resetAt = Number.isFinite(reset) && reset > 0 ? new Date(reset * 1000) : null
  if (response.status === 429 || (response.status === 403 && remaining === '0')) {
    return new GitHubAPIError('rate-limited', message, response.status, resetAt)
  }
  if (response.status === 403 && /secondary rate limit/i.test(message)) {
    return new GitHubAPIError('rate-limited', message, response.status, resetAt)
  }
  switch (response.status) {
    case 401:
      return new GitHubAPIError('unauthorized', message, 401)
    case 403:
      return new GitHubAPIError('forbidden', message, 403)
    case 404:
      return new GitHubAPIError('not-found', message, 404)
    case 409:
      return new GitHubAPIError('conflict', message, 409)
    case 413:
      return new GitHubAPIError('too-large', message, 413)
    case 422:
      return /fast.forward|reference.*(update|exists)/i.test(message)
        ? new GitHubAPIError('conflict', message, 422)
        : new GitHubAPIError('validation', message, 422)
    default:
      return new GitHubAPIError('network', message, response.status)
  }
}

export function createGitHubClient(options: GitHubClientOptions) {
  const baseURL = options.baseURL ?? GITHUB_API_URL
  const fetcher: GitHubFetch = options.fetch ?? ((input, init) => fetch(input, init))

  async function send(
    method: string,
    url: string,
    body?: unknown,
    extraHeaders: Record<string, string> = {}
  ): Promise<Response> {
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    let response: Response
    try {
      response = await fetcher(url, {
        method,
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${options.token}`,
          'X-GitHub-Api-Version': API_VERSION,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...extraHeaders
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
        cache: 'no-store'
      })
    } catch (cause) {
      options.signal?.throwIfAborted()
      const detail = cause instanceof Error ? cause.message : String(cause)
      throw new GitHubAPIError(
        'network',
        timeout.aborted ? 'GitHub did not respond in time.' : detail
      )
    }
    if (!response.ok && response.status !== 304) throw await toError(response)
    return response
  }

  function validate<T extends v.GenericSchema>(
    schema: T,
    data: unknown,
    label: string,
    status: number
  ): v.InferOutput<T> {
    const parsed = v.safeParse(schema, data)
    if (!parsed.success) {
      throw new GitHubAPIError(
        'invalid-response',
        `Unexpected response from GitHub for ${label}`,
        status
      )
    }
    return parsed.output
  }

  async function request<T extends v.GenericSchema>(
    method: string,
    path: string,
    schema: T,
    body?: unknown
  ): Promise<v.InferOutput<T>> {
    const url = `${baseURL}${path}`
    const cached = method === 'GET' ? options.etags?.get(url) : undefined
    const response = await send(method, url, body, cached ? { 'If-None-Match': cached.etag } : {})
    if (response.status === 304) {
      if (!cached) throw new GitHubAPIError('invalid-response', `Unexpected 304 for ${path}`, 304)
      return validate(schema, cached.body, `${method} ${path}`, 304)
    }
    const data: unknown = await response.json().catch(() => null)
    const output = validate(schema, data, `${method} ${path}`, response.status)
    const etag = response.headers.get('etag')
    if (method === 'GET' && etag && options.etags) options.etags.set(url, { etag, body: data })
    return output
  }

  /** A request whose success has no body (204), such as deleting a ref. */
  async function requestEmpty(method: string, path: string, body?: unknown): Promise<void> {
    await send(method, `${baseURL}${path}`, body)
  }

  /**
   * A GraphQL query or mutation. GraphQL reports most failures in a 200 response's
   * `errors`; they map to the same error kinds as REST failures.
   */
  async function graphql<T extends v.GenericSchema>(
    query: string,
    variables: Record<string, unknown>,
    schema: T
  ): Promise<v.InferOutput<T>> {
    const response = await send('POST', `${baseURL}/graphql`, { query, variables })
    const body: unknown = await response.json().catch(() => null)
    const parsed = validate(GraphQLResponseSchema, body, 'POST /graphql', response.status)
    const error = parsed.errors?.at(0)
    if (error) {
      const kind = (error.type && GRAPHQL_ERROR_KINDS[error.type]) || 'validation'
      throw new GitHubAPIError(kind, error.message, response.status)
    }
    return validate(schema, parsed.data, 'POST /graphql', response.status)
  }

  /** Every item of a paged listing, following `Link` headers up to `MAX_PAGES`. */
  async function paginate<T extends v.GenericSchema>(
    path: string,
    schema: T
  ): Promise<Array<v.InferOutput<T>>> {
    const items: Array<v.InferOutput<T>> = []
    const separator = path.includes('?') ? '&' : '?'
    let url: string | null = `${baseURL}${path}${separator}per_page=${PAGE_SIZE}`
    for (let page = 0; url && page < MAX_PAGES; page++) {
      // Follow links only back to the same API origin; the token goes with every request.
      if (!url.startsWith(`${baseURL}/`)) break
      const response = await send('GET', url)
      const data: unknown = await response.json().catch(() => null)
      items.push(...validate(v.array(schema), data, `GET ${path}`, response.status))
      url = nextPageURL(response.headers.get('link'))
    }
    return items
  }

  return {
    getAuthenticatedUser: () => request('GET', '/user', UserSchema),

    getRepository: (owner: string, repo: string) =>
      request('GET', repoPath(owner, repo), RepositorySchema),

    async getBranchHead(owner: string, repo: string, branch: string): Promise<string> {
      const ref = await request(
        'GET',
        `${repoPath(owner, repo)}/git/ref/heads/${encodePath(branch)}`,
        RefSchema
      )
      return ref.object.sha
    },

    getCommit: (owner: string, repo: string, sha: string) =>
      request(
        'GET',
        `${repoPath(owner, repo)}/git/commits/${encodeURIComponent(sha)}`,
        CommitSchema
      ),

    getTree: (owner: string, repo: string, sha: string, recursive = false) =>
      request(
        'GET',
        `${repoPath(owner, repo)}/git/trees/${encodeURIComponent(sha)}${recursive ? '?recursive=1' : ''}`,
        TreeSchema
      ),

    async getBlob(owner: string, repo: string, sha: string): Promise<Uint8Array> {
      const blob = await request(
        'GET',
        `${repoPath(owner, repo)}/git/blobs/${encodeURIComponent(sha)}`,
        BlobSchema
      )
      if (blob.encoding !== 'base64') {
        throw new GitHubAPIError('invalid-response', `Unsupported blob encoding ${blob.encoding}`)
      }
      return decodeBase64(blob.content.replace(/\s/g, ''))
    },

    async createBlob(owner: string, repo: string, bytes: Uint8Array): Promise<string> {
      const created = await request('POST', `${repoPath(owner, repo)}/git/blobs`, CreatedSchema, {
        content: encodeBase64(bytes),
        encoding: 'base64'
      })
      return created.sha
    },

    async createTree(
      owner: string,
      repo: string,
      baseTree: string,
      entries: readonly GitHubTreeWrite[]
    ): Promise<string> {
      const created = await request('POST', `${repoPath(owner, repo)}/git/trees`, CreatedSchema, {
        base_tree: baseTree,
        tree: entries
      })
      return created.sha
    },

    createCommit: (
      owner: string,
      repo: string,
      commit: { message: string; tree: string; parents: string[] }
    ) => request('POST', `${repoPath(owner, repo)}/git/commits`, CommitSchema, commit),

    async updateBranch(owner: string, repo: string, branch: string, sha: string): Promise<void> {
      await request(
        'PATCH',
        `${repoPath(owner, repo)}/git/refs/heads/${encodePath(branch)}`,
        RefSchema,
        { sha, force: false }
      )
    },

    /** Every branch, following pagination (up to 1,000). */
    listBranches: (owner: string, repo: string): Promise<GitHubBranch[]> =>
      paginate(`${repoPath(owner, repo)}/branches`, BranchSchema),

    /** A new branch at `sha`; an existing name fails as a `conflict`. */
    async createBranch(owner: string, repo: string, branch: string, sha: string): Promise<void> {
      await request('POST', `${repoPath(owner, repo)}/git/refs`, RefSchema, {
        ref: `refs/heads/${branch}`,
        sha
      })
    },

    deleteBranch: (owner: string, repo: string, branch: string) =>
      requestEmpty('DELETE', `${repoPath(owner, repo)}/git/refs/heads/${encodePath(branch)}`),

    /** Files changed between two refs (`base...head`). */
    compare: (owner: string, repo: string, base: string, head: string) =>
      request(
        'GET',
        `${repoPath(owner, repo)}/compare/${encodePath(base)}...${encodePath(head)}`,
        CompareSchema
      ),

    /** Pull requests whose head is `branch` in this repository, newest first. */
    listPullRequestsForBranch: (owner: string, repo: string, branch: string) =>
      request(
        'GET',
        `${repoPath(owner, repo)}/pulls?state=all&sort=created&direction=desc&per_page=10&head=${encodeURIComponent(`${owner}:${branch}`)}`,
        v.array(PullRequestSchema)
      ),

    createPullRequest: (owner: string, repo: string, input: GitHubPullRequestInput) =>
      request('POST', `${repoPath(owner, repo)}/pulls`, PullRequestSchema, input),

    /**
     * Take a draft pull request out of draft. REST cannot do this; GraphQL can, with the
     * pull request's `node_id`.
     */
    async markPullRequestReadyForReview(nodeId: string): Promise<{ number: number }> {
      const data = await graphql(
        'mutation($id: ID!) { markPullRequestReadyForReview(input: { pullRequestId: $id }) { pullRequest { number isDraft } } }',
        { id: nodeId },
        ReadyForReviewSchema
      )
      return { number: data.markPullRequestReadyForReview.pullRequest.number }
    },

    listPullRequestReviews: (owner: string, repo: string, number: number) =>
      request(
        'GET',
        `${repoPath(owner, repo)}/pulls/${number}/reviews?per_page=${PAGE_SIZE}`,
        v.array(ReviewSchema)
      ),

    /**
     * Issues carrying every label in `labels`, without pull requests. Uses the issue listing
     * rather than search: no indexing delay, and the core rate limit instead of 30 a minute.
     */
    async listIssues(
      owner: string,
      repo: string,
      query: { labels: readonly string[]; state: GitHubIssueState }
    ): Promise<GitHubIssue[]> {
      const labels = encodeURIComponent(query.labels.join(','))
      const issues = await request(
        'GET',
        `${repoPath(owner, repo)}/issues?labels=${labels}&state=${query.state}&per_page=${PAGE_SIZE}&sort=created&direction=desc`,
        v.array(IssueSchema)
      )
      return issues.filter((issue) => issue.pull_request === undefined)
    },

    /** Issue search (30 requests a minute); prefer `listIssues` for label queries. */
    searchIssues: (query: string) =>
      request(
        'GET',
        `/search/issues?q=${encodeURIComponent(query)}&per_page=${PAGE_SIZE}`,
        IssueSearchSchema
      ),

    createIssue: (
      owner: string,
      repo: string,
      input: { title: string; body: string; labels: readonly string[] }
    ) => request('POST', `${repoPath(owner, repo)}/issues`, IssueSchema, input),

    setIssueState: (owner: string, repo: string, number: number, state: 'open' | 'closed') =>
      request('PATCH', `${repoPath(owner, repo)}/issues/${number}`, IssueSchema, {
        state,
        ...(state === 'closed' ? { state_reason: 'completed' } : {})
      }),

    listIssueComments: (owner: string, repo: string, number: number) =>
      request(
        'GET',
        `${repoPath(owner, repo)}/issues/${number}/comments?per_page=${PAGE_SIZE}`,
        v.array(IssueCommentSchema)
      ),

    createIssueComment: (owner: string, repo: string, number: number, body: string) =>
      request('POST', `${repoPath(owner, repo)}/issues/${number}/comments`, IssueCommentSchema, {
        body
      }),

    /** A label by name, or null when the repository does not have it. */
    async getLabel(owner: string, repo: string, name: string) {
      try {
        return await request(
          'GET',
          `${repoPath(owner, repo)}/labels/${encodeURIComponent(name)}`,
          RepositoryLabelSchema
        )
      } catch (error) {
        if (error instanceof GitHubAPIError && error.kind === 'not-found') return null
        throw error
      }
    },

    createLabel: (owner: string, repo: string, label: GitHubLabelInput) =>
      request('POST', `${repoPath(owner, repo)}/labels`, RepositoryLabelSchema, label)
  }
}

export type GitHubClient = ReturnType<typeof createGitHubClient>
