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
