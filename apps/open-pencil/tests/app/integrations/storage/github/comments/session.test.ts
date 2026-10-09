import { expect, test } from 'bun:test'

import { shallowRef } from 'vue'

import { SceneGraph } from '@open-pencil/scene-graph'

import { createGitHubClient } from '@/app/integrations/storage/github/client'
import { parseAnchor } from '@/app/integrations/storage/github/comments/anchor'
import {
  COMMENT_AUTO_REFRESH_MS,
  createGitHubCommentsSession
} from '@/app/integrations/storage/github/comments/session'
import type { GitHubDocumentBinding } from '@/app/integrations/storage/github/repository'

import { createGitHubRoutes, issueJSON, pullJSON } from '#tests/helpers/github/routes'

const binding: GitHubDocumentBinding = {
  owner: 'southleft',
  repo: 'altitude-designs',
  branch: 'design/hero',
  path: 'documents/landing-page',
  commitSHA: 'b'.repeat(40),
  committedAt: null,
  files: { 'document.json': 'c'.repeat(40) }
}

function fixture(options: { signedIn?: boolean } = {}) {
  const api = createGitHubRoutes()
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const hero = graph.createNode('RECTANGLE', page.id, {
    name: 'Hero',
    x: 10,
    y: 20,
    width: 50,
    height: 50
  })
  const bound = shallowRef<GitHubDocumentBinding | null>(binding)
  let now = 1_000_000
  const session = createGitHubCommentsSession(
    { github: { binding: bound }, editor: { graph }, state: { currentPageId: page.id } },
    {
      resolveClient: (etags) =>
        Promise.resolve(createGitHubClient({ token: 't', fetch: api.fetch, etags })),
      signedIn: () => options.signedIn ?? true,
      now: () => now
    }
  )
  return {
    api,
    graph,
    page,
    hero,
    bound,
    session,
    advance: (ms: number) => {
      now += ms
    }
  }
}

function serveLabels(api: ReturnType<typeof createGitHubRoutes>, existing: string[]) {
  api.on('GET', /\/labels\/([^/?]+)$/, (_request, match) =>
    existing.includes(decodeURIComponent(match[1]))
      ? Response.json({ name: decodeURIComponent(match[1]) })
      : Response.json({ message: 'Not Found' }, { status: 404 })
  )
  api.on('POST', /\/labels$/, (request) =>
    Response.json({ name: (request.body as { name: string }).name }, { status: 201 })
  )
}

test('comment mode is unavailable until the document is committed or when signed out', () => {
  const signedOut = fixture({ signedIn: false })
  expect(signedOut.session.availability.value).toBe('signed-out')
  signedOut.session.setActive(true)
  expect(signedOut.session.active.value).toBe(false)

  const local = fixture()
  local.bound.value = null
  expect(local.session.availability.value).toBe('not-committed')
})

