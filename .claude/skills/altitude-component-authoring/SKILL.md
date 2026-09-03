---
name: altitude-component-authoring
description: "Add a new al- component or change an existing one's public API in libs/al-web-components, and the rule against hand-rolling arrangement anywhere in the repo. Triggers: 'add a new component', 'create a component', 'new al- component', 'component checklist', 'update a component's API', 'scaffold a component', 'ship a component PR', plus 'wrap this in a div for spacing', 'add padding/margin around an al-layout', 'add a spacing/orientation/alignment prop', or any inline width/height/flex/margin style on a slotted child. The checklist is fragmented across plop's console output, AGENTS.md's deliverable table, and steps documented NOWHERE (parity:seed, guidance YAML, llms:build, a11y:report, a changeset) — this skill is the single ordered flow plus every trap that costs an hour to find. Read this BEFORE running plop, and BEFORE writing any wrapper element that carries only spacing, direction or sizing."
---

# altitude-component-authoring

The end-to-end flow for shipping a component in Altitude — scaffold through
release-ready PR — plus the traps that are not written down anywhere else.

Verify with `node scripts/component-check.mjs <al-tag>` at every stage; it is
the mechanical half of this skill (see step 10). This document is the prose
half: order, rationale, and the non-obvious failure modes.

---

## 0. Decide where it belongs — and whether it should exist at all

**Altitude is layout-first.** `<al-layout>` is the ONE arrangement primitive
(`direction`, `gap`, `align`, `justify`, `wrap`, `grow`, `stretchItems`,
`responsive`, `fullHeight`, `noCollapse`, plus `constrained` / `grid` /
`bento` variants). If the thing you're about to scaffold owns no behavior, no
ARIA relationship, and no state — only spacing/direction/alignment of slotted
content — it is `<al-layout>` with props, not a new component. `al-button-group`,
`al-layout-container`, `al-layout-section`, `al-bento-grid`, `al-split-content`,
`al-chip-group` and `al-toast-group` were all removed for exactly this reason.
Full rule: AGENTS.md "Arrangement vs. semantics" (~lines 247–269).

Both plop generators refuse a suspiciously-named component
(`*-group`/`*-container`/`*-wrapper`/…) unless you confirm it owns real
semantics — that gate is `LAYOUT_SUSPECT` in
`libs/al-web-components/plop/plop-config.cjs:9` and
`libs/al-react/plop/plop-config.cjs:9`. Don't fight it; if it's really layout,
stop here.

### Never hand-roll arrangement — use the primitive, or fix the primitive

The `LAYOUT_SUSPECT` gate only catches people who reach for `plop`. The far
more common failure is quieter: writing a wrapper element with a bit of CSS on
it instead of using what already exists. **A `<div>` that carries only spacing,
direction, or sizing is a bug**, whether it lives in a component's shadow root,
in a page, or in a docs example. It is invisible to every gate in this
checklist, so it is on you.

These four are the ones that actually happen in this repo. Audited 2026-08-27;
counts are real, and each has a correct alternative that already ships:

| Instead of | Write | Why |
| --- | --- | --- |
| A wrapper element whose only job is padding around an `<al-layout>` — plus a `display: block` to make padding stick | `--al-layout-padding` on the `<al-layout>` itself | 5 sites hand-rolled this and each wrote its own multi-line comment re-deriving the `:host { display: contents }` trap: `apps/astro/src/styles/dashboard.css:37-49`, `apps/react/src/components/Layout.scss:21-29`, `apps/svelte/src/lib/Layout.css:21-31`, `apps/angular/src/app/app.component.scss:36-39`, `apps/home/src/home.scss:110-119`. The hook already existed; nobody found it. |
| `<div style="margin-top: var(--al-theme-space-xl)">` around each sibling | A parent `<al-layout gap="xl">` | 77 of these across 18 files in `apps/southleft/src/pages` (~145 margin-only inline styles repo-wide). Each one is a meaningless element the DS exists to delete. |
| `style="height:100%; box-sizing:border-box"` on a card inside a grid layout | `.al-u-grid__item` (optionally `.col:N`) on that child | 26 sites. `.al-u-grid__item` is `display: grid`, which stretches the child on BOTH axes — the reason it is grid and not flex is written out at `styles/core/utilities/grid.scss` (a flex item only stretches on the CROSS axis, so no flex direction gets both). The inline style is re-solving a solved problem, badly. |
| `style="width:100%"` / `style="flex:1"` on a slotted child | Check `al-layout`'s props first; if none fit, treat it as evidence and raise it | `stretchItems` used to look like the answer. It was REMOVED in v2 — zero call sites repo-wide, and the only two comments mentioning it explained why it didn't fit. Don't reintroduce it under a new name. |
| Re-implementing `direction`/`gap`/`align` inside a new component's shadow root | Nest the slotted content in `<al-layout>` | `checkbox-group`, `radio-group` and `toggle-button-group` all do it correctly — see `checkbox-group.ts:185`. They keep only their SEMANTICS (fieldset/legend, roving selection). |

