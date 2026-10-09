import type { GitHubFetch } from '@/app/integrations/storage/github/client'

export type RecordedRequest = {
  method: string
  url: URL
  headers: Record<string, string>
  body: unknown
}

type Route = {
  method: string
  pattern: RegExp
  respond: (request: RecordedRequest, match: RegExpExecArray) => Response | Promise<Response>
}

/**
 * A scripted GitHub API: each route matches `METHOD /path?query` and returns a Response.
 * Requests are recorded for assertions; unmatched requests fail with 500.
 */
export function createGitHubRoutes() {
  const routes: Route[] = []
  const requests: RecordedRequest[] = []

  const fetch: GitHubFetch = async (input, init) => {
    const url = new URL(input)
    const method = init.method ?? 'GET'
    const headers = Object.fromEntries(new Headers(init.headers).entries())
    const body = typeof init.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined
    const request = { method, url, headers, body }
    requests.push(request)
    const target = `${url.pathname}${url.search}`
    for (const route of routes) {
      if (route.method !== method) continue
      const match = route.pattern.exec(target)
      if (match) return route.respond(request, match)
    }
    return Response.json({ message: `Unhandled ${method} ${target}` }, { status: 500 })
  }

  return {
    fetch,
    requests,
    on(method: string, pattern: RegExp, respond: Route['respond']) {
      routes.push({ method, pattern, respond })
    },
    /** Requests whose `METHOD path` matches. */
    matching(method: string, pattern: RegExp) {
      return requests.filter(
        (request) => request.method === method && pattern.test(request.url.pathname)
      )
    }
  }
}

export function issueJSON(overrides: Record<string, unknown> = {}) {
  return {
    number: 1,
    html_url: 'https://github.com/southleft/altitude-designs/issues/1',
    title: 'Tighten the hero spacing',
    body: 'Tighten the hero spacing',
    state: 'open',
    user: { login: 'octo', avatar_url: 'https://avatars.githubusercontent.com/u/7?v=4' },
    labels: [{ name: 'design-comment' }, { name: 'doc:landing-page' }],
    comments: 0,
    created_at: '2026-10-07T12:00:00Z',
    updated_at: '2026-10-07T12:00:00Z',
    ...overrides
  }
}

export function pullJSON(overrides: Record<string, unknown> = {}) {
  return {
    number: 12,
    html_url: 'https://github.com/southleft/altitude-designs/pull/12',
    state: 'open',
    title: 'Update Landing page',
    body: '',
    draft: false,
    merged_at: null,
    head: { ref: 'design/landing-page-ab12', sha: 'a'.repeat(40) },
    base: { ref: 'main' },
    ...overrides
  }
}