test('creating a comment adds missing labels, links the open PR and writes the anchor', async () => {
  const { api, session, hero } = fixture()
  serveLabels(api, ['design-comment'])
  api.on('GET', /\/issues\?/, () => Response.json([]))
  api.on('GET', /\/pulls\?/, () => Response.json([pullJSON({ number: 12 })]))
  api.on('POST', /\/issues$/, (request) => {
    const body = request.body as { title: string; body: string; labels: string[] }
    return Response.json(issueJSON({ number: 7, title: body.title, body: body.body }), {
      status: 201
    })
  })

  session.setActive(true)
  session.startDraft({ x: 15, y: 30 }, hero.id)
  const outcome = await session.submitDraft('Tighten the spacing\nMore detail', 'Design comment')
  expect(outcome).toEqual({ ok: true })

  // Only the missing document label was created.
  expect(api.matching('POST', /\/labels$/).map((request) => request.body)).toEqual([
    expect.objectContaining({ name: 'doc:landing-page' })
  ])
  const created = api.matching('POST', /\/issues$/)[0].body as {
    title: string
    body: string
    labels: string[]
  }
  expect(created.title).toBe('Tighten the spacing')
  expect(created.labels).toEqual(['design-comment', 'doc:landing-page'])
  expect(created.body).toContain('Related to #12')
  expect(parseAnchor(created.body)).toMatchObject({
    doc: 'documents/landing-page',
    node: hero.id,
    dx: 5,
    dy: 10,
    branch: 'design/hero',
    commit: binding.commitSHA
  })
  expect(session.threads.value.map((thread) => thread.number)).toEqual([7])
  expect(session.selected.value).toBe(7)
  expect(session.draft.value).toBeNull()

  // Labels are checked once per session.
  session.startDraft({ x: 0, y: 0 }, null)
  await session.submitDraft('Second', 'Design comment')
  expect(api.matching('GET', /\/labels\//)).toHaveLength(2)
})

test('threads load for this document only; replies, resolve and reopen update them', async () => {
  const { api, session } = fixture()
  const anchorBody = (doc: string) =>
    `Text\n\n<!-- openpencil:anchor {"doc":"${doc}","page":"0:1","x":1,"y":2} -->`
  api.on('GET', /\/issues\?/, () =>
    Response.json([
      issueJSON({ number: 3, body: anchorBody('documents/landing-page'), comments: 1 }),
      issueJSON({ number: 4, body: anchorBody('archive/landing-page') }),
      issueJSON({ number: 5, body: 'No anchor at all' })
    ])
  )
  api.on('GET', /\/issues\/3\/comments/, () => Response.json([]))
  api.on('POST', /\/issues\/3\/comments$/, (request) =>
    Response.json(
      {
        id: 9,
        html_url: 'https://github.com/c/9',
        body: (request.body as { body: string }).body,
        user: { login: 'octo', avatar_url: 'https://avatars.githubusercontent.com/u/7' },
        created_at: '2026-10-07T12:00:00Z',
        updated_at: '2026-10-07T12:00:00Z'
      },
      { status: 201 }
    )
  )
  api.on('PATCH', /\/issues\/3$/, (request) =>
    Response.json(
      issueJSON({
        number: 3,
        body: anchorBody('documents/landing-page'),
        state: (request.body as { state: string }).state
      })
    )
  )

  session.setActive(true)
  await session.refresh()
  // Same slug in another folder is filtered out; a body without an anchor stays (orphaned).
  expect(session.threads.value.map((thread) => thread.number)).toEqual([5, 3])
  expect(session.threads.value[0].anchor).toBeNull()

  session.select(3)
  await session.loadReplies(3)
  expect(await session.reply(3, '  Done  ')).toEqual({ ok: true })
  expect(session.replies.value.get(3)?.items.map((item) => item.body)).toEqual(['Done'])
  expect(session.threads.value.find((thread) => thread.number === 3)?.replyCount).toBe(2)

  expect(await session.setResolved(3, true)).toEqual({ ok: true })
  // Hidden while "show resolved" is off.
  expect(session.threads.value.map((thread) => thread.number)).toEqual([5])
  expect(session.selected.value).toBeNull()
  session.setIncludeResolved(true)
  expect(await session.setResolved(3, false)).toEqual({ ok: true })
  expect(session.threads.value.find((thread) => thread.number === 3)?.state).toBe('open')
})

test('automatic refreshes are throttled and pause after a rate limit', async () => {
  const { api, session, advance } = fixture()
  let calls = 0
  api.on('GET', /\/issues\?/, () => {
    calls++
    if (calls === 2) {
      return Response.json(
        { message: 'API rate limit exceeded' },
        { status: 403, headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '2000' } }
      )
    }
    return Response.json([])
  })
  session.setActive(true)
  await session.refresh()
  await session.refresh({ auto: true })
  expect(calls).toBe(1)
  advance(COMMENT_AUTO_REFRESH_MS)
  await session.refresh({ auto: true })
  expect(calls).toBe(2)
  expect(session.failure.value?.kind).toBe('rate-limited')
  // Until the reset time (2000 s), nothing is requested, even manually.
  advance(COMMENT_AUTO_REFRESH_MS)
  await session.refresh()
  expect(calls).toBe(2)
})

test('a failed create keeps the draft and reports the failure', async () => {
  const { api, session } = fixture()
  serveLabels(api, ['design-comment', 'doc:landing-page'])
  api.on('GET', /\/issues\?/, () => Response.json([]))
  api.on('GET', /\/pulls\?/, () => Response.json([]))
  api.on('POST', /\/issues$/, () =>
    Response.json({ message: 'Issues are disabled' }, { status: 410 })
  )
  session.setActive(true)
  session.startDraft({ x: 1, y: 1 }, null)
  const outcome = await session.submitDraft('Hello', 'Design comment')
  expect(outcome.ok).toBe(false)
  expect(session.draft.value).not.toBeNull()
})

test('switching to another document clears its threads', async () => {
  const { api, session, bound } = fixture()
  api.on('GET', /\/issues\?/, () => Response.json([issueJSON({ number: 1, body: 'x' })]))
  session.setActive(true)
  await session.refresh()
  expect(session.threads.value).toHaveLength(1)
  bound.value = { ...binding, path: 'documents/other' }
  await Promise.resolve()
  expect(session.threads.value).toHaveLength(0)
  // A branch switch of the same document keeps them.
  await session.refresh()
  bound.value = { ...binding, path: 'documents/other', branch: 'main' }
  await Promise.resolve()
  expect(session.threads.value).toHaveLength(1)
})

test('a refresh right after creating keeps the new thread while the listing lags', async () => {
  const { api, session, advance } = fixture()
  serveLabels(api, ['design-comment', 'doc:landing-page'])
  api.on('GET', /\/pulls\?/, () => Response.json([]))
  api.on('GET', /\/issues\?/, () => Response.json([]))
  api.on('POST', /\/issues$/, () => Response.json(issueJSON({ number: 9 }), { status: 201 }))
  session.setActive(true)
  await session.refresh()
  session.startDraft({ x: 1, y: 1 }, null)
  await session.submitDraft('New', 'Design comment')
  await session.refresh()
  expect(session.threads.value.map((thread) => thread.number)).toEqual([9])
  // After a minute the listing is authoritative again.
  advance(61_000)
  await session.refresh()
  expect(session.threads.value).toEqual([])
})
