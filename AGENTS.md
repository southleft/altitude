# AGENTS.md — Altitude design system

This file is the **agent contract** for the Altitude design system. AI coding
agents should read it before authoring or modifying component code.

## What this repo is

A monorepo on **pnpm 9 workspaces** (Node 22 LTS) shipping two libraries:

- `al-web-components` — Lit 3.3 web components (~65 today, evolving via the
  v2 refactor at `NEXT-GEN-UPGRADE-PLAN.md`).
- `al-react` — `@lit/react` wrappers, one per web component (React 19).

## The refactor governs everything

There's an active multi-phase refactor described in
[`NEXT-GEN-UPGRADE-PLAN.md`](./NEXT-GEN-UPGRADE-PLAN.md). **All changes must
map to a plan task** (T0.x, T1.x, …) or be explicitly flagged as out-of-plan
in the PR description. Eight non-negotiable guardrails (G1–G8) are CI-enforced:

- **G1 — Evolve, don't rebuild.**
- **G2 — `legacy` components are read-only** outside migration PRs. State is
  tracked in [`.altitude/migration.json`](./.altitude/migration.json); see
  [`.altitude/migration.schema.json`](./.altitude/migration.schema.json).
- **G3 — Prove every new pattern on the 5 pilot components first**:
  `button`, `input`, `select`, `dialog`, `theme-switcher`.
- **G6 — Contracts are generated** (CEM → schemas → AGENTS.md → validator).
  Hand-edit JSDoc and types; everything else is downstream.
- **G7 — Decorator semantics frozen**: `experimentalDecorators: true`,
  `useDefineForClassFields: false`. Don't touch.
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
| Brand contract + token reachability map | [`.altitude/BRANDS.md`](./.altitude/BRANDS.md) — **read before editing any `tier-2/brand/` file.** A brand carries the whole look (typography, radius, shadow, border width, spacing), and several obvious overrides are inert: `--al-theme-typography-*` has zero consumers, `theme.space.{sm,md,lg}` belongs to the `density` axis, `theme.border.radius.sm` is unused, and `letterSpacing` is dropped by the formatter. |
| Build pipeline docs | [`.altitude/BUILD.md`](./.altitude/BUILD.md) |
| Pinned target versions | [`.altitude/targets.json`](./.altitude/targets.json) |
| Migration manifest | [`.altitude/migration.json`](./.altitude/migration.json) |
| Custom Elements Manifest (CEM) | [`libs/al-web-components/custom-elements.json`](./libs/al-web-components/custom-elements.json) |
| Per-component schemas (T3.2) | [`libs/al-web-components/schemas/`](./libs/al-web-components/schemas/) — see [Component schema index](./libs/al-web-components/schemas/INDEX.md) |
| Pilot web components | `libs/al-web-components/components/{button,input,select,dialog,theme-switcher}/` |
| Pilot React wrappers | `libs/al-react/src/components/{Button,Input,Select,Dialog,ThemeSwitcher}/` |
| Tokens (legacy + DTCG) | `libs/al-web-components/styles/tokens/` (legacy) and `tokens-dtcg/` (generated) |
| Base class | `libs/al-web-components/components/ALElement.ts` |
| Registry (versioned tags) | `libs/al-web-components/directives/register.ts` |

## How to verify your change

```bash
# Whole-pipeline smoke test:
pnpm --filter al-web-components build:tokens                # Style Dictionary v5 (the only token pipeline)
pnpm --filter al-web-components test:tokens                 # token contract tests vs .altitude/baselines/
pnpm test:brands                                            # brands must differ beyond colour; no inert overrides
pnpm brands:compare                                         # rendered four-column check → .altitude/visual-compare/brands.dark.png
pnpm --filter al-web-components build                       # library build (Vite)
pnpm --filter al-web-components build:storybook \
    --output-dir ../../dist/storybook/web-components        # Storybook static
pnpm --filter al-web-components build:custom-elements.json  # CEM regenerate
node scripts/check-cem-coverage.js                          # T3.1 acceptance
pnpm test:vrt                                               # Playwright VRT
pnpm gate:self-test                                         # G2/G8 gate scripts
```

