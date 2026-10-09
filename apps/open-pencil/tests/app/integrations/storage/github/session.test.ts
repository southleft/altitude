import { beforeEach, expect, test } from 'bun:test'

import { SceneGraph } from '@open-pencil/scene-graph'

import { createGitHubClient } from '@/app/integrations/storage/github/client'
import {
  createGitHubDocumentSession,
  type GitHubDocumentHost
} from '@/app/integrations/storage/github/document/session'

import { FakeGitHub } from '#tests/helpers/github/fake'

let github: FakeGitHub
beforeEach(async () => {
  github = new FakeGitHub()
  await github.init()
})

function fixture() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const persisted: Array<[number, number]> = []
  const replaced: Array<() => void> = []
  let revision = 1
  const state = { documentName: 'Landing page', sceneVersion: 10 }
  const editor: GitHubDocumentHost['editor'] = {
    graph,
    stopMotion: () => undefined,
    populateAllPages: () => Promise.resolve(false),
    onEditorEvent: (event: string, handler: () => void) => {
      if (event === 'graph:replaced') replaced.push(handler)
      return () => undefined
    }
  }
  const session = createGitHubDocumentSession(
    {
      editor,
      state,
      captureRevision: () => revision,
      markPersisted: async (captured, version) => {
        persisted.push([captured, version])
      }
    },
    {
      resolveClient: () => Promise.resolve(createGitHubClient({ token: 't', fetch: github.fetch })),
      preferences: () => ({
        owner: 'southleft',
        repo: 'altitude-designs',
        branch: 'main',
        folder: 'documents'
      })
    }
  )
  return {
    graph,
    page,
    state,
    session,
    persisted,
    edit(name: string) {
      revision++
      state.sceneVersion++
      graph.createNode('RECTANGLE', page.id, { name })
    },
    replaceGraph: () => replaced.forEach((handler) => handler())
  }
}

test('publishing binds the document and marks that revision persisted', async () => {
  const { session, persisted } = fixture()
  expect(await session.publish('Landing page')).toBe(true)
  expect(session.binding.value?.path).toBe('documents/landing-page')
  expect(session.binding.value?.commitSHA).toBe(github.head)
  expect(persisted).toEqual([[1, 10]])
  expect(github.commits.get(github.head)?.message.startsWith('Add Landing page')).toBe(true)
})

test('a conflict leaves the revision unpersisted so recovery keeps protecting it', async () => {
  const { session, persisted, edit } = fixture()
  await session.publish('Landing page')
  const cover = github.text('documents/landing-page/pages/page-1.json') ?? ''
  await github.commitFiles(
    { 'documents/landing-page/pages/page-1.json': cover.replace('"Page 1"', '"Theirs"') },
    'Their edit'
  )
  edit('Mine')
  expect(await session.commit()).toBe(false)
  expect(session.status.value.phase).toBe('conflict')
  expect(persisted).toHaveLength(1)

  expect(await session.commit({ overwrite: true, message: 'Keep mine' })).toBe(true)
  expect(persisted).toEqual([
    [1, 10],
    [2, 11]
  ])
  expect(github.commits.get(github.head)?.message).toBe('Keep mine')
})

test('a 401 is reported as unauthorized and nothing is persisted', async () => {
  const { session, persisted, edit } = fixture()
  await session.publish('Landing page')
  edit('Offline')
  github.failures.push({ pattern: /git\/ref\//, status: 401 })
  expect(await session.commit()).toBe(false)
  const status = session.status.value
  expect(status.phase === 'failed' && status.failure.kind).toBe('unauthorized')
  expect(persisted).toHaveLength(1)
})

test('opening another document in the tab drops the binding', async () => {
  const { session, replaceGraph } = fixture()
  await session.publish('Landing page')
  replaceGraph()
  expect(session.binding.value).toBeNull()
})

test('the save hint is offered once per document', () => {
  const { session, replaceGraph } = fixture()
  expect(session.claimSaveHint()).toBe(true)
  expect(session.claimSaveHint()).toBe(false)
  replaceGraph()
  expect(session.claimSaveHint()).toBe(true)
})
