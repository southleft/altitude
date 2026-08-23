# @southleft/altitude-mcp

A stdio [MCP](https://modelcontextprotocol.io) server exposing Altitude's already-generated
token/component graph to AI agents. Implements `T7.2` from `NEXT-GEN-UPGRADE-PLAN.md`.

## What this is (and isn't)

This server **reads** generated artifacts that already exist elsewhere in the repo — it is
**never a second source of truth**. Every tool below either parses a file `@southleft/al-web-components`'
own build already produced, or shells out to an existing script:

| Tool | Reads |
|---|---|
| `altitude_list_components` | `libs/al-web-components/custom-elements.json` (CEM) + `.altitude/migration.json` |
| `altitude_get_component` | CEM + `libs/al-web-components/schemas/*.schema.json` + migration state + `*.stories.ts` `title:` |
| `altitude_validate` | shells to `libs/al-web-components/cli/validate.mjs --json` |
| `altitude_get_tokens` | `libs/al-web-components/dist/css/{tokens,aliases}.json` + `styles/tokens-dtcg/**` |
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

Registered in the repo's `.mcp.json` as `altitude`, alongside `monday-morning` and `playwright`.

**HTTP mode:** `pnpm --filter @southleft/al-web-components start` runs this server with
`--http 6017` alongside the WC Storybook — stateless streamable HTTP at `POST /mcp`, plus
`GET /parity.json[?project=<id>]`, `GET /ds-projects.json`, and `GET /healthz`. Binds loopback
only (`ALTITUDE_MCP_HOST` to override), with Host-header and CORS guards.

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

## Files

```
libs/altitude-mcp/
├── package.json
├── README.md
├── src/
│   ├── server.mjs              # MCP server entry — tool registration
│   └── lib/
│       ├── paths.mjs           # generated-artifact locations + MissingArtifactError
│       ├── cem.mjs             # custom-elements.json reader
│       ├── migration.mjs       # .altitude/migration.json reader
│       ├── schemas.mjs         # schemas/*.schema.json reader
│       ├── stories.mjs         # *.stories.ts title -> Storybook docs URL
│       ├── validate.mjs        # wraps cli/validate.mjs --json
│       ├── tokens.mjs          # tokens.json/aliases.json + DTCG tier/brand/mode index
│       ├── icons.mjs           # catalog.ts reader + import-guidance snippets
│       ├── theme.mjs           # deterministic OKLCH engine wrapper
│       ├── parity.mjs          # Figma <-> code parity engine (manifest + live hashing)
│       ├── ds-project.mjs      # .altitude/ds-projects.json resolution (multi-project)
│       └── ts-loader-hook.mjs  # extensionless-.ts-import resolve hook
└── test/
    └── smoke.mjs                # spawns server, real MCP handshake, calls every tool
```
