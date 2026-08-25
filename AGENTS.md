# AGENTS.md — Altitude design system

This file is the **agent contract** for the Altitude design system. AI coding
agents should read it before authoring or modifying component code.

## What this repo is

A monorepo on **pnpm 9 workspaces** (Node 22 LTS) shipping two libraries:

- `@southleft/al-web-components` — Lit 3.3 web components (~65 today, evolving via the
  v2 refactor at `NEXT-GEN-UPGRADE-PLAN.md`).
- `@southleft/al-react` — `@lit/react` wrappers, one per web component (React 19).

Plus a brand layer: `@southleft/sl-web-components` (`libs/sl-web-components`) — Southleft's
9 opinionated section components on top of the base library. Read
[`.altitude/BRAND-LAYER.md`](./.altitude/BRAND-LAYER.md) before touching it.
For the full dev-workflow map — which commands, gates, skills, and docs apply
to each kind of change — start at [`.altitude/WORKFLOWS.md`](./.altitude/WORKFLOWS.md).

## The refactor governs everything

There's an active multi-phase refactor described in
[`NEXT-GEN-UPGRADE-PLAN.md`](./NEXT-GEN-UPGRADE-PLAN.md). **All changes must
map to a plan task** (T0.x, T1.x, …) or be explicitly flagged as out-of-plan
in the PR description. Eight non-negotiable guardrails (G1–G8), defined in
[`NEXT-GEN-UPGRADE-PLAN.md` §1](./NEXT-GEN-UPGRADE-PLAN.md). **Four have a CI
job that can fail** (G2, G5, G6, G8); the other four are review obligations —
no script can check them, so they are on you and the PR reviewer:

- **G1 — Evolve, don't rebuild.** *(review obligation)*
- **G2 — `legacy` components are read-only** outside migration PRs. State is
  tracked in [`.altitude/migration.json`](./.altitude/migration.json); see
  [`.altitude/migration.schema.json`](./.altitude/migration.schema.json).
  *(CI: `migration-gate`, `schema-validate-migration`, `gate-self-test`)*
- **G3 — Prove every new pattern on the 5 pilot components first**:
  `button`, `input`, `select`, `dialog`, `theme-switcher`. *(review obligation)*
- **G4 — Codemod-or-rebuild.** If an automated codemod cannot bridge a
  component, that slice earns a clean rewrite — surfaced in the PR, never
  silent. *(review obligation)*
- **G5 — Green gate between phases.** install + typecheck + lint +
  unit/interaction tests + VRT + Storybook build all green before the next
  phase starts. *(CI: the whole `v2-checks` workflow is this gate)*
- **G6 — Contracts are generated** (CEM → schemas → AGENTS.md → validator).
  Hand-edit JSDoc and types; everything else is downstream.
  *(CI: `cem-and-contracts`, `jsdoc-dialect` — the `cem-and-contracts` job
  regenerates the chain and `git diff --exit-code`s it, so a JSDoc edit that
  was not regenerated fails)*
- **G7 — Decorator semantics frozen**: `experimentalDecorators: true`,
  `useDefineForClassFields: false`. Don't touch. *(review obligation — no
  script asserts it)* The setting that decides the **shipped** semantics is
  esbuild's, not tsc's: `libs/al-web-components/vite.config.mjs:119-123` (and
  `vite.spike.config.mjs:44-45`), plus both Storybook configs
  (`@southleft/al-web-components/.storybook/main.ts:177-178`,
  `@southleft/al-react/.storybook/main.ts:152-153`). `libs/al-web-components/tsconfig.json:21`
  sets only `useDefineForClassFields: false` and deliberately omits
  `experimentalDecorators` — it is `emitDeclarationOnly`, and `@property accessor`
  auto-accessors type-check identically either way (verified: `tsc --noEmit`
  exits 0 with and without the flag). `libs/al-react/tsconfig.json:56-57` sets
  both, because it emits JS.
