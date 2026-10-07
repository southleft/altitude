#!/usr/bin/env node
/**
 * Self-test for the OpenPencil GitHub OAuth Pages Functions:
 * functions/open-pencil/auth/github/{start,callback}.js.
 *
 * Runs the handlers directly under Node with a fake `fetch` for GitHub's token endpoint.
 * Cloudflare's `crypto.subtle.timingSafeEqual` is not in Node, so a byte-wise stand-in is
 * installed first. Nothing here talks to GitHub.
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

const { onRequestGet: start } = await import('../../functions/open-pencil/auth/github/start.js');
const { onRequestGet: callback } = await import('../../functions/open-pencil/auth/github/callback.js');

let PASS = 0;
let FAIL = 0;
function assert(desc, cond) {
  if (cond) { console.log(`  ok - ${desc}`); PASS++; }
  else { console.log(`  NOT OK - ${desc}`); FAIL++; }
}

const ORIGIN = 'https://altitude.pages.dev';
const STATE = 'a'.repeat(64);
const ENV = { GITHUB_OAUTH_CLIENT_ID: 'client-id', GITHUB_OAUTH_CLIENT_SECRET: 'client-secret' };
const COOKIE = '__Secure-open-pencil-github-oauth';

function context(path, { env = ENV, cookie } = {}) {
  const headers = new Headers();
  if (cookie) headers.set('Cookie', cookie);
  return { env, request: new Request(`${ORIGIN}${path}`, { headers }) };
}

const realFetch = globalThis.fetch;
const exchanges = [];
globalThis.fetch = async (input, init) => {
  const url = String(input);
  if (url !== 'https://github.com/login/oauth/access_token') throw new Error(`unexpected fetch ${url}`);
  const body = JSON.parse(init.body);
  exchanges.push(body);
  if (body.code === 'bad') return Response.json({ error: 'bad_verification_code' });
  return Response.json({ access_token: 'gho_test_token', token_type: 'bearer', scope: 'repo' });
};

try {
  console.log('start');
  {
    const response = await start(context('/open-pencil/auth/github/start', { env: {} }));
    assert('missing env → 503', response.status === 503);
    assert('503 is not cached', response.headers.get('Cache-Control') === 'no-store');
  }
  {
    const response = await start(context('/open-pencil/auth/github/start', {
      env: { GITHUB_OAUTH_CLIENT_ID: 'client-id' }
    }));
    assert('missing secret → 503', response.status === 503);
  }
  {
    const response = await start(context('/open-pencil/auth/github/start?state=short'));
    assert('invalid state → 400', response.status === 400);
  }
  {
    const response = await start(context(`/open-pencil/auth/github/start?state=${STATE}`));
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
    const response = await callback(context(`/open-pencil/auth/github/callback?code=c&state=${STATE}`, { env: {} }));
    assert('missing env → 503', response.status === 503);
  }
  {
    const response = await callback(context(`/open-pencil/auth/github/callback?code=c&state=${STATE}`));
    assert('no state cookie → 400', response.status === 400);
  }
  {
    const response = await callback(context(`/open-pencil/auth/github/callback?code=c&state=${STATE}`, {
      cookie: `${COOKIE}=${'b'.repeat(64)}`
    }));
    assert('state mismatch → 400', response.status === 400);
    assert('mismatch clears the cookie', /Max-Age=0/.test(response.headers.get('Set-Cookie')));
    assert('mismatch never exchanges the code', exchanges.length === 0);
  }
  {
    const response = await callback(context(`/open-pencil/auth/github/callback?code=good&state=${STATE}`, {
      cookie: `other=1; ${COOKIE}=${STATE}`
    }));
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
  }
  {
    const response = await callback(context(`/open-pencil/auth/github/callback?code=bad&state=${STATE}`, {
      cookie: `${COOKIE}=${STATE}`
    }));
    const html = await response.text();
    assert('failed exchange → 502 hand-off with an error, no token', response.status === 502 && html.includes('"error":"exchange_failed"') && !html.includes('"token"'));
  }
  {
    const response = await callback(context(`/open-pencil/auth/github/callback?error=access_denied&state=${STATE}`, {
      cookie: `${COOKIE}=${STATE}`
    }));
    const html = await response.text();
    assert('denied authorization hands off an error', response.status === 200 && html.includes('"error":"access_denied"'));
  }
  {
    const before = exchanges.length;
    const response = await callback(context(`/open-pencil/auth/github/callback?state=${STATE}`, {
      cookie: `${COOKIE}=${STATE}`
    }));
    assert('missing code → 400', response.status === 400 && exchanges.length === before);
  }
} finally {
  globalThis.fetch = realFetch;
}

console.log(`\n${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
