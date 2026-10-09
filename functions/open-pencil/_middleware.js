/**
 * Password gate for /open-pencil/* — the OpenPencil canvas editor (apps/open-pencil).
 *
 * The docs site is public; the editor is a team experiment, so every request under
 * /open-pencil/ (the app shell, its JS, the CanvasKit wasm, fonts) needs HTTP Basic auth.
 * Any username; the password is the Pages environment variable:
 *
 *   OPEN_PENCIL_PASSWORD  (required — Settings → Environment variables, for BOTH
 *                          Production and Preview. Without it the editor returns 503:
 *                          an unconfigured gate fails closed, never open.)
 *
 * Self-contained on purpose: functions/README.md explains why a Functions build failure
 * takes the whole site down, so this file imports nothing.
 */

const REALM = 'OpenPencil (Southleft)'

function unauthorized() {
  return new Response('Password required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
      'Cache-Control': 'no-store'
    }
  })
}

function passwordFrom(request) {
  const header = request.headers.get('Authorization') || ''
  const match = /^Basic\s+(.+)$/i.exec(header)
  if (!match) return null
  try {
    const decoded = new TextDecoder().decode(
      Uint8Array.from(atob(match[1]), (c) => c.charCodeAt(0))
    )
    const colon = decoded.indexOf(':')
    return colon === -1 ? null : decoded.slice(colon + 1)
  } catch {
    return null
  }
}

/** Constant-time comparison, so response timing does not leak the password. */
async function matches(given, expected) {
  const encoder = new TextEncoder()
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(given)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected))
  ])
  return crypto.subtle.timingSafeEqual(a, b)
}

/**
 * The built file, or the app shell for a client-side route (`/open-pencil/share/<id>`).
 * `_redirects` does not apply to Function-served requests, so the SPA fallback is here:
 * only for page navigations to paths without a file extension, never for missing assets.
 */
async function appResponse(context) {
  const response = await context.next()
  if (response.status !== 404) return response
  const { pathname } = new URL(context.request.url)
  const isNavigation = (context.request.headers.get('Accept') || '').includes('text/html')
  if (!isNavigation || /\.[a-z0-9]+$/i.test(pathname)) return response
  const shell = new URL('/open-pencil/index.html', context.request.url)
  return context.env.ASSETS.fetch(new Request(shell, context.request))
}

function withAppHeaders(response, pathname) {
  // Authenticated content stays out of shared caches. The browser may keep hashed build
  // assets (content-addressed, so never stale) but revalidates everything else.
  const headers = new Headers(response.headers)
  // A response that must never be stored (the GitHub sign-in hand-off) keeps `no-store`.
  if (!/\bno-store\b/.test(headers.get('Cache-Control') || '')) {
    headers.set(
      'Cache-Control',
      response.ok && pathname.startsWith('/open-pencil/assets/')
        ? 'private, max-age=31536000, immutable'
        : 'private, no-cache'
    )
  }
  // WebAssembly.instantiateStreaming refuses the renderer without its real type.
  if (pathname.endsWith('.wasm')) headers.set('Content-Type', 'application/wasm')
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

export async function onRequest(context) {
  const expected = context.env.OPEN_PENCIL_PASSWORD
  if (!expected) {
    return new Response('OpenPencil is not configured: set OPEN_PENCIL_PASSWORD.', {
      status: 503,
      headers: { 'Cache-Control': 'no-store' }
    })
  }
  const given = passwordFrom(context.request)
  if (given === null || !(await matches(given, expected))) return unauthorized()

  const response = await appResponse(context)
  return withAppHeaders(response, new URL(context.request.url).pathname)
}
