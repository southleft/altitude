import { beforeEach, describe, expect, test } from 'bun:test'

import {
  DocumentJSONSnapshotStaleError,
  writeHashedDocumentJSON
} from '@open-pencil/core/io/formats/document-json'
import { SceneGraph } from '@open-pencil/scene-graph'

import {
  draftBranchName,
  isDraftBranch,
  validBranchName
} from '@/app/integrations/storage/github/branches/name'
import {
  draftPullRequestBody,
  draftPullRequestDocument,
  ensureDraftPullRequest
} from '@/app/integrations/storage/github/branches/pulls'
import { createGitHubClient, type GitHubFetch } from '@/app/integrations/storage/github/client'
import {
  AUTOSAVE_TRAILER,
  autosaveCommitMessage
} from '@/app/integrations/storage/github/document/message'
import {
  createGitHubDocumentSession,
  type GitHubDocumentServices,
  type GitHubDocumentSession
} from '@/app/integrations/storage/github/document/session'

import { FakeGitHub } from '#tests/helpers/github/fake'
import { pullJSON } from '#tests/helpers/github/routes'

const DRAFT = 'design/landing-page/octo'

let github: FakeGitHub
beforeEach(async () => {
  github = new FakeGitHub()
  await github.init()
})

type Pull = ReturnType<typeof pullJSON>

/** FakeGitHub plus pull requests (listed by head, created as posted) and GraphQL. */
function withPulls() {
  const pulls: Pull[] = []
  const created: Array<{
    title: string
    body: string
    head: string
    base: string
    draft: boolean
  }> = []
  const graphql: Array<{ query: string; variables: Record<string, unknown> }> = []
  const fetch: GitHubFetch = async (input, init) => {
    const url = new URL(input)
    const method = init.method ?? 'GET'
    if (method === 'GET' && url.pathname.endsWith('/pulls')) {
      const head = url.searchParams.get('head')?.split(':')[1]
      return Response.json(pulls.filter((pull) => pull.head.ref === head))
    }
    if (method === 'POST' && url.pathname.endsWith('/pulls')) {
      const body = JSON.parse(String(init.body)) as (typeof created)[number]
      created.push(body)
      const pull = pullJSON({
        number: 30 + created.length,
        node_id: `PR_${created.length}`,
        title: body.title,
        body: body.body,
        draft: body.draft,
        head: { ref: body.head, sha: 'b'.repeat(40) },
        base: { ref: body.base }
      })
      pulls.push(pull)
      return Response.json(pull, { status: 201 })
    }
    if (method === 'POST' && url.pathname === '/graphql') {
      const body = JSON.parse(String(init.body)) as (typeof graphql)[number]
      graphql.push(body)
      const pull = pulls.find((candidate) => candidate.node_id === body.variables.id)
      if (!pull) {
        return Response.json({ data: null, errors: [{ type: 'NOT_FOUND', message: 'No PR' }] })
      }
      pull.draft = false
      return Response.json({
        data: {
          markPullRequestReadyForReview: { pullRequest: { number: pull.number, isDraft: false } }
        }
      })
    }
    return github.fetch(input, init)
  }
  return { fetch, pulls, created, graphql }
}

function fixture(
  fetch: GitHubFetch,
  login: string | null = 'octo',
  writeSnapshot?: GitHubDocumentServices['writeSnapshot']
) {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const persisted: Array<[number, number]> = []
  let revision = 1
  const state = { documentName: 'Landing page', sceneVersion: 10 }
  const session = createGitHubDocumentSession(
    {
      editor: {
        graph,
        stopMotion: () => undefined,
        populateAllPages: () => Promise.resolve(false),
        onEditorEvent: () => () => undefined
      },
      state,
      captureRevision: () => revision,
      markPersisted: async (captured, version) => {
        persisted.push([captured, version])
      }
    },
    {
      resolveClient: () => Promise.resolve(createGitHubClient({ token: 't', fetch })),
      preferences: () => ({
        owner: 'southleft',
        repo: 'altitude-designs',
        branch: 'main',
        folder: 'documents'
      }),
      draftPolicy: () => (login ? { login, base: 'main' } : null),
      writeSnapshot
    }
  )
  return {
    session,
    persisted,
    edit(name: string) {
      revision++
      state.sceneVersion++
      graph.createNode('RECTANGLE', page.id, { name })
    }
  }
}

/** The draft pull request is opened in the background after a commit. */
async function settled(session: GitHubDocumentSession) {
  for (let tick = 0; tick < 50; tick++) {
    if (session.pullRequestActivity.value.phase !== 'working') return
    await Bun.sleep(0)
  }
}