If any of the above is red, the change isn't ready to commit.

### Validate your DS usage, then self-heal

When you author or edit code that **consumes** Altitude — `<al-*>` custom elements in any
markup (HTML / Svelte / Astro / Angular / Lit templates) or `al-react` `<AL*>` JSX wrappers —
run the usage validator and fix what it reports before moving on:

```bash
npx altitude-validate <file-or-dir>          # human report, non-zero exit on any violation
npx altitude-validate --json <file-or-dir>   # one JSON envelope on stdout (for a self-heal loop)
pnpm --filter al-web-components validate:usage <file-or-dir>   # in-repo equivalent
```

It checks each usage against the shipped CEM and returns violations with a stable `code`
(`ERR_UNKNOWN_COMPONENT`, `ERR_UNKNOWN_ATTRIBUTE`, `ERR_INVALID_ENUM`, `ERR_TYPE_MISMATCH`), a
did-you-mean `suggestion`, and a concrete `fix`. **Self-heal loop:** run `--json` → for each
violation apply its `fix` (full recipe in [`libs/al-web-components/cli/REPAIR.md`](./libs/al-web-components/cli/REPAIR.md),
keyed by `code`) → re-run until exit 0. If a fix would require inventing an element, attribute, or
value that doesn't exist, **stop and report the gap** — don't fake it past the design system.

### MCP server (T7.2)

For an agent connected over MCP rather than shelling out, [`libs/altitude-mcp`](./libs/altitude-mcp)
is a stdio server exposing the same contract surface as six tools: `altitude_list_components`,
`altitude_get_component`, `altitude_validate` (wraps the CLI above, same codes), `altitude_get_tokens`
(tier/brand/mode-filtered), `altitude_search_icons` (the 1,512-glyph Phosphor catalog), and
`altitude_generate_theme` (the deterministic OKLCH solver — never calls an LLM). It is a reader
of the same generated artifacts as everything else on this page, never a second source of truth.
Registered in [`.mcp.json`](./.mcp.json) as `altitude`. See
[`libs/altitude-mcp/README.md`](./libs/altitude-mcp/README.md) for the full tool contract and
example calls.

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
   - Owned component override hooks (`--al-stat-card-value-color`) →
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
| **blocker** | **Focus ring on every interactive control** — `&:focus-visible { @include al-focus; }` on the inner clickable / focusable element. Never re-author an outline. This is non-negotiable for buttons, links, dismissible chips, menu items, anything that takes focus. |
| **blocker** | **Storybook stories** at `<name>.stories.ts` — CSF3 object stories with `tags: ['autodocs']`, one story per visually-meaningful state. |
| **blocker** | **`bundle.ts` export** — add one alphabetical `export … from './<name>/<name>'` line **in place** in the existing file.

| **high** | **React wrapper** generated by `pnpm --filter al-react plop`. May be FLAGGED as follow-up if the scaffolder can't run plop. |
| **high** | **CEM regeneration** — run `pnpm --filter al-web-components build:custom-elements.json` after JSDoc edits so the manifest reflects new slots / events / cssparts. May be FLAGGED as follow-up. |
| **medium** | **`.altitude/migration.json` entry** — net-new components start in state `scoped-complete` (no `dual` / `legacy` transition needed) with `react19: true, headless: …, ssr: …` reflecting the actual surface. **Policy is all-or-nothing per PR: if you emit ANY file (bundle.ts, the .ts source, .scss, .stories.ts), you MUST also emit the entire `migration.json` with the new key inserted alphabetically. Flagging migration.json as follow-up is acceptable ONLY when you emit zero files (pure-review or analysis tasks).** Never emit some files and flag others — that produces inconsistent, incomplete PRs. |

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
| **blocker** | **Display numerics** | Type the value prop as `string` (not `number`). Consumers own locale formatting / digit grouping / unit suffixes; an internal `Intl.NumberFormat` in a display-only atom imposes a locale on every consumer. | `@property() accessor value: string;` on `<al-stat-card value="1,234">` |

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
| **Page section** | `al-layout-section` | Cascade-layer + max-width pattern |

