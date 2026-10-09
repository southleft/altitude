import { describe, expect, test } from 'bun:test'

import {
  createGitHubClient,
  GitHubAPIError,
  nextPageURL,
  type GitHubETagCache
} from '@/app/integrations/storage/github/client'

import { createGitHubRoutes, issueJSON, pullJSON } from '#tests/helpers/github/routes'

const REPO = '/repos/southleft/altitude-designs'

function setup(etags?: GitHubETagCache) {
  const api = createGitHubRoutes()
  const client = createGitHubClient({ token: 'secret-token', fetch: api.fetch, etags })
  return { api, client }
}

async function failure(promise: Promise<unknown>): Promise<GitHubAPIError> {
  try {
    await promise
  } catch (error) {
    if (error instanceof GitHubAPIError) return error
    throw error
  }
  throw new Error('Expected the request to fail')
}

describe('branches', () => {
  test('lists every page of branches by following Link headers', async () => {
    const { api, client } = setup()
    api.on('GET', /\/branches\?per_page=100$/, () =>
      Response.json([{ name: 'main', commit: { sha: 'a1' } }], {
        headers: {
          link: `<https://api.github.com${REPO}/branches?per_page=100&page=2>; rel="next", <https://api.github.com${REPO}/branches?per_page=100&page=3>; rel="last"`
        }
      })
    )
    api.on('GET', /\/branches\?per_page=100&page=2$/, () =>
      Response.json([{ name: 'design/hero', commit: { sha: 'b2' }, protected: false }], {
        headers: {
          link: `<https://api.github.com${REPO}/branches?per_page=100&page=3>; rel="next"`
        }
      })
    )
    api.on('GET', /\/branches\?per_page=100&page=3$/, () =>
      Response.json([{ name: 'design/nav', commit: { sha: 'c3' } }])
    )
    const branches = await client.listBranches('southleft', 'altitude-designs')
    expect(branches.map((branch) => branch.name)).toEqual(['main', 'design/hero', 'design/nav'])
    expect(api.requests).toHaveLength(3)
    expect(api.requests[0].headers.authorization).toBe('Bearer secret-token')
  })

  test('never follows a next link to another origin', async () => {
    const { api, client } = setup()
    api.on('GET', /\/branches/, () =>
      Response.json([{ name: 'main', commit: { sha: 'a1' } }], {
        headers: { link: '<https://evil.example/steal>; rel="next"' }
      })
    )
    expect(await client.listBranches('southleft', 'altitude-designs')).toHaveLength(1)
    expect(api.requests).toHaveLength(1)
  })

  test('creates a branch ref and reports an existing name as a conflict', async () => {
    const { api, client } = setup()
    let calls = 0
    api.on('POST', /\/git\/refs$/, (request) => {
      calls++
      if (calls === 2) {
        return Response.json({ message: 'Reference already exists' }, { status: 422 })
      }
      expect(request.body).toEqual({ ref: 'refs/heads/design/hero', sha: 'a1' })
      return Response.json(
        { ref: 'refs/heads/design/hero', object: { sha: 'a1', type: 'commit' } },
        { status: 201 }
      )
    })
    await client.createBranch('southleft', 'altitude-designs', 'design/hero', 'a1')
    const error = await failure(
      client.createBranch('southleft', 'altitude-designs', 'design/hero', 'a1')
    )
    expect(error.kind).toBe('conflict')
  })

  test('deletes a branch (204, no body) with an encoded ref path', async () => {
    const { api, client } = setup()
    api.on(
      'DELETE',
      /\/git\/refs\/heads\/design\/hero%20x$/,
      () => new Response(null, { status: 204 })
    )
    await client.deleteBranch('southleft', 'altitude-designs', 'design/hero x')
    expect(api.requests).toHaveLength(1)
  })
})

describe('pull requests', () => {
  test('finds pull requests for a branch by owner:branch head', async () => {
    const { api, client } = setup()
    api.on('GET', /\/pulls\?/, (request) => {
      expect(request.url.searchParams.get('head')).toBe('southleft:design/hero')
      expect(request.url.searchParams.get('state')).toBe('all')
      return Response.json([pullJSON()])
    })
    const pulls = await client.listPullRequestsForBranch(
      'southleft',
      'altitude-designs',
      'design/hero'
    )
    expect(pulls[0].number).toBe(12)
  })

  test('creates a pull request with base, head and draft flag', async () => {
    const { api, client } = setup()
    api.on('POST', /\/pulls$/, (request) => {
      expect(request.body).toEqual({
        title: 'Update Landing page',
        body: 'Body',
        head: 'design/hero',
        base: 'main',
        draft: true
      })
      return Response.json(pullJSON({ draft: true }), { status: 201 })
    })
    const pull = await client.createPullRequest('southleft', 'altitude-designs', {
      title: 'Update Landing page',
      body: 'Body',
      head: 'design/hero',
      base: 'main',
      draft: true
    })
    expect(pull.draft).toBe(true)
  })

  test('an existing pull request for the branch fails as validation (422)', async () => {
    const { api, client } = setup()
    api.on('POST', /\/pulls$/, () =>
      Response.json({ message: 'Validation Failed' }, { status: 422 })
    )
    const error = await failure(
      client.createPullRequest('southleft', 'altitude-designs', {
        title: 't',
        body: '',
        head: 'design/hero',
        base: 'main',
        draft: false
      })
    )
    expect(error.kind).toBe('validation')
    expect(error.status).toBe(422)
  })
})

