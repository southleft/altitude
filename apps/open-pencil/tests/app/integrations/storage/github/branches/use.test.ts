import { beforeEach, expect, test } from 'bun:test'

import { effectScope, nextTick } from 'vue'

import { SceneGraph } from '@open-pencil/scene-graph'

import {
  validBranchName,
  suggestedBranchName
} from '@/app/integrations/storage/github/branches/name'
import { reviewDecision } from '@/app/integrations/storage/github/branches/pulls'
import { useGitHubBranches } from '@/app/integrations/storage/github/branches/use'
import { createGitHubClient, type GitHubFetch } from '@/app/integrations/storage/github/client'
import { createGitHubDocumentSession } from '@/app/integrations/storage/github/document/session'
import type { GitHubRepositoryLocation } from '@/app/integrations/storage/github/repository'

import { FakeGitHub } from '#tests/helpers/github/fake'
import { pullJSON } from '#tests/helpers/github/routes'

let github: FakeGitHub
beforeEach(async () => {
  github = new FakeGitHub()
  await github.init()
})

type PullRoutes = {
  pulls: Array<ReturnType<typeof pullJSON>>
  reviews: Array<{ state: string; user: { login: string } }>
  compare: string[]
  created: unknown[]
}

/** FakeGitHub plus scripted pull request and compare endpoints. */
function withPulls(routes: PullRoutes): GitHubFetch {
  return async (input, init) => {
    const url = new URL(input)
    const method = init.method ?? 'GET'
    if (method === 'GET' && url.pathname.endsWith('/pulls')) return Response.json(routes.pulls)
    if (method === 'GET' && /\/pulls\/\d+\/reviews$/.test(url.pathname)) {
      return Response.json(routes.reviews)
    }
    if (method === 'POST' && url.pathname.endsWith('/pulls')) {
      const body = JSON.parse(String(init.body)) as { title?: string; draft?: boolean }
      routes.created.push(body)
      return Response.json(pullJSON({ number: 21, title: body.title, draft: body.draft }), {
        status: 201
      })
    }
    if (method === 'GET' && url.pathname.includes('/compare/')) {
      return Response.json({
        status: 'ahead',
        ahead_by: 1,
        behind_by: 0,
        files: routes.compare.map((filename) => ({ filename, status: 'modified' }))
      })
    }
    return github.fetch(input, init)
  }
}

async function fixture(options: { dirty?: boolean } = {}) {
  const routes: PullRoutes = { pulls: [], reviews: [], compare: [], created: [] }
  const fetch = withPulls(routes)
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  graph.updateNode(page.id, { name: 'Cover' })
  graph.addPage('Components')
  let revision = 1
  let dirty = options.dirty ?? false
  const state = { documentName: 'Landing page', sceneVersion: 1 }
  const loads: Array<{ location: GitHubRepositoryLocation; path: string }> = []
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
      markPersisted: async () => {
        dirty = false
      }
    },
    {
      resolveClient: () => Promise.resolve(createGitHubClient({ token: 't', fetch })),
      preferences: () => ({
        owner: 'southleft',
        repo: 'altitude-designs',
        branch: 'main',
        folder: 'documents'
      })
    }
  )
  expect(await session.publish('Landing page')).toBe(true)
  const scope = effectScope()
  const branches = scope.run(() =>
    useGitHubBranches(session, {
      resolveClient: () => Promise.resolve(createGitHubClient({ token: 't', fetch })),
      load: async (location, path) => {
        loads.push({ location, path })
        const current = session.binding.value
        if (current) session.bind({ ...current, branch: location.branch })
      },
      hasUnsavedChanges: () => dirty,
      documentName: () => state.documentName,
      pageNames: () => graph.getPages().map((item) => item.name)
    })
  )
  if (!branches) throw new Error('scope did not run')
  return {
    routes,
    graph,
    page,
    session,
    branches,
    loads,
    edit() {
      revision++
      dirty = true
      graph.createNode('RECTANGLE', page.id, { name: `Shape ${revision}` })
    },
    dispose: () => scope.stop()
  }
}

test('a new branch starts at the bound branch head and takes the next commit', async () => {
  const { session, branches, edit } = await fixture()
  const mainHead = github.head
  expect((await branches.createBranch('design/hero')).kind).toBe('done')
  expect(github.branches.get('design/hero')).toBe(mainHead)
  expect(session.binding.value?.branch).toBe('design/hero')

  edit()
  expect(await session.commit()).toBe(true)
  expect(github.branches.get('design/hero')).not.toBe(mainHead)
  expect(github.head).toBe(mainHead)
})

test('an invalid or existing branch name is refused', async () => {
  const { branches } = await fixture()
  expect((await branches.createBranch('bad name')).kind).toBe('invalid')
  github.createBranch('taken')
  const outcome = await branches.createBranch('taken')
  expect(outcome.kind === 'failed' && outcome.failure.kind).toBe('conflict')
})

test('switching with uncommitted changes asks first; discarding loads the branch', async () => {
  const { branches, loads, edit } = await fixture()
  github.createBranch('design/hero')
  edit()
  expect((await branches.switchBranch('design/hero')).kind).toBe('dirty')
  expect(loads).toHaveLength(0)

  expect((await branches.switchBranch('design/hero', true)).kind).toBe('done')
  expect(loads).toEqual([
    {
      location: { owner: 'southleft', repo: 'altitude-designs', branch: 'design/hero' },
      path: 'documents/landing-page'
    }
  ])
})