If nothing matches: copy the *most recently shipped* atom (`al-chip` is the
current freshest convention) and ask for review.

### Canonical stat-card contract (al-stat-card)

When scaffolding `<al-stat-card>` or any metric / KPI tile, follow this
contract verbatim. The contract is intentionally narrow so two
independent scaffolders produce visually-identical output.

| Concern | Decision |
|---|---|
| **Taxonomy** | `Atoms/Stat Card`. Composing internal `<al-icon>` atoms for decoration does NOT promote a display atom to a Molecule. Badge/chip/stat-card all remain Atoms. |
| **Visual surface** | Bordered card (NOT a bare inline tile). Padding: `var(--al-theme-space-md)`. Border-radius: `var(--al-theme-border-radius)`. Border: `var(--al-theme-border-width) solid var(--al-theme-color-border-default)`. Background: `var(--al-theme-color-background-default)`. No shadow by default. |
| **Value typography** | `@include al-theme-typography-display-sm-bold;` — do NOT hand-assemble from raw `--al-font-size-*` / `--al-font-weight-*` primitives. The mixin lives in `libs/al-web-components/styles/core/mixins/typography.scss`. |
| **Label typography** | `@include al-theme-typography-body-sm;` with `color: var(--al-theme-color-content-default-weak);`. |
| **Delta typography** | `@include al-theme-typography-body-xs;`. Color by trend (see Trend polarity row). |
| **Properties** | `value: string` (display numeric, consumer formats — see "Display numerics" in the Naming table), `label: string`, `trend: 'up' \| 'down' \| 'none'`, `delta: string` (e.g. `"+12%"`), `invertPolarity: boolean` (escape hatch for metrics where down=good — see Trend polarity below). |
| **Owned override hooks** | Exactly ONE: `--al-stat-card-value-color` with `var(--al-theme-color-content-default)` fallback. Documented via `@cssproperty`. Do not invent additional hooks unless the consumer override case is documented. |
| **Trend polarity** | Default: `trend='up'` uses `--al-theme-color-content-success-default`, `trend='down'` uses `--al-theme-color-content-danger-default`, `trend='none'` uses `--al-theme-color-content-default-weak` with NO direction icon. **`invertPolarity` flips ONLY the success/danger color mapping** for metrics where lower is better (cost, latency, churn, open tickets). The chevron direction, `iconTitle`, and `aria-label` ALWAYS reflect the literal `trend` value — a rising cost shows an up-chevron colored danger and says "Trending up". Inverting the icon or label would lie about which direction the number moved. |
| **Slot** | `slot="icon"` for an optional leading icon. **Keep the `<slot>` permanently mounted** so `slotchange` keeps firing if content is added at runtime; gate only the WRAPPER element (e.g. `<div ?hidden=${!hasIcon}>` with a matching `[hidden] { display: none }` rule in @layer al.component, OR conditional class on a wrapper). Conditionally rendering the `<slot>` itself away (e.g. `${hasIcon ? html\`<slot>\` : ''}`) breaks late-add reactivity. Use `slotNotEmpty('icon')` to decide, plus `@slotchange=${() => this.requestUpdate()}` on the slot to re-evaluate when assigned nodes change. |
| **Layout / DOM structure** | Exactly this hierarchy — independent scaffolders MUST produce visually-identical output: `<div class="al-c-stat-card" part="container">` (the bordered surface) containing, in this order: an optional `<div class="al-c-stat-card__icon" ?hidden=${!hasIcon}><slot name="icon" @slotchange=…></slot></div>` (icon row, top), then `<span class="al-c-stat-card__value" part="value">${value}</span>` (the numeric, full width), then `<span class="al-c-stat-card__label">${label}</span>` (label, immediately below value), then an optional trend row `<div class="al-c-stat-card__trend" part="trend" ?hidden=${!delta}>` containing the chevron + visually-hidden direction + visible `${delta}`. Vertical gaps: `gap: var(--al-theme-space-xs)` between value/label, `margin-block-start: var(--al-theme-space-sm)` on the trend row. Icon position: LEADING the value horizontally is NOT canonical — use the stacked vertical hierarchy above. |
| **Accessibility — canonical shape** | Use shape (a) — `aria-hidden="true"` on the chevron + a visually-hidden `<span class="al-u-is-vishidden">Trending up,</span>` (or "Trending down,") immediately before the visible delta. Shape (b) (wrapping aria-label that includes the delta) is also acceptable but (a) is canonical: it keeps the visible delta on the screen-reader path naturally and avoids any masking risk. Pick (a) when scaffolding; flag (b) only if it omits the delta. |
| **Chevron sizing** | `<al-icon name="caret-up" size="sm">` / `<al-icon name="caret-down" size="sm">` — size="sm" matches the body-xs delta typography. Do NOT let the icon use its default size; do NOT set width/height on `.al-c-stat-card__trend` to size the icon. |
| **Badge composition** | Compose `<al-badge>` only when the stat itself communicates a status (success/warning). For a plain numeric tile, render the value with the typography mixin directly and skip the badge. |
| **Trend icon** | Use `<al-icon name="caret-up">` / `<al-icon name="caret-down">`. Do NOT hand-roll a CSS triangle or use Unicode ▲/▼ glyphs. (The deprecated `al-icon-chevron-up` / `al-icon-chevron-down` elements still render the same artwork, but new code should use `name=`.) |
| **Trend-row gating** | Render the trend row only when `delta` is a non-empty string (the consumer's signal that a comparison exists). If `trend === 'none'` AND `delta` is set, still render the row but omit the direction icon — never invent a default delta to satisfy the row. |
| **Accessibility — trend cue** | The direction is conveyed by BOTH color and icon — but color alone is insufficient. Two acceptable shapes: (a) Set `iconTitle="Trending up"` on the chevron, mark the chevron `aria-hidden="true"`, and add a visually-hidden `<span class="al-u-is-vishidden">Trending up,</span>` BEFORE the visible delta — the screen reader announces "Trending up, +12%" while sighted users see "+12%". (b) Fold the direction into a wrapping `aria-label` that INCLUDES the delta text — e.g. `aria-label="Trending up, +12%"`. **Do NOT set an `aria-label` that omits the delta** (e.g. `aria-label="Trending up"` next to a visible "+12%") — the aria-label REPLACES the accessible name, masking the visible delta from screen readers. |
| **CSS parts** | Expose three: `@csspart container` (the bordered surface), `@csspart value` (the numeric), `@csspart trend` (the row containing delta + chevron). Consumers theme via these, not by descending the BEM tree. |
| **Property defaults** | `@property accessor foo: T = '<default>'` initializers are PERMITTED under G7 (`useDefineForClassFields: false` plus `experimentalDecorators: true` keep field initializers reactive). The pilots all use them. Setting a default in the accessor is canonical; omitting it just means "no initial value" — both are valid. |

### Canonical al-tag contract (al-tag)

Mirrors the al-chip dismissible-atom recipe. Pin these so reviewers and
scaffolders converge.

| Concern | Decision |
|---|---|
| **Taxonomy** | `Atoms/Tag`. |
| **Variant union** | `'secondary' \| 'info' \| 'success' \| 'warning' \| 'danger'` — no `'default'` member. The default state is the UNSET attribute (mirrors al-button "primary = unset"). Reviewer: flag a literal `variant="default"` as a typing bug. |
| **Variant default styling** | When `variant` is unset, render the neutral surface using `--al-theme-color-content-default-weak` for text and `--al-theme-color-background-default-weak` for the chip body. |
| **Boolean props** | `isDismissible: boolean` (capability). If owning state: `isDismissed: boolean`. Same `is*` prefix as chip. |
| **Dismissal model** | Same as `al-chip`: two acceptable shapes — owned `isDismissed` + `.al-is-dismissed` hide class OR controlled `close()` without owned state. Reviewers MUST NOT flag controlled-close as a violation (see CEM digest `doNotFlag` for this tag). |
| **Close event** | `this.dispatch({ eventName: 'onTagClose', detailObj: { value: this.value } })`. The `value` mirrors `al-menu-item.value` for consumer pattern-matching. |
| **Focus ring** | `&:focus-visible { @include al-focus; }` on the inner clickable element (blocker — same as the global rule). |
| **Tokens** | Padding `var(--al-theme-space-xxs) var(--al-theme-space-sm)`, gap `var(--al-theme-space-xs)`, radius `size(4)` (NOT `--al-theme-border-radius-round` which is 50% = circle), per-variant `color` from `--al-theme-color-content-<role>-default`. |
| **Host display** | `:host { display: contents; }` — style the inner `.al-c-tag`, never the host. |
| **Stories** | CSF3 object stories with `tags: ['autodocs']`, one story per variant + dismissible state. |

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
| **blocker** | **Close event** | `this.dispatch({ eventName: 'onChipClose' })` (use ALElement's dispatch — bubbles + composed). For `al-tag` mirror as `onTagClose`. |
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
2. **`<al-layout>` is a VERTICAL stack only.** It exposes `gap` for
   row-spacing and `variant: 'sidebar-left' | 'sidebar-right'` — there
   is no horizontal row affordance. Do NOT use `<al-layout slot="header">`
   to lay out a horizontal cluster; it renders a column.
3. **For a horizontal cluster, use blessed inline flex with theme tokens.**
   This is the sanctioned shape. Do NOT use a raw `<div>` with `al-u-*`
   utility classes (silent no-op in light-DOM slot content) or with
   hand-rolled rem values (token drift).

```html
<al-card>
  <div slot="header" style="display:flex; gap:var(--al-theme-space-sm); align-items:center;">
    <al-avatar><img src="…" alt="Jane Doe" /></al-avatar>
    <al-heading variant="md" tagName="h3">Jane Doe</al-heading>
    <al-badge variant="success">Active</al-badge>
  </div>
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

Use `<al-layout-container>` + `<al-layout-section>` + `<al-layout>` with
`styleModifier="al-u-gap-lg"` (or `-md`/`-xl`) instead of raw `<div>` +
inline flex. The `al-u-*` utility classes reach the shadow root via
`ALElement.getSharedThemeSheet()`.

### Icon system

Altitude ships the full **Phosphor** set — 1,512 icons, `regular` weight, MIT
licensed, from the `@phosphor-icons/core` devDependency. Source of truth for the
roster is `libs/al-web-components/icons/icons-config.mjs`; browse them under
`Foundations/Icons` in Storybook.

**The canonical form is `<al-icon name="…">` with an explicit registration.**
Registration is what makes it tree-shakeable and synchronous (so it renders
under SSR and never flashes an empty box):

```ts
import { caretDown } from 'al-web-components/dist/components/icon/glyphs.js';
import { registerIcons } from 'al-web-components/dist/components/icon/registry.js';
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

### Tokens you may reference

The full token surface is digested for you. Read these to verify a token
exists before referencing it:

- `libs/al-web-components/styles/dist/tokens.json` — every `--al-*` name with
  its resolved value (328 tokens).
- `libs/al-web-components/styles/dist-v5/aliases.json` — the frozen alias
  contract (names that cannot drift through 3.0).

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
  `@lit/react`. Auto-generated by `pnpm --filter al-react plop`; don't
  hand-edit defensively.

## What NOT to do

- Don't hand-edit `custom-elements.json`. Regenerate via the script.
- Don't hand-edit `libs/al-web-components/styles/tokens-dtcg/`. It is
  produced by `scripts/convert-tokens-to-dtcg.js` and lives in `.gitignore`.
- Don't introduce new dependencies without a plan-task mapping.
- Don't bypass G2 by force-pushing past the migration-gate workflow.
- Don't add `:root { --al-* }` outside Phase 4's `<al-theme>` host (T4.2).
