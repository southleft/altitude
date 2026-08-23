---
name: altitude-component-authoring
description: "Add a new al- component or change an existing one's public API in libs/al-web-components. Triggers: 'add a new component', 'create a component', 'new al- component', 'component checklist', 'update a component's API', 'scaffold a component', 'ship a component PR'. The checklist is fragmented across plop's console output, AGENTS.md's deliverable table, and steps documented NOWHERE (parity:seed, guidance YAML, llms:build, a11y:report, a changeset) — this skill is the single ordered flow plus every trap that costs an hour to find. Read this BEFORE running plop."
---

# altitude-component-authoring

The end-to-end flow for shipping a component in Altitude — scaffold through
release-ready PR — plus the traps that are not written down anywhere else.

Verify with `node scripts/component-check.mjs <al-tag>` at every stage; it is
the mechanical half of this skill (see step 9). This document is the prose
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
`libs/al-web-components/plop/plop-config.js:9` and
`libs/al-react/plop/plop-config.js:9`. Don't fight it; if it's really layout,
stop here.

**Where** — base library vs. a brand layer. `libs/al-web-components/plop/plop-config.js`
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

Answers: dash-case name, target package, Storybook tier (Atoms = standalone
primitive, Molecules = composes 2+ atoms, Organisms = page-level region).
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
(`libs/al-react/plop/plop-config.js:82`) — it adds
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
discovers stories automatically. If this component introduces a new
visually-meaningful state, add a story for it now, not as a follow-up; the
VRT baseline is generated from whatever stories exist at capture time.

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

## 8. Machine docs regeneration

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

### Trap: a11y:report needs a STATIC Storybook build, never a dev server

`scripts/build-a11y-report.mjs` refuses to take a URL and serves the static
build itself, on its own port. Pointing this at a dev server on 6006 (or
leaving one running) silently absorbs the run and reports ~300+ false
failures that are 15s mount timeouts, not real violations — this was
expensive enough to find that it's recorded twice (script header and
`.mm/specs/2026-08-22-accessibility-remediation/axe-baseline.md`). Build
Storybook first if you need a report that includes the new component:
```bash
pnpm --filter @southleft/al-web-components build:storybook --output-dir ../../dist/storybook/web-components
pnpm run a11y:report
```

---

## 9. Verify mechanically

```bash
node scripts/component-check.mjs <al-tag>
```

Checks the blocker items (bundle.ts export, migration.json entry, CEM
present-and-not-stale, component source files) and lists warnings (parity
manifest entry, React wrapper, guidance YAML, llms.txt mention, a changeset
that mentions the tag). `--json` for machine consumption, `--strict` to fail
on warnings too, `--all` to sweep every component in the library. Exit 0 =
blockers clear.

This does **not** replace the gates below — it's the fast, component-scoped
subset a dev runs before pushing.

---

## 10. Changeset (release notes)

```bash
pnpm dlx changeset
```

Required for any public-API or token change (CONTRIBUTING.md §Changesets).
Pick patch/minor/major per `.altitude/SEMVER.md`. Name the component tag in
the summary — `component-check.mjs`'s changeset check is a heuristic string
search over `.changeset/*.md` and can only find it if you did.

---

## 11. The gates that will catch what you missed

Run locally before pushing, or let CI tell you (slower feedback loop):

| Command | Catches |
|---|---|
| `pnpm run check:jsdoc` | Legacy JSDoc prose dialect, empty `@event` descriptions, duplicate CEM entries |
| `node scripts/check-bundle-completeness.js` | Missing `bundle.ts` export |
| `pnpm lint` | ESLint 9 flat config, typescript-eslint 8 |
| `pnpm run check:llms` | `llms.txt` drifted from the CEM/digests/registry |
| `pnpm test:vrt` | Visual regression (Playwright) |
| `pnpm gate:self-test` | The P0 migration/baseline gates themselves |
| `node scripts/component-check.mjs <tag> --strict` | Every item in this skill, mechanically, warnings included |

CI additionally enforces guardrails G2 (migration manifest — non-migration
changes to a `legacy` component fail), G6 (hand-edits to `custom-elements.json`
outside the generator pipeline fail), G7 (decorator semantics), G8 (baseline
updates on build/dep bumps). Full set: `NEXT-GEN-UPGRADE-PLAN.md` §1,
summarized in CONTRIBUTING.md "Guardrails".

---

## Quick reference — the whole flow

```bash
pnpm --filter @southleft/al-web-components plop                              # 1. scaffold
# 2. implement — AGENTS.md:152-189, 217-245
# 3. bundle.ts export (alphabetical) + .altitude/migration.json entry (alphabetical, no al- prefix)
pnpm --filter @southleft/al-web-components build:custom-elements.json        # 3. CEM
pnpm --filter @southleft/al-react plop                                       # 4. React wrapper
# 5. stories already required in step 2 — nothing extra to run
# 6. apps/docs/src/content/guidance/<name>.yaml — 7 required sections + sources[]
pnpm run parity:seed                                                         # 7. Figma manifest entry (not sync)
pnpm run llms:build                                                          # 8. regenerate llms.txt
pnpm run a11y:report                                                         # 8. regenerate a11y report (static build first)
node scripts/component-check.mjs al-<name>                                   # 9. verify
pnpm dlx changeset                                                           # 10. release notes
```