test('commit first, then switch: the commit lands on the old branch', async () => {
  const { session, branches, edit } = await fixture()
  github.createBranch('design/hero')
  edit()
  expect((await branches.switchBranch('design/hero')).kind).toBe('dirty')
  const before = github.head
  expect(await session.commit()).toBe(true)
  expect(github.head).not.toBe(before)
  expect((await branches.switchBranch('design/hero')).kind).toBe('done')
})

test('a branch without the document offers to add it on the next commit', async () => {
  const { session, branches, loads } = await fixture()
  await github.commitFiles({ 'other.txt': 'x' }, 'Unrelated', undefined, 'main')
  // A branch from before the document existed.
  const initial = [...github.commits.entries()].find(([, commit]) => commit.parents.length === 0)
  github.createBranch('old', initial?.[0])
  const outcome = await branches.switchBranch('old')
  expect(outcome).toEqual({
    kind: 'missing',
    branch: 'old',
    head: github.branches.get('old') ?? ''
  })
  expect(loads).toHaveLength(0)

  branches.adoptOnBranch('old', github.branches.get('old') ?? '')
  expect(session.binding.value).toMatchObject({ branch: 'old', files: {} })
  expect(await session.commit()).toBe(true)
  expect(github.files(github.branches.get('old')).has('documents/landing-page/document.json')).toBe(
    true
  )
})

test('refresh lists branches default-first and finds the pull request with its review', async () => {
  const { branches, routes, session } = await fixture()
  github.createBranch('design/zeta')
  github.createBranch('design/alpha')
  await branches.createBranch('design/hero')
  routes.pulls = [pullJSON({ number: 3, state: 'closed' }), pullJSON({ number: 12 })]
  routes.reviews = [
    { state: 'CHANGES_REQUESTED', user: { login: 'a' } },
    { state: 'APPROVED', user: { login: 'a' } },
    { state: 'COMMENTED', user: { login: 'b' } }
  ]
  await branches.refresh()
  expect(branches.branches.value?.map((branch) => branch.name)).toEqual([
    'main',
    'design/alpha',
    'design/hero',
    'design/zeta'
  ])
  expect(branches.defaultBranch.value).toBe('main')
  expect(branches.onDefaultBranch.value).toBe(false)
  expect(branches.pullRequest.value).toMatchObject({
    number: 12,
    state: 'open',
    review: 'approved'
  })
  expect(session.binding.value?.branch).toBe('design/hero')
})

test('opening a pull request targets the default branch and lists changed pages', async () => {
  const { branches, routes } = await fixture()
  await branches.createBranch('design/hero')
  await branches.refresh()
  routes.compare = [
    'documents/landing-page/pages/cover.json',
    'documents/landing-page/pages/components.source.json',
    'documents/landing-page/variables.json',
    'documents/other/pages/cover.json'
  ]
  const draft = await branches.pullRequestDraft()
  expect(draft.title).toBe('Update Landing page')
  expect(draft.body).toContain('- Cover')
  expect(draft.body).toContain('- Components')
  expect(draft.body).toContain('Also changed: 1 other document file(s).')

  expect((await branches.createPullRequest({ ...draft, draft: true })).kind).toBe('done')
  expect(routes.created[0]).toMatchObject({ head: 'design/hero', base: 'main', draft: true })
  expect(branches.pullRequest.value?.number).toBe(21)
})

test('the bound and default branches cannot be deleted; a merged one can', async () => {
  const { branches } = await fixture()
  github.createBranch('design/merged')
  await branches.refresh()
  expect((await branches.deleteBranch('main')).kind).toBe('invalid')
  expect((await branches.deleteBranch('design/merged')).kind).toBe('done')
  expect(github.branches.has('design/merged')).toBe(false)
})

test('results for a document that changed meanwhile are dropped', async () => {
  const { branches, session } = await fixture()
  const refresh = branches.refresh()
  const current = session.binding.value
  if (current) session.bind({ ...current, path: 'documents/elsewhere' })
  await nextTick()
  await refresh
  expect(branches.branches.value).toBeNull()
})

test('branch names follow git rules', () => {
  for (const name of ['design/hero', 'feature-1', 'a.b']) expect(validBranchName(name)).toBe(true)
  for (const name of [
    '',
    'a b',
    '/a',
    'a/',
    'a..b',
    'a.lock',
    '-a',
    'a/.b',
    'a~1',
    'a^',
    'a:b',
    '@'
  ]) {
    expect(validBranchName(name)).toBe(false)
  }
  expect(suggestedBranchName('documents/Landing Page')).toMatch(
    /^design\/landing-page-[a-z0-9]{4}$/
  )
})

test('a later comment does not undo an approval; any change request wins', () => {
  expect(
    reviewDecision([
      { state: 'APPROVED', user: { login: 'a' } },
      { state: 'COMMENTED', user: { login: 'a' } }
    ])
  ).toBe('approved')
  expect(
    reviewDecision([
      { state: 'APPROVED', user: { login: 'a' } },
      { state: 'CHANGES_REQUESTED', user: { login: 'b' } }
    ])
  ).toBe('changes-requested')
  expect(reviewDecision([])).toBeNull()
})
