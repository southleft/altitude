/**
 * Access gate for /open-pencil/* — the OpenPencil canvas editor (apps/open-pencil).
 *
 * The docs site is public; the editor is for the team. Every request under /open-pencil/
 * (the app shell, its JS, the CanvasKit wasm, fonts) needs a session for a GitHub account
 * that can access a private repository. This file also serves the sign-in routes under
 * /open-pencil/auth/github/ itself, so the session code exists exactly once.
 *
 * Self-contained on purpose: functions/README.md explains why a Functions build failure
 * takes the whole site down, so this file imports nothing.
 *
 * ── Modes (decided per request from the Pages environment) ────────────────────────────
 *
 *   github    GITHUB_OAUTH_CLIENT_ID + OPEN_PENCIL_SESSION_SECRET (≥ 32 bytes), plus
 *             GITHUB_OAUTH_CLIENT_SECRET everywhere except preview hosts (previews send
 *             sign-in to production and never exchange codes themselves).
 *   password  Otherwise, when OPEN_PENCIL_PASSWORD is set: the previous HTTP Basic gate,
 *             any username. A rollout fallback only; remove the variable afterwards.
 *   503       Nothing configured. An unconfigured gate fails closed, never open.
 *
 * Optional: OPEN_PENCIL_ACCESS_REPO (default southleft/altitude-designs; must be private),
 * OPEN_PENCIL_ACCESS_MIN_PERMISSION (pull | push, default pull), OPEN_PENCIL_PREVIEW_ORIGINS
 * (comma-separated, `*` = one DNS label, default https://*.altitude.pages.dev),
 * OPEN_PENCIL_PRODUCTION_ORIGIN (default https://altitude.pages.dev),
 * OPEN_PENCIL_SESSION_TTL_SECONDS (default 43200) and OPEN_PENCIL_SESSION_REVERIFY_SECONDS
 * (default 3600).
 *
 * ── Routes (github mode; all no-store) ────────────────────────────────────────────────
 *
 *   GET  auth/github/start?state=…        popup sign-in used by the app (unchanged)
 *   GET  auth/github/start?return_to=…    full-page site sign-in
 *   GET  auth/github/callback             OAuth redirect target (production only)
 *   GET  auth/github/accept?ticket=…      preview hosts: turn a 60 s ticket into a session
 *   GET  auth/github/session              who is signed in; the token only with
 *                                         `X-OpenPencil-Request: 1` from the same origin
 *   POST auth/github/logout               clears the session (same guard), 303 → signed-out
 *   GET  auth/github/signed-out           a static page
 *
 * The session cookie `op_session` is AES-GCM sealed (HKDF-SHA-256 key from
 * OPEN_PENCIL_SESSION_SECRET) and holds {login, id, avatar, permission, token, iat, exp}.
 * After OPEN_PENCIL_SESSION_REVERIFY_SECONDS the repository access is checked again with
 * the stored token: revoked access or a dead token ends the session; a GitHub outage keeps
 * it until it expires. Tokens never appear in URLs or logs; this file logs nothing.
 */