- **G8 — Baselines move with build/dep changes**: token snapshot, bundle
  size, and VRT live at [`.altitude/baselines/`](./.altitude/baselines/).
  Adding a token, brand, or theme requires regenerating
  `.altitude/baselines/tokens/snapshot.json` in the same PR — CI compares its
  sha256 with no tolerance. Procedure:
  [`.altitude/TOKENS.md` § "Rebaselining after a token change"](./.altitude/TOKENS.md#rebaselining-after-a-token-change).

## Where to look for things

| Need | Location |
|---|---|
| Plan + phase gates | [`NEXT-GEN-UPGRADE-PLAN.md`](./NEXT-GEN-UPGRADE-PLAN.md) |
| Token engine docs | [`.altitude/TOKENS.md`](./.altitude/TOKENS.md) |
| Design-system projects (which Figma file each DS is checked against) | [`.altitude/ds-projects.json`](./.altitude/ds-projects.json) + [`.altitude/DS-PROJECTS.md`](./.altitude/DS-PROJECTS.md) — **parity is multi-project.** `altitude` is the default; `southleft` targets the "Southleft V5" file. Select with `--project <id>` or `DS_PROJECT`. Never hardcode a Figma file key, manifest path or "Altitude" string in parity tooling again — read it from the registry. Validate with `pnpm run check:ds-projects`. |
| Brand contract + token reachability map | [`.altitude/BRANDS.md`](./.altitude/BRANDS.md) — **read before editing any `tier-2/brand/` file.** A brand carries the whole look (typography, radius, shadow, border width, spacing), and several obvious overrides are inert: `--al-theme-typography-*` has zero consumers, `theme.space.{sm,md,lg}` belongs to the `density` axis, `theme.border.radius.sm` is unused, and `letterSpacing` is dropped by the formatter. **Adding a *new* brand** (not editing an existing one) is § 9 of that doc — an ordered ~8-site checklist; there is no scaffold, and `altitude_generate_theme` is not one. |
| Build pipeline docs | [`.altitude/BUILD.md`](./.altitude/BUILD.md) |
| Pinned target versions | [`.altitude/targets.json`](./.altitude/targets.json) |
| Migration manifest | [`.altitude/migration.json`](./.altitude/migration.json) |
| Custom Elements Manifest (CEM) | [`libs/al-web-components/custom-elements.json`](./libs/al-web-components/custom-elements.json) |
| Per-component schemas (T3.2) | [`libs/al-web-components/schemas/`](./libs/al-web-components/schemas/) — see [Component schema index](./libs/al-web-components/schemas/INDEX.md) |
| Pilot web components | `libs/al-web-components/components/{button,input,select,dialog,theme-switcher}/` |
| Pilot React wrappers | `libs/al-react/src/components/{Button,Input,Select,Dialog,ThemeSwitcher}/` |
| Tokens (DTCG source) | `libs/al-web-components/styles/tokens-dtcg/` |
| Base class | `libs/al-web-components/components/ALElement.ts` |
| Registry (versioned tags) | `libs/al-web-components/directives/register.ts` |

## How to verify your change

```bash
# Whole-pipeline smoke test:
pnpm --filter @southleft/al-web-components build:tokens                # Style Dictionary v5 (the only token pipeline)
pnpm --filter @southleft/al-web-components test:tokens                 # token contract tests vs .altitude/baselines/
pnpm test:brands                                            # brands must differ beyond colour; no inert overrides
pnpm brands:compare                                         # rendered side-by-side check → .altitude/visual-compare/brands.dark.png
pnpm --filter @southleft/al-web-components build                       # library build (Vite)
pnpm --filter @southleft/al-web-components build:storybook \
    --output-dir ../../dist/storybook/web-components        # Storybook static
pnpm --filter @southleft/al-web-components build:custom-elements.json  # CEM regenerate
node scripts/check-cem-coverage.js                          # T3.1 acceptance
pnpm test:vrt                                               # Playwright VRT
pnpm gate:self-test                                         # G2/G8 gate scripts
pnpm lint:styles                                            # Stylelint: literal colours + hallucinated token names
pnpm check:llms                                             # the generated root llms.txt still matches its sources
```

If any of the above is red, the change isn't ready to commit.

### If you touched a stylesheet

`pnpm lint:styles` runs two rules over every `.scss` file in both component libraries and
every example app (`stylelint.config.mjs`), and it is currently at **zero** violations:

- **a literal colour** in a colour property — `color: #4375ff` renders identically to
  `color: var(--al-theme-color-content-primary-default)` and is invisible in review, but it
  does not move with a brand, a mode or a contrast setting;
- **a hallucinated token name** — `var(--al-theme-focus-ring-color)` is not a CSS error. It
  falls back silently, so the page renders and is quietly wrong. The rule is fed the real
  token set from `.altitude/ai-readiness/tokens-digest.json`.

`pnpm lint:styles:report` adds the sites' hand-written `.css`, where 21 pre-existing
violations live; they are reported, never disabled. `pnpm gate:styles-new` holds the line
there by checking only the lines a branch changed.

### Validate your DS usage, then self-heal

When you author or edit code that **consumes** Altitude — `<al-*>` custom elements in any
markup (HTML / Svelte / Astro / Angular / Lit templates) or `@southleft/al-react` `<AL*>` JSX wrappers —
run the usage validator and fix what it reports before moving on:

```bash
npx altitude-validate <file-or-dir>          # human report, non-zero exit on any violation
npx altitude-validate --json <file-or-dir>   # one JSON envelope on stdout (for a self-heal loop)
pnpm --filter @southleft/al-web-components validate:usage <file-or-dir>   # in-repo equivalent
```

It checks each usage against the shipped CEM and returns violations with a stable `code`
(`ERR_UNKNOWN_COMPONENT`, `ERR_UNKNOWN_ATTRIBUTE`, `ERR_INVALID_ENUM`, `ERR_TYPE_MISMATCH`), a
did-you-mean `suggestion`, and a concrete `fix`. **Self-heal loop:** run `--json` → for each
violation apply its `fix` (full recipe in [`libs/al-web-components/cli/REPAIR.md`](./libs/al-web-components/cli/REPAIR.md),
keyed by `code`) → re-run until exit 0. If a fix would require inventing an element, attribute, or
value that doesn't exist, **stop and report the gap** — don't fake it past the design system.

### MCP server (T7.2)

For an agent connected over MCP rather than shelling out, [`libs/altitude-mcp`](./libs/altitude-mcp)
is a stdio server exposing the same contract surface as eight tools: `altitude_list_components`,
`altitude_get_component`, `altitude_validate` (wraps the CLI above, same codes), `altitude_get_tokens`
(tier/brand/mode-filtered), `altitude_search_icons` (the 1,512-glyph Phosphor catalog),
`altitude_generate_theme` (the deterministic OKLCH solver — never calls an LLM),
`altitude_check_parity` (per-project Figma ↔ code parity, each entry carrying a ready-to-run
`aiPrompt`), and `altitude_list_ds_projects` (the design systems this repo drives, from
`.altitude/ds-projects.json`). It is a reader of the same generated artifacts as everything else
on this page, never a second source of truth. Registered in [`.mcp.json`](./.mcp.json) as
`altitude` (stdio); `pnpm --filter @southleft/al-web-components start` also serves it over HTTP
on :6017 (`POST /mcp`, `GET /parity.json`). See
[`libs/altitude-mcp/README.md`](./libs/altitude-mcp/README.md) for the full tool contract and
example calls. (`pnpm run check:mcp-docs` asserts this list matches the registered tools.)

It also exposes **resources** (7: 6 fixed-URI artifacts under `altitude://` — CEM, resolved
tokens, the a11y report, the two ai-readiness digests, the ds-project registry — plus one
`ResourceTemplate`, `altitude://parity-manifest/{project}`, since the parity manifest is the one
artifact that's genuinely per-design-system) and **prompts** (4: `audit_component_parity`,
`generate_brand_theme`, `check_snippet_convention`, `scaffold_component`, each grounded in a real
engine/skill/gate — see `libs/altitude-mcp/src/lib/{resources,prompts}.mjs`). Both degrade the same
way the tools do: a missing/malformed artifact reads back as structured JSON, never a crash or a
thrown protocol error. Full intent → surface → required filters → expected fields → common failure
mode table (Carbon's format, generated from a live handshake, not hand-written):
[`libs/altitude-mcp/CAPABILITY-MATRIX.md`](./libs/altitude-mcp/CAPABILITY-MATRIX.md).

## Component authoring rules (per pilot pattern)

For a web component (`libs/al-web-components/components/<name>/`):

1. Class extends `ALElement`. Tag name on `static el`.
2. Use Lit `@property accessor foo: T` for reactive properties.
3. JSDoc above each `@property` is the documentation source. **Keep it.**
4. Slot/event/CSS-part docs go in the class-level JSDoc using
   `@slot`, `@event`, `@csspart`, `@cssproperty` tags (the CEM picks
   these up; the legacy `* - **slot**:` prose is being codemodded out).

   **`@cssproperty` semantics — important.** This tag documents the
   component's **OWN public override surface** — the
   `--al-<component>-<role>` variables that consumers can set to
   customize a single instance without touching the theme. It does
   **NOT** enumerate the global `--al-theme-*` tokens the component
   merely consumes. Example: `<al-button>` exposes
   `--al-button-background` as its own override hook (a `@cssproperty`);
   the `--al-theme-color-background-default` token it falls back to is
   NOT a `@cssproperty` of al-button. Over-documenting consumed theme
   tokens pollutes the manifest with cssproperties the component
   doesn't actually own, degrading the digest's value for downstream
   agents.

   **A new component-owned override hook is INTENTIONALLY absent from
   the tokens digest.** The tokens digest enforces "no fabricated
   `--al-theme-*` names" — it does NOT forbid you from declaring a
   brand-new `--al-<component>-<role>` override hook for your own
   component. The two are different surfaces:
   - Consumed theme tokens (`--al-theme-color-background-default`) →
     must exist in the tokens digest (digest is the contract).
   - Owned component override hooks (`--al-stat-value-color`) →
     declared by the component itself, documented via `@cssproperty`,
     wired in SCSS with a `var(--al-theme-*, …)` fallback. The digest
     intentionally does not list these.
   If a recipe / precedent tells you to declare a new
   `--al-<component>-*` hook, the absence of that name from the
   tokens digest is correct — emit the hook anyway.
5. Styles imported from the sibling `.scss` and exposed via
   `static get styles() { return unsafeCSS(styles.toString()); }`.
   The Vite build re-routes `*.scss` → `*.scss?inline` automatically.
6. **Two registration helpers — different audiences. Don't confuse them.**
   - **`registerAltitude({ mode, suffix? }, elements)`** is the
     **consumer-facing** entry point. An app calls it ONCE at boot to
     register a set of Altitude components into `customElements`.
     Modes: `stable` (plain tags), `versioned` (suffixed for MFE
     coexistence), `manual` (caller owns `customElements.define`).
   - **`register({ elements: [[tagName, ClassRef]], suffix?, prefix? })`**
     is the **intra-component** helper used by composites that inject
     sub-components into their own template (e.g. `al-chip` injects
     `al-icon-close`). It returns a `Map<originalTag, registeredTag>`
     consumed by `unsafeStatic` in the render template. The canonical
     shape mirrors `chip.ts`:
     ```ts
     private elementMap = register({
       elements: [[ALIconClose.el, ALIconClose]],
       suffix: (globalThis as any).alAutoRegistry === true ? '' : PackageJson.version
     });
     private iconCloseEl = unsafeStatic(this.elementMap.get(ALIconClose.el));
     ```
     Every shipped composite uses this — `chip.ts`, `alert.ts`,
     `toast.ts`, etc. — and that is correct; do NOT replace those
     with `registerAltitude`. **`elements` is an array of
     `[tagName, ClassRef]` tuples; do not pass a `{ key: ClassRef }`
     object map (that signature does not exist).**

   Quick rule: if you're an APP, call `registerAltitude`. If you're a
   COMPONENT composing sub-components, call `register`.

### "New component" deliverable checklist

When scaffolding a brand-new component, every box below ships in the
same PR. The **severity** column tells you what to flag (vs emit) when
a scaffolding-only task can't include a downstream generator, and how to
weight an omission in a code review:

- `blocker` — hand-authored source the scaffolder MUST emit; missing it
  ships a broken component.
- `high` — generated artifact that should ship in the same PR; the
  scaffolder may FLAG it as a required follow-up if it can't run the
  generator itself.
- `medium` — bookkeeping; small enough that a reviewer can fix it inline
  without re-running the scaffolder.

| Severity | Item |
|---|---|
| **blocker** | **Component class** at `libs/al-web-components/components/<name>/<name>.ts` — extends `ALElement`, `static el = 'al-<name>'`, `@property accessor` properties with JSDoc, class-level `@slot` / `@event` / `@csspart` / `@cssproperty` tags **only where applicable** (a display-only atom legitimately has no `@event`; do not invent events to satisfy the tag). |
| **blocker** | **Self-register guard** at the bottom of the .ts file, matching the pilot pattern:<br /><br />`if ((globalThis as any).alAutoRegistry === true && customElements.get(ALFoo.el) === undefined) { customElements.define(ALFoo.el, ALFoo); }` |
| **blocker** | **`HTMLElementTagNameMap` declaration** at the bottom of the .ts file, so consumer TypeScript gets the right type for `document.querySelector('al-foo')`. |
| **blocker** | **Sibling `.scss`** that `@use '../../styles/component' as *;` and wraps rules in `@layer al.component { … }`. Use the `:host { display: contents }` pattern + style the inner element when you need a transparent host. |
| **blocker** | **Compose arrangement with `<al-layout>` — never re-implement it.** A new component or page section MUST NOT introduce its own `direction` / `orientation` / `gap` / `align` / `alignment` / `justify` / `behavior` / `wrap` property, and MUST NOT hand-roll `display: flex` / `display: grid` in its `.scss` to arrange SLOTTED children. Nest slotted content in `<al-layout>` instead. Internal shadow-DOM structure of an atom (positioning an icon against a label, say) is exempt — the rule is about arranging content the consumer provides. **Do not create a new `*-group` wrapper.** If you think you need one, you need `<al-layout>` plus, at most, a semantic component that owns ONLY the semantics (see "Arrangement vs. semantics" below). |
| **blocker** | **Focus ring on every interactive control** — `&:focus-visible { @include al-focus; }` on the inner clickable / focusable element. Never re-author an outline. This is non-negotiable for buttons, links, dismissible chips, menu items, anything that takes focus. |
| **blocker** | **Storybook stories** at `<name>.stories.ts` — CSF3 object stories with `tags: ['autodocs']`, one story per visually-meaningful state. |
| **blocker** | **`bundle.ts` export** — add one alphabetical `export … from './<name>/<name>'` line **in place** in the existing file.

| **high** | **React wrapper** generated by `pnpm --filter @southleft/al-react plop`. May be FLAGGED as follow-up if the scaffolder can't run plop. |
| **high** | **CEM regeneration** — run `pnpm --filter @southleft/al-web-components build:custom-elements.json` after JSDoc edits so the manifest reflects new slots / events / cssparts. May be FLAGGED as follow-up. |
| **medium** | **`.altitude/migration.json` entry** — net-new components start in state `scoped-complete` (no `dual` / `legacy` transition needed) with `react19: true, headless: …, ssr: …` reflecting the actual surface. **Policy is all-or-nothing per PR: if you emit ANY file (bundle.ts, the .ts source, .scss, .stories.ts), you MUST also emit the entire `migration.json` with the new key inserted alphabetically. Flagging migration.json as follow-up is acceptable ONLY when you emit zero files (pure-review or analysis tasks).** Never emit some files and flag others — that produces inconsistent, incomplete PRs. |

### Arrangement vs. semantics — the group-component rule

Altitude has **one** arrangement primitive: `<al-layout>`. Everything about
where boxes sit — direction, gap, alignment, distribution, wrapping, stretch,
the sidebar and container shells — lives there and nowhere else.

A component earns its own existence only when it owns **semantics**, meaning
something a layout box cannot express:

| Component | Why it exists (NOT layout) |
|---|---|
| `al-checkbox-group` | `<fieldset>` / `<legend>` grouping, field-note + error-note, cascades `isRequired` / `isDisabled` to children |
| `al-radio-group` | the above, plus arrow-key roving selection and single-selection enforcement |
| `al-toggle-button-group` | single-select state and click-outside deselection |

`al-button-group`, `al-layout-container`, `al-layout-section`, `al-bento-grid`
and `al-split-content` have all been **removed** — none owned semantics, only
arrangement. `al-chip-group` and `al-toast-group` were removed too: they DID
own behaviour (the "+N" overflow counter; viewport-fixed positioning and
auto-close), but nothing in the system used it, so the components were cut
rather than carried. Chips now sit in an `<al-layout direction="row" wrap>`,
and a toast positions itself. The replacements, in order: `al-button-group` →
`<al-layout direction="row">`, `al-layout-container` →
`<al-layout variant="constrained">`, `al-layout-section` → a plain child of the
constrained layout, `al-bento-grid` → `<al-layout variant="bento">`, and
`al-split-content` → `<al-layout direction="row" wrap>` plus a theme class.
The `sidebar-left` / `sidebar-right` variants are gone too — a page declares
its own track list via `--al-layout-template`. That is the test:
**if a wrapper would own no behavior, no ARIA relationship, and no state, it is
not a component — it is `<al-layout>` with props.**

When you touch one of the semantic components above, strip arrangement props
from it rather than adding more; the arrangement belongs to the `<al-layout>`
its content nests in.

**Reviewer note — generated artifacts are STILL reportable.** When
reviewing a new-component PR, the absence of any checklist item —
including the `high`-tier generated artifacts (React wrapper, CEM
regeneration) and the `medium`-tier `migration.json` entry — is a
**reportable finding at its listed severity**, even if the PR only
shows source files. Do not silently treat "out of scope of this diff"
as "not a violation." The severity column tells you the weight; the
existence of a missing item is always reportable.

**`bundle.ts` safety note — do not emit a single-line `bundle.ts` as
your output.** The file is hand-maintained and currently exports ~65
components. Writing your output to the path literally with only one
line wipes every other component. If your scaffolder emits files as
`{path, content}` objects, the content for `bundle.ts` MUST be the
entire file with the new line inserted alphabetically — or your fix is
a patch, not a full-file replacement. The pattern in the existing file
is:

```ts
export { ALAccordion } from './accordion/accordion';
export { ALAccordionPanel } from './accordion-panel/accordion-panel';
// …65 more lines, alphabetical by tag name…
export { ALToggle } from './toggle/toggle';
```

When unsure, Read `libs/al-web-components/components/bundle.ts` first
and emit the full file with one new export added.

A display-only atom (badge, chip, stat-card) does not need a play test
or interaction handler. An interactive composite (menu, dialog) does.

### Naming and API conventions

These conventions are enforced by convention (not lint yet) and used across
every shipped component. Mirror them when scaffolding a new component:

| Severity | Concern | Convention | Example |
|---|---|---|---|
| **blocker** | **Class name** | PascalCase with a **capitalized `AL`** prefix — `ALTag`, not `AlTag`. Must match the `bundle.ts` export and the `HTMLElementTagNameMap` value. | `export class ALStatCard extends ALElement` |
| **blocker** | **Primary action** | `<al-button>` with **no** `variant` attribute — "primary" is the implicit default. The `variant` enum is only `'secondary' \| 'tertiary' \| 'bare' \| 'danger'`. | `<al-button>Save</al-button>` |
| **blocker** | **Boolean property names** | Prefix with `is*` (state) or `has*` (capability) | `isDisabled`, `isPressed`, `isExpanded`, `hasBadge` |
| **blocker** | **Event names** | Camel-case `on<Component><Action>` | `onChipClose`, `onMenuItemSelect`, `onAccordionPanelOpen` / `onAccordionPanelClose` |
| **blocker** | **Event dispatch** | Use `this.dispatch({ eventName, e, detailObj })` — the ALElement helper, not raw `dispatchEvent` | see "ALElement public API" below |
| **enhancement** | **Component-tier CSS variables** | **OPTIONAL** for display atoms (badge, chip, stat-card) — the canonical chip precedent references `--al-theme-*` tokens directly without an intermediate `--al-<component>-*` hook. Use `--al-<component>-<role>` with a `var(--al-theme-*, …)` fallback ONLY when the component needs a *named, documented override surface* (e.g. `al-button` exposes `--al-button-background` so consumers can override per-button without forking the theme). Absence is NOT a violation. | `var(--al-button-background, var(--al-theme-color-background-default))` for an interactive control; bare `var(--al-theme-color-content-default-weak)` for a display atom |
| **blocker** | **Typography** | Set type via the `al-theme-typography-*` mixins (`@include al-theme-typography-display-sm-bold;`, `@include al-theme-typography-body-sm;`, etc.). Do NOT hand-assemble from raw `--al-font-size-*` / `--al-font-weight-*` / `--al-line-height-*` primitives. The mixins live in `libs/al-web-components/styles/core/mixins/typography.scss`. | `@include al-theme-typography-heading-md-bold;` |
| **blocker** | **BEM class prefix** | `al-c-<component>` for the root element, `al-c-<component>__<part>` for parts, `al-c-<component>--<modifier>` for variants | `.al-c-button`, `.al-c-button__icon`, `.al-c-button--danger` |
| **blocker** | **SCSS cascade layer** | Wrap every rule in `@layer al.component { … }` so consumers can override via the `al.override` layer | (see `components/divider/divider.scss`) |
| **blocker** | **SCSS module imports** | `@use '../../styles/component' as *;` (modern Sass module system — no `@import`) | top of every leaf component .scss |
| **blocker** | **`bundle.ts`** | **Hand-maintained, alphabetical.** Add one `export …` line for every new component. The bundler picks it up. | `libs/al-web-components/components/bundle.ts` |
| **medium** | **Storybook taxonomy** | Title prefix decides folder. `Atoms/X` = standalone primitive (single tag, no composition). `Molecules/X` = composes 2+ atoms. `Organisms/X` = page-level region (header/layout). `Templates/X` = full page templates. | `title: 'Atoms/Stat Card'` |
| **medium** | **Story format** | **CSF3 object stories** is the target for new components — `const meta = { title, component, tags: ['autodocs'], parameters, argTypes }; export default meta; export const Default = { args: {…} };`. Existing chip/badge precedents still use CSF2 `Template.bind({})` and will be migrated; do not copy that pattern into new stories. Always provide an explicit `render: (args) => html\`…\``  — don't rely on a default Lit renderer. | new component: CSF3; legacy precedent: CSF2 (pending migration) |
| **blocker** | **Display numerics** | Type the value prop as `string` (not `number`). Consumers own locale formatting / digit grouping / unit suffixes; an internal `Intl.NumberFormat` in a display-only atom imposes a locale on every consumer. | `@property() accessor value: string;` on `<al-stat value="1,234">` |

### Precedent map — which existing component to mirror

When scaffolding a new component, **start from a precedent**. The matrix
below points at the closest existing analog; copy its file shape, naming
patterns, and JSDoc style.

| If your new component is… | Mirror | Why |
|---|---|---|
| **Small inline labeled atom** (badge/pill/chip-like, dismissible) | `al-chip` | Has `isDismissible` / `isDismissed` boolean prefix and the `onChipClose` event — the canonical small-atom pattern. See "Canonical dismissible-atom recipe" below. |
| **Metric / stat with directional indicator** (KPI card, stat tile) | `al-badge` (status surface) + compose `<al-icon name="caret-up">` / `<al-icon name="caret-down">` for trend direction | See the full canonical contract immediately below the precedent map — taxonomy, visual surface, value typography, owned hooks, trend polarity. |
| **Notification banner** (auto-dismiss, multiple variants) | `al-toast` | Variant-based status surface with timed dismissal |
| **Static labeled atom** (no interaction, just a swatch + number) | `al-badge` | Variant-driven display-only atom |
| **Expandable section** | `al-accordion-panel` | Open/close state pattern, slotted content |
| **Trigger-and-floating-content composite** (kebab menu, tooltip on click) | `al-popover` + child content | See "Composition recipes" below — trigger slot pattern |
| **Form input wrapper** | `al-input` | Field-note + variant + isRequired/isDisabled state pattern |
| **Page section** | `al-layout` (`variant="container"`) | Cascade-layer + max-width pattern |

If nothing matches: copy the *most recently shipped* atom (`al-chip` is the
current freshest convention) and ask for review.

### `al-stat-card` and `al-tag` are NOT components — do not build them

Neither exists in `libs/al-web-components/components/`, in
`custom-elements.json`, or in `.altitude/migration.json`. They are the subjects
of the AI-readiness eval (`scripts/ai-readiness/tasks/B-scaffold.md` scaffolds
`<al-stat-card>`; `C-violation.md` reviews a non-conformant `<al-tag>` PR), and
`build-cem-digest.mjs` emits them as `FORWARD_STUBS`.

**They duplicate shipping components exactly.** For a metric / KPI tile use
[`al-stat`](./libs/al-web-components/components/stat/); for a small dismissible
inline label use [`al-chip`](./libs/al-web-components/components/chip/).

Their pinned contracts — which this document used to carry, at the cost of
telling agents to build redundant components and of parking the eval's answer
key inside the document the eval measures — now live at
[`scripts/ai-readiness/fixtures/canonical-contracts.md`](./scripts/ai-readiness/fixtures/canonical-contracts.md).
Read them only when working ON the eval harness.

### Canonical dismissible-atom recipe (from `al-chip`)

Use this as the spine for any small inline atom (chip/pill/tag/tagging
input). The contract is intentionally narrow — controlled `close()` is
acceptable, but owning state (`isDismissed` toggle + the
`al-is-dismissed` hide class) is canonical because it removes the
consumer's burden of wiring up the close event.

> **⚠ Reviewer must-read.** Two patterns are equally sanctioned:
> (a) the component **owns** `isDismissed` + `al-is-dismissed` class
> (canonical), or (b) the component exposes a **controlled `close()`**
> method with NO owned `isDismissed` state (consumer-orchestrated).
> Pattern (b) is correct, supported, and shipped. **Reviewers — do
> NOT flag pattern (b) as a violation.** Specifically, do NOT write a
> finding that says "missing isDismissed property", "missing
> al-is-dismissed hide class", "missing close handler that toggles
> state", or similar — those are pattern-(a) requirements, not
> universal ones. Cite the "Dismissal model" row below for the
> authoritative shape.

The **Severity** column maps to the same scale as the new-component
checklist: `blocker` is a must (its absence is a hard convention
violation); `enhancement` is nice-to-have (its absence is NOT a
violation — do not flag it in reviews).

| Severity | Concern | Pattern |
|---|---|---|
| **blocker** | **Host display** | `:host { display: contents; }` — the host has NO visual properties of its own. Never set `display: inline-block` / `padding` / `border-radius` / `font-family` on `:host`; style the inner `.al-c-<name>` instead. |
| **blocker** | **Dismissal model** | EITHER own `isDismissed` state (canonical: `isDismissible: boolean` capability + `isDismissed: boolean` state toggled by `close()`, with `.al-is-dismissed { display: none }`) OR expose a controlled `close()` method without owning `isDismissed` (the consumer's container manages dismissal — chip groups, tag lists in a form). **Both shapes are acceptable. Do NOT flag a controlled `close()` as a violation.** |
| **blocker** | **Boolean props (when owning state)** | `isDismissible: boolean` (capability) + `isDismissed: boolean` (state) — the `is*` prefix applies. |
| **blocker** | **Close event** | `this.dispatch({ eventName: 'onChipClose' })` (use ALElement's dispatch — bubbles + composed). Mirror the tag name in the event: an `al-<name>` atom dispatches `on<Name>Close`. |
| **blocker** | **Focus ring** | `&:focus-visible { @include al-focus; }` on the inner clickable element. Never re-author an outline rule. (Already in the blocker checklist; restated here for visibility.) |
| **blocker** | **Padding / radius / color tokens** | `padding: var(--al-theme-space-xxs) var(--al-theme-space-sm);`, `border-radius: size(4);` (NOT `--al-theme-border-radius-round` — that's `50%` = circle, not pill), `color: var(--al-theme-color-content-default-weak);`. Token names must verify against the digest. |
| **blocker** | **Internal gap** | `gap: var(--al-theme-space-xs);` |
| **blocker** | **Hide-when-dismissed** | `.al-is-dismissed { display: none; }` inside `@layer al.component { … }`. (Only required when owning `isDismissed`; controlled-close hosts skip this.) |
| **enhancement** | **Close keyboard** | `handleOnKeydown(e)` on the host: if `e.code === 'Escape' && this.isDismissible` call `close()`. Nice-to-have for keyboard parity; not a review-blocker if absent on a small atom. |
| **enhancement** | **Close icon composition** | Compose `<al-icon name="x">` registered via `register({ elements: [[ALIcon.el, ALIcon]], suffix })` + `unsafeStatic` (see "Two registration helpers" rule above), with an accessible name on the surrounding button. The component may instead accept the icon via a slot — both are sanctioned. (Was `<al-icon-close>`; that element still renders, but see "Icon system" below — `name=` is the canonical form for new code.) |

_The "Dismissal model" row above is the single source of truth on
this. The owned-state shape is the canonical recipe spine; the
controlled-`close()` shape is equally sanctioned. Reviewers — do not
flag controlled-close as a violation._

### Composition recipes — canonical patterns

When you're composing existing components into a pattern, prefer the
recipes below over inventing wiring. Every recipe was derived from a
shipped story or page template.

**Kebab menu (3-dot action menu):**

```html
<al-popover variant="menu" position="bottom-right">
  <al-button slot="trigger" variant="tertiary" hideText label="Open actions"
             ariaControls="actions-menu">
    <al-icon name="dots-three-vertical" slot="before" iconTitle="Actions"></al-icon>
  </al-button>
  <al-menu id="actions-menu" label="Actions">
    <al-menu-item label="Edit">Edit</al-menu-item>
    <al-menu-item label="Delete">Delete</al-menu-item>
  </al-menu>
</al-popover>
```

`al-popover` `position` is one of: `bottom-center` | `bottom-right` | `bottom-left` | `top-center` | `top-right` | `top-left` | `left` | `left-top` | `right` | `right-top` — no `*-end` / `*-start` aliases. `variant="menu"` is the only variant value.

**Anchoring guidance:** for a kebab in `al-card`'s `action-right` slot (top-right corner), use `position="bottom-right"` so the menu opens DOWNWARD and AWAY from the edge of the card. The rule: pick the `position` whose first segment is the OPPOSITE side of the trigger's location (trigger top → menu `bottom-*`, trigger right edge → menu `*-right` so it opens inward).

**Event bind site:** `onMenuItemSelect` is dispatched by `<al-menu-item>` with `bubbles: true, composed: true`, so it surfaces on the surrounding `<al-menu>`. **The canonical bind site is on `<al-menu>`, not the individual items** — the event carries the selected item's `value` in `e.detail`:

```html
<al-menu @onMenuItemSelect=${(e) => handleSelect(e.detail.value)}>
  <al-menu-item value="edit" label="Edit">Edit</al-menu-item>
  …
</al-menu>
```

**Card with a primary action in the corner:**

```html
<al-card>
  <div slot="header">Title</div>
  <p>Body</p>
  <al-button slot="actions-end">View</al-button>
</al-card>
```

`al-card` slots map to corners: `header` (top, full-width), `image` (top,
flush), `action-right` (top-right, single control like a kebab),
`actions-start` (bottom row, leading edge), **`actions-end`** (bottom
row, trailing edge — the canonical bottom-right primary action), default
slot (body).

**Header row / atom cluster inside a slot:**

A common pattern — avatar + display name + status badge sitting on one
line — projects multiple atoms into a single slot. Two important rules:

1. **`al-u-*` utilities only adopt into `al-*` shadow roots, NOT into
   light-DOM `<div>`s projected into slots.** A plain `<div
   class="al-u-gap-sm">` inside `slot="header"` does NOT pick up the
   utility class — the rule only lives in shadow trees that adopted
   the shared utility sheet via `ALElement.getSharedThemeSheet()`.
2. **`<al-layout>` is the arrangement primitive — use it for the cluster.**
   It exposes `direction="row|column"`, `gap`, `align`, `justify`, `wrap`,
   `grow`, `stretchItems`, `responsive`, `fullHeight`, `noCollapse`, plus
   `variant: 'constrained' | 'grid' | 'bento'` with `size` / `gutter` /
   `columns`. A horizontal cluster is `<al-layout direction="row" align="center">`.
   (Historic note: Layout used to be a vertical-only stack. It is not any
   more — do not reintroduce a bespoke wrapper on that basis.)
3. **When Layout is slotted into a flex parent, add `grow`.** Layout's host is
   `display: contents`, so its box participates directly in the parent's flex
   row; `grow` gives its own `justify` room to act on. This is what makes
   `<al-layout slot="footer" direction="row" justify="end" grow>` right-align
   inside a `space-between` dialog/popover footer.
   Do NOT use a raw `<div>` with `al-u-*` utility classes (silent no-op in
   light-DOM slot content) or with hand-rolled rem values (token drift).

```html
<al-card>
  <al-layout slot="header" direction="row" gap="sm" align="center">
    <al-avatar><img src="…" alt="Jane Doe" /></al-avatar>
    <al-heading variant="md" tagName="h3">Jane Doe</al-heading>
    <al-badge variant="success">Active</al-badge>
  </al-layout>
  <p>…body…</p>
  <al-button slot="actions-end">View profile</al-button>
</al-card>
```

**Avatar with status dot:**

```html
<al-avatar hasBadge badgeVariant="success">
  <img src="…" alt="Jane Doe" />
</al-avatar>
```

For a textual status badge next to the name, use a separate `<al-badge variant="success">Active</al-badge>` adjacent to the heading.

**Page-level layout with vertical rhythm:**

Use a single `<al-layout variant="constrained">` for the page measure. Children
land in the centred content column; a child marked **`bleed`** breaks out and
runs edge-to-edge. That is what removes the need for a container wrapper around
every section.

```html
<al-layout variant="constrained" size="xl" gap="lg">
  <al-hero bleed></al-hero>
  <al-heading tagName="h1" variant="lg">Page title</al-heading>
  <al-layout variant="grid" columns="12" gap="md">
    <al-card class="al-u-grid__item col:6">…</al-card>
    <al-card class="al-u-grid__item col:6">…</al-card>
  </al-layout>
</al-layout>
```

**One span system.** A `variant="grid"` child spans with the SAME
`al-u-grid__item col:N` / `row:N` classes as the light-DOM `.al-u-grid` utility
(`styles/core/utilities/grid.scss`). Do not add a second span API.

**Theme escape hatch.** `--al-layout-template` overrides the track list of
`variant="grid"` and inherits through the shadow boundary, so a consuming theme
can define any container shape (a fixed sidebar, an asymmetric split) without
the design system growing a variant for it. Pair it with `noCollapse`.

### Icon system

Altitude ships the full **Phosphor** set — 1,512 icons, `regular` weight, MIT
licensed, from the `@phosphor-icons/core` devDependency. Source of truth for the
roster is `libs/al-web-components/icons/icons-config.mjs`; browse them under
`Foundations/Icons` in Storybook.

**The canonical form is `<al-icon name="…">` with an explicit registration.**
Registration is what makes it tree-shakeable and synchronous (so it renders
under SSR and never flashes an empty box):

```ts
import { caretDown } from '@southleft/al-web-components/dist/components/icon/glyphs.js';
import { registerIcons } from '@southleft/al-web-components/dist/components/icon/registry.js';
registerIcons({ 'caret-down': caretDown });
```
```html
<al-icon name="caret-down" size="sm"></al-icon>
```

Rules:

- **Names are Phosphor's, kebab-case** — `x` (not `close`), `plus` (not `add`),
  `caret-down` (not `chevron-down`), `magnifying-glass` (not `search`),
  `dots-three-vertical` (not `dots-vertical`), `gear` (not `settings`).
  Do NOT guess: check `libs/al-web-components/components/icon/catalog.ts`.
- **`iconTitle` is the accessible name.** Set it when the icon carries meaning
  on its own; omit it for icons beside visible text and they are correctly
  hidden from assistive technology. Do NOT add your own `aria-label` to
  `<al-icon>` — `iconTitle` already produces `role="img"` + `aria-label`.
- **The 37 `<al-icon-*>` elements are deprecated but still work**, and now
  render Phosphor artwork. `libs/al-web-components/icons/legacy-aliases.json`
  is the hand-authored legacy→Phosphor map and the only place that mapping is
  decided. Do NOT flag these as broken; do NOT add new ones.
- **`name=` never resolves to a legacy alias before a real Phosphor icon.**
  Lookup order is Phosphor catalog first, legacy alias only on a miss.
  Consequence, and it is intentional: `<al-icon-list>` renders the legacy
  bulleted list (Phosphor `list-dashes`) while `<al-icon name="list">` renders
  the Phosphor hamburger. Do NOT "fix" this.
- **`lazy.js` is opt-in, not the default.** Import it only when icon names come
  from data you do not control; it costs ~13 KB gzipped plus a request per icon
  and cannot render server-side.
- **The icon webfont is gone.** `.icon-<name>` utility classes and the
  `iconfont` `@font-face` no longer exist. `iconfont.css` is an empty
  deprecation stub. Do NOT reintroduce font-based icons.

### Utility classes — the complete `.al-u-*` surface

`styleModifier` accepts any of the utility classes below, joined by
spaces. The list is exhaustive — **do not invent `al-u-justify-end` /
`al-u-display-flex` / `al-u-align-center` etc.**, they don't exist.

Source: `libs/al-web-components/styles/core/utilities/*.scss`.

| Family | Class | Notes |
|---|---|---|
| **Spacing** | `al-u-gap[--xxxs|--xxs|--xs|--sm|--md|--lg|--xl|--xxl|--xxxl|--super|--none]` | Vertical stack (flex column) with the named gap |
| Spacing | `al-u-gap--row` | Modifier — combine with a `al-u-gap-*` size to switch to a horizontal row |
| Spacing | `al-u-flex-direction-row` | Standalone row flex without changing gap |
| **Grid** | `al-u-grid` | 12-column grid container (uses `--al-grid-cols: 12`) |
| Grid | `al-u-grid--align-center` \| `--align-end` \| `--align-stretch` | `align-items` modifier on the grid |
| Grid | `al-u-grid--justify-center` \| `--justify-end` \| `--justify-space-between` | `justify-content` modifier on the grid |
| **Typography** | `al-u-theme-typography-{body|heading|display}-{xs|sm|md|lg}[-bold]` | Maps to the matching mixin |
| **Visibility** | `al-u-is-vishidden` | Visually-hidden (screen-reader only) |
| Visibility | `al-u-is-overflow-hidden` | `overflow: hidden` |

For row layouts with right-aligned content, use `<al-layout>` with `gap`
and CSS — not a fabricated utility class.

### Tokens you may reference — and where the digests are

Everywhere this document says "the digest", it means one of exactly two files.
Both are **tracked in git**, so they are readable in a bare clone with no build,
and both are regenerated by `pnpm --filter @southleft/al-web-components build` and
drift-gated by the `cem-and-contracts` CI job:

| Digest | Path | Answers |
|---|---|---|
| **Tokens digest** | `.altitude/ai-readiness/tokens-digest.json` | Does this `--al-*` name exist? Which role/suffix combinations are real? Which names are known hallucination targets (`conventions.notExistDoNotInvent`)? |
| **CEM digest** | `.altitude/ai-readiness/cem-digest.json` | Does this tag/attribute/slot/event/enum-value exist? Which review findings are sanctioned and must NOT be flagged (each tag's `doNotFlag` array)? |

Both are also mirrored to `/tmp/ai-readiness-tokens-digest.json` and
`/tmp/ai-readiness-cem-digest.json` — that is the copy the fleet probe
(`scripts/ai-readiness/run-probe.mjs`) and judge (`run-judge.mjs`) point agents at.
Regenerate either with `pnpm --filter @southleft/al-web-components build`, or individually:
`node scripts/ai-readiness/build-tokens-digest.mjs` /
`node scripts/ai-readiness/build-cem-digest.mjs`.

The underlying build output the tokens digest is derived from — useful when you
want raw values rather than the convention matrix — is **generated, not tracked**
(run `pnpm --filter @southleft/al-web-components build:tokens` first):

- `libs/al-web-components/styles/dist/tokens.json` — every `--al-*` name with
  its resolved value (398 as of 2026-08-23; the digest's `total` field is the
  live count, so read that rather than trusting this sentence).
- `libs/al-web-components/styles/dist-v5/aliases.json` — the frozen alias
  contract (names that cannot drift through 3.0). Byte-identical to
  `libs/al-web-components/dist/css/aliases.json`.

**Suffix matrix — per role, not per family**. The roles + suffixes that actually exist are NOT uniform across the matrix. Verify against `tokens.json` before inventing combinations.

`--al-theme-color-content-<role>[-<suffix>]`:

| Role | Available suffixes |
|---|---|
| `default` | _(no suffix)_, `-weak` |
| `primary`, `secondary` | `-default`, `-weak`, `-strong` |
| `info`, `success`, `warning`, `danger` | `-default`, `-weak` _(no `-strong` / `-stronger`)_ |
| `inverse` | `-default`, `-strong` |
| `disabled` | `-default` |

The `background-*` and `border-*` families follow a similar role-specific
pattern (not the same scheme as content). Always grep `tokens.json` to
confirm a specific combination exists.

**Numeric tiers:**

| Family | Prefix | Tier |
|---|---|---|
| Font sizes | `--al-font-size-<n>` | `-10`, `-12`, `-14`, `-16`, `-18`, `-20`, `-24`, `-28`, `-32`, `-36`. **No t-shirt sizes (`-sm` / `-md` / `-lg` / `-2xl`).** |
| Font weights | `--al-font-weight-<w>` | `-regular`, `-bold`. **No `-light`, `-medium`, `-semibold`, `-heavy`.** |
| Border width | `--al-theme-border-width-<n>` | `-1`, `-2`, `-4`. |
| Animation duration | `--al-animation-duration-<n>` | `-2`, `-4`, `-6`, `-8` (×100ms). |
| Animation timing | `--al-animation-timing-<curve>` | `-ease`, `-linear`, `-cubic-bezier`. |

**T-shirt tiers (spacing + border radius):**

- `--al-theme-space[-<size>]` — base `--al-theme-space` (1× = 0.5rem), then `-xxxs`, `-xxs`, `-xs`, `-sm`, `-md`, `-lg`, `-xl`, `-xxl`, `-super`.
- `--al-theme-border-radius[-<size>]` — t-shirt scale.

**Do not invent:**
- `--al-theme-focus-ring-*` (doesn't exist; use `outline` rules from the `al-focus` mixin).
- `--al-theme-transition-duration-*` (use `--al-animation-duration-*`).
- `--al-theme-color-content-default-stronger` / `-weaker` (`default` role has only `(none)` and `-weak`).
- `--al-font-weight-semibold` / `-medium` (only `-regular` and `-bold` exist).
- T-shirt font sizes — only the numeric tier above.

When in doubt: `grep -c "<your-token-name>" libs/al-web-components/styles/dist/tokens.json` before you ship it.

### ALElement public API

These are the helpers `ALElement` exposes that your component will use.
They are not documented in the CEM (which only describes the public element
contract), so reference this section instead of reading the source:

```ts
// Dispatch a custom event with bubbles + composed. detailObj is the public payload.
this.dispatch({
  eventName: 'onChipClose',
  e?: Event,                 // optional originating event (re-surfaced under detail.originalEvent)
  detailObj?: { [k]: unknown },
  optionsObj?: EventInit,
}): CustomEvent;

// Build a classMap including the base class, an inherited styleModifier, and your modifiers.
this.componentClassNames(
  baseClassName: string,
  additionalClassNames?: { [cls]: boolean }
): DirectiveResult;

// Slot helpers: return true when the named slot has light-DOM children.
// Implemented via querySelector — evaluated once at render time.
// **Non-reactive.** If slot content can change at runtime (icons added
// later, conditional slotted children), add `@slotchange=${() => this.requestUpdate()}`
// on the `<slot>` element so the host re-renders when assigned nodes change.
this.slotEmpty(slotName?: string): boolean;
this.slotNotEmpty(slotName?: string): boolean;

// Inherited from ALElement.styleModifier — accept utility class strings
// from consumers via the `styleModifier` attribute. Already wired into
// componentClassNames() above; just declare it as a property.
@property() accessor styleModifier: string;
```

`ALElement.connectedCallback()` adopts the shared utility stylesheet
into your shadow root automatically — utility classes passed via
`styleModifier` (e.g. `al-u-gap-lg`) will apply inside the shadow.

For a React wrapper (`libs/al-react/src/components/<Name>/`):

- One file: `createComponent({react, tagName, elementClass, events})` from
  `@lit/react`. Auto-generated by `pnpm --filter @southleft/al-react plop`; don't
  hand-edit defensively.

## What NOT to do

- Don't hand-edit `custom-elements.json`. Regenerate via the script.
- DO hand-edit `libs/al-web-components/styles/tokens-dtcg/` — it is the tracked
  DTCG token source. Set `$value`, `$type` AND
  `$extensions["org.altitude.token"].cssType`, then run
  `pnpm run generate:token-metadata`. A token with no `cssType` gets no
  `cssProperties` allow-list (see `scripts/lib/dtcg-token.mjs`).
- Don't introduce new dependencies without a plan-task mapping.
- Don't bypass G2 by force-pushing past the migration-gate workflow.
- Don't add `:root { --al-* }` outside Phase 4's `<al-theme>` host (T4.2).
