import { computed, shallowRef, watch } from 'vue'

import type { SceneGraph } from '@open-pencil/scene-graph'
import type { Vector } from '@open-pencil/scene-graph/primitives'

import { documentSlug } from '../branches/name'
import type { GitHubClient, GitHubETagCache } from '../client'
import {
  describeGitHubFailure,
  type GitHubDocumentFailure,
  type GitHubDocumentSession
} from '../document/session'
import { githubIdentity } from '../identity'
import type { GitHubRepositoryLocation } from '../repository'
import { resolveGitHubClient } from '../runtime'
import type { CommentAnchor } from './anchor'
import { anchorAt } from './pins'
import {
  createCommentThread,
  listCommentReplies,
  listCommentThreads,
  replyToCommentThread,
  setCommentThreadResolved,
  type CommentReply,
  type CommentThread
} from './repository'

/** Why comment mode is unavailable, or `ready`. */
export type CommentAvailability = 'ready' | 'signed-out' | 'not-committed'

export type CommentDraft = {
  anchor: CommentAnchor
  pageName: string
  nodeName: string | null
}

export type CommentReplies =
  | { status: 'loading'; items: CommentReply[] }
  | { status: 'ready'; items: CommentReply[] }
  | { status: 'failed'; items: CommentReply[]; failure: GitHubDocumentFailure }

export type CommentOperationOutcome =
  | { ok: true }
  | { ok: false; failure: GitHubDocumentFailure | null }

/** What the comments session reads from its editor session. */
export interface GitHubCommentsHost {
  github: Pick<GitHubDocumentSession, 'binding'>
  editor: { readonly graph: SceneGraph }
  state: { currentPageId: string }
}

export interface GitHubCommentsServices {
  resolveClient(etags: GitHubETagCache): Promise<GitHubClient>
  signedIn(): boolean
  now(): number
}

const defaultServices: GitHubCommentsServices = {
  resolveClient: (etags) => resolveGitHubClient(undefined, undefined, etags),
  signedIn: () => githubIdentity.value !== null,
  now: () => Date.now()
}

/** How long a thread created here survives refreshes that do not list it yet. */
const RECENT_COMMENT_MS = 60_000

/** Automatic refreshes (on window focus) wait at least this long after the last one. */
export const COMMENT_AUTO_REFRESH_MS = 30_000

/**
 * Design comments of one document, kept as GitHub issues. Created per editor session next
 * to the GitHub document session; threads load when comment mode is turned on.
 */
