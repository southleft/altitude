import { decodeBase64, encodeBase64 } from '@open-pencil/core/bytes'
import { gitBlobSHA } from '@open-pencil/core/io/formats/document-json'

import type { GitHubFetch } from '@/app/integrations/storage/github/client'

type TreeView = { files: ReadonlyMap<string, string>; prefix: string }
type RequestBody = {
  content?: string
  base_tree?: string
  /** POST /git/trees sends entries; POST /git/commits sends the tree SHA. */
  tree?: string | Array<{ path: string; sha: string | null }>
  message?: string
  parents?: string[]
  sha?: string
  force?: boolean
  ref?: string
}
type Handler = (match: RegExpExecArray, body: RequestBody, url: URL) => Response | Promise<Response>

const USER = {
  id: 7,
  login: 'octo',
  name: 'Octo Cat',
  avatar_url: 'https://avatars.example/octo',
  html_url: 'https://github.com/octo'
}
const NOT_FOUND = () => Response.json({ message: 'Not Found' }, { status: 404 })
type Commit = { tree: string; parents: string[]; message: string; date: string }

/**
 * An in-memory GitHub repository behind the REST endpoints the client uses: refs, commits,
 * trees (flat file maps; folders get synthetic SHAs), blobs, and fast-forward-only ref
 * updates. Requests are recorded so tests can count uploads.
 */
export class FakeGitHub {
  readonly blobs = new Map<string, Uint8Array>()
  readonly trees = new Map<string, TreeView>()
  readonly commits = new Map<string, Commit>()
  readonly requests: string[] = []
  /** Branch heads by name; `head` is the default branch's. */
  readonly branches = new Map<string, string>()
  /** Respond with this status to the next request matching the pattern, once. */
  failures: Array<{ pattern: RegExp; status: number; headers?: Record<string, string> }> = []
  /** Runs before the next ref update, once (simulates a concurrent push). */
  beforeRefUpdate: (() => Promise<void>) | null = null
  #ids = 0

  constructor(
    readonly owner = 'southleft',
    readonly repo = 'altitude-designs',
    readonly branch = 'main'
  ) {}

  get head(): string {
    return this.branches.get(this.branch) ?? ''
  }

  set head(sha: string) {
    this.branches.set(this.branch, sha)
  }

  /** A new branch at `from` (the default branch head by default). */
  createBranch(name: string, from = this.head) {
    this.branches.set(name, from)
  }

  async init(files: Record<string, string> = { 'README.md': '# Designs\n' }) {
    this.head = await this.commitFiles(files, 'Initial commit', [])
  }

