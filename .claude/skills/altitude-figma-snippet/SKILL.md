---
name: altitude-figma-snippet
description: Generate a Figma page from a REAL RENDERED PAGE SECTION (the snippet/page lane) — capture a live route, measure it with token provenance, build it on canvas from existing component sets + literal facts, and numerically verify against the site as ground truth. Triggers: 'make this page/section in Figma', 'generate the hero/section from the site', 'the generated section doesn't match the site', 'run the snippet pipeline', 'verify a generated section'. Use this INSTEAD of altitude-figma-generate when the subject is a PAGE (real copy, page CSS, compositions) rather than a library component's variant set. Built and proven on the southleft hero benchmark, 9 verify-driven rounds in one session (2026-08-28); encodes every trap hit. Read BEFORE running generate-snippet.mjs or measure-page.mjs.
---

# altitude-figma-snippet

**Binding first:** `.altitude/FIGMA-CLEANLINESS.md` — the owner's Figma rules
(component reuse, hug preservation, organism widths/breakpoints, naming, the
mandatory screenshot loop). Every generation and edit answers to it.

Generate Figma from what a VISITOR sees — a real route's real section — not from a
component's synthetic harness case. Born from the hero benchmark: the component
lane produced a "Hero" from fixture copy on a white background, because the
pipeline could not look at the page at all (spec
`2026-08-28-snippet-capture-code-to-figma`; full round-by-round narrative in
`.mm/notes/snippet-lane-learnings-hero-benchmark-round-1-…-08-28-2026.md`).

**Operating goal (owner-set): least human input.** One command runs the whole
loop; the numeric verify + auto-exported image pair are the critic, not the
human's eyeballs. When output diverges: read the verify report, classify each
miss (generic rule / measurement fact / curation), fix at that layer, re-run.
Never hand-edit the canvas.

**The verify is no longer geometry-only (T4, spec
2026-08-29-parity-judgement-gates-and-evals).** Every paired row in
`<section>-verify.json` now carries `facts[]` alongside its box deltas:
`text` (measured words vs the Figma TEXT node's characters), `fill` (colour,
canonicalized both ways — a TEXT node compares against `computed.fc`, anything
else against `computed.bg`), and `fill-binding` (is the paint bound to a
variable, or a literal that will not follow a mode switch — repair-skill trap
4; note the `fill` check PASSES on such a node, which is why binding is
separate). `skipped` is a real outcome with a reason attached: a gradient is
not comparable to a flat paint and never counts as agreement.

They **report** by default. `--gate-facts` makes them fail the run. Nobody has
run them against a live build yet, so their false-positive rate is unmeasured
— read the volume on the first real run before turning them on. This is the
direct answer to trap 9 below: colour and copy are now compared by number
instead of by eye.

## The one command

```bash
node scripts/figma-atoms/mcp-shim.mjs        # once, background (Figma Desktop on the right file)
node scripts/contracts/generate-snippet.mjs --section hero --project southleft \
  --measure --verify --base http://localhost:4188/southleft
```

`--measure` runs `measure-page.mjs` (fresh capture: walk + rasters + ground-truth
data); the build lands on scratch page `--page` (default "Site Sections",
decoy-guarded, name-scoped clearing); `--verify` runs `verify-figma.mjs` and
exits with its gate status. Sections are the route's `[data-section-id]`
elements. `--ops-only` / `--check-determinism` work like the component lane.
The app must be running (`pnpm --filter al-app-southleft start`; NOTE the astro
`base: '/southleft'` — the site is at `/southleft/`, and `astro dev` is a
detaching daemon: a stale instance serves 404s, `npx astro dev stop` first).

Verify output: `<syncDir>/verify/<section>-verify.json` — per-node bbox deltas
(positional pairing, builder's skip rules mirrored, decorative grid vectors
excluded) PLUS an auto-exported image pair: the PRESENTATION frame png (never
the variant master — it sits outside the theme-mode wrapper and exports
white-on-white) and the site ground-truth path.

## How it works (maximum reuse)

`measure-page.mjs` (real route, theme-mode forcing, `__section()` walk from
measure-lib, replaced-element rasterization) → `generate-snippet.mjs` shapes ONE
section into a PSEUDO-CONTRACT via emit-contracts' exported `buildAnatomyNode`,
then attaches the page-lane literal facts below → the EXISTING generator
(`buildOps` + `buildPluginCode`) builds it. Known `al-c-*`/`sl-c-*` subtrees
become INSTANCES of the real sets (nested resolution by name); everything else
becomes token-bound frames with literal fallbacks.

## The page-lane fact model (tokens ALWAYS win at every consumption site)

Attached by `generate-snippet.mjs` onto pseudo-contract nodes only — never on
real contracts, so component-lane ops stay byte-identical:

