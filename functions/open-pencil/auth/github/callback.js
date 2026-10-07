/**
 * GET /open-pencil/auth/github/callback — GitHub OAuth redirect target (see ./start.js).
 *
 * Checks the state against the cookie set by start.js, exchanges the code for a token with
 * GITHUB_OAUTH_CLIENT_ID + GITHUB_OAUTH_CLIENT_SECRET, and answers with a tiny page that
 * hands the token to `window.opener` through postMessage with this exact origin as the
 * target, then closes. The secret never reaches the browser; the token is never put in a
 * URL, logged, or cached (no-store), and the page runs only its own nonce'd script.
 *
 * 503 when unconfigured (fails closed). Self-contained: functions/README.md.
 */

const STATE_COOKIE = '__Secure-open-pencil-github-oauth'
const STATE_PATTERN = /^[A-Za-z0-9_-]{32,128}$/
const MESSAGE_TYPE = 'open-pencil:github-oauth'
const CLEAR_COOKIE = `${STATE_COOKIE}=; Max-Age=0; Path=/open-pencil/; HttpOnly; Secure; SameSite=Lax`

function plain(status, message) {
  return new Response(message, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'Set-Cookie': CLEAR_COOKIE
    }
  })
}

function cookieValue(request, name) {
  for (const part of (request.headers.get('Cookie') || '').split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return rest.join('=')
  }
  return null
}

/** Constant-time comparison, so response timing does not leak the expected state. */
async function sameState(given, expected) {
  const encoder = new TextEncoder()
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(given)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected))
  ])
  return crypto.subtle.timingSafeEqual(a, b)
}

/** JSON that is safe inside a <script> element. */
function scriptJSON(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
}

function randomNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return btoa(String.fromCharCode(...bytes))
}

/** The page that delivers `message` to the opener on this origin only, then closes. */
function handoff(status, origin, message) {
  const nonce = randomNonce()
  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>GitHub sign-in</title></head>
<body>
<p>You can close this window.</p>
<script nonce="${nonce}">
(function () {
  var message = ${scriptJSON(message)};
  if (window.opener) window.opener.postMessage(message, ${scriptJSON(origin)});
  window.close();
})();
</script>
</body>
</html>`
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'Set-Cookie': CLEAR_COOKIE
    }
  })
}

async function exchange(env, code, redirectURI) {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'open-pencil-oauth'
    },
    body: JSON.stringify({
      client_id: env.GITHUB_OAUTH_CLIENT_ID,
      client_secret: env.GITHUB_OAUTH_CLIENT_SECRET,
      code,
      redirect_uri: redirectURI
    })
  })
  if (!response.ok) return null
  const body = await response.json().catch(() => null)
  return body && typeof body.access_token === 'string' && body.access_token
    ? body.access_token
    : null
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
  const expected = cookieValue(request, STATE_COOKIE)
  if (!STATE_PATTERN.test(state) || !expected || !(await sameState(state, expected))) {
    return plain(400, 'Sign-in state did not match. Close this window and try again.')
  }
  if (url.searchParams.get('error')) {
    return handoff(200, url.origin, { type: MESSAGE_TYPE, state, error: 'access_denied' })
  }
  const code = url.searchParams.get('code')
  if (!code) return plain(400, 'Missing authorization code.')

  const redirectURI = new URL(url.pathname, url.origin).toString()
  const token = await exchange(env, code, redirectURI).catch(() => null)
  if (!token) {
    return handoff(502, url.origin, { type: MESSAGE_TYPE, state, error: 'exchange_failed' })
  }
  return handoff(200, url.origin, { type: MESSAGE_TYPE, state, token })
}