  #id(kind: string) {
    this.#ids++
    return `${kind}${String(this.#ids).padStart(38, '0')}`
  }

  #tree(files: Map<string, string>, prefix = ''): string {
    const id = this.#id('t')
    this.trees.set(id, { files, prefix })
    return id
  }

  async putBlob(bytes: Uint8Array): Promise<string> {
    const sha = await gitBlobSHA(bytes)
    this.blobs.set(sha, bytes)
    return sha
  }

  /** Commit straight to the branch, as another collaborator would. */
  async commitFiles(
    changes: Record<string, string | null>,
    message: string,
    parents?: string[],
    branch = this.branch
  ): Promise<string> {
    const base = this.branches.get(branch) ?? ''
    const files = base ? this.files(base) : new Map<string, string>()
    for (const [path, content] of Object.entries(changes)) {
      if (content === null) files.delete(path)
      else files.set(path, await this.putBlob(new TextEncoder().encode(content)))
    }
    const sha = this.#id('c')
    this.commits.set(sha, {
      tree: this.#tree(files),
      parents: parents ?? (base ? [base] : []),
      message,
      date: '2026-10-07T12:00:00Z'
    })
    this.branches.set(branch, sha)
    return sha
  }

  /** Every file at the branch head, by full path. */
  files(commit = this.head): Map<string, string> {
    const entry = this.commits.get(commit)
    const tree = entry ? this.trees.get(entry.tree) : undefined
    return new Map(tree?.files)
  }

  text(path: string): string | null {
    const sha = this.files().get(path)
    const bytes = sha ? this.blobs.get(sha) : undefined
    return bytes ? new TextDecoder().decode(bytes) : null
  }

  #listing(id: string, recursive: boolean) {
    const view = this.trees.get(id)
    if (!view) return null
    const entries = new Map<string, { path: string; mode: string; type: string; sha: string }>()
    for (const [path, sha] of view.files) {
      if (!path.startsWith(view.prefix)) continue
      const relative = path.slice(view.prefix.length)
      if (recursive || !relative.includes('/')) {
        entries.set(relative, { path: relative, mode: '100644', type: 'blob', sha })
        continue
      }
      const folder = relative.slice(0, relative.indexOf('/'))
      if (!entries.has(folder)) {
        entries.set(folder, {
          path: folder,
          mode: '040000',
          type: 'tree',
          sha: this.#tree(new Map(view.files), `${view.prefix}${folder}/`)
        })
      }
    }
    return { sha: id, tree: [...entries.values()], truncated: false }
  }

  #isAncestor(ancestor: string, commit: string): boolean {
    if (ancestor === commit) return true
    return (this.commits.get(commit)?.parents ?? []).some((parent) =>
      this.#isAncestor(ancestor, parent)
    )
  }

  readonly fetch: GitHubFetch = async (input, init) => {
    const url = new URL(input)
    const method = init.method ?? 'GET'
    const route = `${method} ${url.pathname}`
    this.requests.push(route)
    const failure = this.failures.find((candidate) => candidate.pattern.test(route))
    if (failure) {
      this.failures = this.failures.filter((candidate) => candidate !== failure)
      return Response.json(
        { message: 'Simulated failure' },
        { status: failure.status, headers: failure.headers }
      )
    }
    const body = typeof init.body === 'string' ? (JSON.parse(init.body) as RequestBody) : {}
    for (const [pattern, handle] of this.#routes()) {
      const match = pattern.exec(route)
      if (match) return handle(match, body, url)
    }
    return Response.json({ message: `Unhandled ${route}` }, { status: 500 })
  }

  #routes(): Array<[RegExp, Handler]> {
    const repo = `/repos/${this.owner}/${this.repo}`
    return [
      [/^GET \/user$/, () => Response.json(USER)],
      [new RegExp(`^GET ${repo}$`), () => Response.json(this.#repository())],
      [new RegExp(`^GET ${repo}/git/ref/heads/(.+)$`), (match) => this.#getRef(match[1])],
      [new RegExp(`^GET ${repo}/branches$`), () => this.#listBranches()],
      [new RegExp(`^POST ${repo}/git/refs$`), (_match, body) => this.#createRef(body)],
      [new RegExp(`^DELETE ${repo}/git/refs/heads/(.+)$`), (match) => this.#deleteRef(match[1])],
      [/^GET .*\/git\/commits\/([^/]+)$/, (match) => this.#getCommit(match[1])],
      [/^GET .*\/git\/trees\/([^/]+)$/, (match, _body, url) => this.#getTree(match[1], url)],
      [/^GET .*\/git\/blobs\/([^/]+)$/, (match) => this.#getBlob(match[1])],
      [new RegExp(`^POST ${repo}/git/blobs$`), (_match, body) => this.#createBlob(body)],
      [new RegExp(`^POST ${repo}/git/trees$`), (_match, body) => this.#createTree(body)],
      [new RegExp(`^POST ${repo}/git/commits$`), (_match, body) => this.#createCommit(body)],
      [
        new RegExp(`^PATCH ${repo}/git/refs/heads/(.+)$`),
        (match, body) => this.#updateRef(decodeURIComponent(match[1]), body)
      ]
    ]
  }

  #repository() {
    return {
      full_name: `${this.owner}/${this.repo}`,
      private: true,
      default_branch: this.branch,
      html_url: `https://github.com/${this.owner}/${this.repo}`,
      permissions: { push: true, pull: true }
    }
  }

  #ref(sha: string, branch = this.branch) {
    return Response.json({ ref: `refs/heads/${branch}`, object: { sha, type: 'commit' } })
  }

  #getRef(encoded: string) {
    const branch = decodeURIComponent(encoded)
    const sha = this.branches.get(branch)
    return sha ? this.#ref(sha, branch) : NOT_FOUND()
  }

  #listBranches() {
    return Response.json(
      [...this.branches].map(([name, sha]) => ({ name, commit: { sha }, protected: false }))
    )
  }

  #createRef(body: RequestBody) {
    const branch = (body.ref ?? '').replace(/^refs\/heads\//, '')
    if (this.branches.has(branch)) {
      return Response.json({ message: 'Reference already exists' }, { status: 422 })
    }
    this.branches.set(branch, body.sha ?? '')
    return this.#ref(body.sha ?? '', branch)
  }

  #deleteRef(encoded: string) {
    const branch = decodeURIComponent(encoded)
    if (!this.branches.delete(branch)) return NOT_FOUND()
    return new Response(null, { status: 204 })
  }

  #getCommit(sha: string) {
    const commit = this.commits.get(sha)
    if (!commit) return NOT_FOUND()
    return Response.json({
      sha,
      message: commit.message,
      tree: { sha: commit.tree },
      parents: commit.parents.map((parent) => ({ sha: parent })),
      committer: { date: commit.date }
    })
  }

  #getTree(sha: string, url: URL) {
    const listing = this.#listing(sha, url.searchParams.get('recursive') === '1')
    return listing ? Response.json(listing) : NOT_FOUND()
  }

  #getBlob(sha: string) {
    const bytes = this.blobs.get(sha)
    if (!bytes) return NOT_FOUND()
    return Response.json({
      sha,
      size: bytes.byteLength,
      encoding: 'base64',
      content: encodeBase64(bytes)
    })
  }

  async #createBlob(body: RequestBody) {
    const sha = await this.putBlob(decodeBase64(body.content ?? ''))
    return Response.json({ sha }, { status: 201 })
  }

  #createTree(body: RequestBody) {
    const files = new Map(this.trees.get(body.base_tree ?? '')?.files)
    for (const entry of Array.isArray(body.tree) ? body.tree : []) {
      if (entry.sha === null) files.delete(entry.path)
      else files.set(entry.path, entry.sha)
    }
    return Response.json({ sha: this.#tree(files) }, { status: 201 })
  }

  #createCommit(body: RequestBody) {
    const sha = this.#id('c')
    const commit = {
      tree: typeof body.tree === 'string' ? body.tree : '',
      parents: body.parents ?? [],
      message: body.message ?? '',
      date: '2026-10-07T12:30:00Z'
    }
    this.commits.set(sha, commit)
    return Response.json(
      {
        sha,
        message: commit.message,
        tree: { sha: commit.tree },
        parents: commit.parents.map((parent) => ({ sha: parent })),
        committer: { date: commit.date }
      },
      { status: 201 }
    )
  }

  async #updateRef(branch: string, body: RequestBody) {
    const hook = this.beforeRefUpdate
    this.beforeRefUpdate = null
    await hook?.()
    const sha = body.sha ?? ''
    const current = this.branches.get(branch)
    if (current === undefined) return NOT_FOUND()
    if (body.force !== false || !this.#isAncestor(current, sha)) {
      return Response.json({ message: 'Update is not a fast forward' }, { status: 422 })
    }
    this.branches.set(branch, sha)
    return this.#ref(sha, branch)
  }
}