const APP_PREFIX = '/open-pencil/'
const AUTH_PREFIX = '/open-pencil/auth/github/'
const SESSION_COOKIE = 'op_session'
const POPUP_STATE_COOKIE = '__Secure-open-pencil-github-oauth'
const LOGIN_STATE_COOKIE = '__Secure-open-pencil-github-login'
const STATE_PATTERN = /^[A-Za-z0-9_-]{32,128}$/
const STATE_MAX_AGE_SECONDS = 600
const TICKET_TTL_SECONDS = 60
const CLOCK_SKEW_SECONDS = 30
const MIN_SECRET_BYTES = 32
const MAX_RETURN_TO_LENGTH = 2048
const OAUTH_SCOPE = 'repo'
const MESSAGE_TYPE = 'open-pencil:github-oauth'
const REQUEST_HEADER = 'X-OpenPencil-Request'
const REALM = 'OpenPencil (Southleft)'
const GITHUB_API = 'https://api.github.com'
const USER_AGENT = 'open-pencil-site-access'
const PERMISSION_RANK = { pull: 1, push: 2, admin: 3 }
const REPO_PATTERN = /^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/
const LOGIN_PATTERN = /^[A-Za-z0-9-]{1,39}$/
const DEFAULTS = {
  repo: 'southleft/altitude-designs',
  minPermission: 'pull',
  previewOrigins: 'https://*.altitude.pages.dev',
  productionOrigin: 'https://altitude.pages.dev',
  sessionTTL: 12 * 60 * 60,
  reverify: 60 * 60
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

// ── Configuration ──────────────────────────────────────────────────────────────────────

function text(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function seconds(value, fallback, min, max) {
  const parsed = Number.parseInt(text(value), 10)
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** `https://*.altitude.pages.dev` → a regex where `*` is exactly one DNS label. */
function originPatterns(value) {
  return value
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter((part) => /^https:\/\/[a-z0-9.*-]+$/.test(part))
    .map((part) => new RegExp(`^${part.split('*').map(escapeRegExp).join('[a-z0-9-]+')}$`))
}

function readConfig(env, origin) {
  const secret = typeof env.OPEN_PENCIL_SESSION_SECRET === 'string' ? env.OPEN_PENCIL_SESSION_SECRET : ''
  const productionOrigin = text(env.OPEN_PENCIL_PRODUCTION_ORIGIN) || DEFAULTS.productionOrigin
  const previewPatterns = originPatterns(
    env.OPEN_PENCIL_PREVIEW_ORIGINS === undefined ? DEFAULTS.previewOrigins : text(env.OPEN_PENCIL_PREVIEW_ORIGINS)
  )
  const isPreviewOrigin = (candidate) =>
    candidate !== productionOrigin && previewPatterns.some((pattern) => pattern.test(candidate))
  const repo = text(env.OPEN_PENCIL_ACCESS_REPO) || DEFAULTS.repo
  const minPermission = (text(env.OPEN_PENCIL_ACCESS_MIN_PERMISSION) || DEFAULTS.minPermission).toLowerCase()
  const clientID = text(env.GITHUB_OAUTH_CLIENT_ID)
  const clientSecret = text(env.GITHUB_OAUTH_CLIENT_SECRET)
  const isPreview = isPreviewOrigin(origin)
  const github =
    encoder.encode(secret).length >= MIN_SECRET_BYTES &&
    Boolean(clientID) &&
    (Boolean(clientSecret) || isPreview) &&
    REPO_PATTERN.test(repo) &&
    (minPermission === 'pull' || minPermission === 'push')
  const password = typeof env.OPEN_PENCIL_PASSWORD === 'string' ? env.OPEN_PENCIL_PASSWORD : ''
  return {
    mode: github ? 'github' : password ? 'password' : 'unconfigured',
    secret,
    password,
    clientID,
    clientSecret,
    repo,
    minPermission,
    productionOrigin,
    isPreview,
    isPreviewOrigin,
    sessionTTL: seconds(env.OPEN_PENCIL_SESSION_TTL_SECONDS, DEFAULTS.sessionTTL, 300, 30 * 24 * 60 * 60),
    reverify: seconds(env.OPEN_PENCIL_SESSION_REVERIFY_SECONDS, DEFAULTS.reverify, 60, 24 * 60 * 60)
  }
}

// ── Small helpers ──────────────────────────────────────────────────────────────────────

function nowSeconds() {
  return Math.floor(Date.now() / 1000)
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** JSON that is safe inside a <script> element. */
function scriptJSON(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
}

function toBase64URL(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64URL(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null
  try {
    const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'))
    return Uint8Array.from(binary, (c) => c.charCodeAt(0))
  } catch {
    return null
  }
}

function randomToken(bytes) {
  return toBase64URL(crypto.getRandomValues(new Uint8Array(bytes)))
}

/** Constant-time comparison of two strings (hashed first, so lengths do not leak). */
async function sameSecret(given, expected) {
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(given)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected))
  ])
  return crypto.subtle.timingSafeEqual(a, b)
}

function cookieValue(request, name) {
  for (const part of (request.headers.get('Cookie') || '').split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return rest.join('=')
  }
  return null
}

function cookie(name, value, maxAge) {
  return `${name}=${value}; Max-Age=${Math.max(0, maxAge)}; Path=${APP_PREFIX}; HttpOnly; Secure; SameSite=Lax`
}

const clearCookie = (name) => cookie(name, '', 0)

function isNavigation(request) {
  return (
    (request.method === 'GET' || request.method === 'HEAD') &&
    (request.headers.get('Accept') || '').includes('text/html')
  )
}

/** The CSRF guard for token-bearing and state-changing endpoints. */
function sameOriginRequest(request) {
  if (request.headers.get(REQUEST_HEADER) !== '1') return false
  const site = request.headers.get('Sec-Fetch-Site')
  return !site || site === 'same-origin'
}

function respond(status, body, headers = {}, cookies = []) {
  const out = new Headers({ 'Cache-Control': 'no-store', ...headers })
  for (const value of cookies) if (value) out.append('Set-Cookie', value)
  return new Response(body, { status, headers: out })
}

function plain(status, message, cookies = []) {
  return respond(status, message, { 'Content-Type': 'text/plain; charset=utf-8' }, cookies)
}

function json(status, value, cookies = []) {
  return respond(status, JSON.stringify(value), { 'Content-Type': 'application/json; charset=utf-8' }, cookies)
}

function redirect(location, cookies = [], status = 302) {
  return respond(status, null, { Location: location, 'Referrer-Policy': 'no-referrer' }, cookies)
}

// ── Sealing: HKDF → AES-GCM, one key per purpose ───────────────────────────────────────

const keyCache = new Map()

function sealingKey(secret, purpose) {
  let byPurpose = keyCache.get(secret)
  if (!byPurpose) {
    byPurpose = new Map()
    keyCache.set(secret, byPurpose)
  }
  let key = byPurpose.get(purpose)
  if (!key) {
    key = crypto.subtle
      .importKey('raw', encoder.encode(secret), 'HKDF', false, ['deriveKey'])
      .then((material) =>
        crypto.subtle.deriveKey(
          {
            name: 'HKDF',
            hash: 'SHA-256',
            salt: encoder.encode('open-pencil:site-access:v1'),
            info: encoder.encode(purpose)
          },
          material,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt']
        )
      )
    key.catch(() => byPurpose.delete(purpose))
    byPurpose.set(purpose, key)
  }
  return key
}

async function seal(secret, purpose, payload) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const sealed = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode(purpose) },
    await sealingKey(secret, purpose),
    encoder.encode(JSON.stringify(payload))
  )
  return `v1.${toBase64URL(iv)}.${toBase64URL(new Uint8Array(sealed))}`
}