function commitMessages(branch: string): string[] {
  const messages: string[] = []
  for (let sha = github.branches.get(branch); sha;) {
    const commit = github.commits.get(sha)
    if (!commit) break
    messages.push(commit.message)
    sha = commit.parents[0]
  }
  return messages
}

describe('draft branch names', () => {
  test('design/<doc-slug>/<login>, valid as a git ref', () => {
    expect(draftBranchName('documents/landing-page', 'Octo')).toBe(DRAFT)
    expect(draftBranchName('documents/Über Café', 'a-b')).toBe('design/uber-cafe/a-b')
    expect(validBranchName(draftBranchName('documents/x', 'octo-cat'))).toBe(true)
    expect(isDraftBranch(DRAFT, 'documents/landing-page', 'octo')).toBe(true)
    expect(isDraftBranch('design/landing-page-ab12', 'documents/landing-page', 'octo')).toBe(false)
  })

  test('the draft pull request body lists pages and carries a findable marker', () => {
    const body = draftPullRequestBody({
      documentName: 'Landing page',
      documentPath: 'documents/landing-page',
      pages: ['Cover', 'Components']
    })
    expect(body).toContain('- Cover\n- Components')
    expect(body).toContain(AUTOSAVE_TRAILER)
    expect(draftPullRequestDocument(body)).toBe('documents/landing-page')
    expect(draftPullRequestDocument('no marker')).toBeNull()
  })

  test('autosave messages name the pages and end with the trailer paragraph', () => {
    const message = autosaveCommitMessage(
      'Landing page',
      [{ id: '0:1', name: 'Cover', path: 'pages/cover.json' }],
      ['pages/cover.json']
    )
    expect(message).toBe(`Autosave Landing page\n\nPages: Cover\n\n${AUTOSAVE_TRAILER}`)
  })
})

