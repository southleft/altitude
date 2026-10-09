#!/usr/bin/env node
/**
 * Self-test for the OpenPencil site gate: functions/open-pencil/_middleware.js — GitHub
 * sign-in restricted to people who can access a private repository, sealed `op_session`
 * cookies, re-verification, preview tickets, the session/logout endpoints for the app, and
 * the password / 503 fallbacks.
 *
 * Runs the middleware directly under Node with a fake `fetch` for GitHub and a controllable
 * clock. Cloudflare's `crypto.subtle.timingSafeEqual` is not in Node, so a byte-wise
 * stand-in is installed first. Nothing here talks to GitHub.
 *
 * Run: node scripts/__tests__/open-pencil-site-access.test.mjs
 */
import { webcrypto } from 'node:crypto';

if (!webcrypto.subtle.timingSafeEqual) {
  webcrypto.subtle.timingSafeEqual = (a, b) => {
    const left = new Uint8Array(a);
    const right = new Uint8Array(b);
    return left.length === right.length && left.every((byte, index) => byte === right[index]);
  };
}

const { onRequest } = await import('../../functions/open-pencil/_middleware.js');

let PASS = 0;
let FAIL = 0;
function assert(desc, cond) {
  if (cond) { console.log(`  ok - ${desc}`); PASS++; }
  else { console.log(`  NOT OK - ${desc}`); FAIL++; }
}

const PROD = 'https://altitude.pages.dev';
const PREVIEW = 'https://feat-x.altitude.pages.dev';
const OTHER_PREVIEW = 'https://feat-y.altitude.pages.dev';
const SECRET = 'k'.repeat(48);
const ENV = {
  GITHUB_OAUTH_CLIENT_ID: 'client-id',
  GITHUB_OAUTH_CLIENT_SECRET: 'client-secret',
  OPEN_PENCIL_SESSION_SECRET: SECRET,
  OPEN_PENCIL_PASSWORD: 'rollout-password'
};
// Previews only need the client ID and the shared session secret.
const PREVIEW_ENV = { GITHUB_OAUTH_CLIENT_ID: 'client-id', OPEN_PENCIL_SESSION_SECRET: SECRET };
const HTML = 'text/html,application/xhtml+xml';
const LOGIN_COOKIE = '__Secure-open-pencil-github-login';

// ── Clock ──
const realNow = Date.now;
let offsetSeconds = 0;
Date.now = () => realNow() + offsetSeconds * 1000;
const advance = (seconds) => { offsetSeconds += seconds; };

// ── Fake GitHub ──
const USERS = {
  gho_writer: { login: 'writer', id: 1, avatar_url: 'https://avatars/1' },
  gho_reader: { login: 'reader', id: 2, avatar_url: 'https://avatars/2' },
  gho_outsider: { login: 'outsider', id: 3, avatar_url: 'https://avatars/3' }
};
const REPO_ACCESS = new Map([
  ['gho_writer', { status: 200, permissions: { admin: false, push: true, pull: true } }],
  ['gho_reader', { status: 200, permissions: { admin: false, push: false, pull: true } }],
  ['gho_outsider', { status: 404 }]
]);
const CODES = { writer: 'gho_writer', reader: 'gho_reader', outsider: 'gho_outsider' };
const calls = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init = {}) => {
  const url = String(input);
  if (url === 'https://github.com/login/oauth/access_token') {
    const token = CODES[JSON.parse(init.body).code];
    return Response.json(token ? { access_token: token } : { error: 'bad_verification_code' });
  }
  const token = (new Headers(init.headers).get('Authorization') || '').replace(/^Bearer /, '');
  calls.push({ url, token });
  if (url === 'https://api.github.com/user') {
    return USERS[token] ? Response.json(USERS[token]) : new Response('{}', { status: 401 });
  }
  if (url === 'https://api.github.com/repos/southleft/altitude-designs') {
    const access = REPO_ACCESS.get(token) || { status: 401 };
    if (access.status !== 200) return new Response('{}', { status: access.status, headers: access.headers });
    return Response.json({ full_name: 'southleft/altitude-designs', private: true, permissions: access.permissions });
  }
  if (url === 'https://api.github.com/repos/southleft/elsewhere') return new Response('{}', { status: 404 });
  throw new Error(`unexpected fetch ${url}`);
};

