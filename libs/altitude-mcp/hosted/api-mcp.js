/**
 * PARKED 2026-08-27 - NOT DEPLOYED. This file used to live at
 * `functions/api/mcp.js`, where Cloudflare Pages bundles it automatically.
 * It was moved OUT of `functions/` because it broke the Pages build, and a
 * Pages Functions build failure fails the WHOLE deploy - it was taking the
 * docs site, the homepage and functions/api/theme.js down with it.
 *
 * THE ERROR (real Pages build log, 2026-08-27T17:06:55Z):
 *
 *   Found Functions directory at /functions. Uploading.
 *   wrangler 3.114.17
 *   X [ERROR] Expected ";" but found "with"
 *       libs/altitude-mcp/src/lib/registry-data.mjs:27:85
 *   Failed building Pages Functions.
 *
 * WHY IT IS A REAL BIND, NOT A TYPO. This file imports worker.mjs, which
 * imports lib/registry-data.mjs, which imports JSON with import attributes
 * (`with { type: 'json' }`). Node 22 REQUIRES that attribute to import JSON;
 * the esbuild inside wrangler 3.114.17 - the version Cloudflare Pages builds
 * Functions with, which this repo does not choose - CANNOT PARSE it. The same
 * module is loaded by both runtimes (here for the Worker, and by
 * test/worker-smoke.mjs under Node), so no single spelling satisfies both.
 *
 * This endpoint had never deployed successfully. It landed in 7dc5e94
 * (2026-08-25) and every Cloudflare Pages deploy failed from that commit
 * onward. Its header claimed verification "under real workerd
 * (`wrangler pages dev`)" - a NEWER local wrangler than Pages runs, which is
 * exactly why the gap went unnoticed. Nothing working was lost by parking it:
 * without ALTITUDE_MCP_TOKEN set in the Pages dashboard (still unset, see
 * below) this endpoint returns 503 by design.
 *
 * TO RESTORE, all three are required:
 *   1. Resolve the import-attribute conflict. The least invasive option is to
 *      dependency-inject the registry: have handleMcpRequest() take the data
 *      as an argument, so the Worker-bundled file can import the JSON WITHOUT
 *      attributes (esbuild's json loader needs none) while test/worker-smoke.mjs
 *      keeps importing WITH them under Node.
 *   2. Check the bundle size. registry-data.mjs statically pulls in ~1.2MB of
 *      JSON (888K is custom-elements.json alone), which may exceed the Worker
 *      size limit even once it parses. Nobody has measured this.
 *   3. `git mv libs/altitude-mcp/hosted/api-mcp.js functions/api/mcp.js` and set
 *      ALTITUDE_MCP_TOKEN in the Pages dashboard.
 *
 * Anything placed under `functions/` is bundled by Cloudflare's wrangler, not
 * by this repo's toolchain - see functions/README.md before adding a file there.
 */

/**
 * POST /api/mcp — the hosted Altitude MCP endpoint (R9: "an agent can reach
 * the MCP server without a local checkout").
 *
 * Cloudflare Pages Function — deploys automatically with the Pages build
 * (wrangler bundles the ./functions directory), same convention as
 * functions/api/theme.js. Delegates everything protocol-level to
 * libs/altitude-mcp/src/worker.mjs, which is transport-only and
 * server-surface-only: this file's entire job is the two things a HOSTED
 * (as opposed to loopback) endpoint needs that worker.mjs deliberately does
 * not own — auth and the origin policy — because those are deployment
 * concerns, not protocol ones, and belong at the edge of the request, not
 * inside the MCP server construction.
 *
 * AUTH — fails closed. `functions/api/theme.js` sets the precedent: no
 * secret configured means a 503, not an open unauthenticated endpoint.
 * Same here. Configure in the Pages project settings (Settings ->
 * Environment variables):
 *   ALTITUDE_MCP_TOKEN   (required — endpoint returns 503 without it)
 * A caller sends `Authorization: Bearer <token>`.
 *
 * WHAT THIS DOES NOT DO. No CORS headers are set. MCP clients (Claude Code,
 * Claude Desktop, an agent runtime) call this server-to-server, not from
 * browser JS running on a third-party page — CORS exists to protect browser
 * clients from cross-origin reads, which is not this endpoint's threat
 * model the way it was for the loopback server's Storybook-manager fetches
 * (see server.mjs's CORS comment, a genuinely different case). Omitting
 * Access-Control-Allow-Origin means a browser page cannot read this
 * endpoint cross-origin by default, which is the conservative default for a
 * bearer-token-protected API; add an explicit allow-list here if a real
 * browser-based consumer ever needs one.
 *
 * WHAT A HUMAN STILL HAS TO DO — see libs/altitude-mcp/README.md "Hosted
 * endpoint" for the full list. Short version: set ALTITUDE_MCP_TOKEN in the
 * Cloudflare Pages dashboard, decide the actual public origin policy
 * (rate limiting, WAF rules — Cloudflare dashboard features this repo
 * cannot configure from a checkout), and deploy. This file and
 * worker.mjs are implemented and verified locally under real `workerd`
 * (`wrangler pages dev`, see the README); none of the above three are.
 */
import { handleMcpRequest } from '../../libs/altitude-mcp/src/worker.mjs'

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })

export async function onRequest({ request, env }) {
  if (!env.ALTITUDE_MCP_TOKEN) return json({ error: 'not configured' }, 503)

  const expected = `Bearer ${env.ALTITUDE_MCP_TOKEN}`
  if (request.headers.get('authorization') !== expected) {
    return json({ error: 'unauthorized' }, 401)
  }

  return handleMcpRequest(request)
}
