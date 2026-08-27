#!/usr/bin/env node
// Altitude MCP server — CLI bin (stdio + Node HTTP transports).
//
// This used to be the whole server: tool/resource/prompt registration lived
// here, inline. As of spec 2026-08-25-mcp-library-first-refactor, the
// registration logic moved to `./index.mjs` (`registerAltitudeTools()` /
// `buildServer()`) so it can be composed by a consumer's own `McpServer`
// without forking this file — see `./index.mjs`'s header and the README
// "Extending" section. This file is now ONLY what genuinely needs a real
// Node process: argv parsing and the two transports (stdio; Node
// `http.createServer` for the loopback streamable-HTTP mode). It is a
// READER of Altitude's already-generated artifacts, never a second source
// of truth — see README.md for the full contract, and `./lib/paths.mjs` /
// `./lib/*.mjs` for what each tool reads.
//
// Run with `--experimental-strip-types` (harmless no-op on Node versions
// where type stripping is unflagged). altitude_generate_theme prefers the
// BUILT theme engine (@southleft/al-web-components/dist/theme-engine/index.js)
// and needs no type stripping for it; the flag only matters for the fallback path, where
// an unbuilt checkout is served from the engine's TypeScript source. See
// ./lib/theme.mjs.

import { createServer as createHttpServer } from 'node:http';

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

import { buildServer } from './index.mjs';
import { computeParity } from './lib/parity.mjs';
import { resolveProject, listProjectIds } from './lib/ds-project.mjs';

// ── transports ───────────────────────────────────────────────────────────
// Default: stdio (what .mcp.json launches — one server, one client).
// `--http [port]`: streamable HTTP for the Storybook pairing
// (`pnpm --filter @southleft/al-web-components start` runs both via concurrently), so
// any MCP client can attach to the running instance at /mcp while Storybook
// is up. Stateless: a fresh server+transport per POST, no session ids.
const httpFlag = process.argv.indexOf('--http');

if (httpFlag === -1) {
  await buildServer().connect(new StdioServerTransport());
} else {
  // 6017, not 6006+1: 6007 was observed occupied on a dev machine (and is the
  // first port a second `storybook dev` would grab anyway).
  const port = Number(process.argv[httpFlag + 1]) || Number(process.env.ALTITUDE_MCP_PORT) || 6017;

  const readBody = (req) =>
    new Promise((resolve, reject) => {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => resolve(raw));
      req.on('error', reject);
    });

  // /parity.json response cache — see the handler below for why.
  const PARITY_CACHE_TTL_MS = 3000;
  /** @type {Map<string, {at:number, payload:string}>} keyed by requested project id ('' = default) */
  const parityCache = new Map();

  /** Is this a loopback origin/host? Any port, http or https. */
  const isLoopback = (value) => {
    if (!value) return false;
    try {
      // Accept both a full origin ("http://localhost:6006") and a bare Host
      // header ("localhost:6006"), which has no scheme.
      const { hostname } = new URL(value.includes('://') ? value : `http://${value}`);
      return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1';
    } catch {
      return false;
    }
  };

  const httpServer = createHttpServer(async (req, res) => {
    // DNS-REBINDING GUARD. Without a Host check, a page on any website can point
    // a hostname it controls at 127.0.0.1 and then reach this server from the
    // browser as a same-site request. Rejecting a non-loopback Host closes that,
    // and costs nothing for real local clients.
    if (!isLoopback(req.headers.host)) {
      res.writeHead(403, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Host not allowed; @southleft/altitude-mcp serves loopback clients only.' }));
      return;
    }

    // CORS: the Storybook manager (localhost:6006), the docs site and other
    // local tools fetch /parity.json cross-origin, so a header is needed — but
    // this was `*`, which let ANY page the developer happened to be visiting
    // read this repo's component and parity data straight out of their browser.
    // Reflect loopback origins only.
    const origin = req.headers.origin;
    if (isLoopback(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'content-type, mcp-session-id, mcp-protocol-version');
    if (req.method === 'OPTIONS') {
      res.writeHead(204).end();
      return;
    }

    const url = new URL(req.url ?? '/', `http://localhost:${port}`);
    try {
      if (url.pathname === '/healthz') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true, name: 'altitude', transport: 'streamable-http' }));
        return;
      }
      if (url.pathname === '/parity.json') {
        // `?project=<id>` selects the design system; omitted falls back to
        // DS_PROJECT then the registry default.
        const requested = url.searchParams.get('project') ?? undefined;
        // Compute BEFORE writing any header: an unknown project id must be able
        // to come back as a 400, and writeHead is not reversible.
        let payload;
        try {
          // Short-TTL cache (R5, spec 2026-08-27-parity-system-audit-
          // remediation): computeParity() is several hundred synchronous file
          // reads on the event loop; a burst of requests (a panel polling, an
          // agent looping) used to pay that per request. 3s is short enough
          // that "edit a component, re-poll" still reads fresh.
          const key = requested ?? '';
          const hit = parityCache.get(key);
          if (hit && Date.now() - hit.at < PARITY_CACHE_TTL_MS) {
            payload = hit.payload;
          } else {
            payload = JSON.stringify(computeParity(requested));
            parityCache.set(key, { at: Date.now(), payload });
          }
        } catch (err) {
          if (err?.code === 'ERR_UNKNOWN_DS_PROJECT') {
            res.writeHead(400, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ error: err.message, code: err.code, knownProjects: err.known }));
            return;
          }
          throw err;
        }
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(payload);
        return;
      }
      if (url.pathname === '/ds-projects.json') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ default: resolveProject().id, projects: listProjectIds() }));
        return;
      }
      if (url.pathname === '/mcp') {
        if (req.method !== 'POST') {
          // Stateless mode: no SSE stream to resume, no session to delete.
          res.writeHead(405, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed (stateless server: POST only)' }, id: null }));
          return;
        }
        const raw = await readBody(req);
        const body = raw ? JSON.parse(raw) : undefined;
        const server = buildServer();
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined, // stateless
          enableJsonResponse: true, // plain JSON responses; no SSE needed for reader tools
        });
        res.on('close', () => {
          transport.close();
          server.close();
        });
        await server.connect(transport);
        await transport.handleRequest(req, res, body);
        return;
      }
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'Unknown route. Endpoints: POST /mcp, GET /parity.json[?project=<id>], GET /ds-projects.json, GET /healthz',
        }),
      );
    } catch (err) {
      if (!res.headersSent) res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: String(err?.message ?? err) }));
    }
  });

  // BIND TO LOOPBACK EXPLICITLY. `listen(port)` with no host binds 0.0.0.0 —
  // every interface — while the line below cheerfully logged "localhost". This
  // server reads the repo off disk and answers unauthenticated, so on any
  // shared or untrusted network (a café, a conference, a client office) it was
  // a readable window into the working tree for anyone who could reach the
  // machine. Loopback is the correct default for a dev-time tool; set
  // ALTITUDE_MCP_HOST deliberately if you genuinely need to expose it.
  const host = process.env.ALTITUDE_MCP_HOST ?? '127.0.0.1';
  httpServer.listen(port, host, () => {
    console.log(`[@southleft/altitude-mcp] streamable HTTP on http://${host}:${port}/mcp (parity: /parity.json)`);
    if (host !== '127.0.0.1' && host !== 'localhost') {
      console.warn(
        `[@southleft/altitude-mcp] WARNING: bound to ${host}, not loopback. This server is unauthenticated ` +
          'and serves repository contents. Do not do this on an untrusted network.',
      );
    }
  });
}