export function createGitHubCommentsSession(
  host: GitHubCommentsHost,
  services: GitHubCommentsServices = defaultServices
) {
  const active = shallowRef(false)
  const threads = shallowRef<CommentThread[]>([])
  const loaded = shallowRef(false)
  const loading = shallowRef(false)
  const failure = shallowRef<GitHubDocumentFailure | null>(null)
  const includeResolved = shallowRef(false)
  const selected = shallowRef<number | null>(null)
  const draft = shallowRef<CommentDraft | null>(null)
  const replies = shallowRef<ReadonlyMap<number, CommentReplies>>(new Map())
  const pending = shallowRef<ReadonlySet<string>>(new Set())
  const etags: GitHubETagCache = new Map()
  const knownLabels = new Set<string>()
  /**
   * Threads created here, by number. GitHub's label-filtered issue listing can lag a new
   * issue by a few seconds, so a refresh right after creating one keeps it.
   */
  const created = new Map<number, number>()
  let generation = 0
  let lastRefresh = 0
  let pausedUntil = 0

  const binding = computed(() => host.github.binding.value)
  const documentKey = computed(() => {
    const current = binding.value
    return current ? `${current.owner}/${current.repo}:${current.path}` : null
  })

  const availability = computed<CommentAvailability>(() => {
    if (!services.signedIn()) return 'signed-out'
    return binding.value ? 'ready' : 'not-committed'
  })

  function reset() {
    generation++
    inflight = null
    threads.value = []
    loaded.value = false
    loading.value = false
    failure.value = null
    selected.value = null
    draft.value = null
    replies.value = new Map()
    pending.value = new Set()
    created.clear()
    lastRefresh = 0
  }

  // Comments belong to a document, not a branch: switching branches keeps them.
  const stopDocumentWatch = watch(documentKey, reset)
  const stopAvailabilityWatch = watch(availability, (value) => {
    if (value !== 'ready') active.value = false
  })

  function location() {
    const current = binding.value
    return current ? { owner: current.owner, repo: current.repo, branch: current.branch } : null
  }

  function setPending(key: string, on: boolean) {
    const next = new Set(pending.value)
    if (on) next.add(key)
    else next.delete(key)
    pending.value = next
  }

  function remember(error: unknown): GitHubDocumentFailure {
    const described = describeGitHubFailure(error)
    if (described.kind === 'rate-limited') {
      pausedUntil = described.resetAt?.getTime() ?? services.now() + 60_000
    }
    return described
  }

  function withRecent(listed: CommentThread[]): CommentThread[] {
    const now = services.now()
    const missing = threads.value.filter((thread) => {
      const at = created.get(thread.number)
      if (at === undefined || now - at > RECENT_COMMENT_MS) return false
      const visible = includeResolved.value || thread.state === 'open'
      return visible && !listed.some((item) => item.number === thread.number)
    })
    return [...missing, ...listed].sort((a, b) => b.number - a.number)
  }

  function upsert(thread: CommentThread) {
    const others = threads.value.filter((item) => item.number !== thread.number)
    const visible = includeResolved.value || thread.state === 'open'
    threads.value = visible ? [thread, ...others].sort((a, b) => b.number - a.number) : others
  }

  let inflight: { promise: Promise<void>; includeResolved: boolean } | null = null

  async function load(token: number, path: string, where: GitHubRepositoryLocation) {
    const resolved = includeResolved.value
    try {
      const client = await services.resolveClient(etags)
      const listed = await listCommentThreads(client, where, {
        documentPath: path,
        slug: documentSlug(path),
        includeResolved: resolved
      })
      if (token !== generation) return
      threads.value = withRecent(listed)
      failure.value = null
      loaded.value = true
    } catch (error) {
      if (token === generation) failure.value = remember(error)
    }
  }

  /**
   * Reload the threads. A refresh while one is running joins it, unless the filter changed
   * since it started; then it runs again afterwards.
   */
  function refresh(options: { auto?: boolean } = {}): Promise<void> {
    const current = binding.value
    const where = location()
    if (!current || !where || availability.value !== 'ready') return Promise.resolve()
    const now = services.now()
    if (now < pausedUntil) return Promise.resolve()
    if (options.auto && now - lastRefresh < COMMENT_AUTO_REFRESH_MS) return Promise.resolve()
    if (inflight) {
      if (inflight.includeResolved === includeResolved.value) return inflight.promise
      return inflight.promise.then(() => refresh())
    }
    const token = generation
    lastRefresh = now
    loading.value = true
    const promise = load(token, current.path, where).finally(() => {
      if (inflight?.promise === promise) inflight = null
      if (token === generation) loading.value = false
    })
    inflight = { promise, includeResolved: includeResolved.value }
    return promise
  }

  function setActive(on: boolean) {
    if (on && availability.value !== 'ready') return
    active.value = on
    if (!on) draft.value = null
    if (on && !loaded.value) void refresh()
  }

  function setIncludeResolved(on: boolean) {
    if (includeResolved.value === on) return
    includeResolved.value = on
    lastRefresh = 0
    void refresh()
  }

  /** Start a comment at `point` on the current page, on `nodeId` if the click hit one. */
  function startDraft(point: Vector, nodeId: string | null) {
    const current = binding.value
    if (!current || !active.value) return
    const graph = host.editor.graph
    const pageId = host.state.currentPageId
    const anchor = anchorAt(graph, {
      doc: current.path,
      page: pageId,
      nodeId,
      point,
      branch: current.branch,
      commit: current.commitSHA
    })
    selected.value = null
    draft.value = {
      anchor,
      pageName: graph.getNode(pageId)?.name ?? '',
      nodeName: anchor.node ? (graph.getNode(anchor.node)?.name ?? null) : null
    }
  }

  function cancelDraft() {
    draft.value = null
  }

  async function submitDraft(
    text: string,
    fallbackTitle: string
  ): Promise<CommentOperationOutcome> {
    const current = binding.value
    const where = location()
    const pendingDraft = draft.value
    if (!current || !where || !pendingDraft || !text.trim()) return { ok: false, failure: null }
    const token = generation
    setPending('draft', true)
    try {
      const thread = await createCommentThread(await services.resolveClient(etags), where, {
        text,
        anchor: pendingDraft.anchor,
        slug: documentSlug(current.path),
        pageName: pendingDraft.pageName,
        nodeName: pendingDraft.nodeName,
        fallbackTitle,
        knownLabels
      })
      if (token !== generation) return { ok: false, failure: null }
      created.set(thread.number, services.now())
      upsert(thread)
      if (draft.value === pendingDraft) draft.value = null
      selected.value = thread.number
      return { ok: true }
    } catch (error) {
      return { ok: false, failure: token === generation ? remember(error) : null }
    } finally {
      if (token === generation) setPending('draft', false)
    }
  }

  function setReplies(number: number, value: CommentReplies) {
    const next = new Map(replies.value)
    next.set(number, value)
    replies.value = next
  }

  async function loadReplies(number: number): Promise<void> {
    const where = location()
    if (!where) return
    const token = generation
    setReplies(number, { status: 'loading', items: replies.value.get(number)?.items ?? [] })
    try {
      const items = await listCommentReplies(await services.resolveClient(etags), where, number)
      if (token === generation) setReplies(number, { status: 'ready', items })
    } catch (error) {
      if (token !== generation) return
      setReplies(number, {
        status: 'failed',
        items: replies.value.get(number)?.items ?? [],
        failure: remember(error)
      })
    }
  }

  function select(number: number | null) {
    selected.value = number
    if (number !== null) {
      draft.value = null
      if (!replies.value.has(number)) void loadReplies(number)
    }
  }

  async function reply(number: number, text: string): Promise<CommentOperationOutcome> {
    const where = location()
    if (!where || !text.trim()) return { ok: false, failure: null }
    const token = generation
    const key = `reply:${number}`
    setPending(key, true)
    try {
      const created = await replyToCommentThread(
        await services.resolveClient(etags),
        where,
        number,
        text
      )
      if (token !== generation) return { ok: false, failure: null }
      const existing = replies.value.get(number)?.items ?? []
      setReplies(number, { status: 'ready', items: [...existing, created] })
      threads.value = threads.value.map((thread) =>
        thread.number === number ? { ...thread, replyCount: thread.replyCount + 1 } : thread
      )
      return { ok: true }
    } catch (error) {
      return { ok: false, failure: token === generation ? remember(error) : null }
    } finally {
      if (token === generation) setPending(key, false)
    }
  }

  async function setResolved(number: number, resolved: boolean): Promise<CommentOperationOutcome> {
    const where = location()
    if (!where) return { ok: false, failure: null }
    const token = generation
    const key = `state:${number}`
    setPending(key, true)
    try {
      const thread = await setCommentThreadResolved(
        await services.resolveClient(etags),
        where,
        number,
        resolved
      )
      if (token !== generation) return { ok: false, failure: null }
      upsert(thread)
      if (resolved && !includeResolved.value && selected.value === number) selected.value = null
      return { ok: true }
    } catch (error) {
      return { ok: false, failure: token === generation ? remember(error) : null }
    } finally {
      if (token === generation) setPending(key, false)
    }
  }

  return {
    active,
    availability,
    threads,
    loaded,
    loading,
    failure,
    includeResolved,
    selected,
    draft,
    replies,
    pending,
    setActive,
    toggle: () => setActive(!active.value),
    setIncludeResolved,
    refresh,
    startDraft,
    cancelDraft,
    submitDraft,
    select,
    loadReplies,
    reply,
    setResolved,
    dispose() {
      generation++
      stopDocumentWatch()
      stopAvailabilityWatch()
      etags.clear()
    }
  }
}

export type GitHubCommentsSession = ReturnType<typeof createGitHubCommentsSession>