describe('issues, comments and labels', () => {
  test('lists issues by labels and drops pull requests', async () => {
    const { api, client } = setup()
    api.on('GET', /\/issues\?/, (request) => {
      expect(request.url.searchParams.get('labels')).toBe('design-comment,doc:landing-page')
      expect(request.url.searchParams.get('state')).toBe('open')
      return Response.json([issueJSON(), issueJSON({ number: 2, pull_request: { url: 'x' } })])
    })
    const issues = await client.listIssues('southleft', 'altitude-designs', {
      labels: ['design-comment', 'doc:landing-page'],
      state: 'open'
    })
    expect(issues.map((issue) => issue.number)).toEqual([1])
  })

  test('reuses an ETag: a 304 returns the cached body', async () => {
    const etags: GitHubETagCache = new Map()
    const { api, client } = setup(etags)
    let calls = 0
    api.on('GET', /\/issues\?/, (request) => {
      calls++
      if (calls === 1) return Response.json([issueJSON()], { headers: { etag: 'W/"abc"' } })
      expect(request.headers['if-none-match']).toBe('W/"abc"')
      return new Response(null, { status: 304 })
    })
    const query = { labels: ['design-comment'], state: 'open' as const }
    await client.listIssues('southleft', 'altitude-designs', query)
    const again = await client.listIssues('southleft', 'altitude-designs', query)
    expect(again[0].title).toBe('Tighten the hero spacing')
    expect(calls).toBe(2)
  })

  test('creates, comments on, closes and reopens an issue', async () => {
    const { api, client } = setup()
    api.on('POST', /\/issues$/, (request) =>
      Response.json(issueJSON({ body: (request.body as { body: string }).body }), { status: 201 })
    )
    api.on('GET', /\/issues\/1\/comments/, () =>
      Response.json([
        {
          id: 5,
          html_url: 'https://github.com/c/5',
          body: 'Agreed',
          user: { login: 'cat', avatar_url: 'https://avatars.githubusercontent.com/u/8' },
          created_at: '2026-10-07T12:01:00Z',
          updated_at: '2026-10-07T12:01:00Z'
        }
      ])
    )
    api.on('POST', /\/issues\/1\/comments$/, (request) =>
      Response.json(
        {
          id: 6,
          html_url: 'https://github.com/c/6',
          body: (request.body as { body: string }).body,
          user: null,
          created_at: '2026-10-07T12:02:00Z',
          updated_at: '2026-10-07T12:02:00Z'
        },
        { status: 201 }
      )
    )
    api.on('PATCH', /\/issues\/1$/, (request) =>
      Response.json(issueJSON({ state: (request.body as { state: string }).state }))
    )
    const issue = await client.createIssue('southleft', 'altitude-designs', {
      title: 'Hero',
      body: 'Body',
      labels: ['design-comment']
    })
    expect(issue.body).toBe('Body')
    expect(await client.listIssueComments('southleft', 'altitude-designs', 1)).toHaveLength(1)
    const reply = await client.createIssueComment('southleft', 'altitude-designs', 1, 'Done')
    expect(reply.body).toBe('Done')
    const closed = await client.setIssueState('southleft', 'altitude-designs', 1, 'closed')
    expect(closed.state).toBe('closed')
    expect(api.matching('PATCH', /\/issues\/1$/)[0].body).toEqual({
      state: 'closed',
      state_reason: 'completed'
    })
    const reopened = await client.setIssueState('southleft', 'altitude-designs', 1, 'open')
    expect(reopened.state).toBe('open')
  })

  test('getLabel returns null for a missing label; other errors still throw', async () => {
    const { api, client } = setup()
    api.on('GET', /\/labels\/doc%3Alanding-page$/, () =>
      Response.json({ message: 'Not Found' }, { status: 404 })
    )
    api.on('GET', /\/labels\/design-comment$/, () =>
      Response.json({ message: 'Forbidden' }, { status: 403 })
    )
    expect(await client.getLabel('southleft', 'altitude-designs', 'doc:landing-page')).toBeNull()
    expect(
      (await failure(client.getLabel('southleft', 'altitude-designs', 'design-comment'))).kind
    ).toBe('forbidden')
  })

  test('searches issues with an encoded query', async () => {
    const { api, client } = setup()
    api.on('GET', /^\/search\/issues\?/, (request) => {
      expect(request.url.searchParams.get('q')).toBe('repo:southleft/altitude-designs label:x')
      return Response.json({ total_count: 1, items: [issueJSON()] })
    })
    const result = await client.searchIssues('repo:southleft/altitude-designs label:x')
    expect(result.items).toHaveLength(1)
  })
})

describe('errors', () => {
  test.each([
    [401, {}, 'unauthorized'],
    [403, {}, 'forbidden'],
    [403, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1791374400' }, 'rate-limited'],
    [404, {}, 'not-found'],
    [422, {}, 'validation']
  ] as const)('HTTP %d maps to a typed error', async (status, headers, kind) => {
    const { api, client } = setup()
    api.on('GET', /\/branches/, () => Response.json({ message: 'nope' }, { status, headers }))
    const error = await failure(client.listBranches('southleft', 'altitude-designs'))
    expect(error.kind).toBe(kind)
    if (kind === 'rate-limited') expect(error.resetAt?.getTime()).toBe(1791374400 * 1000)
  })

  test('a response that does not match the schema is an invalid response', async () => {
    const { api, client } = setup()
    api.on('GET', /\/issues\?/, () => Response.json([{ number: 'one' }]))
    const error = await failure(
      client.listIssues('southleft', 'altitude-designs', { labels: ['x'], state: 'all' })
    )
    expect(error.kind).toBe('invalid-response')
  })
})

test('nextPageURL reads rel="next" only', () => {
  expect(nextPageURL(null)).toBeNull()
  expect(nextPageURL('<https://a/x?page=3>; rel="last"')).toBeNull()
  expect(nextPageURL('<https://a/x?page=2>; rel="next", <https://a/x?page=3>; rel="last"')).toBe(
    'https://a/x?page=2'
  )
})