**When the primitive genuinely cannot express it**, the answer is still not an
inline style. In order of preference: (1) an existing escape-hatch custom
property — `--al-layout-gap`, `--al-layout-padding`, `--al-layout-template`;
(2) a change to `al-layout` itself, with evidence; (3) a documented exception
with a comment saying why. Option 2 needs the evidence *first* — a proposal to
grow `al-layout` toward Figma's Auto Layout panel (padding props,
`.al-u-fill`/`.al-u-hug`, clip, align-content) was killed on 2026-08-27
because an audit of every call site found the demand wasn't there; see
`.mm/specs/2026-08-27-layout-figma-auto-layout-parity/spec.md` § "Rejected —
and why" before re-proposing any of it.

**Changing an existing component's API counts too.** If you are adding a prop
that names an arrangement concept (`spacing`, `orientation`, `alignment`,
`fullWidth`, `stacked`), stop and check whether `<al-layout>` already says it.
Full rule: AGENTS.md "Arrangement vs. semantics".

**Where** — base library vs. a brand layer. `libs/al-web-components/plop/plop-config.cjs`
prompts for a target when `.altitude/ds-projects.json` declares more than one
`brandLibrary`. Every target scaffolds an `al-` tag — a brand layer is a
different PACKAGE, not a different namespace, so a page never mixes two
prefixes. If the component OVERRIDES a base tag (same `al-` name), the plop
output tells you to declare it in `brandLibrary.supersedes`, skip
`HTMLElementTagNameMap` (the base package already owns that declaration — two
declarations for one tag is a TS2717 build error), and never import or render
the base component from inside the override (same tag both places = infinite
recursion, and whichever module's `customElements.define` runs first wins
permanently).

---

## 1. Scaffold

```bash
pnpm --filter @southleft/al-web-components plop
```

Answers: dash-case name, target package, story tier (Atoms = standalone
primitive, Molecules = composes 2+ atoms, Organisms = page-level region — the
tier still drives the docs sidebar taxonomy via `apps/docs/src/lib/registry.mjs`,
which reads the story title; Storybook itself was retired 2026-08-25).
Emits `<name>.ts` / `.scss` / `.stories.ts` and prints the rest of this
checklist to the console — that printout is a summary, not a substitute for
reading AGENTS.md once.

---

## 2. Implement the component

The full **blocker-graded contract** lives in AGENTS.md "New component
deliverable checklist" (~lines 217–245) and "Component authoring rules"
(~lines 152–189) — read those two sections, don't re-derive them here. In
short, every blocker item ships in the SAME PR:

- Component class: `extends ALElement`, `static el = 'al-<name>'`,
  `@property accessor` fields with JSDoc.