describe('autosave to the draft branch', () => {
  test('a new document commits to its draft branch and opens one draft pull request', async () => {
    const routes = withPulls()
    const { session } = fixture(routes.fetch)
    const mainHead = github.head
    expect(await session.publish('Landing page')).toBe(true)
    await settled(session)

    expect(github.head).toBe(mainHead)
    expect(session.binding.value?.branch).toBe(DRAFT)
    expect(
      github.files(github.branches.get(DRAFT)).has('documents/landing-page/document.json')
    ).toBe(true)
    expect(routes.created).toHaveLength(1)
    expect(routes.created[0]).toMatchObject({
      title: 'Design: Landing page',
      head: DRAFT,
      base: 'main',
      draft: true
    })
    expect(draftPullRequestDocument(routes.created[0].body)).toBe('documents/landing-page')
    expect(session.pullRequest.value?.state).toBe('draft')
  })

  test('two autosaves land on the one draft branch with the trailer and reuse the pull request', async () => {
    const routes = withPulls()
    const { session, edit, persisted } = fixture(routes.fetch)
    await session.publish('Landing page')
    await settled(session)
    edit('First')
    expect(await session.autosave()).toEqual({ kind: 'committed' })
    await settled(session)
    edit('Second')
    expect(await session.autosave()).toEqual({ kind: 'committed' })
    await settled(session)

    const messages = commitMessages(DRAFT)
    expect(messages[0]).toBe(`Autosave Landing page\n\nPages: Page 1\n\n${AUTOSAVE_TRAILER}`)
    expect(messages[1].startsWith('Autosave Landing page')).toBe(true)
    expect(messages[2].startsWith('Add Landing page')).toBe(true)
    expect([...github.branches.keys()].filter((name) => name.startsWith('design/'))).toEqual([
      DRAFT
    ])
    expect(routes.created).toHaveLength(1)
    expect(persisted).toHaveLength(3)
  })

  test('an unchanged document is skipped without any request', async () => {
    const routes = withPulls()
    const { session, persisted } = fixture(routes.fetch)
    await session.publish('Landing page')
    await settled(session)
    const before = github.requests.length
    expect(await session.autosave()).toEqual({ kind: 'unchanged' })
    expect(github.requests.length).toBe(before)
    expect(persisted).toHaveLength(2)
  })

  test('a document bound to main moves to an existing draft branch and reuses its open pull request', async () => {
    const routes = withPulls()
    // Publish without a draft policy: the document lands on main.
    const plain = fixture(routes.fetch, null)
    await plain.session.publish('Landing page')
    const binding = plain.session.binding.value
    if (!binding) throw new Error('not bound')
    expect(binding.branch).toBe('main')
    github.createBranch(DRAFT, binding.commitSHA)
    routes.pulls.push(
      pullJSON({
        number: 9,
        node_id: 'PR_9',
        draft: true,
        head: { ref: DRAFT, sha: 'c'.repeat(40) }
      })
    )

    const { session, edit } = fixture(routes.fetch)
    session.bind(binding)
    edit('Mine')
    expect(await session.autosave()).toEqual({ kind: 'committed' })
    await settled(session)
    expect(session.binding.value?.branch).toBe(DRAFT)
    expect(github.head).toBe(binding.commitSHA)
    expect(routes.created).toHaveLength(0)
    expect(session.pullRequest.value?.number).toBe(9)
  })

  test('Ready for review flips the draft through GraphQL', async () => {
    const routes = withPulls()
    const { session } = fixture(routes.fetch)
    await session.publish('Landing page')
    await settled(session)
    expect(await session.readyForReview()).toBe(true)
    expect(routes.graphql).toHaveLength(1)
    expect(routes.graphql[0].query).toContain('markPullRequestReadyForReview')
    expect(routes.graphql[0].variables).toEqual({ id: 'PR_1' })
    expect(session.pullRequest.value?.state).toBe('open')
    expect(routes.pulls[0].draft).toBe(false)
    // Already open: nothing more to do.
    expect(await session.readyForReview()).toBe(false)
  })

  test('after the draft is merged and its branch deleted, autosave starts a new draft', async () => {
    const routes = withPulls()
    const { session, edit } = fixture(routes.fetch)
    await session.publish('Landing page')
    await settled(session)
    // Merge on GitHub (fast-forward) and delete the branch.
    github.head = github.branches.get(DRAFT) ?? ''
    github.branches.delete(DRAFT)
    routes.pulls[0].state = 'closed'
    routes.pulls[0].merged_at = '2026-10-09T12:00:00Z'

    edit('After merge')
    expect(await session.autosave()).toEqual({ kind: 'committed' })
    await settled(session)
    expect(github.branches.has(DRAFT)).toBe(true)
    expect(commitMessages(DRAFT)[0].startsWith('Autosave Landing page')).toBe(true)
    expect(routes.created).toHaveLength(2)
    expect(session.pullRequest.value?.state).toBe('draft')
  })

  test('a failed autosave is reported as an autosave failure and keeps the revision unpersisted', async () => {
    const routes = withPulls()
    const { session, edit, persisted } = fixture(routes.fetch)
    await session.publish('Landing page')
    await settled(session)
    edit('Offline')
    github.failures.push({ pattern: /git\/ref\//, status: 503 })
    const result = await session.autosave()
    expect(result.kind).toBe('failed')
    const status = session.status.value
    expect(status.phase === 'failed' && status.origin).toBe('autosave')
    expect(persisted).toHaveLength(1)
  })
})

describe('snapshots during edits', () => {
  test('an edit during an autosave copy skips it; an explicit commit copies again at once', async () => {
    const routes = withPulls()
    const calls: Array<'sliced' | 'whole'> = []
    let editDuringCopy: (() => void) | null = null
    const { session, edit, persisted } = fixture(
      routes.fetch,
      'octo',
      async (graph, name, isStale) => {
        calls.push(isStale ? 'sliced' : 'whole')
        if (isStale && editDuringCopy) {
          editDuringCopy()
          if (isStale()) throw new DocumentJSONSnapshotStaleError()
        }
        return writeHashedDocumentJSON(graph, { name })
      }
    )
    await session.publish('Landing page')
    await settled(session)
    editDuringCopy = () => edit('During')
    edit('Before')
    expect(await session.autosave()).toEqual({ kind: 'skipped' })
    expect(session.status.value).toEqual({ phase: 'idle' })
    expect(persisted).toHaveLength(1)

    expect(await session.commit({ message: 'Explicit' })).toBe(true)
    expect(calls.slice(-2)).toEqual(['sliced', 'whole'])
    expect(commitMessages(DRAFT)[0]).toBe('Explicit')
  })
})

describe('draft pull request lookup', () => {
  test('reuses an open pull request and opens a new draft after a merge', async () => {
    const routes = withPulls()
    const client = createGitHubClient({ token: 't', fetch: routes.fetch })
    const location = { owner: 'southleft', repo: 'altitude-designs', branch: DRAFT }
    const input = {
      base: 'main',
      documentName: 'Landing page',
      documentPath: 'documents/landing-page',
      pages: []
    }
    routes.pulls.push(
      pullJSON({
        number: 3,
        state: 'closed',
        merged_at: '2026-10-01T00:00:00Z',
        head: { ref: DRAFT, sha: 'd'.repeat(40) }
      })
    )
    const first = await ensureDraftPullRequest(client, location, input)
    expect(first.created).toBe(true)
    const second = await ensureDraftPullRequest(client, location, input)
    expect(second).toMatchObject({
      created: false,
      pullRequest: { number: first.pullRequest.number }
    })
    expect(routes.created).toHaveLength(1)
  })
})
