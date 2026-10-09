import {
  gitBlobSHA,
  MANIFEST_PATH,
  parseDocumentJSONManifest,
  readDocumentJSON,
  slugify,
  sourceSidecarPath,
  type DocumentJSONSnapshot
} from '@open-pencil/core/io/formats/document-json'
import type { SceneGraph } from '@open-pencil/scene-graph'

import { GitHubAPIError, type GitHubClient, type GitHubTreeWrite } from './client'

export type GitHubRepositoryLocation = {
  owner: string
  repo: string
  branch: string
}

/**
 * What a GitHub-bound document was loaded from or last committed as. Kept per document:
 * the branch is part of the binding, not a global setting.
 */
export type GitHubDocumentBinding = GitHubRepositoryLocation & {
  /** Document folder in the repository, such as `documents/landing-page`. */
  path: string
  /** Commit this document revision corresponds to. */
  commitSHA: string
  committedAt: string | null
  /** Blob SHA of every file in the document folder at `commitSHA`, by relative path. */
  files: Readonly<Record<string, string>>
}

export type GitHubDocumentSummary = {
  path: string
  name: string
}

/** GitHub refuses blobs over 100 MB; files over 50 MB get a warning. */
export const GITHUB_MAX_FILE_BYTES = 100 * 1024 * 1024
export const GITHUB_WARN_FILE_BYTES = 50 * 1024 * 1024

const READ_CONCURRENCY = 6
const WRITE_CONCURRENCY = 4
const MAX_COMMIT_ATTEMPTS = 3