- Self-register guard + `HTMLElementTagNameMap` at the bottom of the `.ts`
  (plop already emits both — don't delete them).
- `.scss` sibling, rules wrapped in `@layer al.component { … }`.
- Compose slotted-content arrangement with `<al-layout>` — never a hand-rolled
  `direction`/`gap`/flex-or-grid prop on this component (see §0).
- `&:focus-visible { @include al-focus; }` on every interactive element —
  never a re-authored `outline`.
- CSF3 stories (`tags: ['autodocs']`), one story per visually-meaningful
  state.

### Trap: `@cssproperty` documents OWN hooks only

`@cssproperty` is for the component's **own public override surface**
(`--al-<component>-<role>`, e.g. `--al-button-background`) — never the global
`--al-theme-*` tokens the component merely consumes as a fallback
(AGENTS.md:163–189). A brand-new `--al-<component>-<role>` hook is
*intentionally* absent from the tokens digest — that's correct, not a bug;
the digest's "no fabricated `--al-theme-*` names" rule is about the consumed
surface, not hooks you own and declare yourself.

### Trap: composites register sub-components differently than apps

If this component injects its own sub-elements into its template (like
`chip.ts` injecting `al-icon-close`), use the intra-component `register()`
helper, not `registerAltitude()` — that one is for apps booting the whole
library. AGENTS.md:190–216 has the canonical shape; getting this backwards
either double-registers a tag or breaks MFE version suffixing.

---

## 3. Wire it into the build (same PR, no exceptions)

1. **`bundle.ts`** — one alphabetical line:
   `export { AL<Pascal> } from './<name>/<name>';` in
   `libs/al-web-components/components/bundle.ts`. Gated by
   `scripts/check-bundle-completeness.js` (any `extends ALElement` component
   without a matching export line fails CI).
2. **`.altitude/migration.json`** — new key inserted **alphabetically**, dash
   name **without** the `al-` prefix (e.g. `"toggle-button-group"`, not
   `"al-toggle-button-group"`), state `"scoped-complete"` for a net-new
   component, `react19`/`headless`/`ssr` reflecting the real surface. Policy
   is all-or-nothing per PR: if you emit ANY source file, you must also emit
   this entry (AGENTS.md:245).
3. **CEM regeneration** — after JSDoc is final:
   ```bash
   pnpm --filter @southleft/al-web-components build:custom-elements.json
   ```
   This is `cem analyze` plus three generator scripts (component JSON
   schemas, schema index, the AI-readiness CEM digest) — running `cem
   analyze` alone silently leaves those three stale. Everything downstream
   (docs site, parity, llms.txt, `component-check.mjs`'s own CEM check)
   reads the CEM as ground truth, so a stale manifest here breaks several
   things at once and looks like unrelated bugs in each.

---

## 4. React wrapper

```bash
pnpm --filter @southleft/al-react plop
```

Name it **PascalCase** (`ToggleButtonGroup`, not `toggle-button-group`).
Emits `libs/al-react/src/components/<Pascal>/index.tsx` +
`<Pascal>.tsx` + `<Pascal>.stories.tsx`.

### Trap: this plop APPENDS, not alphabetically

The `src/index.ts` action is `type: 'append'`
(`libs/al-react/plop/plop-config.cjs:82`) — it adds
`export * from './components/<Pascal>';` to the END of the file, unlike the
web-components generator which asks you to insert alphabetically by hand. Do
not "fix" this by re-sorting `index.ts` unless you mean to touch every line
in a diff nobody asked for; it's cosmetic, not a gate.

### Trap: `'use client'` is load-bearing

Every wrapper module calls `customElements.define` at module scope, so it can
only run in the browser. The generator emits `'use client';` at the top of
the barrel file for exactly this reason — never strip it, or Next.js App
Router / RSC import of the wrapper throws.

---

## 5. Stories / VRT

CSF3 stories with `tags: ['autodocs']` were already required in step 2.
There's no separate "register for VRT" step — `pnpm test:vrt` (Playwright)
discovers stories automatically off the story fixture's own index. If this
component introduces a new visually-meaningful state, add a story for it
now, not as a follow-up; the VRT baseline is generated from whatever stories
exist at capture time.

### Trap: test:vrt needs the story fixture built first, and Windows will show 9 false failures

`tests/components.vrt.spec.ts` reads
`libs/al-web-components/story-fixture/dist/index.json` and Playwright's
`webServer` serves it on `:5178` — build it first (`pnpm run
build:story-fixture`, or `pnpm run build:fixtures` for all fixtures) or the
spec throws instead of running. Separately, 9 of 67 baselines are text-heavy
enough that Linux (CI) and Windows rasterise them differently (alert, banner,
breadcrumbs, heading, pagination, tab-panel, tabs, testimonial, text-block) —
running `test:vrt` on a Windows dev machine reports those 9 as failing even
with no real regression. CI (Linux) is authoritative; never `--update-snapshots`
locally to "fix" that, or the committed baseline stops matching CI.

---

## 6. Docs guidance YAML

Machine-generated docs (props tables, slots, events) come from the CEM for
free. The judgement half does not, and the schema **requires** it — a missing
section fails the Astro build, not just a lint warning
(`apps/docs/src/content.config.ts`).

Create `apps/docs/src/content/guidance/<name>.yaml` (dash name, no `al-`
prefix — matches the CEM slug, i.e. the directory name) with ALL of:

```yaml
purpose: "…"              # >=60 chars, one paragraph, becomes the page lede
whenToUse: ["…", "…"]     # >=2 full sentences
whenNotToUse:              # >=2, each an object
  - text: "…"
    instead: <slug>        # optional — must be a real component slug
dos: ["…", "…"]            # >=2
donts: ["…", "…"]          # >=2
accessibility: ["…"]       # >=1 — real constraints of THIS implementation, not generic WCAG restatement
content: ["…"]             # >=1 — UX writing rules for strings consumers put into this component
sources:                    # >=1
  - path: "libs/al-web-components/components/<name>/<name>.ts"
    contains: "<literal string that must still be in that file>"
    note: "…"               # >=10 chars
```

### Trap: every claim must cite code, and the citation is re-checked against the BUILD

`sources[].contains` is not decoration — `scripts/check-guidance.mjs` re-reads
each citation from the **built** pages and fails when the anchor text moved
or vanished. A source anchor also can't contain `< > & " '` (it's
round-tripped through an HTML attribute — `content.config.ts`'s `anchor`
schema rejects those five characters at author time).

### Trap: brand-layer guidance is namespaced, base library is not

If this component is a brand-layer override (§0) with its own guidance, the
file goes in `apps/docs/src/content/guidance/<project-id>/<name>.yaml`, not
the flat path — a slug stops being unique the moment a layer can override a
base component (`header` means two different things for Altitude vs.
Southleft).

---

## 7. Figma parity

```bash
pnpm run parity:seed
```

Merges a new entry per CEM component into
`.altitude/figma-sync/parity-manifest.json`. **Multi-project** — pass
`--project southleft` (or `:sl` script variants) if this is a Southleft-layer
component.

### Trap: seed does not mean synced

`parity:seed` only stamps `lastSync` (marking a component green) for
components it can actually map to a built Figma set (via the project's
instance map / ops index). A genuinely new component with no Figma set yet
seeds as `figma: null, lastSync: null` — still red/missing in the sidebar,
correctly. Building the actual Figma component set is a separate, manual
step (see the `altitude-figma-sync` skill); only once that's verified do you
run:

```bash
pnpm run parity:synced <al-tag>
```

to stamp it as confirmed-matching. Do not run `parity:synced` speculatively —
it asserts a fact you should have just checked, not a wish.

---

## 8. Component contract

```bash
node scripts/contracts/emit-contracts.mjs --seed --component al-<name>
```

Seeds `.altitude/contracts/altitude/al-<name>.contract.json` (or
`.altitude/contracts/southleft/...` with `--project southleft` / the
`:sl`-suffixed `pnpm run` scripts, for a brand-layer component) — the
canvas-expressible API surface derived from the CEM you just regenerated
(step 3) plus the parity-manifest entry you just seeded (step 7): props,
events, slots, states, anatomy (best-effort, see
`.altitude/contracts/README.md`), a11y facts, code/Figma bindings. See
`.altitude/contracts/README.md` for the full model.

**Run this AFTER step 7 (parity), not before** — `--seed` reads the active
project's parity manifest for the list of tracked tags; a component with no
manifest entry yet has nothing to seed against. Both plop generators print
this exact command in their completion output, so it doesn't need to be
re-derived here.

### Trap: the React wrapper does NOT get a second contract

A contract is keyed by the underlying **web-component tag**, one per
project — not by which package's plop generator you ran. Running
`@southleft/al-react`'s plop generator never seeds a second contract for the
same tag; it only prints a reminder to confirm the WC-side one already
exists.

### Trap: this is a WARNING today, not a blocker

`scripts/component-check.mjs` reports a missing contract the same severity
as a missing parity-manifest entry — a warning, not a blocker (see step 10).
The gate that actually enforces it is CI: `pnpm run gate:contracts` fails
the build if a parity-tracked tag has no contract, an invalid one, or one
that has drifted from the CEM (see `.altitude/contracts/README.md` "CI
gate").

### Regenerate the reference doc (T20)

```bash
pnpm run contracts:docs
```

Builds `.altitude/contracts/docs/altitude/al-<name>.md` (or
`contracts:docs:sl` / `.../docs/southleft/...` for a brand-layer component) —
a GENERATED, human-readable Markdown twin of the contract you just seeded:
structure, props, variant axes, slots (with the Figma placeholder convention
when a slot names one), states, token bindings including per-variant/per-
state `conditionalBindings`, and the Figma set's name/nodeId or the by-name
resolution rule for a set with no pinned id. This is what
`altitude_get_component` serves back as `referenceDoc`, and what
`altitude-figma-sync` reads BEFORE touching this component's Figma set — see
that skill's §0. Run it every time the contract changes; a stale doc is
caught the same way a stale contract is:

### Trap: another warning, not a blocker — but a REAL CI gate

`scripts/component-check.mjs` reports a missing generated doc the same
severity as a missing contract — a warning (see step 10). `pnpm run
gate:contracts`'s `check:contract-docs[:sl]` leg fails the build if a
tracked component's doc is missing OR has drifted from what its contract +
the parity manifest would regenerate — same discipline as `check:llms` for
`llms.txt`. Never hand-edit a file under `.altitude/contracts/docs/`.

---

## 9. Machine docs regeneration

```bash
pnpm run llms:build
```

Regenerates the root `llms.txt` (and the docs-site `llms-*.txt` split files)
from the CEM, the AI-readiness digests, the axe report, and the ds-project
registry. `pnpm run check:llms` (CI) fails if `llms.txt` has drifted from
those committed artifacts — i.e. if you forgot this step after adding a
component, CI catches it, but running it locally first is faster than
waiting for that PR comment.

```bash
pnpm run a11y:report
```

Regenerates `.altitude/a11y/report.json`, which the docs accessibility
panels read.

### Trap: a11y:report needs a STATIC fixture build, never a dev server

`scripts/build-a11y-report.mjs` refuses to take a URL and serves the static
build itself, on its own port. Pointing this at a dev server (or leaving one
running) silently absorbs the run and reports ~300+ false failures that are
15s mount timeouts, not real violations — this was expensive enough to find
that it's recorded twice (script header and
`.mm/specs/2026-08-22-accessibility-remediation/axe-baseline.md`). Storybook
was retired 2026-08-25; use the story fixture instead, which builds and
points this at it in one step:
```bash
pnpm run a11y:report:fixture
```

---

## 10. Verify mechanically

```bash
node scripts/component-check.mjs <al-tag>
```

Checks the blocker items (bundle.ts export, migration.json entry, CEM
present-and-not-stale, component source files) and lists warnings (parity
manifest entry, component contract, React wrapper, guidance YAML, llms.txt
mention, a changeset that mentions the tag). `--json` for machine
consumption, `--strict` to fail on warnings too, `--all` to sweep every
component in the library. Exit 0 = blockers clear.

This does **not** replace the gates below — it's the fast, component-scoped
subset a dev runs before pushing.

---

## 11. Changeset (release notes)

```bash
pnpm dlx changeset
```

Required for any public-API or token change (CONTRIBUTING.md §Changesets).
Pick patch/minor/major per `.altitude/SEMVER.md`. Name the component tag in
the summary — `component-check.mjs`'s changeset check is a heuristic string
search over `.changeset/*.md` and can only find it if you did.

---

## 12. The gates that will catch what you missed

Run locally before pushing, or let CI tell you (slower feedback loop):

| Command | Catches |
|---|---|
| `pnpm run check:jsdoc` | Legacy JSDoc prose dialect, empty `@event` descriptions, duplicate CEM entries |
| `node scripts/check-bundle-completeness.js` | Missing `bundle.ts` export |
| `pnpm lint` | ESLint 9 flat config, typescript-eslint 8 |
| `pnpm run check:llms` | `llms.txt` drifted from the CEM/digests/registry |
| `pnpm run gate:contracts` | Missing/invalid contract for a parity-tracked tag, contract drifted from the CEM, non-deterministic contract derivation, missing/drifted generated reference doc (T20) |
| `pnpm test:vrt` | Visual regression (Playwright) |
| `pnpm gate:self-test` | The P0 migration/baseline gates themselves |
| `node scripts/component-check.mjs <tag> --strict` | Every item in this skill, mechanically, warnings included |

CI additionally enforces guardrails G2 (migration manifest — non-migration
changes to a `legacy` component fail), G6 (hand-edits to `custom-elements.json`
outside the generator pipeline fail), G5 (the whole `v2-checks` workflow), G8
(baseline updates on build/dep bumps). **G7 (decorator semantics) is a review
obligation with no CI job** — nothing asserts it. Full set: `AGENTS.md`
§ "The standing rules (G1–G8)", summarized in CONTRIBUTING.md "Guardrails".

---

## Quick reference — the whole flow

```bash
pnpm --filter @southleft/al-web-components plop                              # 1. scaffold
# 2. implement — AGENTS.md:152-189, 217-245
# 3. bundle.ts export (alphabetical) + .altitude/migration.json entry (alphabetical, no al- prefix)
pnpm --filter @southleft/al-web-components build:custom-elements.json        # 3. CEM
pnpm --filter @southleft/al-react plop                                       # 4. React wrapper
# 5. stories already required in step 2 — nothing extra to run
# 6. apps/docs/src/content/guidance/<name>.yaml — 8 required sections (incl. sources[])
pnpm run parity:seed                                                         # 7. Figma manifest entry (not sync)
node scripts/contracts/emit-contracts.mjs --seed --component al-<name>       # 8. seed the contract
pnpm run contracts:docs                                                      # 8. regenerate its reference doc
pnpm run llms:build                                                          # 9. regenerate llms.txt
pnpm run a11y:report:fixture                                                 # 9. regenerate a11y report (builds the story fixture first)
node scripts/component-check.mjs al-<name>                                   # 10. verify
pnpm dlx changeset                                                           # 11. release notes
```
