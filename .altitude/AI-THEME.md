# AI Theme — prompt-driven token derivation in Storybook

A Storybook addon panel where you type a vibe ("deep sea at midnight") and the
whole component library re-skins. Ported from the `<theme.console>` on
southleft.com and adapted to Altitude's token architecture.

## The one idea that matters

**The AI never returns colours, and never returns CSS.**

It returns a small JSON *art direction* — hue, chroma, personality, shape and
motion dials. A deterministic OKLCH solver on the client derives every token
value from that direction and enforces WCAG AA on each pairing it renders.

Two things follow, and both are the reason it's built this way:

1. **Nothing the model returns can ship an inaccessible palette.** The contrast
   guarantee is structural, not a prompt instruction the model might ignore.
2. **The feature works with no API key.** A prompt hash seeds a PRNG and a
   keyword dictionary produces a complete direction locally. The AI upgrades the
   result; it is not required for one.

## Flow

```
panel input
   │
   ├─ 1. buildTheme({ prompt })            instant, local, deterministic
   │      └─ emit APPLY over the addon channel ──► preview writes inline props
   │
   └─ 2. POST /api/theme  { prompt }       ~1s, 15s timeout
          └─ direction ─► buildTheme({ prompt, direction })
                 └─ emit APPLY again (stale-guarded)

          on any failure: log "art director unreachable", keep the local theme
```

## Why re-pointing tier-1 primitives is the whole trick

Altitude's tier-2/tier-3 semantic tokens already indirect through tier-1:

```css
--al-theme-color-background-primary-default: var(--al-color-brand-blue-500);
--al-theme-color-content-primary-default:    var(--al-color-brand-blue-500);
--al-theme-color-border-primary-default:     var(--al-color-brand-blue-500);
```

So overriding ~36 tier-1 primitives re-skins all 48 semantic colour tokens for
free. The same holds for shape and motion:

| Override | Drives |
| --- | --- |
| `--al-border-radius-{2,4,6,8}` | `--al-theme-border-radius{,-sm,-md,-lg}` |
| `--al-border-width-{1,2,4}` | `--al-theme-border-width{,-md,-lg}` |
| `--al-box-shadow-{2..48}` | `--al-theme-box-shadow{-xs..-xl}` |
| `--al-animation-duration-{2..8}` | `--al-theme-animation-duration{,-long}` |

The generated ramps **preserve Altitude's measured OKLCH lightness curves**
(sampled from `.altitude/baselines/tokens/snapshot.json` into `ramps.ts`) and
only re-hue them. Because the tonal structure is unchanged, every semantic
pairing keeps the contrast relationship the design system was built on — the
solver then only has to fix up the handful of pairs that actually miss AA.

Values are written as **inline custom properties on `<html>`**, which outranks
every `:root` rule in `main.scss` without touching the cascade layers. Custom
properties pierce shadow boundaries, so every `<al-*>` picks them up with no
per-component work.

### The one place tier-1 alone isn't enough

Re-pointing primitives is mode-agnostic, but *which* primitive a semantic token
reads is not:

```css
/* dark sheet */   --al-theme-color-background-default: var(--al-color-neutral-dark-700);
/* light sheet */  --al-theme-color-background-default: var(--al-color-neutral-light-600);
```

Only one sheet is ever loaded — Storybook's `main.scss` hard-codes the dark one.
So a theme that derives for light mode would solve its ramps against light role
stops while the page still read the dark mapping, and render inverted: dark
canvas, light ink, and receipts vouching for pairs nobody sees.

`MODE_SEMANTICS` in `ramps.ts` holds the 16 semantic tokens that differ between
the two sheets, and the engine emits the whole block for the chosen mode every
time. That makes a derived theme self-contained — it lands the same way
whichever sheet a consumer happens to have loaded, and is what lets a prompt
flip the entire library to paper-white inside a dark Storybook.

## Files

