// Altitude MCP — LIBRARY entrypoint (R1/R2, spec
// 2026-08-25-mcp-library-first-refactor). Extension = composition, not a
// fork: `registerAltitudeTools(server, opts)` registers this server's eight
// tools onto a caller-owned `McpServer`, and `buildServer(opts)` is the
// convenience factory that also wires up the resources and prompts
// `../server.mjs`'s bin has always shipped.
//
// IMPORTANT — importing this module has ZERO side effects: no transport
// connect, no process exit, no unexpected filesystem I/O beyond what the
// existing `./lib/paths.mjs` module-init path-joining already did (see that
// file's header). Nothing in this module's own top level calls either
// exported function. `../server.mjs` (the CLI bin) is the only thing in
// this package that calls `buildServer()` / connects a transport, and it
// does so inside its own `--http` branch / top-level await, never from in
// here.
//
// `{ repoRoot }` (R3): an npm-installed copy of this package, or a brand
// layer with its own checkout, can point every generated-artifact read at a
// different repo root than the one this file itself lives in. Configuring
// it here — before any tool is registered — means every `PATHS.*` read
// inside `./lib/*.mjs` (always call-time, never snapshotted at another
// module's top level; see `./lib/paths.mjs`) sees the override.
//
// PROCESS-GLOBAL, NOT PER-SERVER: `configurePaths()` mutates module-level
// state shared by every `McpServer` in the process. The LAST configured
// root wins for ALL of them — building two servers against two different
// `repoRoot`s in one process silently redirects the first server's reads
// to the second server's checkout. One artifact root per process; run a
// separate process per checkout if you need more than one.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { configurePaths } from './lib/paths.mjs';
import { TOOLS } from './lib/tools.mjs';
import { STATIC_RESOURCES, parityManifestTemplate, readParityManifest } from './lib/resources.mjs';
import { PROMPTS } from './lib/prompts.mjs';

// Re-exported so a consumer composing its own server never has to reach past
// this module into `./lib/paths.mjs` directly for the one config hook.
export { configurePaths };

/**
 * Narrow `TOOLS` to the subset a caller wants registered.
 *
 * `include` wins when both are given — an explicit allowlist is a stronger
 * statement of intent than an excludelist, and the two are contradictory
 * together only by omission, not by conflicting values, so there is no
 * ambiguous case to reject.
 */
function selectTools(opts = {}) {
  const { include, exclude } = opts;
  // An explicitly-passed `include` is an allowlist even when EMPTY — a
  // caller writing `include: []` means "register nothing", not "register
  // everything". Only an absent/non-array `include` falls through.
  if (Array.isArray(include)) {
    return TOOLS.filter((t) => include.includes(t.name));
  }
  if (Array.isArray(exclude) && exclude.length) {
    return TOOLS.filter((t) => !exclude.includes(t.name));
  }
  return TOOLS;
}

/**
 * Register Altitude's tools onto a caller-owned `McpServer`.
 *
 * ```js
 * import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
 * import { registerAltitudeTools } from '@southleft/altitude-mcp';
 *
 * const server = new McpServer({ name: 'my-consumer', version: '1.0.0' });
 * registerAltitudeTools(server, { repoRoot: '/path/to/altitude/checkout' });
 * // ... register additional, consumer-owned tools on the same `server` ...
 * ```
 *
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {object} [opts]
 * @param {string} [opts.repoRoot] Override the artifact root (default: `ALTITUDE_REPO_ROOT` env, else this package's own checkout). PROCESS-GLOBAL: the last configured root wins for every server in this process — one root per process. See `./lib/paths.mjs` and this file's header.
 * @param {string[]} [opts.include] Only register tools whose name is in this list — an explicit empty array registers NOTHING. Wins over `exclude` when both are given.
 * @param {string[]} [opts.exclude] Register every tool EXCEPT the ones named here. Ignored when `include` is also given.
 */
export function registerAltitudeTools(server, opts = {}) {
  if (opts.repoRoot) configurePaths(opts.repoRoot);
  for (const tool of selectTools(opts)) {
    server.registerTool(tool.name, tool.config, tool.handler);
  }
}

/**
 * Build a fully-registered server instance: `registerAltitudeTools()` plus
 * every resource and prompt this package ships. A FACTORY rather than a
 * module singleton because the streamable-HTTP mode runs STATELESS: one
 * fresh server + transport pair per request (the documented pattern for
 * servers whose tools hold no session state — every tool here is a pure
 * reader). Stdio mode (`../server.mjs`) builds exactly one.
 *
 * `opts` is passed through to `registerAltitudeTools()` — `repoRoot` /
 * `include` / `exclude` all apply here too.
 *
 * @param {object} [opts]
 * @returns {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer}
 */
export function buildServer(opts = {}) {
  const server = new McpServer({ name: 'altitude', version: '1.0.0' });

  registerAltitudeTools(server, opts);

  // ── resources ────────────────────────────────────────────────────────────
  // Six fixed-URI artifacts (one instance each) plus one ResourceTemplate for
  // the per-design-system parity manifest. See ./lib/resources.mjs for the
  // full URI-scheme rationale and the failure-degradation discipline (mirrors
  // toolHandler() in ./lib/tools.mjs — never a crash, always structured JSON
  // on a miss).
  for (const [name, uri, config, read] of STATIC_RESOURCES) {
    server.registerResource(name, uri, config, (u) => read(u));
  }

  server.registerResource(
    'altitude-parity-manifest',
    parityManifestTemplate(),
    {
      title: 'Figma <-> code parity manifest (per project)',
      description:
        'One design system\'s parity manifest (.altitude/figma-sync/**/parity-manifest.json) — the ' +
        'source of truth altitude_check_parity reads before hashing live source. `{project}` is any id ' +
        'from altitude_list_ds_projects / altitude://ds-projects.',
      mimeType: 'application/json',
    },
    (uri, variables) => readParityManifest(uri, variables)
  );

  // ── prompts ──────────────────────────────────────────────────────────────
  // Four, each grounded in a real engine/skill/gate this repo already has —
  // see ./lib/prompts.mjs for what backs each one and why the set stops there.
  for (const p of PROMPTS) {
    server.registerPrompt(p.name, p.config, (args) => p.callback(args));
  }

  return server;
}