// ── Harness ──
function context(url, { env = ENV, method = 'GET', accept = '*/*', cookie, headers = {}, asset } = {}) {
  const h = new Headers({ Accept: accept, ...headers });
  if (cookie) h.set('Cookie', cookie);
  const nexts = [];
  return {
    env: { ...env, ASSETS: { fetch: async () => new Response('<!doctype html>shell', { headers: { 'Content-Type': 'text/html' } }) } },
    request: new Request(url, { method, headers: h }),
    next: async () => {
      nexts.push(url);
      return asset ? asset() : new Response('asset body', { headers: { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'public, max-age=60' } });
    },
    nexts
  };
}
const run = (url, options) => onRequest(context(url, options));
const setCookies = (response) => response.headers.get('Set-Cookie') || '';
function cookieFrom(response, name) {
  const match = new RegExp(`(?:^|, )${name}=([^;]*)`).exec(setCookies(response));
  return match ? match[1] : null;
}
const clears = (response, name) => new RegExp(`(?:^|, )${name}=; Max-Age=0`).test(setCookies(response));

/** Full-page sign-in on production; returns the callback response. */
async function signIn(code, returnTo = '/open-pencil/', env = ENV) {
  const begin = await run(`${PROD}/open-pencil/auth/github/start?return_to=${encodeURIComponent(returnTo)}`, { env, accept: HTML });
  const state = new URL(begin.headers.get('Location')).searchParams.get('state');
  const login = cookieFrom(begin, LOGIN_COOKIE);
  return run(`${PROD}/open-pencil/auth/github/callback?code=${code}&state=${state}`, {
    env, accept: HTML, cookie: `${LOGIN_COOKIE}=${login}`
  });
}
async function sessionFor(code, env = ENV) {
  return cookieFrom(await signIn(code, '/open-pencil/', env), 'op_session');
}