```
functions/api/theme.js                       Cloudflare Pages Function — the AI call
libs/al-web-components/
  theme-engine/                              BUILT + EXPORTED as `al-web-components/theme-engine`
    index.ts                                 the public barrel — everything below is internal
    constants.ts                             channel event ids + the /api/theme path
    types.ts                                 Direction / Theme / Receipt contract
    oklch.ts                                 OKLab math, WCAG contrast, the solver
    ramps.ts                                 Altitude's measured tonal skeleton
    personalities.ts                         shape + motion presets
    engine.ts                                buildTheme() — seed, merge, solve
    apply.ts                                 client-side inline-prop applicator
  vite-plugins/theme-api.mjs                 serves /api/theme in `astro dev` (Node-only)
apps/southleft/src/components/
  AIDirectionPanel.astro                     the live console (drawer + prompt)
  TrySystem.astro                            "try the system" — same engine, one chunk
libs/altitude-mcp/src/lib/theme.mjs          altitude_generate_theme — same solver, no LLM
```

The engine lived in `.storybook/ai-theme/` until 2026-08-23. That directory is
a dot-directory, so TypeScript's wildcard `include` skipped it: it was never in
the `tsc` program, never emitted to `dist`, never named in `exports`, and never
packed — no consumer of the published package could derive a theme. The move to
`theme-engine/` (a built, exported top-level directory, same shape as `motion/`
and `controllers/`) fixed all four at once, and removed both symptoms: the
southleft app's four-levels-deep relative imports into the library's Storybook
internals, and the MCP's need to hot-compile TypeScript off disk at runtime.

## The API key never reaches the browser

| | Serves `/api/theme` | Key source |
| --- | --- | --- |
| `astro dev` | `vite-plugins/theme-api.mjs` (`configureServer`) | `.env` via Vite `loadEnv`, in Node |
| Deployed | `functions/api/theme.js` (Pages Function) | Cloudflare Pages env vars |

Both import **the same handler**, so there is exactly one copy of the system
prompt and the clamps. Set `ANTHROPIC_API_KEY` (see `.env.example`); without it
the endpoint returns 503 and the panel falls back to the seed engine.

`.env` is gitignored. The plugin reads the repo root *and* the workspace dir,
because `pnpm --filter al-web-components start` runs with a different cwd.

## What it does not touch

- **No source token files are modified.** Overrides are runtime-only, so
  `scripts/test-tokens-contract.js` (which fails on any token value drift
  against the baseline) is unaffected.
- **No CSS rules are added**, so `scripts/check-css-layers.js` is unaffected.
- **Typography and spacing are deliberately out of scope.** The type scale is
  fixed, and spacing already belongs to `<al-theme density>`; re-deriving either
  breaks story layouts for no expressive gain.

## Gotchas worth knowing

- `.storybook` is a dot-directory, so TypeScript excludes it from the `tsc`
  program entirely — anything still in there is type-checked by the editor and
  bundled by Vite/esbuild, but never emitted into `dist`. That is exactly why
  the engine no longer lives there.
- `vite-plugins/theme-api.mjs` is plain `.mjs`, not `.ts`, on purpose: as
  TypeScript it would join the declaration-emit program and fail on its
  `import ... from '../../../functions/api/theme.js'` (an untyped `.js` module
  outside the package, with `allowJs` off).
- The MCP prefers the BUILT barrel (`dist/theme-engine/index.js`) and falls
  back to the TypeScript source only when `dist/` is absent — `dist` is
  gitignored and `pnpm --filter al-web-components start` boots the MCP with no
  build in front of it. Both paths produce byte-identical themes.
- The applicator diff-removes keys from the previous theme. Without that, a key
  present before and absent now would linger and blend two palettes.
- `setProperty(k, undefined)` writes the literal string `"undefined"` — an
  invalid inline value that still beats every stylesheet. `apply.ts` guards it.
- `claude-haiku-4-5` is deliberate: a classification-shaped task with a strict
  schema. Overriding `THEME_MODEL` to a 4.6+ model needs a higher `max_tokens`,
  because those models think by default and thinking counts against the budget.
