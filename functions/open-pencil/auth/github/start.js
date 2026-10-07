/**
 * GET /open-pencil/auth/github/start?state=<random> — begins GitHub OAuth for the
 * OpenPencil editor (apps/open-pencil, "Sign in with GitHub").
 *
 * The editor opens this in a popup with its own random state. We remember that state in a
 * short-lived HttpOnly cookie scoped to /open-pencil/ and redirect to GitHub; the
 * callback only accepts a code whose state matches the cookie.
 *
 * Pages environment variables (Settings → Variables and Secrets):
 *
 *   GITHUB_OAUTH_CLIENT_ID      (plain text) — the OAuth app's client ID
 *   GITHUB_OAUTH_CLIENT_SECRET  (secret)     — used only by ./callback.js
 *
 * Without both, this returns 503: unconfigured sign-in fails closed. The route sits behind
 * the password middleware (../../_middleware.js) like the rest of /open-pencil/.
 *
 * Self-contained on purpose: functions/README.md explains why a Functions build failure
 * takes the whole site down, so this file imports nothing.
 */

const STATE_COOKIE = '__Secure-open-pencil-github-oauth'
const STATE_PATTERN = /^[A-Za-z0-9_-]{32,128}$/
const STATE_MAX_AGE_SECONDS = 600
const SCOPE = 'repo'

function plain(status, message) {
  return new Response(message, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
  })
}

export async function onRequestGet(context) {
  const { env, request } = context
  if (!env.GITHUB_OAUTH_CLIENT_ID || !env.GITHUB_OAUTH_CLIENT_SECRET) {
    return plain(
      503,
      'GitHub sign-in is not configured: set GITHUB_OAUTH_CLIENT_ID and GITHUB_OAUTH_CLIENT_SECRET.'
    )
  }
  const url = new URL(request.url)
  const state = url.searchParams.get('state') || ''
  if (!STATE_PATTERN.test(state)) return plain(400, 'Missing or invalid state.')

  const authorize = new URL('https://github.com/login/oauth/authorize')
  authorize.searchParams.set('client_id', env.GITHUB_OAUTH_CLIENT_ID)
  authorize.searchParams.set('redirect_uri', new URL('callback', url).toString())
  authorize.searchParams.set('scope', SCOPE)
  authorize.searchParams.set('state', state)
  authorize.searchParams.set('allow_signup', 'false')

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorize.toString(),
      'Set-Cookie': `${STATE_COOKIE}=${state}; Max-Age=${STATE_MAX_AGE_SECONDS}; Path=/open-pencil/; HttpOnly; Secure; SameSite=Lax`,
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer'
    }
  })
}
