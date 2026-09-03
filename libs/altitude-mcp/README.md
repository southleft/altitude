# @southleft/altitude-mcp

A stdio [MCP](https://modelcontextprotocol.io) server exposing Altitude's already-generated
token/component graph to AI agents. Implements `T7.2` from the v2 plan, archived at `.altitude/history/NEXT-GEN-UPGRADE-PLAN.md`.

## What this is (and isn't)

This server **reads** generated artifacts that already exist elsewhere in the repo — it is
**never a second source of truth**. Every tool below either parses a file `@southleft/al-web-components`'
own build already produced, or shells out to an existing script:

| Tool | Reads |
|---|---|
| `altitude_list_components` | `libs/al-web-components/custom-elements.json` (CEM) + `.altitude/migration.json` + `dist/docs[/<project>]/guidance.json` |
| `altitude_get_component` | CEM + `libs/al-web-components/schemas/*.schema.json` + migration state + `*.stories.ts` `title:` + `dist/docs[/<project>]/examples.json` (executed stories) + `dist/docs[/<project>]/guidance.json` + `libs/al-react/src/components/**` (wrapper + event props) + `.altitude/a11y/report.json` + the component contract |
| `altitude_validate` | shells to `libs/al-web-components/cli/validate.mjs --json` |
| `altitude_get_tokens` | `libs/al-web-components/dist/css/{tokens,aliases}.json` + `styles/tokens-dtcg/**` (for `cssType`, the `cssProperties` allow-list and each token's description) |
| `altitude_search_icons` | `libs/al-web-components/components/icon/catalog.ts` |
| `altitude_generate_theme` | `libs/al-web-components/dist/theme-engine/index.js` (built barrel; falls back to `theme-engine/` TS source) |
| `altitude_check_parity` | `.altitude/ds-projects.json` + the project's parity manifest (`.altitude/figma-sync/**/parity-manifest.json`) + live source hashing |
| `altitude_list_ds_projects` | `.altitude/ds-projects.json` |

If a generated artifact is missing (fresh clone, no build yet), the tool returns a structured
error naming the exact `pnpm` command that produces it — it does not fail silently or fabricate
data.

**Strictly Altitude-scoped.** No Monday Morning / `.mm/` awareness of any kind.

**Never calls an LLM.** `altitude_generate_theme` runs the same deterministic, WCAG-AA-enforcing
OKLCH solver Storybook's token console uses. It does not call the Anthropic API
(`functions/api/theme.js` is a separate, optional layer that this server does not touch).

## Runtime

Plain ESM `.mjs`, no build step — matches how `scripts/*.mjs` are authored elsewhere in this
repo. One exception: `altitude_generate_theme` prefers the built theme-engine barrel
(`libs/al-web-components/dist/theme-engine/index.js`) and falls back to importing the engine's
TypeScript source (`libs/al-web-components/theme-engine/`), which is plain, erasable TypeScript
(interfaces + type-only imports, no enums/namespaces/decorators). The fallback is loaded via Node's
built-in type-stripping loader (unflagged on Node ≥22.18; pass `--experimental-strip-types`
explicitly for older 22.x patches — harmless no-op where it's already default) plus a 12-line
custom resolve hook (`src/lib/ts-loader-hook.mjs`) that appends `.ts` to the engine's
extensionless relative imports, which TypeScript's resolver allows but Node's ESM resolver
does not. This avoids pulling in a TS runtime dependency (`tsx`/`ts-node`/`esbuild-register`)
for one already-plain-JS-shaped module, keeping the dependency list to exactly
`@modelcontextprotocol/sdk` + `zod`.

## Run

```bash
pnpm --filter @southleft/altitude-mcp start
# or directly:
node --experimental-strip-types --no-warnings libs/altitude-mcp/src/server.mjs
```

`src/server.mjs` is a thin bin — argv parsing and the two transports (stdio, Node
`http.createServer`) — built on top of the library entry documented in "Extending" below. It is
the only thing in this package that calls `buildServer()` and connects a transport; importing
`@southleft/altitude-mcp` itself never does either.

Registered in the repo's `.mcp.json` as `altitude`, alongside `monday-morning` and `playwright`.

**HTTP mode:** `pnpm --filter @southleft/al-web-components start` runs this server with
`--http 6017` alongside the WC Storybook — stateless streamable HTTP at `POST /mcp`, plus
`GET /parity.json[?project=<id>]`, `GET /ds-projects.json`, and `GET /healthz`. Binds loopback
only (`ALTITUDE_MCP_HOST` to override), with Host-header and CORS guards.

## Extending

The supported way to extend this server is **composition, not a fork**: build your own
`McpServer`, register Altitude's tools onto it with `registerAltitudeTools()`, then register your
own tools on the same instance. There is deliberately no plugin-loader / tool-discovery mechanism
(scanning directories for tool modules, a manifest of third-party tools, etc.) — composition via
the exported API covers every known extension case, and adding a discovery layer would be
speculative machinery for a caller that doesn't exist yet.

`@southleft/altitude-mcp`'s `exports["."]` (`src/index.mjs`) is the library entry:

```js
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { registerAltitudeTools } from '@southleft/altitude-mcp';

// 1. Build a server you own — any name/version you like.
const server = new McpServer({ name: 'my-design-system-mcp', version: '1.0.0' });

// 2. Register Altitude's tools onto it (see "repoRoot", below, if this
//    package is npm-installed rather than living inside the Altitude repo).
registerAltitudeTools(server, { repoRoot: '/path/to/altitude/checkout' });

// 3. Register your own tools on the SAME server instance.
server.registerTool(
  'my_tool',
  { title: 'My tool', description: '...', inputSchema: { query: z.string() } },
  async ({ query }) => ({ content: [{ type: 'text', text: `handled: ${query}` }] }),
);

// 4. Connect whichever transport you need — stdio, streamable HTTP, your own.
await server.connect(new StdioServerTransport());
```

`registerAltitudeTools(server, opts)` only ever calls `server.registerTool(...)` in a loop — it
never connects a transport and never touches `process`, so it composes cleanly inside a larger
server that also has its own resources, prompts, and lifecycle.

**`repoRoot`.** Every tool here reads a generated artifact off disk (CEM, tokens, schemas, the
icon catalog, `.altitude/ds-projects.json`, …) relative to a repo root that defaults to this
package's own location on disk (`import.meta.url`-derived). That default is correct when this
package runs from inside the Altitude monorepo, but wrong the moment it's `npm install`ed as a
dependency elsewhere, or wrapped by a brand layer with its own checkout. Two ways to point it
elsewhere, in precedence order:

- `registerAltitudeTools(server, { repoRoot: '/path/to/checkout' })` /
  `buildServer({ repoRoot: '/path/to/checkout' })` — explicit.
- `ALTITUDE_REPO_ROOT` env var — picked up once at module load if no explicit `repoRoot` is
  passed.

**One root per process.** `repoRoot` is **process-global**, not per-server: under the hood it
mutates shared module state (`configurePaths()` in `src/lib/paths.mjs`) that every `McpServer`
in the process reads through. The last configured root wins for all of them — building two
servers against two different `repoRoot`s in one process silently redirects the first server's
tool reads to the second server's checkout. If you need to serve more than one checkout, run a
separate process per checkout (which is also what the stateless HTTP mode's
fresh-server-per-request pattern assumes: every request's server shares the one process-wide
root).

**This pairing is not optional for an npm-installed copy.** If neither is set and this package is
not physically sitting inside an Altitude checkout, `repoRoot` resolves to wherever
`node_modules/@southleft/altitude-mcp` happens to live — which has no `libs/al-web-components`,
no `.altitude/`, nothing the tools expect. That is not a crash: every tool degrades to the same
structured `{ error, code: 'ERR_MISSING_ARTIFACT', path, hint }` response an unbuilt local clone
already returns (see "What this is" above) — the `hint` names the exact command that would
produce the missing file, which is meaningless advice against the wrong checkout. The degradation
is deliberate and matches this server's existing fail-structured-not-crash discipline; the fix is
always to set `repoRoot` / `ALTITUDE_REPO_ROOT` to a real Altitude checkout (or a build that ships
the same generated artifacts) before registering, not to change the tools.

**Subset filter.** `registerAltitudeTools` (and therefore `buildServer`) accepts `include` /
`exclude` to register fewer than all eight tools:

```js
registerAltitudeTools(server, { include: ['altitude_list_components', 'altitude_get_component'] });
// or
registerAltitudeTools(server, { exclude: ['altitude_validate'] });
```

`include` wins when both are given — an explicit allowlist is a stronger statement of intent than
an excludelist, so there's no ambiguous case to reject, only a redundant `exclude` to ignore. An
explicitly-passed `include: []` is honored as an empty allowlist and registers **nothing** — only
omitting `include` altogether means "no filter".

**`buildServer(opts)`** is the all-in-one convenience: it calls `registerAltitudeTools(server,
opts)` on a fresh `McpServer` named `"altitude"` and additionally registers every resource and
prompt this package ships (see "Resources" and "Prompts" below). It's what `src/server.mjs` (this
package's own bin) calls — reach for it when you want the full stock server as a starting point
rather than building tool-by-tool; reach for `registerAltitudeTools` directly when you're
composing Altitude's tools into a server that already has its own resources/prompts/identity.

## Hosted endpoint (R9 — "an agent can reach the MCP server without a local checkout")

`server.mjs`'s two transports (stdio, Node `http.createServer`) both need a real Node process
reading the working tree off `node:fs` — neither can run anywhere but a local checkout. Getting a
genuinely *hosted* endpoint means three different kinds of thing, and they have three different
answers here — do not read "implemented" on one as implying it on another:

| Piece | Status |
|---|---|
| A Fetch-standard transport (works on Workers, Deno, Bun, plain Node) | **Implemented**, `src/worker.mjs` |
| A deployable adapter using it (Cloudflare Pages Function) | **Written, but PARKED and NOT DEPLOYED** — `libs/altitude-mcp/hosted/api-mcp.js`. It lived at `functions/api/mcp.js` until 2026-08-27, where it broke the Cloudflare Pages build and took the whole deploy (docs site, homepage, `theme.js`) down with it. See that file's header for the diagnosis and what restoring it requires. |
| Verified under the actual target runtime, not just Node | **No.** It was verified under `pnpm dlx wrangler@4 pages dev` — but Cloudflare Pages builds Functions with **wrangler 3.114.17**, whose esbuild cannot parse the import attributes in `lib/registry-data.mjs`. Testing against a newer local wrangler than the platform runs is what hid this for two days. |
| A public deployment: DNS, TLS, the live secret | **Not done — needs a human** with Cloudflare dashboard access this session does not have |

**What's hosted.** `src/worker.mjs` builds a SEPARATE, smaller `McpServer` (`name:
"altitude-hosted"`, not `"altitude"` — an agent can tell the two apart at `initialize`) using the
SDK's `WebStandardStreamableHTTPServerTransport` (`Request` in, `Response` out — no Node `req`/
`res`). Two tools, five resources — `altitude_list_components`, `altitude_list_ds_projects`, and
the CEM / both ai-readiness digests / the ds-project registry / the a11y report as resources — all
backed by `src/lib/registry-data.mjs`, which reads the same committed JSON files `paths.mjs` names
via static `import … with { type: "json" }` instead of `fs.readFileSync`, so the data is inlined
into the deployed Worker bundle at build time rather than read from a filesystem that does not
exist at request time.

**What's deliberately NOT hosted, and why it's a wall, not a gap:**

| Tool | Why not portable |
|---|---|
| `altitude_validate` | Spawns `node cli/validate.mjs` as a **child process** (`lib/validate.mjs`) — Workers isolates cannot spawn processes, full stop. |
| `altitude_get_tokens` | Reads `dist/css/tokens.json`, a **build artifact this repo deliberately does not commit** (see `llms.txt` "Built artifacts — import them, do not link them"). A static import needs a tracked file. |
| `altitude_generate_theme` | Dynamically resolves the built theme-engine barrel under `dist/theme-engine/`, same untracked-artifact problem as tokens, plus a runtime `import()` this module cannot statically name for a bundler. |
| `altitude_get_component`, `altitude_check_parity` | Need a live directory walk (`.stories.ts` parsing, per-component source hashing) with no static-import equivalent — deferred, not architecturally impossible; a real port would mean bundling every component's source/stories as data, which is a bigger change than this task's scope. |

**The trap that made "verified locally" mean something.** The first version of `worker.mjs`
imported its CEM parser from `lib/cem.mjs`, which imports `lib/paths.mjs`, which calls
`fileURLToPath(import.meta.url)` at MODULE-INIT time to compute `REPO_ROOT`. Under plain Node this
is harmless. Under `workerd` (verified with `wrangler pages dev`, not guessed) `import.meta.url`
is not a `file://` URL the way Node's is, so that call threw immediately at bundle evaluation —
before any handler ran, before anything touched `node:fs`. Merely importing a module that *names*
filesystem paths broke a filesystem-less runtime. Fix: the pure parsing logic moved to
`lib/cem-parse.mjs` (zero imports), and both `cem.mjs` (Node) and `worker.mjs` (Workers) import
from there — see that file's header. This is why "runs under Node" was explicitly not treated as
proof: it wasn't.

**How it was verified locally**, with real workerd (no npm dependency added to the repo — `pnpm
dlx` fetches wrangler into its own throwaway store):

```bash
# NOTE the version: `wrangler@4`. Cloudflare Pages builds Functions with its own
# pinned wrangler (3.114.17 as of 2026-08-27), whose esbuild CANNOT parse the
# import attributes in lib/registry-data.mjs. Passing here therefore proves the
# code runs under workerd - it does NOT prove Pages can build it, and it did not:
# every Pages deploy failed from 7dc5e94 until the adapter was parked on
# 2026-08-27. These commands also require the adapter to be back at
# functions/api/mcp.js; it is currently at libs/altitude-mcp/hosted/api-mcp.js.
echo 'ALTITUDE_MCP_TOKEN=test-secret' > .dev.vars      # gitignored; local only
pnpm dlx wrangler@4 pages dev <any-static-dir> --port 8793 \
  --compatibility-date=2025-06-01 --compatibility-flags=nodejs_compat
curl -X POST http://127.0.0.1:8793/api/mcp                                        # -> 503 {"error":"not configured"} with no .dev.vars
curl -X POST http://127.0.0.1:8793/api/mcp -H "authorization: Bearer wrong"       # -> 401 {"error":"unauthorized"}
curl -X POST http://127.0.0.1:8793/api/mcp -H "authorization: Bearer test-secret" \
  -H "content-type: application/json" -H "accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"x","version":"0"}}}'
# -> 200, serverInfo.name = "altitude-hosted"
```

All four requests above were run against a live `workerd` process in this session; `functions/api/
mcp.js`'s auth gate (fail-closed on no secret, same precedent as `functions/api/theme.js`) and
`worker.mjs`'s protocol handling both responded correctly. `pnpm --filter @southleft/altitude-mcp
test` also runs `test/worker-smoke.mjs` against `worker.mjs` directly (real `Request`/`Response`,
no stdio) on every test run, so the hosted subset cannot silently regress the way the `workerd`
check (not wired into any automated gate — it needs `pnpm dlx`, a real port, and is not something
`check:mcp-docs`-style drift-checking applies to) would only catch by hand.

**What a human still has to do**, none of which this checkout can do or verify:

1. Confirm the Cloudflare Pages project actually bundles `/functions` from the repo root (it
   already does — `functions/api/theme.js` is live precedent) and that `ALTITUDE_MCP_TOKEN` gets
   set in that project's **Settings → Environment variables** as a real secret, not a plaintext var.
2. Decide the actual public origin policy — rate limiting, WAF rules, geographic restrictions —
   all Cloudflare dashboard features, none configurable from a checkout.
3. Decide whether `altitude-hosted`'s two-tool/five-resource subset is worth publishing at all
   given it is materially smaller than the loopback server's eight tools, or whether the tools
   left out (see table above) are worth the larger, genuinely harder port before shipping.
4. Actually deploy, and confirm the live URL the same way `check-llms-content-type.mjs` verified
   the docs site's machine artifacts against a real branch preview rather than trusting local output.

## Test

```bash
pnpm --filter @southleft/altitude-mcp test
```

`test/smoke.mjs` spawns the real server, performs the MCP handshake over stdio, lists tools, and
calls every tool once with real inputs, asserting each response is valid JSON with the expected
shape. No mocking.

## Tools

### `altitude_list_components`

```jsonc
// request
{ "filter": "button" }
// response (truncated)
{
  "count": 3,
  "components": [
    { "tag": "al-button", "className": "ALButton", "summary": "...", "migration": { "state": "scoped-complete", "react19": true, "headless": false, "ssr": false } }
  ]
}
```

### `altitude_get_component`

```jsonc
// request
{ "tag": "al-button" }
// response (truncated)
{
  "tag": "al-button",
  "className": "ALButton",
  "attributes": [ /* CEM attributes */ ],
  "slots": [ /* ... */ ],
  "events": [ /* ... */ ],
  "migration": { "state": "scoped-complete", "react19": true, "headless": false, "ssr": false },
  "schema": { /* full JSON Schema from schemas/al-button.schema.json, or null if none exists */ },
  "story": {
    "title": "Atoms/Button",
    "storyId": "atoms-button--docs",
    "docsUrl": "https://altitude.pages.dev/storybook/web-components/?path=/docs/atoms-button--docs"
  }
}
```

### `altitude_validate`

```jsonc
// request — either { "markup": "..." } or { "path": "..." }
{ "markup": "<al-button styleTypeee=\"x\">Click</al-button>" }
// response — the cli/validate.mjs --json envelope, verbatim
{
  "apiVersion": 1,
  "type": "validation.result",
  "data": {
    "violations": [
      { "component": "al-button", "rule": "unknown-attribute", "code": "ERR_UNKNOWN_ATTRIBUTE", "fix": "..." }
    ]
  }
}
```

### `altitude_get_tokens`

With no `tier`/`brand`/`mode`, queries the flat resolved `dist/css/tokens.json` (the default
altitude/light build). Add `tier` (`1`|`2`|`3`), `brand`, or `mode` to query the DTCG source
tree instead — a token's CSS custom-property **name** is stable across brand/mode, only its
**value** changes, so scoped results carry both the raw (possibly-aliased) value and a
best-effort resolved value.

`brand` is an enum of the two brands this repo ships — `altitude` and `southleft` — matching
`styles/tokens-dtcg/tier-2/brand/*` and `.altitude/ds-projects.json`.

```jsonc
// request
{ "tier": 2, "brand": "southleft", "name": "theme-color-background-primary-default" }
// response
{
  "count": 1,
  "totalMatched": 1,
  "tokens": [
    { "name": "al-theme-color-background-primary-default", "tier": 2, "brand": "southleft", "mode": null,
      "rawValue": "{color.brand.red.500}", "resolvedValue": "#F05735", "type": "color" }
  ]
}
```

### `altitude_search_icons`

```jsonc
// request
{ "query": "trash" }
// response (truncated)
{
  "count": 3,
  "icons": [
    { "name": "trash", "pascalName": "Trash", "categories": ["office", "system"], "tags": ["garbage", "delete", "..."],
      "exportName": "trash",
      "snippet": "import { trash } from '@southleft/al-web-components/dist/components/icon/glyphs.js';\nimport { registerIcons } from '@southleft/al-web-components/dist/components/icon/registry.js';\nregisterIcons({ 'trash': trash });" }
  ]
}
```

### `altitude_generate_theme`

```jsonc
// request — a bare prompt (keyless keyword-seeded path)
{ "prompt": "ocean sunset" }
// or an explicit art direction (deterministic path; same shape as functions/api/theme.js)
{ "direction": { "accentHue": 200, "personality": "geometric", "mode": "dark", "radius": "pill" } }
// response
{
  "name": "ocean sunset",
  "mode": "dark",
  "personality": "editorial",
  "palette": { "--al-color-brand-blue-500": "#...", "...": "..." },
  "receipts": [ { "label": "content/default", "ratio": 7.2, "target": 4.5 } ],
  "source": "prompt-seed"
}
```

### `altitude_check_parity`

Figma ↔ code parity per component: `in-sync`, `code-drift`, `figma-drift`, `conflict`,
`missing-in-figma`, `missing-in-code`, or `excluded`. **Multi-project:** pass `project`
(see `altitude_list_ds_projects`) to check a design system other than the default. Code drift
is computed live by hashing component source; Figma drift is as of the manifest's
`figmaLastRefreshed` (updated by `scripts/figma-parity/refresh-figma-digests.mjs`). Each entry
carries an `aiPrompt` — a ready-to-run reconciliation prompt naming that project's Figma file.
Same data the Storybook sidebar badges and docs-site parity panels render from.

```jsonc
// request — one tag, a status filter, or nothing for the full report
{ "tag": "al-button", "project": "southleft" }
```

### `altitude_list_ds_projects`

Every design system this repo drives, from `.altitude/ds-projects.json`: id, display name,
brand, Figma file key/name/URL, Storybook port (or `null` where the docs site replaced it),
docs base, and parity-manifest path. Use it to discover the `project` argument accepted by
`altitude_check_parity`.

```jsonc
// request
{}
```

## Resources

Read-only, subscribable-by-URI views over the same artifacts the tools above read — the right
shape for pulling a whole artifact rather than querying it with filters. One custom scheme,
`altitude://`; single-instance artifacts get a fixed URI, and the one genuinely PER-PROJECT
artifact (the Figma <-> code parity manifest — this repo drives more than one design system off
one component library, see `altitude_list_ds_projects`) is a `ResourceTemplate` parameterised by
project id, so a new project registered in `.altitude/ds-projects.json` is reachable without a
server.mjs change. Full rationale: `src/lib/resources.mjs`.

| URI | Reads |
|---|---|
| `altitude://components` | `libs/al-web-components/custom-elements.json` (CEM) |
| `altitude://tokens` | `libs/al-web-components/dist/css/tokens.json` (resolved, default build) |
| `altitude://a11y-report` | `.altitude/a11y/report.json` |
| `altitude://ai-readiness/cem-digest` | `.altitude/ai-readiness/cem-digest.json` |
| `altitude://ai-readiness/tokens-digest` | `.altitude/ai-readiness/tokens-digest.json` |
| `altitude://ds-projects` | `.altitude/ds-projects.json` |
| `altitude://parity-manifest/{project}` (template) | that project's `.altitude/figma-sync/**/parity-manifest.json` |

A missing/malformed artifact reads back as JSON content `{error, code, path, hint}` — same shape
`toolHandler()` returns for a tool — never a thrown protocol error and never a server crash.
Proven: `.altitude/ds-projects.json` moved aside still starts the server and lists every resource;
only reads that actually touch the registry (the parity-manifest template) degrade.

**Capabilities:** this SDK (`@modelcontextprotocol/sdk@1.30.0`)'s `McpServer` advertises
`resources: { listChanged: true }` automatically the moment any resource is registered — that is
baked into the SDK itself, not something this server opts into, and this server never calls
`sendResourceListChanged()` (the resource set here is fixed for the life of a connection). The SDK
has no `subscribe`/`unsubscribe` request handler at all in this version, so `subscribe` is never
advertised — there is nothing to opt into.

## Prompts

Four reusable message templates, each grounded in a real engine/skill/gate this repo already has
— kept small on purpose (see `src/lib/prompts.mjs` for what backs each one):

| Prompt | Grounded in |
|---|---|
| `audit_component_parity` | the Figma <-> code parity engine (`altitude_check_parity`) + the `altitude-figma-sync` skill |
| `generate_brand_theme` | the deterministic OKLCH solver (`altitude_generate_theme`) |
| `check_snippet_convention` | the usage validator (`altitude_validate`) + `cli/REPAIR.md`'s self-heal loop |
| `scaffold_component` | the `altitude-component-authoring` skill + plop's `LAYOUT_SUSPECT` gate |

Argument validation matches the tools' discipline: the zod `argsSchema` rejects a missing/mistyped
argument at the protocol level; deeper domain checks (an unknown tag, an unknown project, a name
that collides with the layout-primitive gate) happen inside the callback and come back as a single
message whose text is `JSON.stringify({error, code, ...})` — the same shape a tool error uses —
rather than a thrown exception.

## Capability matrix

[`CAPABILITY-MATRIX.md`](./CAPABILITY-MATRIX.md) — intent → tool/resource/prompt → required
filters → expected result fields → common failure mode, for all 8 tools, 6 fixed resources + 1
templated resource, and 4 prompts (Carbon's tool-docs format). **Generated**, not hand-written:
`scripts/build-capability-matrix.mjs` performs a real MCP handshake against the running server for
the name/required-argument columns, so it cannot list something the server does not register or
omit something it does; only the prose (intent, expected fields, failure mode) is authored, and
the generator refuses to run if any registered name lacks an entry. `pnpm run check:mcp-docs` at
the repo root gates it in CI the same way it gates the tool roster.

```bash
pnpm --filter @southleft/altitude-mcp run capability-matrix          # regenerate
pnpm --filter @southleft/altitude-mcp run capability-matrix:check    # fail if stale
```

## Files

```
libs/altitude-mcp/
├── package.json
├── README.md
├── CAPABILITY-MATRIX.md         # GENERATED — do not hand-edit, see scripts/build-capability-matrix.mjs
├── scripts/
│   └── build-capability-matrix.mjs  # real MCP handshake -> CAPABILITY-MATRIX.md; --check mode
├── src/
│   ├── server.mjs              # MCP server entry (stdio + Node HTTP) — tool/resource/prompt registration
│   ├── worker.mjs              # Fetch-standard entry (R9) — smaller "altitude-hosted" server, Workers-safe
│   └── lib/
│       ├── paths.mjs           # generated-artifact locations + MissingArtifactError (fs-based; Node only)
│       ├── cem.mjs             # custom-elements.json reader (fs-based; Node only)
│       ├── cem-parse.mjs       # pure CEM parsing, ZERO imports — shared by cem.mjs AND worker.mjs
│       ├── registry-data.mjs   # static JSON imports for worker.mjs (no fs) — CEM/migration/digests/ds-projects/a11y
│       ├── migration.mjs       # .altitude/migration.json reader
│       ├── schemas.mjs         # schemas/*.schema.json reader
│       ├── stories.mjs         # *.stories.ts title -> Storybook docs URL
│       ├── validate.mjs        # wraps cli/validate.mjs --json (child_process — Node only, never portable)
│       ├── tokens.mjs          # tokens.json/aliases.json + DTCG tier/brand/mode index
│       ├── icons.mjs           # catalog.ts reader + import-guidance snippets
│       ├── theme.mjs           # deterministic OKLCH engine wrapper
│       ├── parity.mjs          # Figma <-> code parity engine (manifest + live hashing)
│       ├── ds-project.mjs      # .altitude/ds-projects.json resolution (multi-project)
│       ├── resources.mjs       # MCP resource definitions + altitude:// URI scheme
│       ├── prompts.mjs         # MCP prompt definitions
│       └── ts-loader-hook.mjs  # extensionless-.ts-import resolve hook
└── test/
    ├── smoke.mjs                # spawns server.mjs, real MCP handshake over stdio, calls every tool/resource/prompt
    └── worker-smoke.mjs         # calls worker.mjs's handleMcpRequest() directly with real Request/Response

../hosted/api-mcp.js             # PARKED Cloudflare Pages Function adapter (auth + delegates to worker.mjs).
                                 # Was functions/api/mcp.js; moved out of functions/ 2026-08-27 because it
                                 # failed the Pages build. Not deployed. See its header.
```