try {
  console.log('configuration');
  {
    const response = await run(`${PROD}/open-pencil/`, { env: {}, accept: HTML });
    assert('nothing configured → 503 (fails closed)', response.status === 503 && response.headers.get('Cache-Control') === 'no-store');
  }
  {
    const env = { GITHUB_OAUTH_CLIENT_ID: 'id', GITHUB_OAUTH_CLIENT_SECRET: 'secret' };
    const response = await run(`${PROD}/open-pencil/`, { env, accept: HTML });
    assert('GitHub configured but no session secret and no password → 503', response.status === 503);
  }
  {
    const env = { ...ENV, OPEN_PENCIL_SESSION_SECRET: 'too-short' };
    const denied = await run(`${PROD}/open-pencil/`, { env, accept: HTML });
    assert('session secret under 32 bytes → password fallback', denied.status === 401 && /^Basic /.test(denied.headers.get('WWW-Authenticate')));
  }
  {
    const env = { OPEN_PENCIL_PASSWORD: 'rollout-password', GITHUB_OAUTH_CLIENT_ID: 'id', GITHUB_OAUTH_CLIENT_SECRET: 'secret' };
    const none = await run(`${PROD}/open-pencil/`, { env, accept: HTML });
    const wrong = await run(`${PROD}/open-pencil/`, { env, accept: HTML, headers: { Authorization: `Basic ${btoa('x:nope')}` } });
    const right = await run(`${PROD}/open-pencil/assets/app.js`, { env, headers: { Authorization: `Basic ${btoa('x:rollout-password')}` } });
    const session = await run(`${PROD}/open-pencil/auth/github/session`, { env, headers: { Authorization: `Basic ${btoa('x:rollout-password')}` } });
    assert('password fallback: no credentials → 401 Basic', none.status === 401 && /Basic realm=/.test(none.headers.get('WWW-Authenticate')));
    assert('password fallback: wrong password → 401', wrong.status === 401);
    assert('password fallback: right password → the app', right.status === 200 && (await right.text()) === 'asset body');
    assert('password fallback: no session endpoint', session.status === 404);
  }
  {
    const response = await run(`${PROD}/open-pencil?x=1`, { accept: HTML });
    assert('/open-pencil → /open-pencil/ (cookie path)', response.status === 308 && response.headers.get('Location') === `${PROD}/open-pencil/?x=1`);
  }

  console.log('no session');
  {
    const ctx = context(`${PROD}/open-pencil/share/abc?x=1`, { accept: HTML });
    const response = await onRequest(ctx);
    const location = new URL(response.headers.get('Location'));
    assert('HTML navigation → 302 to start', response.status === 302 && location.origin === PROD && location.pathname === '/open-pencil/auth/github/start');
    assert('…with return_to = path and query', location.searchParams.get('return_to') === '/open-pencil/share/abc?x=1');
    assert('…and serves nothing', ctx.nexts.length === 0 && response.headers.get('Cache-Control') === 'no-store');
  }
  for (const path of ['/open-pencil/assets/index.js', '/open-pencil/canvaskit.wasm', '/open-pencil/']) {
    const ctx = context(`${PROD}${path}`);
    const response = await onRequest(ctx);
    assert(`non-HTML ${path} → 401 JSON, no redirect`, response.status === 401 && !response.headers.get('Location') && (await response.json()).error === 'unauthenticated' && ctx.nexts.length === 0);
  }
  {
    const response = await run(`${PROD}/open-pencil/`, { accept: HTML, method: 'POST' });
    assert('a POST is never redirected', response.status === 401);
  }
  {
    const response = await run(`${PROD}/open-pencil/auth/github/start`, { accept: HTML });
    const location = new URL(response.headers.get('Location'));
    assert('sign-in routes need no session', response.status === 302 && location.origin === 'https://github.com');
    assert('site sign-in generates its own state', /^[A-Za-z0-9_-]{32,}$/.test(location.searchParams.get('state')));
    assert('site sign-in state is sealed in a cookie', /^v1\./.test(cookieFrom(response, LOGIN_COOKIE)) && /HttpOnly/.test(setCookies(response)));
    assert('no referrer to GitHub', response.headers.get('Referrer-Policy') === 'no-referrer');
  }
  {
    const response = await run(`${PROD}/open-pencil/auth/github/nope`);
    assert('unknown auth route → 404', response.status === 404);
  }

  console.log('sign-in');
  {
    const response = await signIn('writer', '/open-pencil/share/abc?x=1');
    const session = cookieFrom(response, 'op_session');
    const raw = setCookies(response);
    assert('callback → 302 back to return_to', response.status === 302 && response.headers.get('Location') === `${PROD}/open-pencil/share/abc?x=1`);
    assert('sets op_session HttpOnly, Secure, SameSite=Lax, Path=/open-pencil/, 12 h', /op_session=v1\.[^;]+; Max-Age=43200; Path=\/open-pencil\/; HttpOnly; Secure; SameSite=Lax/.test(raw));
    assert('the cookie is sealed (no token or login in clear)', !raw.includes('gho_writer') && !session.includes('writer'));
    assert('clears the login state cookie', clears(response, LOGIN_COOKIE));
    assert('the token is not in the redirect URL', !response.headers.get('Location').includes('gho_'));
  }
  {
    const begin = await run(`${PROD}/open-pencil/auth/github/start`, { accept: HTML });
    const login = cookieFrom(begin, LOGIN_COOKIE);
    const response = await run(`${PROD}/open-pencil/auth/github/callback?code=writer&state=${'z'.repeat(43)}`, { cookie: `${LOGIN_COOKIE}=${login}` });
    assert('callback with a different state → 400', response.status === 400 && !cookieFrom(response, 'op_session'));
  }
  {
    const begin = await run(`${PROD}/open-pencil/auth/github/start`, { accept: HTML });
    const state = new URL(begin.headers.get('Location')).searchParams.get('state');
    const login = cookieFrom(begin, LOGIN_COOKIE);
    advance(601);
    const response = await run(`${PROD}/open-pencil/auth/github/callback?code=writer&state=${state}`, { cookie: `${LOGIN_COOKIE}=${login}` });
    advance(-601);
    assert('expired login state → 400', response.status === 400);
  }
  {
    const response = await signIn('outsider');
    const html = await response.text();
    assert('no repository access → 403 page', response.status === 403 && response.headers.get('Content-Type').startsWith('text/html'));
    assert('…naming the account and the repository', html.includes('@outsider') && html.includes('southleft/altitude-designs'));
    assert('…with a sign-out control', html.includes('id="sign-out"') && html.includes('/open-pencil/auth/github/logout'));
    assert('…and no session', !/op_session=v1/.test(setCookies(response)) && clears(response, 'op_session'));
    assert('…under a nonce-only CSP', /script-src 'nonce-/.test(response.headers.get('Content-Security-Policy')));
  }
  {
    const env = { ...ENV, OPEN_PENCIL_ACCESS_MIN_PERMISSION: 'push' };
    const reader = await signIn('reader', '/open-pencil/', env);
    const writer = await signIn('writer', '/open-pencil/', env);
    assert('min permission push: read-only account is denied', reader.status === 403 && (await reader.text()).includes('write access'));
    assert('min permission push: writer gets in', writer.status === 302 && cookieFrom(writer, 'op_session'));
  }
  {
    const env = { ...ENV, OPEN_PENCIL_ACCESS_REPO: 'southleft/elsewhere' };
    const response = await signIn('writer', '/open-pencil/', env);
    assert('OPEN_PENCIL_ACCESS_REPO selects the repository checked', response.status === 403 && calls.some((c) => c.url === 'https://api.github.com/repos/southleft/elsewhere') && (await response.text()).includes('southleft/elsewhere'));
  }

  console.log('with a session');
  const writer = await sessionFor('writer');
  {
    const ctx = context(`${PROD}/open-pencil/assets/index-abc.js`, { cookie: `op_session=${writer}` });
    const response = await onRequest(ctx);
    assert('valid session → the asset', response.status === 200 && (await response.text()) === 'asset body' && ctx.nexts.length === 1);
    assert('hashed assets cache privately', response.headers.get('Cache-Control') === 'private, max-age=31536000, immutable');
    assert('no cookie refresh before the re-verify age', !setCookies(response));
  }
  {
    const response = await run(`${PROD}/open-pencil/canvaskit.wasm`, { cookie: `op_session=${writer}` });
    assert('wasm gets application/wasm', response.headers.get('Content-Type') === 'application/wasm');
    assert('other files revalidate privately', response.headers.get('Cache-Control') === 'private, no-cache');
  }
  {
    const response = await run(`${PROD}/open-pencil/x.json`, {
      cookie: `op_session=${writer}`,
      asset: () => new Response('{}', { headers: { 'Cache-Control': 'no-store' } })
    });
    assert('no-store passes through', response.headers.get('Cache-Control') === 'no-store');
  }
  {
    const ctx = context(`${PROD}/open-pencil/share/abc`, { cookie: `op_session=${writer}`, accept: HTML, asset: () => new Response('missing', { status: 404 }) });
    const response = await onRequest(ctx);
    assert('SPA fallback serves the shell for client routes', response.status === 200 && (await response.text()).includes('shell'));
  }
  {
    const tampered = writer.slice(0, -2) + (writer.endsWith('A') ? 'BB' : 'AA');
    const response = await run(`${PROD}/open-pencil/`, { cookie: `op_session=${tampered}`, accept: HTML });
    assert('tampered cookie → sign-in again, cookie cleared', response.status === 302 && clears(response, 'op_session'));
    const garbage = await run(`${PROD}/open-pencil/a.js`, { cookie: 'op_session=not-a-session' });
    assert('garbage cookie → 401', garbage.status === 401);
  }
  {
    const otherSecret = await sessionFor('writer', { ...ENV, OPEN_PENCIL_SESSION_SECRET: 'q'.repeat(48) });
    const response = await run(`${PROD}/open-pencil/a.js`, { cookie: `op_session=${otherSecret}` });
    assert('a cookie sealed with another secret is rejected', response.status === 401);
  }
  {
    advance(12 * 60 * 60 + 1);
    const response = await run(`${PROD}/open-pencil/`, { cookie: `op_session=${writer}`, accept: HTML });
    advance(-(12 * 60 * 60 + 1));
    assert('expired session → sign-in again', response.status === 302 && new URL(response.headers.get('Location')).pathname === '/open-pencil/auth/github/start');
  }

  console.log('re-verification');
  {
    const session = await sessionFor('writer');
    calls.length = 0;
    advance(3601);
    const response = await run(`${PROD}/open-pencil/a.js`, { cookie: `op_session=${session}` });
    const refreshed = cookieFrom(response, 'op_session');
    assert('stale session is re-verified with the stored token', calls.length === 1 && calls[0].token === 'gho_writer' && calls[0].url.endsWith('/repos/southleft/altitude-designs'));
    assert('…passes and refreshes the cookie', response.status === 200 && refreshed && refreshed !== session);
    calls.length = 0;
    const again = await run(`${PROD}/open-pencil/a.js`, { cookie: `op_session=${refreshed}` });
    assert('…and the refreshed cookie is fresh again', again.status === 200 && calls.length === 0);
    advance(-3601);
  }
  {
    const session = await sessionFor('reader');
    REPO_ACCESS.set('gho_reader', { status: 404 });
    advance(3601);
    const page = await run(`${PROD}/open-pencil/`, { cookie: `op_session=${session}`, accept: HTML });
    const asset = await run(`${PROD}/open-pencil/a.js`, { cookie: `op_session=${session}` });
    assert('access revoked → sign-in again', page.status === 302 && clears(page, 'op_session'));
    assert('access revoked → assets 401', asset.status === 401);
    REPO_ACCESS.set('gho_reader', { status: 401 });
    const dead = await run(`${PROD}/open-pencil/`, { cookie: `op_session=${session}`, accept: HTML });
    assert('token revoked → sign-in again', dead.status === 302 && clears(dead, 'op_session'));
    REPO_ACCESS.set('gho_reader', { status: 503 });
    const outage = await run(`${PROD}/open-pencil/a.js`, { cookie: `op_session=${session}` });
    assert('GitHub outage keeps the unexpired session', outage.status === 200 && !setCookies(outage));
    REPO_ACCESS.set('gho_reader', { status: 403, headers: { 'x-ratelimit-remaining': '0' } });
    const limited = await run(`${PROD}/open-pencil/a.js`, { cookie: `op_session=${session}` });
    assert('rate limit keeps the unexpired session', limited.status === 200);
    REPO_ACCESS.set('gho_reader', { status: 200, permissions: { admin: false, push: false, pull: true } });
    advance(-3601);
  }
  {
    const reader = await sessionFor('reader');
    const env = { ...ENV, OPEN_PENCIL_ACCESS_MIN_PERMISSION: 'push' };
    const response = await run(`${PROD}/open-pencil/`, { env, cookie: `op_session=${reader}`, accept: HTML });
    const html = await response.text();
    assert('signed in below the minimum permission → access denied page', response.status === 403 && html.includes('@reader') && html.includes('southleft/altitude-designs'));
  }

  console.log('return_to');
  const evil = [
    '//evil.com',
    '//evil.com/open-pencil/',
    'https://evil.com/open-pencil/',
    'https://altitude.pages.dev.evil.com/open-pencil/',
    'https://evil.altitude.pages.dev.evil.com/open-pencil/',
    'http://feat-x.altitude.pages.dev/open-pencil/',
    'https://user@feat-x.altitude.pages.dev/open-pencil/',
    'https://feat-x.altitude.pages.dev:8443/open-pencil/',
    'https://feat-x.altitude.pages.dev/other/',
    '/other-path',
    '/open-pencil',
    '/open-pencil/../evil',
    '/open-pencil/%2e%2e/evil',
    '/open-pencil/%2E%2E/%2E%2E/evil',
    '%2F%2Fevil.com',
    '/%2F%2Fevil.com',
    '/\\evil.com',
    '/open-pencil/\\..\\evil',
    '\\\\evil.com',
    'javascript:alert(1)',
    'data:text/html,hi',
    '/open-pencil/\nLocation: https://evil.com',
    '/open-pencil/auth/github/logout',
    `/open-pencil/${'a'.repeat(3000)}`
  ];
  for (const target of evil) {
    const response = await run(`${PROD}/open-pencil/auth/github/start?return_to=${encodeURIComponent(target)}`, { accept: HTML });
    assert(`rejects return_to ${JSON.stringify(target.slice(0, 60))}`, response.status === 400 && !response.headers.get('Location'));
  }
  {
    const response = await run(`${PROD}/open-pencil/auth/github/start?return_to=${encodeURIComponent('https://evil.com')}`.replace('%3A', ':'), { accept: HTML });
    assert('rejects a partly-decoded absolute URL', response.status === 400);
  }
  {
    const response = await run(`${PROD}/open-pencil/auth/github/start?return_to=${encodeURIComponent(`${PREVIEW}/open-pencil/x?y=1`)}`, { accept: HTML });
    assert('production accepts an allowlisted preview URL', response.status === 302 && new URL(response.headers.get('Location')).origin === 'https://github.com');
    const env = { ...ENV, OPEN_PENCIL_PREVIEW_ORIGINS: 'https://*.other.pages.dev' };
    const narrowed = await run(`${PROD}/open-pencil/auth/github/start?return_to=${encodeURIComponent(`${PREVIEW}/open-pencil/`)}`, { env, accept: HTML });
    assert('OPEN_PENCIL_PREVIEW_ORIGINS narrows the allowlist', narrowed.status === 400);
  }

  console.log('preview');
  {
    const response = await run(`${PREVIEW}/open-pencil/share/1?a=b`, { env: PREVIEW_ENV, accept: HTML });
    const location = new URL(response.headers.get('Location'));
    assert('preview without session → production start', response.status === 302 && location.origin === PROD && location.pathname === '/open-pencil/auth/github/start');
    assert('…with the absolute preview URL as return_to', location.searchParams.get('return_to') === `${PREVIEW}/open-pencil/share/1?a=b`);
    const forwarded = await run(`${PREVIEW}/open-pencil/auth/github/start?return_to=${encodeURIComponent('/open-pencil/x')}`, { env: PREVIEW_ENV, accept: HTML });
    assert('preview start forwards to production', new URL(forwarded.headers.get('Location')).searchParams.get('return_to') === `${PREVIEW}/open-pencil/x`);
    const foreign = await run(`${PREVIEW}/open-pencil/auth/github/start?return_to=${encodeURIComponent(`${OTHER_PREVIEW}/open-pencil/`)}`, { env: PREVIEW_ENV, accept: HTML });
    assert('a preview never forwards to another preview', foreign.status === 400);
  }
  let ticketURL;
  {
    const response = await signIn('writer', `${PREVIEW}/open-pencil/share/1?a=b`);
    ticketURL = new URL(response.headers.get('Location'));
    assert('production callback → preview accept with a ticket', response.status === 302 && ticketURL.origin === PREVIEW && ticketURL.pathname === '/open-pencil/auth/github/accept');
    assert('…the ticket is sealed (no token in the URL)', /^v1\./.test(ticketURL.searchParams.get('ticket')) && !ticketURL.href.includes('gho_') && !ticketURL.href.includes('writer'));
    assert('…production sets no session for the preview', !cookieFrom(response, 'op_session'));
    assert('…no referrer', response.headers.get('Referrer-Policy') === 'no-referrer');
  }
  {
    const response = await run(ticketURL.href, { env: PREVIEW_ENV, accept: HTML });
    const session = cookieFrom(response, 'op_session');
    assert('preview accept → 302 to the path, ticket gone', response.status === 302 && response.headers.get('Location') === `${PREVIEW}/open-pencil/share/1?a=b`);
    assert('…sets the preview’s own session', /^v1\./.test(session || '') && /HttpOnly; Secure; SameSite=Lax/.test(setCookies(response)));
    const app = await run(`${PREVIEW}/open-pencil/a.js`, { env: PREVIEW_ENV, cookie: `op_session=${session}` });
    assert('…which opens the preview', app.status === 200);
  }
  {
    const wrong = await run(`${OTHER_PREVIEW}${ticketURL.pathname}${ticketURL.search}`, { env: PREVIEW_ENV, accept: HTML });
    assert('ticket on the wrong origin → 400', wrong.status === 400 && !cookieFrom(wrong, 'op_session'));
    const onProd = await run(`${PROD}${ticketURL.pathname}${ticketURL.search}`, { accept: HTML });
    assert('ticket on production → 400', onProd.status === 400);
    const ticket = ticketURL.searchParams.get('ticket');
    const tampered = `${ticket.slice(0, -3)}${ticket.endsWith('x') ? 'yyy' : 'xxx'}`;
    const bad = await run(`${PREVIEW}/open-pencil/auth/github/accept?ticket=${tampered}`, { env: PREVIEW_ENV, accept: HTML });
    assert('tampered ticket → 400', bad.status === 400);
    const asCookie = await run(`${PREVIEW}/open-pencil/a.js`, { env: PREVIEW_ENV, cookie: `op_session=${ticket}` });
    assert('a ticket is not a session cookie', asCookie.status === 401);
    const asTicket = await run(`${PREVIEW}/open-pencil/auth/github/accept?ticket=${writer}`, { env: PREVIEW_ENV, accept: HTML });
    assert('a session cookie is not a ticket', asTicket.status === 400);
    advance(61);
    const expired = await run(ticketURL.href, { env: PREVIEW_ENV, accept: HTML });
    advance(-61);
    assert('expired ticket (> 60 s) → 400', expired.status === 400 && !cookieFrom(expired, 'op_session'));
    const missing = await run(`${PREVIEW}/open-pencil/auth/github/accept`, { env: PREVIEW_ENV, accept: HTML });
    assert('missing ticket → 400', missing.status === 400);
  }
  {
    const response = await run(`${PREVIEW}/open-pencil/auth/github/callback?code=writer&state=${'a'.repeat(43)}`, { env: PREVIEW_ENV });
    assert('previews never exchange codes (no client secret there)', response.status === 503);
  }

  console.log('session endpoint');
  {
    const none = await run(`${PROD}/open-pencil/auth/github/session`);
    assert('no session → 401 JSON', none.status === 401 && (await none.json()).error === 'unauthenticated' && none.headers.get('Cache-Control') === 'no-store');
    const plain = await run(`${PROD}/open-pencil/auth/github/session`, { cookie: `op_session=${writer}` });
    const body = await plain.json();
    assert('without the header: identity only', plain.status === 200 && body.login === 'writer' && body.id === 1 && body.avatar === 'https://avatars/1' && body.permission === 'push' && !('token' in body));
    const guarded = await run(`${PROD}/open-pencil/auth/github/session`, { cookie: `op_session=${writer}`, headers: { 'X-OpenPencil-Request': '1', 'Sec-Fetch-Site': 'same-origin' } });
    const withToken = await guarded.json();
    assert('with X-OpenPencil-Request and same-origin: the token', guarded.status === 200 && withToken.token === 'gho_writer' && guarded.headers.get('Cache-Control') === 'no-store');
    const legacy = await run(`${PROD}/open-pencil/auth/github/session`, { cookie: `op_session=${writer}`, headers: { 'X-OpenPencil-Request': '1' } });
    assert('no Sec-Fetch-Site (older browsers): the header suffices', (await legacy.json()).token === 'gho_writer');
    for (const site of ['cross-site', 'same-site', 'none']) {
      const cross = await run(`${PROD}/open-pencil/auth/github/session`, { cookie: `op_session=${writer}`, headers: { 'X-OpenPencil-Request': '1', 'Sec-Fetch-Site': site } });
      const text = await cross.text();
      assert(`Sec-Fetch-Site ${site} → 403, no token`, cross.status === 403 && !text.includes('gho_'));
    }
    const wrongValue = await run(`${PROD}/open-pencil/auth/github/session`, { cookie: `op_session=${writer}`, headers: { 'X-OpenPencil-Request': 'yes' } });
    assert('a different header value → 403', wrongValue.status === 403);
  }

  console.log('logout');
  {
    const get = await run(`${PROD}/open-pencil/auth/github/logout`, { cookie: `op_session=${writer}` });
    assert('GET logout → 405', get.status === 405 && get.headers.get('Allow') === 'POST');
    const unguarded = await run(`${PROD}/open-pencil/auth/github/logout`, { method: 'POST', cookie: `op_session=${writer}` });
    assert('POST without the header → 403, session kept', unguarded.status === 403 && !setCookies(unguarded));
    const cross = await run(`${PROD}/open-pencil/auth/github/logout`, { method: 'POST', cookie: `op_session=${writer}`, headers: { 'X-OpenPencil-Request': '1', 'Sec-Fetch-Site': 'cross-site' } });
    assert('cross-site POST → 403', cross.status === 403);
    const ok = await run(`${PROD}/open-pencil/auth/github/logout`, { method: 'POST', cookie: `op_session=${writer}`, headers: { 'X-OpenPencil-Request': '1', 'Sec-Fetch-Site': 'same-origin' } });
    assert('guarded POST → 303 to the signed-out page', ok.status === 303 && ok.headers.get('Location') === `${PROD}/open-pencil/auth/github/signed-out`);
    assert('…and clears op_session', clears(ok, 'op_session'));
    const page = await run(`${PROD}/open-pencil/auth/github/signed-out`, { accept: HTML });
    const html = await page.text();
    assert('signed-out page needs no session and offers sign-in', page.status === 200 && html.includes('/open-pencil/auth/github/start?return_to='));
  }
} finally {
  globalThis.fetch = realFetch;
  Date.now = realNow;
}

console.log(`\n${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
