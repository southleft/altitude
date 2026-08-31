# figma-atoms

Tooling that keeps the **`Altitude Design System`** Figma file (`y83n4o9LOGs74oAoguFcGS`)
in sync with `libs/al-web-components`.

> **Start with the skill, not this file.** `.claude/skills/altitude-figma-sync/SKILL.md`
> has the conventions and the ~13 traps. This README is just how to run the scripts.
>
> Do **not** target `Altitude DS` (`NGpu9IJj2pRhNru1QTGmuF`) — that is an empty scratch
> file an earlier pass mistakenly built into.

## Scripts

| Script | Does |
|---|---|
| `../build-figma-payload.mjs` | Token source (`styles/tokens-dtcg/**`) → Figma-ready payload (3 collections). Code is upstream of Figma; there is no reverse import. |
| `../audit-figma-vs-code.mjs` | Diff live Figma variables against `styles/tokens-dtcg/**` |
| `../figma-var-fixes.mjs` | Emit the variable set/create ops the audit implies |
| `bridge-io.mjs` | GET/POST JSON channel the plugin sandbox can reach (port 9223–9232) |
| `harness.mjs` | Serves the real components from `dist/`, both modes, + `window.__spec()` |
| `measure-lib.js` | Injected: reads AUTHORED CSS declarations and their token names |
| `plan.mjs` | Curated variant matrix per component (which props become axes; `stateCases` maps attribute-driven states into the State axis) |
| `measure-components.mjs` | THE DRIVER: harness + headless Chromium, 5 states x 2 modes → spec-{light,dark}.json |
| `build-component-ops.mjs` | Measured specs → per-component Figma binding ops (`.altitude/figma-sync/ops/<key>.json`) |
| `build-spec.mjs` | LEGACY colour-pair matching path (superseded by the authored-token pipeline) |
| `token-map.mjs` | `--al-theme-space` → `theme/space/@` |

## Variable audit

```bash
node scripts/figma-atoms/bridge-io.mjs --port 9229    # leave running
# figma_execute: dump variables, POST to http://localhost:9229/figma-live-vars.json
node scripts/audit-figma-vs-code.mjs
node scripts/figma-var-fixes.mjs                      # then apply via figma_execute
```

## The pipeline (one command each)

```bash
node scripts/figma-atoms/measure-components.mjs     # bundles, serves, measures 5 states x 2 modes
node scripts/figma-atoms/build-component-ops.mjs    # → .altitude/figma-sync/ops/<key>.json per component
```

Each ops file is self-contained: `State x axes` rows with variable bindings, a
`differsFromDefault` flag per state row, and the simplified child box tree for
structured components. Apply them to Figma ONE COMPONENT AT A TIME (repair or build),
verifying parity per component before moving on.

## Reading a component's real tokens by hand

```bash
# dist/ ships bare `lit` specifiers a browser cannot resolve — bundle first
node node_modules/.pnpm/esbuild@0.28.1/node_modules/esbuild/bin/esbuild \
  libs/al-web-components/dist/components/bundle/bundle.js \
  --bundle --format=esm --outfile=.altitude/figma-sync/atoms-bundle.js

node scripts/figma-atoms/harness.mjs --port 7341
```

Then in a browser at `http://localhost:7341/?mode=light` (or `dark`):

```js
window.__spec('default')   // also 'hover' | 'active' | 'focus' | 'disabled'
```

Each node comes back with `computed` (what the browser resolved), `authored` (the CSS
declarations that won) and `tokens` (the custom-property name behind each one — the bit
that matters). Then:

```bash
node scripts/figma-atoms/build-spec.mjs
```

(`pack.mjs` and `build-button-ops.mjs`, once listed here, were deleted 2026-08-27 —
unreferenced orphans; `build-component-ops.mjs` is the live ops generator.)

## The one idea worth remembering

Do not infer tokens from colours. Many tokens share a hex, and it cannot recover spacing
or radius at all — `16` is `theme/space/@`, `space/16`, `font-size/16` **and**
`line-height/16`. The CSS already names the token; read the declaration.
