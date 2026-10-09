import { beforeEach, describe, expect, test } from 'bun:test'

import { gitBlobSHA, writeDocumentJSON } from '@open-pencil/core/io/formats/document-json'
import { SceneGraph } from '@open-pencil/scene-graph'

import { createGitHubClient, GitHubAPIError } from '@/app/integrations/storage/github/client'
import { defaultCommitMessage } from '@/app/integrations/storage/github/document/message'
import {
  allocateGitHubDocumentPath,
  commitGitHubDocument,
  GITHUB_MAX_FILE_BYTES,
  listGitHubDocuments,
  loadGitHubDocument,
  oversizeGitHubFiles,
  type GitHubDocumentBinding
} from '@/app/integrations/storage/github/repository'

import { FakeGitHub } from '#tests/helpers/github/fake'

const location = { owner: 'southleft', repo: 'altitude-designs', branch: 'main' }

function graphWithPages() {
  const graph = new SceneGraph()
  const cover = graph.getPages()[0]
  graph.updateNode(cover.id, { name: 'Cover' })
  const components = graph.addPage('Components')
  graph.createNode('RECTANGLE', cover.id, { name: 'Hero', width: 200 })
  graph.createNode('FRAME', components.id, { name: 'Button', width: 120 })
  return { graph, cover, components }
}

async function publish(github: FakeGitHub, graph: SceneGraph, name = 'Landing page') {
  const client = createGitHubClient({ token: 'test', fetch: github.fetch })
  const { path, head } = await allocateGitHubDocumentPath(client, location, 'documents', name)
  const draft: GitHubDocumentBinding = {
    ...location,
    path,
    commitSHA: head,
    committedAt: null,
    files: {}
  }
  const outcome = await commitGitHubDocument(client, draft, writeDocumentJSON(graph, { name }), {
    message: 'Add Landing page'
  })
  if (outcome.kind !== 'committed') throw new Error(`publish ${outcome.kind}`)
  return { client, binding: outcome.binding }
}

let github: FakeGitHub
beforeEach(async () => {
  github = new FakeGitHub()
  await github.init()
})

test('git blob SHA matches git hash-object', async () => {
  expect(await gitBlobSHA(new TextEncoder().encode('hello\n'))).toBe(
    'ce013625030ba8dba906f756967f9e9ca394464a'
  )
})

describe('commit flow', () => {
  test('publishes a document folder in one commit and lists it', async () => {
    const { graph } = graphWithPages()
    const { client, binding } = await publish(github, graph)
    expect(binding.path).toBe('documents/landing-page')
    expect(github.head).toBe(binding.commitSHA)
    expect(github.text('documents/landing-page/document.json')).toContain('"name": "Landing page"')
    expect(github.files().has('documents/landing-page/pages/components.json')).toBe(true)
    expect(github.files().has('README.md')).toBe(true)
    expect(await listGitHubDocuments(client, location, 'documents')).toEqual([
      { path: 'documents/landing-page', name: 'Landing page' }
    ])
    const again = await allocateGitHubDocumentPath(client, location, 'documents', 'Landing page')
    expect(again.path).toBe('documents/landing-page-2')
  })

  test('a second save uploads only the changed page and skips unchanged files', async () => {
    const { graph, components } = graphWithPages()
    const { client, binding } = await publish(github, graph)
    const button = graph.getChildren(components.id)[0]
    graph.updateNode(button.id, { width: 999 })
    github.requests.length = 0
    const snapshot = writeDocumentJSON(graph, { name: 'Landing page' })
    const outcome = await commitGitHubDocument(client, binding, snapshot, {
      message: (paths) => defaultCommitMessage('Landing page', snapshot.pages, paths, false)
    })
    expect(outcome.kind).toBe('committed')
    if (outcome.kind !== 'committed') return
    expect(outcome.changedPaths).toEqual(['pages/components.json', 'pages/components.source.json'])
    expect(github.requests.filter((request) => request.endsWith('/git/blobs'))).toHaveLength(2)
    expect(github.commits.get(github.head)?.message).toBe(
      'Update Landing page\n\nPages: Components'
    )
    const unchanged = await commitGitHubDocument(client, outcome.binding, snapshot, {
      message: 'noop'
    })
    expect(unchanged.kind).toBe('unchanged')
  })

  test('replays on a moved branch when the changed files do not overlap', async () => {
    const { graph, cover } = graphWithPages()
    const { client, binding } = await publish(github, graph)
    // A collaborator edits the Components page and adds a note elsewhere.
    const remoteComponents = github.text('documents/landing-page/pages/components.json') ?? ''
    await github.commitFiles(
      {
        'documents/landing-page/pages/components.json': remoteComponents.replace(
          '"Button"',
          '"Button (theirs)"'
        ),
        'notes.md': 'unrelated\n'
      },
      'Their edit'
    )
    graph.updateNode(graph.getChildren(cover.id)[0].id, { name: 'Hero (mine)' })
    const outcome = await commitGitHubDocument(
      client,
      binding,
      writeDocumentJSON(graph, { name: 'Landing page' }),
      { message: 'Mine' }
    )
    expect(outcome.kind).toBe('committed')
    if (outcome.kind !== 'committed') return
    expect(outcome.rebased).toBe(true)
    expect(github.text('documents/landing-page/pages/components.json')).toContain('Button (theirs)')
    expect(github.text('documents/landing-page/pages/cover.json')).toContain('Hero (mine)')
    expect(github.text('notes.md')).toBe('unrelated\n')
    // The local document still has the old Components page; the next save must not revert it.
    graph.updateNode(graph.getChildren(cover.id)[0].id, { name: 'Hero (mine, again)' })
    const next = await commitGitHubDocument(
      client,
      outcome.binding,
      writeDocumentJSON(graph, { name: 'Landing page' }),
      { message: 'Mine again' }
    )
    expect(next.kind).toBe('committed')
    expect(github.text('documents/landing-page/pages/components.json')).toContain('Button (theirs)')
  })

  test('stops with a conflict when the same file changed on both sides', async () => {
    const { graph, components } = graphWithPages()
    const { client, binding } = await publish(github, graph)
    const remote = github.text('documents/landing-page/pages/components.json') ?? ''
    await github.commitFiles(
      { 'documents/landing-page/pages/components.json': remote.replace('"Button"', '"Theirs"') },
      'Their edit'
    )
    const theirHead = github.head
    graph.updateNode(graph.getChildren(components.id)[0].id, { name: 'Mine' })
    const snapshot = writeDocumentJSON(graph, { name: 'Landing page' })
    const outcome = await commitGitHubDocument(client, binding, snapshot, { message: 'Mine' })
    expect(outcome).toEqual({
      kind: 'conflict',
      paths: ['pages/components.json'],
      remoteCommitSHA: theirHead
    })
    expect(github.head).toBe(theirHead)

    const overwritten = await commitGitHubDocument(client, binding, snapshot, {
      message: 'Mine wins',
      overwrite: true
    })
    expect(overwritten.kind).toBe('committed')
    expect(github.text('documents/landing-page/pages/components.json')).toContain('"Mine"')
  })

  test('retries when a push lands between reading and updating the branch', async () => {
    const { graph, cover } = graphWithPages()
    const { client, binding } = await publish(github, graph)
    github.beforeRefUpdate = async () => {
      await github.commitFiles({ 'notes.md': 'raced\n' }, 'Concurrent push')
    }
    graph.updateNode(graph.getChildren(cover.id)[0].id, { name: 'Raced' })
    const outcome = await commitGitHubDocument(
      client,
      binding,
      writeDocumentJSON(graph, { name: 'Landing page' }),
      { message: 'After race' }
    )
    expect(outcome.kind).toBe('committed')
    expect(github.text('notes.md')).toBe('raced\n')
    expect(github.text('documents/landing-page/pages/cover.json')).toContain('Raced')
  })

  test('loads a committed document back into an equivalent graph', async () => {
    const { graph } = graphWithPages()
    const { client, binding } = await publish(github, graph)
    const loaded = await loadGitHubDocument(client, location, binding.path)
    expect(loaded.name).toBe('Landing page')
    expect(loaded.binding.commitSHA).toBe(github.head)
    expect(loaded.binding.files).toEqual(binding.files)
    expect(writeDocumentJSON(loaded.graph, { name: 'Landing page' })).toEqual(
      writeDocumentJSON(graph, { name: 'Landing page' })
    )
  })
})