async function mapLimited<T, R>(
  items: readonly T[],
  limit: number,
  run: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = Array.from({ length: items.length })
  let next = 0
  async function worker() {
    while (next < items.length) {
      const index = next++
      results[index] = await run(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

function joinPath(...parts: string[]): string {
  return parts.filter(Boolean).join('/')
}

/** SHA of the tree at `path` inside `rootTree`, or null when the folder does not exist. */
async function folderTreeSHA(
  client: GitHubClient,
  location: GitHubRepositoryLocation,
  rootTree: string,
  path: string
): Promise<string | null> {
  let tree = rootTree
  for (const segment of path.split('/').filter(Boolean)) {
    const listing = await client.getTree(location.owner, location.repo, tree)
    const entry = listing.tree.find((item) => item.type === 'tree' && item.path === segment)
    if (!entry) return null
    tree = entry.sha
  }
  return tree
}

type BranchState = { head: string; rootTree: string; committedAt: string | null }

async function branchState(
  client: GitHubClient,
  location: GitHubRepositoryLocation
): Promise<BranchState> {
  const head = await client.getBranchHead(location.owner, location.repo, location.branch)
  const commit = await client.getCommit(location.owner, location.repo, head)
  return { head, rootTree: commit.tree.sha, committedAt: commit.committer?.date ?? null }
}

/** Blob SHAs of every file under `path`, by path relative to it. */
async function folderFiles(
  client: GitHubClient,
  location: GitHubRepositoryLocation,
  rootTree: string,
  path: string
): Promise<Record<string, string>> {
  const tree = await folderTreeSHA(client, location, rootTree, path)
  if (!tree) return {}
  const listing = await client.getTree(location.owner, location.repo, tree, true)
  if (listing.truncated) {
    throw new GitHubAPIError('invalid-response', `The folder ${path} has too many files to list.`)
  }
  return Object.fromEntries(
    listing.tree.filter((entry) => entry.type === 'blob').map((entry) => [entry.path, entry.sha])
  )
}

/** Documents in `folder`: every direct subfolder that holds a `document.json`. */
export async function listGitHubDocuments(
  client: GitHubClient,
  location: GitHubRepositoryLocation,
  folder: string
): Promise<GitHubDocumentSummary[]> {
  const { rootTree } = await branchState(client, location)
  const files = await folderFiles(client, location, rootTree, folder)
  const manifests = Object.entries(files)
    .filter(([path]) => /^[^/]+\/document\.json$/.test(path))
    .map(([path, sha]) => ({ slug: path.slice(0, -`/${MANIFEST_PATH}`.length), sha }))
  const documents = await mapLimited(manifests, READ_CONCURRENCY, async ({ slug, sha }) => {
    try {
      const bytes = await client.getBlob(location.owner, location.repo, sha)
      return { path: joinPath(folder, slug), name: parseDocumentJSONManifest(bytes).name }
    } catch (error) {
      if (error instanceof GitHubAPIError && error.kind !== 'invalid-response') throw error
      return { path: joinPath(folder, slug), name: slug }
    }
  })
  return documents.sort((first, second) => first.name.localeCompare(second.name))
}

export type LoadedGitHubDocument = {
  name: string
  graph: SceneGraph
  binding: GitHubDocumentBinding
}

export async function loadGitHubDocument(
  client: GitHubClient,
  location: GitHubRepositoryLocation,
  path: string
): Promise<LoadedGitHubDocument> {
  const state = await branchState(client, location)
  const files = await folderFiles(client, location, state.rootTree, path)
  if (!files[MANIFEST_PATH]) {
    throw new GitHubAPIError('not-found', `No document at ${path} on ${location.branch}.`, 404)
  }
  const { name, graph } = await readDocumentJSON(
    {
      read(file) {
        const sha = files[file]
        if (!sha) return Promise.reject(new Error(`${path}/${file} is missing`))
        return client.getBlob(location.owner, location.repo, sha)
      }
    },
    { concurrency: READ_CONCURRENCY }
  )
  return {
    name,
    graph,
    binding: { ...location, path, commitSHA: state.head, committedAt: state.committedAt, files }
  }
}

/**
 * Whether `path` holds a document on `location.branch`, with the branch head either way.
 * A missing branch fails as `not-found`.
 */
export async function probeGitHubDocument(
  client: GitHubClient,
  location: GitHubRepositoryLocation,
  path: string
): Promise<{ exists: boolean; head: string }> {
  const state = await branchState(client, location)
  const tree = await folderTreeSHA(client, location, state.rootTree, path)
  if (!tree) return { exists: false, head: state.head }
  const listing = await client.getTree(location.owner, location.repo, tree)
  return {
    exists: listing.tree.some((entry) => entry.type === 'blob' && entry.path === MANIFEST_PATH),
    head: state.head
  }
}

/** A free document folder for `name` inside `folder`: `landing-page`, then `landing-page-2`. */
export async function allocateGitHubDocumentPath(
  client: GitHubClient,
  location: GitHubRepositoryLocation,
  folder: string,
  name: string
): Promise<{ path: string; head: string }> {
  const state = await branchState(client, location)
  const tree = await folderTreeSHA(client, location, state.rootTree, folder)
  const taken = new Set(
    tree
      ? (await client.getTree(location.owner, location.repo, tree)).tree.map((entry) => entry.path)
      : []
  )
  const base = slugify(name, 'document')
  let slug = base
  for (let suffix = 2; taken.has(slug); suffix++) slug = `${base}-${suffix}`
  return { path: joinPath(folder, slug), head: state.head }
}

/** A committed file large enough that GitHub warns about it. */
export type GitHubFileSizeWarning = { path: string; megabytes: number }

export type GitHubCommitOutcome =
  | {
      kind: 'committed'
      binding: GitHubDocumentBinding
      changedPaths: string[]
      /** True when the branch had moved and the commit was replayed on top of it. */
      rebased: boolean
      warnings: GitHubFileSizeWarning[]
    }
  | { kind: 'unchanged'; binding: GitHubDocumentBinding }
  | {
      kind: 'conflict'
      /** Files changed both here and on the branch since `binding.commitSHA`. */
      paths: string[]
      remoteCommitSHA: string
    }

export interface CommitGitHubDocumentOptions {
  /** Commit message, or a function of the changed file paths. */
  message: string | ((changedPaths: readonly string[]) => string)
  /** Replace the remote document folder with this snapshot even if it changed. */
  overwrite?: boolean
}

function changedPaths(
  from: Readonly<Record<string, string>>,
  to: Readonly<Record<string, string>>
): Set<string> {
  const paths = new Set<string>()
  for (const path of new Set([...Object.keys(from), ...Object.keys(to)])) {
    if (from[path] !== to[path]) paths.add(path)
  }
  return paths
}

function mergeBase(
  base: Readonly<Record<string, string>>,
  local: Readonly<Record<string, string>>,
  localChanges: ReadonlySet<string>
): Record<string, string> {
  const files: Record<string, string> = {}
  for (const path of new Set([...Object.keys(base), ...Object.keys(local)])) {
    const sha = localChanges.has(path) ? local[path] : base[path]
    if (sha) files[path] = sha
  }
  return files
}

/** A file GitHub would refuse, with the page it holds when it is page content. */
export type GitHubOversizeFile = {
  path: string
  megabytes: number
  /** Page name for a page file or its provenance sidecar; null for shared files and images. */
  page: string | null
}

/** A commit was refused before anything was written because files exceed GitHub's limit. */
export class GitHubOversizeError extends GitHubAPIError {
  constructor(readonly files: readonly GitHubOversizeFile[]) {
    super(
      'too-large',
      files
        .map((file) => `${file.path} is ${file.megabytes} MB; GitHub accepts files up to 100 MB.`)
        .join(' ')
    )
    this.name = 'GitHubOversizeError'
  }
}

function megabytesOf(bytes: Uint8Array): number {
  return Math.ceil(bytes.byteLength / (1024 * 1024))
}

/**
 * Files of a snapshot that GitHub would reject, each attributed to its page when it is
 * page content, so the user learns which page to split or leave out.
 */
export function oversizeGitHubFiles(
  snapshot: DocumentJSONSnapshot,
  paths?: ReadonlySet<string>
): GitHubOversizeFile[] {
  const pages = new Map<string, string>()
  for (const page of snapshot.pages) {
    pages.set(page.path, page.name)
    pages.set(sourceSidecarPath(page.path), page.name)
  }
  return snapshot.files
    .filter(
      (file) => (!paths || paths.has(file.path)) && file.bytes.byteLength > GITHUB_MAX_FILE_BYTES
    )
    .map((file) => ({
      path: file.path,
      megabytes: megabytesOf(file.bytes),
      page: pages.get(file.path) ?? null
    }))
}

function checkSizes(
  snapshot: DocumentJSONSnapshot,
  paths: ReadonlySet<string>
): GitHubFileSizeWarning[] {
  const oversize = oversizeGitHubFiles(snapshot, paths)
  if (oversize.length > 0) throw new GitHubOversizeError(oversize)
  const warnings: GitHubFileSizeWarning[] = []
  for (const file of snapshot.files) {
    if (paths.has(file.path) && file.bytes.byteLength > GITHUB_WARN_FILE_BYTES) {
      warnings.push({ path: file.path, megabytes: megabytesOf(file.bytes) })
    }
  }
  return warnings
}

/** A snapshot, optionally with its files' blob SHAs already computed (by the writer worker). */
export type GitHubCommitSnapshot = DocumentJSONSnapshot & {
  blobSHAs?: Readonly<Record<string, string>>
}

/** Blob SHA of every file of a snapshot, by path, reusing precomputed ones. */
export async function localBlobSHAs(
  snapshot: GitHubCommitSnapshot
): Promise<Record<string, string>> {
  const local: Record<string, string> = {}
  for (const file of snapshot.files) {
    local[file.path] = snapshot.blobSHAs?.[file.path] ?? (await gitBlobSHA(file.bytes))
  }
  return local
}

/** True when a snapshot's files are exactly the files of `binding` (nothing to commit). */
export function sameDocumentFiles(
  binding: Readonly<Record<string, string>>,
  local: Readonly<Record<string, string>>
): boolean {
  const paths = Object.keys(local)
  return (
    paths.length === Object.keys(binding).length &&
    paths.every((path) => binding[path] === local[path])
  )
}

/**
 * Commit a document snapshot as one atomic commit: blobs for changed files, one tree on
 * the branch head, one commit, and a non-forced ref update.
 *
 * When the branch moved since `binding.commitSHA`, the commit is replayed on the new head
 * if no file changed on both sides; otherwise nothing is written and the overlapping
 * files are returned as a conflict. `overwrite` makes the snapshot win instead.
 */
export async function commitGitHubDocument(
  client: GitHubClient,
  binding: GitHubDocumentBinding,
  snapshot: GitHubCommitSnapshot,
  options: CommitGitHubDocumentOptions
): Promise<GitHubCommitOutcome> {
  const { owner, repo } = binding
  const local = await localBlobSHAs(snapshot)
  const bytesByPath = new Map(snapshot.files.map((file) => [file.path, file.bytes]))
  const localChanges = changedPaths(binding.files, local)
  const uploaded = new Map<string, string>()

  for (let attempt = 1; ; attempt++) {
    const state = await branchState(client, binding)
    const remote = await folderFiles(client, binding, state.rootTree, binding.path)
    const remoteChanges = changedPaths(binding.files, remote)

    if (!options.overwrite) {
      const overlap = [...localChanges].filter(
        (path) => remoteChanges.has(path) && remote[path] !== local[path]
      )
      if (overlap.length > 0) {
        return { kind: 'conflict', paths: overlap.sort(), remoteCommitSHA: state.head }
      }
    }

    // Replays write only this document's own changes, so files changed on the branch keep
    // their newer content. Overwrite makes the folder match the snapshot exactly.
    const owned = options.overwrite
      ? new Set([...Object.keys(local), ...Object.keys(remote)])
      : localChanges
    const writes = [...owned].filter((path) => path in local && remote[path] !== local[path])
    const deletions = [...owned].filter((path) => !(path in local) && path in remote)
    // The new merge base: what this in-memory document now corresponds to, file by file.
    const nextFiles = options.overwrite
      ? { ...local }
      : mergeBase(binding.files, local, localChanges)
    const rebased = remoteChanges.size > 0 && !options.overwrite

    if (writes.length === 0 && deletions.length === 0) {
      return {
        kind: 'unchanged',
        binding: { ...binding, commitSHA: state.head, files: nextFiles }
      }
    }

    const warnings = checkSizes(snapshot, new Set(writes))
    await mapLimited(
      writes.filter((path) => !uploaded.has(path)),
      WRITE_CONCURRENCY,
      async (path) => {
        const bytes = bytesByPath.get(path)
        if (!bytes) return
        const sha = await client.createBlob(owner, repo, bytes)
        if (sha !== local[path]) {
          throw new GitHubAPIError(
            'invalid-response',
            `GitHub stored ${path} with an unexpected SHA.`
          )
        }
        uploaded.set(path, sha)
      }
    )
    const entries: GitHubTreeWrite[] = [
      ...writes.map((path) => ({
        path: joinPath(binding.path, path),
        mode: '100644' as const,
        type: 'blob' as const,
        sha: local[path]
      })),
      ...deletions.map((path) => ({
        path: joinPath(binding.path, path),
        mode: '100644' as const,
        type: 'blob' as const,
        sha: null
      }))
    ]
    const tree = await client.createTree(owner, repo, state.rootTree, entries)
    const paths = [...writes, ...deletions].sort()
    const commit = await client.createCommit(owner, repo, {
      message: typeof options.message === 'string' ? options.message : options.message(paths),
      tree,
      parents: [state.head]
    })
    try {
      await client.updateBranch(owner, repo, binding.branch, commit.sha)
    } catch (error) {
      // Someone pushed between reading the head and updating it: replay on the new head.
      if (
        error instanceof GitHubAPIError &&
        error.kind === 'conflict' &&
        attempt < MAX_COMMIT_ATTEMPTS
      )
        continue
      throw error
    }
    return {
      kind: 'committed',
      binding: {
        ...binding,
        commitSHA: commit.sha,
        committedAt: commit.committer?.date ?? new Date().toISOString(),
        files: nextFiles
      },
      changedPaths: paths,
      rebased,
      warnings
    }
  }
}
