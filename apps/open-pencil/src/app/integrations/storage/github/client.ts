import * as v from 'valibot'

import { decodeBase64, encodeBase64 } from '@open-pencil/core/bytes'

/**
 * Typed GitHub REST client: the one place that talks to api.github.com.
 *
 * Every response is validated with Valibot before use. Callers pass a token resolved at
 * operation time; the client never stores it beyond its own lifetime. Branch, pull request
 * and issue endpoints can be added here next to the Git Data calls.
 */

export const GITHUB_API_URL = 'https://api.github.com'
const API_VERSION = '2022-11-28'
const REQUEST_TIMEOUT_MS = 60_000

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

export interface GitHubClientOptions {
  token: string
  fetch?: GitHubFetch
  baseURL?: string
  signal?: AbortSignal
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

  async function request<T extends v.GenericSchema>(
    method: string,
    path: string,
    schema: T,
    body?: unknown
  ): Promise<v.InferOutput<T>> {
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    let response: Response
    try {
      response = await fetcher(`${baseURL}${path}`, {
        method,
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${options.token}`,
          'X-GitHub-Api-Version': API_VERSION,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
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
    if (!response.ok) throw await toError(response)
    const parsed = v.safeParse(schema, await response.json().catch(() => null))
    if (!parsed.success) {
      throw new GitHubAPIError(
        'invalid-response',
        `Unexpected response from GitHub for ${method} ${path}`,
        response.status
      )
    }
    return parsed.output
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
    }
  }
}

export type GitHubClient = ReturnType<typeof createGitHubClient>