/** The payload, or null when the value is malformed, tampered with, or for another purpose. */
async function unseal(secret, purpose, value) {
  if (typeof value !== 'string' || value.length > 8192) return null
  const [version, ivText, dataText, ...extra] = value.split('.')
  if (version !== 'v1' || extra.length > 0) return null
  const iv = fromBase64URL(ivText || '')
  const data = fromBase64URL(dataText || '')
  if (!iv || iv.length !== 12 || !data || data.length < 17) return null
  try {
    const opened = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: encoder.encode(purpose) },
      await sealingKey(secret, purpose),
      data
    )
    return JSON.parse(decoder.decode(opened))
  } catch {
    return null
  }
}

// ── Sessions ───────────────────────────────────────────────────────────────────────────

function isSession(value, now) {
  return (
    isRecord(value) &&
    value.v === 1 &&
    typeof value.login === 'string' &&
    LOGIN_PATTERN.test(value.login) &&
    Number.isSafeInteger(value.id) &&
    typeof value.avatar === 'string' &&
    typeof value.permission === 'string' &&
    Object.hasOwn(PERMISSION_RANK, value.permission) &&
    typeof value.token === 'string' &&
    value.token.length > 0 &&
    Number.isSafeInteger(value.iat) &&
    Number.isSafeInteger(value.exp) &&
    value.iat <= now + CLOCK_SKEW_SECONDS &&
    value.exp > now
  )
}

async function sessionCookie(config, session, now) {
  return cookie(SESSION_COOKIE, await seal(config.secret, 'session', session), session.exp - now)
}

function newSession(config, user, permission, token, now) {
  return {
    v: 1,
    login: user.login,
    id: user.id,
    avatar: user.avatar,
    permission,
    token,
    iat: now,
    exp: now + config.sessionTTL
  }
}