| Fact | Source | Meaning |
| --- | --- | --- |
| `fsPx`/`lhPx` | computed | USED type metrics — outrank even typography tokens (a token names the authored var, not the clamp()ed used size) |
| `ffCss`/`fwCss` | computed | per-node family/weight (pages mix families; the masters' single display family was a whole round of "everything looks wrong") |
| `bgCss`/`fcCss`/`bcCss`+`bwPx`/`radPx` | computed | literal surface styles; drive INSTANCE STYLE DIVERGENCE (page restyles a component — chips) and terminal-card chrome |
| `padPx`/`gapPx` | computed + sibling-gap synthesis | literal spacing; text leaves with real padding get a transparent wrapper frame |
| `mbPx`/`mrPx` | mixed-gap decomposition | recovered MARGINS: base itemSpacing = min gap, extras become trailing padding on the preceding child |
| `absPos` | position:absolute, or margin-auto detection (last flex-row child whose gap dwarfs the rest) | overlay layers, pushed-to-end children (terminal title) |
| `imgB64` | canvas toDataURL / driver raster | image fills — canvas pixels only |
| `gridTex` | parsed 2-gradient grid + background-size | NATIVE hairline rectangles — vectors beat rasters (owner principle) |
| `runs` | measure-lib pre-format runs — fields are `{start, end, color}` NOT offset/length | per-range text colors (terminal syntax) via setRangeFills |

Core sizing rules (build-set-code): grid children own their measured TRACK
width; wrap rows get their measured width (a hugging wrap-row can never wrap)
plus `counterAxisSpacing = itemSpacing`; grid containers apply
align-items/justify-content (align-end bottom-aligns); text-bearing INSTANCES
conform to their measured box UNCONDITIONALLY — wrap authority is the measured
INNER text node's width (hero heading: 764 inside a 1264 container, breaks at
"Built"), and measured height ÷ fsPx decides one-line (never wrap) vs
multi-line.

## Traps — every one cost real time TODAY

1. **The childless-glyph branch eats leaves silently**: its hasPaint check
   `continue`s nodes with empty tokens — no miss, no trace. Both hero
   background layers vanished. When a node disappears with clean missingVars,
   INSTRUMENT THE WALK FIRST (`misses.add` per visit).
2. **Element screenshots are page clips, not element isolations** — the texture
   raster contained the whole hero (the "doubling"). Driver rasterization hides
   sibling subtrees first — with **opacity:0, NOT visibility:hidden** (reveal
   animations set explicit `visibility:visible` on descendants, which pierces a
   hidden ancestor).
3. **`loadFontAsync` can hang forever** (same class as importComponentByKeyAsync)
   — it silently ate the whole 30s bridge ceiling. All family loads race a 3s
   timeout → fall back to the library family → named `font-load-timeout` miss.
4. **Backticks in comments inside the String.raw templates** (skill
   altitude-figma-generate trap 3) — hit THREE times in one day, twice writing
   about CSS. Run `node scripts/contracts/figma/check-parse.mjs` after touching
   generator files; it parses every module in ~1s.
5. **An instance's inner TEXT cannot be resized directly** (silently locked,
   like nested-instance geometry) — impose wrap width by resizing the INSTANCE
   and setting the inner text FILL.
6. **Symptom-gated rules are order-dependent**: the conform trigger checked for
   a size mismatch, another rule made the ancestor definite first, the mismatch
   vanished, the wrap policy never ran (lead collapsed to one 1742px line).
   When applying a measured fact is idempotent, apply it UNCONDITIONALLY.
7. **Silent no-op consumers hide their own failure**: the runs reader used
   offset/length against an emitter writing start/end — nothing applied, no
   error, two rounds to notice. Read the emitter first.
8. **Exports mint new ids every regen** — hand over the CURRENT presentation
   frame id; never cache node ids across regens.
9. **Perception is not a comparator** — the chips "looked right" red at
   thumbnail scale; the measured facts (dark translucent + warm border) were
   correct and the eyeball was wrong. Numbers first, screenshots as evidence.
10. **deviceScaleFactor 2 quadruples raster payloads** for zero fill-quality
    gain — page captures run at 1x.
11. `argOf(flag)` from scripts/lib/argv.mjs takes an argv ARRAY as its second
    parameter, not a default value.

## Library-lane impact watch

Wrap-row width, grid-track width, and grid-align rules also fire for LIBRARY
composites whose anatomy carries those facts (arguably more-correct there too,
but unreviewed at scale). After changing shared rules in build-set-code, re-run
one composite's `--check-determinism` (ops must stay byte-identical — literal
facts exist only on pseudo-contracts) and flag the change to whoever regenerates
library sets next.
