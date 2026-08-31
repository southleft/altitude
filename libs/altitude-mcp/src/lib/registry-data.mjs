// Statically-imported (not `readFileSync`'d) copies of the committed JSON
// artifacts, for `worker.mjs` — the Fetch-standard entrypoint meant to run on
// a runtime with no real filesystem (Cloudflare Workers / Pages Functions).
//
// WHY THIS FILE EXISTS (R9 — "an agent can reach the MCP server without a
// local checkout"). `server.mjs` and every `./lib/*.mjs` reader is built on
// `node:fs` (`paths.mjs`'s `PATHS`, resolved against `import.meta.url` at
// runtime) — the right choice for stdio and the loopback Node-HTTP mode,
// where the server IS the checkout. Neither Cloudflare Workers nor Pages
// Functions expose a real filesystem: there is no `fs.readFileSync` that
// resolves an arbitrary repo path at request time, only whatever the build's
// bundler inlined into the Worker script. A static `import … with { type:
// "json" }` (Node 22 / esbuild / the Workers bundler all support this) is
// exactly that: the JSON becomes part of the compiled Worker, resolved once
// at BUILD time, not read from disk per request.
//
// This is why worker.mjs's tool/resource surface is a SUBSET of server.mjs's
// eight tools, not a port of all of them — see worker.mjs's own header for
// which three tools do not belong here and why (one spawns a subprocess,
// Workers cannot ever do that; two read `dist/` build artifacts this file
// deliberately does not commit to sourcing, see below).
//
// Every import below is a file `paths.mjs` already names and this spec's
// other gates already keep fresh (`check:llms`, the ai-readiness digest
// gate, `check-mcp-docs.mjs`) — this module adds no new source of truth, it
// only reads the existing one through an import statement instead of `fs`.
import customElementsManifest from '../../../al-web-components/custom-elements.json' with { type: 'json' };
import migration from '../../../../.altitude/migration.json' with { type: 'json' };
import dsProjects from '../../../../.altitude/ds-projects.json' with { type: 'json' };
import cemDigest from '../../../../.altitude/ai-readiness/cem-digest.json' with { type: 'json' };
import tokensDigest from '../../../../.altitude/ai-readiness/tokens-digest.json' with { type: 'json' };
import a11yReport from '../../../../.altitude/a11y/report.json' with { type: 'json' };

export { customElementsManifest, migration, dsProjects, cemDigest, tokensDigest, a11yReport };

/** Same shape `migration.mjs`'s `getMigrationState()` returns, over the statically-imported copy. */
export function getMigrationState(tagOrSlug) {
  const slug = tagOrSlug.startsWith('al-') ? tagOrSlug.slice(3) : tagOrSlug;
  return migration.components?.[slug] ?? null;
}