/**
 * The request's session: `{ session, cookie }`, where `cookie` is a Set-Cookie value to
 * send (a refreshed session, or a cleared one) or null. A session past the re-verify age
 * is checked against GitHub first.
 */
async function resolveSession(request, config) {
  const raw = cookieValue(request, SESSION_COOKIE)
  if (!raw) return { session: null, cookie: null }
  const now = nowSeconds()
  const session = await unseal(config.secret, 'session', raw)
  if (!isSession(session, now)) return { session: null, cookie: clearCookie(SESSION_COOKIE) }
  if (now - session.iat < config.reverify) return { session, cookie: null }

  const access = await checkAccess(session.token, config)
  // GitHub unreachable or rate limited: keep the session until it expires.
  if (access.status === 'unavailable') return { session, cookie: null }
  if (access.status !== 'granted') return { session: null, cookie: clearCookie(SESSION_COOKIE) }
  const refreshed = { ...session, permission: access.permission, iat: now }
  return { session: refreshed, cookie: await sessionCookie(config, refreshed, now) }
}

function hasRequiredPermission(config, permission) {
  return (PERMISSION_RANK[permission] || 0) >= PERMISSION_RANK[config.minPermission]
}

// ── GitHub ─────────────────────────────────────────────────────────────────────────────

function githubAPI(path, token) {
  return fetch(`${GITHUB_API}${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': USER_AGENT,
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })
}

function permissionFrom(repository) {
  const permissions = isRecord(repository) ? repository.permissions : null
  if (!isRecord(permissions)) return null
  if (permissions.admin === true) return 'admin'
  if (permissions.push === true || permissions.maintain === true) return 'push'
  if (permissions.pull === true || permissions.triage === true) return 'pull'
  return null
}

function rateLimited(response) {
  return (
    response.status === 429 ||
    (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0')
  )
}

/**
 * `granted` (with the permission), `denied` (no access, or below the minimum),
 * `invalid` (the token is dead) or `unavailable` (GitHub could not answer).
 */
async function checkAccess(token, config) {
  let response
  try {
    response = await githubAPI(`/repos/${config.repo}`, token)
  } catch {
    return { status: 'unavailable' }
  }
  if (response.status === 401) return { status: 'invalid' }
  if (rateLimited(response) || response.status >= 500) return { status: 'unavailable' }
  if (!response.ok) return { status: 'denied' }
  const permission = permissionFrom(await response.json().catch(() => null))
  if (!permission || !hasRequiredPermission(config, permission)) return { status: 'denied' }
  return { status: 'granted', permission }
}

async function fetchUser(token) {
  try {
    const response = await githubAPI('/user', token)
    if (!response.ok) return null
    const user = await response.json()
    if (!isRecord(user) || typeof user.login !== 'string' || !LOGIN_PATTERN.test(user.login)) {
      return null
    }
    if (!Number.isSafeInteger(user.id)) return null
    return {
      login: user.login,
      id: user.id,
      avatar: typeof user.avatar_url === 'string' ? user.avatar_url : ''
    }
  } catch {
    return null
  }
}

async function exchange(config, code, redirectURI) {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT
    },
    body: JSON.stringify({
      client_id: config.clientID,
      client_secret: config.clientSecret,
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

// ── Return targets (no open redirects) ─────────────────────────────────────────────────

function appPath(url) {
  return url.pathname.startsWith(APP_PREFIX) && !url.pathname.startsWith(AUTH_PREFIX)
}

/**
 * Where to go after sign-in: `{ origin, path }`, or null when `raw` is not allowed.
 * A same-origin path under /open-pencil/, or (production only) an absolute URL on an
 * allowlisted preview origin. Absent → the editor root on this origin.
 */
function returnTarget(raw, origin, config) {
  if (raw === null || raw === '') return { origin, path: APP_PREFIX }
  // eslint-disable-next-line no-control-regex
  if (raw.length > MAX_RETURN_TO_LENGTH || /[\u0000-\u001f\u007f\\]/.test(raw)) return null
  let url
  if (raw.startsWith(APP_PREFIX)) {
    try {
      url = new URL(raw, origin)
    } catch {
      return null
    }
    if (url.origin !== origin) return null
  } else {
    if (!raw.startsWith('https://')) return null
    try {
      url = new URL(raw)
    } catch {
      return null
    }
    if (url.username || url.password || url.port) return null
    const allowed =
      url.origin === origin || (!config.isPreview && config.isPreviewOrigin(url.origin))
    if (!allowed) return null
  }
  if (!appPath(url)) return null
  return { origin: url.origin, path: `${url.pathname}${url.search}` }
}

function startURL(config, origin, target) {
  if (config.isPreview) {
    const back = encodeURIComponent(`${origin}${target}`)
    return `${config.productionOrigin}${AUTH_PREFIX}start?return_to=${back}`
  }
  return `${origin}${AUTH_PREFIX}start?return_to=${encodeURIComponent(target)}`
}

// ── Pages ──────────────────────────────────────────────────────────────────────────────

function page(status, { title, body, script }, cookies = []) {
  const nonce = randomToken(16)
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHTML(title)}</title>
<style nonce="${nonce}">
:root{color-scheme:light dark;--fg:#1e1e1e;--muted:#5c5c5c;--bg:#ffffff;--link:#0b57d0}
@media (prefers-color-scheme:dark){:root{--fg:#ededed;--muted:#a3a3a3;--bg:#1e1e1e;--link:#8ab4ff}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:34rem;margin:14vh auto;padding:0 16px}
h1{font-size:1.25rem;margin:0 0 .75rem}
p{margin:0 0 .9rem}
.muted{color:var(--muted);font-size:.875rem}
a{color:var(--link)}
button{font:inherit;padding:.4rem .9rem;border-radius:6px;border:1px solid var(--muted);background:transparent;color:var(--fg);cursor:pointer}
</style>
</head>
<body>
<main>
<h1>${escapeHTML(title)}</h1>
${body}
</main>
${script ? `<script nonce="${nonce}">${script}</script>` : ''}
</body>
</html>`
  return respond(
    status,
    html,
    {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': `default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff'
    },
    cookies
  )
}

const SIGN_OUT_SCRIPT = `(function () {
  var button = document.getElementById('sign-out');
  if (!button) return;
  button.addEventListener('click', function () {
    button.disabled = true;
    fetch(${scriptJSON(`${AUTH_PREFIX}logout`)}, {
      method: 'POST',
      credentials: 'same-origin',
      redirect: 'manual',
      headers: { ${scriptJSON(REQUEST_HEADER)}: '1' }
    }).catch(function () {}).then(function () {
      window.location.assign(${scriptJSON(`${AUTH_PREFIX}signed-out`)});
    });
  });
})();`

function deniedPage(config, login, cookies = []) {
  const level = config.minPermission === 'push' ? 'write' : 'read'
  return page(
    403,
    {
      title: 'No access to OpenPencil',
      body: `<p>Your GitHub account <strong>@${escapeHTML(login)}</strong> doesn’t have access to <strong>${escapeHTML(config.repo)}</strong>. Ask an admin to give it ${level} access, then sign in again.</p>
<p><button type="button" id="sign-out">Sign out</button></p>
<p class="muted">Signed in to GitHub with a different account than you meant? Sign out here, switch accounts on <a href="https://github.com/logout" rel="noreferrer">github.com</a>, then sign in again.</p>`,
      script: SIGN_OUT_SCRIPT
    },
    cookies
  )
}

function messagePage(status, title, message, retryPath, cookies = []) {
  return page(
    status,
    {
      title,
      body: `<p>${escapeHTML(message)}</p>
<p><a href="${escapeHTML(`${AUTH_PREFIX}start?return_to=${encodeURIComponent(retryPath)}`)}">Sign in with GitHub</a></p>`
    },
    cookies
  )
}

/** The popup hand-off: delivers `message` to the opener on this origin only, then closes. */
function handoff(status, origin, message, cookies) {
  const nonce = randomToken(16)
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
  return respond(
    status,
    html,
    {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff'
    },
    cookies
  )
}

// ── Auth routes ────────────────────────────────────────────────────────────────────────

const NOT_CONFIGURED =
  'GitHub sign-in is not configured: set GITHUB_OAUTH_CLIENT_ID and GITHUB_OAUTH_CLIENT_SECRET.'

function authorizeRedirect(config, url, state, stateCookie) {
  const authorize = new URL('https://github.com/login/oauth/authorize')
  authorize.searchParams.set('client_id', config.clientID)
  authorize.searchParams.set('redirect_uri', `${url.origin}${AUTH_PREFIX}callback`)
  authorize.searchParams.set('scope', OAUTH_SCOPE)
  authorize.searchParams.set('state', state)
  authorize.searchParams.set('allow_signup', 'false')
  return redirect(authorize.toString(), [stateCookie])
}

async function start(config, url) {
  const popupState = url.searchParams.get('state')
  if (popupState !== null || config.mode !== 'github') {
    // Popup mode: the app supplies its own state and receives the token by postMessage.
    if (!config.clientID || !config.clientSecret) return plain(503, NOT_CONFIGURED)
    if (!STATE_PATTERN.test(popupState || '')) return plain(400, 'Missing or invalid state.')
    return authorizeRedirect(
      config,
      url,
      popupState,
      cookie(POPUP_STATE_COOKIE, popupState, STATE_MAX_AGE_SECONDS)
    )
  }

  // Site mode: full-page sign-in that ends with a session and a redirect.
  const target = returnTarget(url.searchParams.get('return_to'), url.origin, config)
  if (!target) return plain(400, 'Invalid return_to: it must be a path under /open-pencil/.')
  if (config.isPreview) return redirect(startURL(config, url.origin, target.path))
  if (!config.clientSecret) return plain(503, NOT_CONFIGURED)
  const state = randomToken(32)
  const sealed = await seal(config.secret, 'login', {
    v: 1,
    state,
    origin: target.origin,
    path: target.path,
    exp: nowSeconds() + STATE_MAX_AGE_SECONDS
  })
  return authorizeRedirect(config, url, state, cookie(LOGIN_STATE_COOKIE, sealed, STATE_MAX_AGE_SECONDS))
}

/** Which flow this callback belongs to, after checking its state against the cookies. */
async function callbackFlow(config, request, state, origin) {
  if (!STATE_PATTERN.test(state)) return null
  const popupState = cookieValue(request, POPUP_STATE_COOKIE)
  if (popupState && (await sameSecret(state, popupState))) return { mode: 'popup' }
  if (config.mode !== 'github') return null
  const login = await unseal(config.secret, 'login', cookieValue(request, LOGIN_STATE_COOKIE))
  if (
    !isRecord(login) ||
    login.v !== 1 ||
    typeof login.state !== 'string' ||
    !Number.isSafeInteger(login.exp) ||
    login.exp <= nowSeconds() ||
    !(await sameSecret(state, login.state))
  ) {
    return null
  }
  // Re-validate the stored target with today's configuration.
  if (typeof login.origin !== 'string' || typeof login.path !== 'string') return null
  const target = returnTarget(
    login.origin === origin ? login.path : `${login.origin}${login.path}`,
    origin,
    config
  )
  return target ? { mode: 'site', target } : null
}

async function callback(config, request, url) {
  if (!config.clientID || !config.clientSecret) return plain(503, NOT_CONFIGURED)
  const clear = [clearCookie(POPUP_STATE_COOKIE), clearCookie(LOGIN_STATE_COOKIE)]
  const state = url.searchParams.get('state') || ''
  const flow = await callbackFlow(config, request, state, url.origin)
  if (!flow) {
    return plain(400, 'Sign-in state did not match. Close this window and try again.', clear)
  }
  const retryPath = flow.mode === 'site' && flow.target.origin === url.origin ? flow.target.path : APP_PREFIX

  if (url.searchParams.get('error')) {
    if (flow.mode === 'popup') {
      return handoff(200, url.origin, { type: MESSAGE_TYPE, state, error: 'access_denied' }, clear)
    }
    return messagePage(200, 'Sign-in cancelled', 'GitHub sign-in was cancelled.', retryPath, clear)
  }
  const code = url.searchParams.get('code')
  if (!code) return plain(400, 'Missing authorization code.', clear)

  const token = await exchange(config, code, `${url.origin}${AUTH_PREFIX}callback`).catch(() => null)
  if (!token) {
    if (flow.mode === 'popup') {
      return handoff(502, url.origin, { type: MESSAGE_TYPE, state, error: 'exchange_failed' }, clear)
    }
    return messagePage(502, 'Sign-in failed', 'GitHub did not complete the sign-in. Try again.', retryPath, clear)
  }

  if (flow.mode === 'popup') {
    // The app gets its token as before; with site access configured, the popup also
    // (re)establishes the site session when the account has access.
    const cookies = [...clear]
    if (config.mode === 'github') {
      const [user, access] = await Promise.all([fetchUser(token), checkAccess(token, config)])
      if (user && access.status === 'granted') {
        const now = nowSeconds()
        cookies.push(await sessionCookie(config, newSession(config, user, access.permission, token, now), now))
      }
    }
    return handoff(200, url.origin, { type: MESSAGE_TYPE, state, token }, cookies)
  }

  const [user, access] = await Promise.all([fetchUser(token), checkAccess(token, config)])
  if (!user || access.status === 'unavailable' || access.status === 'invalid') {
    return messagePage(502, 'Sign-in failed', 'GitHub could not confirm your account right now. Try again.', retryPath, clear)
  }
  if (access.status !== 'granted') {
    return deniedPage(config, user.login, [...clear, clearCookie(SESSION_COOKIE)])
  }
  const now = nowSeconds()
  const session = newSession(config, user, access.permission, token, now)
  if (flow.target.origin === url.origin) {
    return redirect(`${url.origin}${flow.target.path}`, [...clear, await sessionCookie(config, session, now)])
  }
  // A preview: hand over a short-lived, origin-bound ticket; the preview mints its own cookie.
  const ticket = await seal(config.secret, 'ticket', {
    v: 1,
    origin: flow.target.origin,
    path: flow.target.path,
    session,
    exp: now + TICKET_TTL_SECONDS
  })
  return redirect(`${flow.target.origin}${AUTH_PREFIX}accept?ticket=${ticket}`, clear)
}

async function accept(config, url) {
  const now = nowSeconds()
  const ticket = await unseal(config.secret, 'ticket', url.searchParams.get('ticket'))
  const valid =
    isRecord(ticket) &&
    ticket.v === 1 &&
    Number.isSafeInteger(ticket.exp) &&
    ticket.exp > now &&
    ticket.exp <= now + TICKET_TTL_SECONDS + CLOCK_SKEW_SECONDS &&
    ticket.origin === url.origin &&
    typeof ticket.path === 'string' &&
    returnTarget(ticket.path, url.origin, config) !== null &&
    isSession(ticket.session, now)
  if (!valid) {
    return messagePage(400, 'Sign-in link expired', 'This sign-in link is invalid or has expired.', APP_PREFIX)
  }
  const target = returnTarget(ticket.path, url.origin, config)
  // The redirect replaces the ticket URL, so it does not stay in history.
  return redirect(`${url.origin}${target.path}`, [await sessionCookie(config, ticket.session, now)])
}

async function sessionEndpoint(config, request) {
  const { session, cookie: setCookie } = await resolveSession(request, config)
  if (!session) return json(401, { error: 'unauthenticated' }, [setCookie])
  if (!hasRequiredPermission(config, session.permission)) {
    return json(403, { error: 'forbidden' }, [setCookie])
  }
  const wantsToken = request.headers.get(REQUEST_HEADER) !== null
  if (wantsToken && !sameOriginRequest(request)) {
    return json(403, { error: 'cross-site' }, [setCookie])
  }
  const body = {
    login: session.login,
    id: session.id,
    avatar: session.avatar,
    permission: session.permission
  }
  if (wantsToken) body.token = session.token
  return json(200, body, [setCookie])
}

function logout(request, url) {
  if (!sameOriginRequest(request)) return json(403, { error: 'cross-site' })
  return redirect(`${url.origin}${AUTH_PREFIX}signed-out`, [clearCookie(SESSION_COOKIE)], 303)
}

function signedOut() {
  return messagePage(200, 'Signed out of OpenPencil', 'You are signed out of OpenPencil.', APP_PREFIX)
}

const ROUTES = {
  start: { method: 'GET', handle: (config, request, url) => start(config, url) },
  callback: { method: 'GET', handle: callback },
  accept: { method: 'GET', github: true, handle: (config, request, url) => accept(config, url) },
  session: { method: 'GET', github: true, handle: (config, request) => sessionEndpoint(config, request) },
  logout: { method: 'POST', github: true, handle: (config, request, url) => logout(request, url) },
  'signed-out': { method: 'GET', github: true, handle: () => signedOut() }
}

function authRoute(config, request, url) {
  const name = url.pathname.slice(AUTH_PREFIX.length)
  const route = Object.hasOwn(ROUTES, name) ? ROUTES[name] : null
  if (!route || (route.github && config.mode !== 'github')) return plain(404, 'Not found.')
  const allowed = route.method === 'GET' ? ['GET', 'HEAD'] : [route.method]
  if (!allowed.includes(request.method)) {
    return respond(405, 'Method not allowed.', { Allow: allowed.join(', ') })
  }
  return route.handle(config, request, url)
}

// ── The app ────────────────────────────────────────────────────────────────────────────

/**
 * The built file, or the app shell for a client-side route (`/open-pencil/share/<id>`).
 * `_redirects` does not apply to Function-served requests, so the SPA fallback is here:
 * only for page navigations to paths without a file extension, never for missing assets.
 */
async function appResponse(context) {
  const response = await context.next()
  if (response.status !== 404) return response
  const { pathname } = new URL(context.request.url)
  const navigation = (context.request.headers.get('Accept') || '').includes('text/html')
  if (!navigation || /\.[a-z0-9]+$/i.test(pathname)) return response
  const shell = new URL('/open-pencil/index.html', context.request.url)
  return context.env.ASSETS.fetch(new Request(shell, context.request))
}

function withAppHeaders(response, pathname) {
  // Authenticated content stays out of shared caches. The browser may keep hashed build
  // assets (content-addressed, so never stale) but revalidates everything else.
  const headers = new Headers(response.headers)
  // A response that must never be stored keeps `no-store`.
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

async function serveApp(context, url, cookies = []) {
  const response = withAppHeaders(await appResponse(context), url.pathname)
  for (const value of cookies) if (value) response.headers.append('Set-Cookie', value)
  return response
}

async function githubGate(context, config, url) {
  const { request } = context
  if (url.pathname.startsWith(AUTH_PREFIX)) return authRoute(config, request, url)

  const { session, cookie: setCookie } = await resolveSession(request, config)
  if (!session) {
    if (isNavigation(request)) {
      return redirect(startURL(config, url.origin, `${url.pathname}${url.search}`), [setCookie])
    }
    return json(401, { error: 'unauthenticated' }, [setCookie])
  }
  if (!hasRequiredPermission(config, session.permission)) {
    return deniedPage(config, session.login, [setCookie])
  }
  return serveApp(context, url, [setCookie])
}

// ── Password fallback (rollout only) ───────────────────────────────────────────────────

function passwordFrom(request) {
  const header = request.headers.get('Authorization') || ''
  const match = /^Basic\s+(.+)$/i.exec(header)
  if (!match) return null
  try {
    const decoded = decoder.decode(Uint8Array.from(atob(match[1]), (c) => c.charCodeAt(0)))
    const colon = decoded.indexOf(':')
    return colon === -1 ? null : decoded.slice(colon + 1)
  } catch {
    return null
  }
}

async function passwordGate(context, config, url) {
  const given = passwordFrom(context.request)
  if (given === null || !(await sameSecret(given, config.password))) {
    return respond(401, 'Password required.', {
      'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`
    })
  }
  // The app's popup sign-in keeps working behind the password.
  if (url.pathname.startsWith(AUTH_PREFIX)) return authRoute(config, context.request, url)
  return serveApp(context, url)
}

export async function onRequest(context) {
  const url = new URL(context.request.url)
  // The session cookie is scoped to /open-pencil/, so the bare path never carries it.
  if (url.pathname === '/open-pencil') return redirect(`${url.origin}${APP_PREFIX}${url.search}`, [], 308)

  const config = readConfig(context.env || {}, url.origin)
  if (config.mode === 'unconfigured') {
    return plain(
      503,
      'OpenPencil is not configured: set GITHUB_OAUTH_CLIENT_ID, GITHUB_OAUTH_CLIENT_SECRET and OPEN_PENCIL_SESSION_SECRET (or OPEN_PENCIL_PASSWORD during rollout).'
    )
  }
  if (config.mode === 'password') return passwordGate(context, config, url)
  return githubGate(context, config, url)
}