describe('GitHub errors', () => {
  test('401 surfaces as unauthorized so the app can ask to sign in again', async () => {
    github.failures.push({ pattern: /git\/ref\//, status: 401 })
    const client = createGitHubClient({ token: 'expired', fetch: github.fetch })
    const error = await client
      .getBranchHead('southleft', 'altitude-designs', 'main')
      .catch((e) => e)
    expect(error).toBeInstanceOf(GitHubAPIError)
    expect((error as GitHubAPIError).kind).toBe('unauthorized')
  })

  test('403 with no remaining quota is a rate limit with its reset time', async () => {
    github.failures.push({
      pattern: /git\/ref\//,
      status: 403,
      headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1800000000' }
    })
    const client = createGitHubClient({ token: 'test', fetch: github.fetch })
    const error = (await client
      .getBranchHead('southleft', 'altitude-designs', 'main')
      .catch((e) => e)) as GitHubAPIError
    expect(error.kind).toBe('rate-limited')
    expect(error.resetAt?.getTime()).toBe(1_800_000_000_000)
  })

  test('404 means no access or no repository', async () => {
    const client = createGitHubClient({ token: 'test', fetch: github.fetch })
    github.failures.push({ pattern: /\/repos\/southleft\/altitude-designs$/, status: 404 })
    const missing = (await client
      .getRepository('southleft', 'altitude-designs')
      .catch((e) => e)) as GitHubAPIError
    expect(missing.kind).toBe('not-found')
  })

  test('responses that do not match the schema are rejected', async () => {
    const client = createGitHubClient({
      token: 'test',
      fetch: () => Promise.resolve(Response.json({ unexpected: true }))
    })
    const error = (await client.getAuthenticatedUser().catch((e) => e)) as GitHubAPIError
    expect(error.kind).toBe('invalid-response')
  })
})

test('oversized files are attributed to the page they hold', () => {
  const { graph } = graphWithPages()
  const snapshot = writeDocumentJSON(graph, { name: 'Huge' })
  const oversized = new Uint8Array(GITHUB_MAX_FILE_BYTES + 1)
  const files = snapshot.files.map((file) =>
    file.path === 'pages/components.json' || file.path === 'variables.json'
      ? { ...file, bytes: oversized }
      : file
  )
  expect(oversizeGitHubFiles({ ...snapshot, files })).toEqual([
    { path: 'pages/components.json', megabytes: 101, page: 'Components' },
    { path: 'variables.json', megabytes: 101, page: null }
  ])
  expect(oversizeGitHubFiles(snapshot)).toEqual([])
})
