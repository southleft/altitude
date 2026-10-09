#!/usr/bin/env node
/**
 * Self-test for the OpenPencil app's popup GitHub sign-in ("Sign in with GitHub" in
 * Settings → Version control), served by functions/open-pencil/_middleware.js under
 * /open-pencil/auth/github/{start,callback}.
 *
 * Runs the middleware directly under Node with a fake `fetch` for GitHub. Cloudflare's
 * `crypto.subtle.timingSafeEqual` is not in Node, so a byte-wise stand-in is installed
 * first. Nothing here talks to GitHub. The site gate itself is covered by
 * open-pencil-site-access.test.mjs.
 *
 * Run: node scripts/__tests__/open-pencil-github-oauth.test.mjs
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

const ORIGIN = 'https://altitude.pages.dev';
const STATE = 'a'.repeat(64);
const PASSWORD = 'team-password';
// The rollout fallback: GitHub client configured, no session secret → password gate.
const ENV = {
  GITHUB_OAUTH_CLIENT_ID: 'client-id',
  GITHUB_OAUTH_CLIENT_SECRET: 'client-secret',
  OPEN_PENCIL_PASSWORD: PASSWORD
};
const SITE_ENV = { ...ENV, OPEN_PENCIL_SESSION_SECRET: 's'.repeat(48) };
const COOKIE = '__Secure-open-pencil-github-oauth';
const BASIC = `Basic ${btoa(`anyone:${PASSWORD}`)}`;

function context(path, { env = ENV, cookie, auth = BASIC } = {}) {
  const headers = new Headers();
  if (cookie) headers.set('Cookie', cookie);
  if (auth) headers.set('Authorization', auth);
  return {
    env,
    request: new Request(`${ORIGIN}${path}`, { headers }),
    next: async () => new Response('app'),
  };
}

const realFetch = globalThis.fetch;
const exchanges = [];
const apiCalls = [];
globalThis.fetch = async (input, init = {}) => {
  const url = String(input);
  if (url === 'https://github.com/login/oauth/access_token') {
    const body = JSON.parse(init.body);
    exchanges.push(body);
    if (body.code === 'bad') return Response.json({ error: 'bad_verification_code' });
    return Response.json({ access_token: 'gho_test_token', token_type: 'bearer', scope: 'repo' });
  }
  apiCalls.push(url);
  if (url === 'https://api.github.com/user') return Response.json({ login: 'octocat', id: 1, avatar_url: 'https://avatars/1' });
  if (url === 'https://api.github.com/repos/southleft/altitude-designs') {
    return Response.json({ permissions: { admin: false, push: true, pull: true } });
  }
  throw new Error(`unexpected fetch ${url}`);
};

const start = (path, options) => onRequest(context(`/open-pencil/auth/github/start${path}`, options));
const callback = (path, options) => onRequest(context(`/open-pencil/auth/github/callback${path}`, options));

try {
  console.log('start');
  {
    const response = await start(`?state=${STATE}`, { env: { OPEN_PENCIL_PASSWORD: PASSWORD } });
    assert('missing GitHub env → 503', response.status === 503);
    assert('503 is not cached', response.headers.get('Cache-Control') === 'no-store');
  }
  {
    const response = await start(`?state=${STATE}`, {
      env: { GITHUB_OAUTH_CLIENT_ID: 'client-id', OPEN_PENCIL_PASSWORD: PASSWORD }
    });
    assert('missing secret → 503', response.status === 503);
  }
  {
    const response = await start(`?state=${STATE}`, { auth: null });
    assert('behind the password while the fallback is active', response.status === 401);
  }
  {
    const response = await start('?state=short');
    assert('invalid state → 400', response.status === 400);
  }
  {
    const response = await start(`?state=${STATE}`);
    const location = new URL(response.headers.get('Location'));
    const cookie = response.headers.get('Set-Cookie');
    assert('redirects to GitHub authorize', response.status === 302 && location.origin === 'https://github.com' && location.pathname === '/login/oauth/authorize');
    assert('requests the repo scope', location.searchParams.get('scope') === 'repo');
    assert('passes the state through', location.searchParams.get('state') === STATE);
    assert('callback is the sibling route', location.searchParams.get('redirect_uri') === `${ORIGIN}/open-pencil/auth/github/callback`);
    assert('never sends the secret to the browser', !response.headers.get('Location').includes('client-secret'));
    assert('state cookie is HttpOnly, Secure, SameSite=Lax, scoped to /open-pencil/',
      cookie.startsWith(`${COOKIE}=${STATE};`) && /HttpOnly/.test(cookie) && /Secure/.test(cookie) && /SameSite=Lax/.test(cookie) && /Path=\/open-pencil\//.test(cookie) && /Max-Age=600/.test(cookie));
  }

  console.log('callback');
  {
    const response = await callback(`?code=c&state=${STATE}`, { env: { OPEN_PENCIL_PASSWORD: PASSWORD } });
    assert('missing env → 503', response.status === 503);
  }
  {
    const response = await callback(`?code=c&state=${STATE}`);
    assert('no state cookie → 400', response.status === 400);
  }
  {
    const response = await callback(`?code=c&state=${STATE}`, { cookie: `${COOKIE}=${'b'.repeat(64)}` });
    assert('state mismatch → 400', response.status === 400);
    assert('mismatch clears the cookie', /Max-Age=0/.test(response.headers.get('Set-Cookie')));
    assert('mismatch never exchanges the code', exchanges.length === 0);
  }
  {
    const response = await callback(`?code=good&state=${STATE}`, { cookie: `other=1; ${COOKIE}=${STATE}` });
    const html = await response.text();
    const csp = response.headers.get('Content-Security-Policy');
    const nonce = /script-src 'nonce-([^']+)'/.exec(csp)?.[1];
    assert('success → 200 HTML', response.status === 200 && response.headers.get('Content-Type').startsWith('text/html'));
    assert('exchanges with client id and secret server-side', exchanges.length === 1 && exchanges[0].client_id === 'client-id' && exchanges[0].client_secret === 'client-secret' && exchanges[0].code === 'good');
    assert('exchange uses the same redirect_uri', exchanges[0].redirect_uri === `${ORIGIN}/open-pencil/auth/github/callback`);
    assert('posts to the opener with this exact origin only', html.includes(`window.opener.postMessage(message, "${ORIGIN}")`) && !html.includes("'*'") && !html.includes('"*"'));
    assert('message carries type, state and token', html.includes('"type":"open-pencil:github-oauth"') && html.includes(`"state":"${STATE}"`) && html.includes('"token":"gho_test_token"'));
    assert('secret is not in the page', !html.includes('client-secret'));
    assert('page is not cached', response.headers.get('Cache-Control') === 'no-store');
    assert('only the nonced script may run', Boolean(nonce) && html.includes(`<script nonce="${nonce}">`) && csp.includes("default-src 'none'"));
    assert('no referrer leaks', response.headers.get('Referrer-Policy') === 'no-referrer');
    assert('state cookie is cleared', /Max-Age=0/.test(response.headers.get('Set-Cookie')));
    assert('password mode sets no site session', !/op_session=v1\./.test(response.headers.get('Set-Cookie')));
    assert('password mode makes no API calls', apiCalls.length === 0);
  }
  {
    const response = await callback(`?code=bad&state=${STATE}`, { cookie: `${COOKIE}=${STATE}` });
    const html = await response.text();
    assert('failed exchange → 502 hand-off with an error, no token', response.status === 502 && html.includes('"error":"exchange_failed"') && !html.includes('"token"'));
  }
  {
    const response = await callback(`?error=access_denied&state=${STATE}`, { cookie: `${COOKIE}=${STATE}` });
    const html = await response.text();
    assert('denied authorization hands off an error', response.status === 200 && html.includes('"error":"access_denied"'));
  }
  {
    const before = exchanges.length;
    const response = await callback(`?state=${STATE}`, { cookie: `${COOKIE}=${STATE}` });
    assert('missing code → 400', response.status === 400 && exchanges.length === before);
  }

  console.log('popup with site access configured');
  {
    const begin = await start(`?state=${STATE}`, { env: SITE_ENV, auth: null });
    assert('popup start needs no session', begin.status === 302 && new URL(begin.headers.get('Location')).origin === 'https://github.com');
    const response = await callback(`?code=good&state=${STATE}`, { env: SITE_ENV, auth: null, cookie: `${COOKIE}=${STATE}` });
    const html = await response.text();
    const cookies = response.headers.get('Set-Cookie');
    assert('still hands the token to the opener', response.status === 200 && html.includes('"token":"gho_test_token"'));
    assert('also sets the site session', /op_session=v1\.[^;]+; Max-Age=43200; Path=\/open-pencil\/; HttpOnly; Secure; SameSite=Lax/.test(cookies));
    assert('the session cookie does not contain the token in clear', !cookies.includes('gho_test_token'));
    assert('checked the user and the repository', apiCalls.includes('https://api.github.com/user') && apiCalls.includes('https://api.github.com/repos/southleft/altitude-designs'));
  }
} finally {
  globalThis.fetch = realFetch;
}

console.log(`\n${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
