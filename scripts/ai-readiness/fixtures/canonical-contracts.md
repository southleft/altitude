# Eval answer keys — Task A, `al-stat-card`, and `al-tag`

> **`al-stat-card` and `al-tag` do not exist.** They are not in
> `libs/al-web-components/components/`, not in `custom-elements.json`, and not
> in `.altitude/migration.json`. They are the *subjects of the AI-readiness
> eval* — Task B scaffolds `<al-stat-card>`, Task C reviews a deliberately
> non-conformant `<al-tag>` PR (see `../tasks/B-scaffold.md`,
> `../tasks/C-violation.md`). `build-cem-digest.mjs` emits them as
> `FORWARD_STUBS` so cross-references do not dangle.

## Task A answer key — "user profile card" composition

Task A (`../tasks/A-composition.md`) is not scored by a fixture contract —
it composes *real* `<al-*>` components — so its pinned answer key is the
tag list a correct answer is expected to contain, for
`../lib/grader.mjs`'s deterministic component-usage grader (`matched −
missing − unexpected`, R4). Sourced verbatim from AGENTS.md's "Composition
recipes" section (the "Header row / atom cluster inside a slot", "Kebab
menu", and "Card with a primary action in the corner" recipes, ~lines
437-522) — not invented for the eval, since the task prompt IS that
recipe with a story wrapped around it:

| Tag | Why it's expected |
|---|---|
| `al-theme` | Task explicitly requires wrapping the pattern in `<al-theme>` |
| `al-card` | The card surface itself |
| `al-layout` | Arranges the avatar/name/badge header cluster (AGENTS.md "arrangement belongs to al-layout") |
| `al-avatar` | Header avatar |
| `al-heading` | Display name |
| `al-badge` | Status badge ("Active") |
| `al-popover` | Kebab menu trigger-and-floating-content composite |
| `al-button` | Kebab trigger AND the primary "View profile" action (same tag, one set entry) |
| `al-icon` | Kebab dots-three-vertical glyph |
| `al-menu` | Kebab menu list |
| `al-menu-item` | The three menu actions |

`grader.mjs`'s `EXPECTED_TASK_A` constant is this table's tag column.
`test/grader.test.mjs` asserts every one of these tags is present (and not
an `eval-fixture` stub) in the committed CEM digest
(`.altitude/ai-readiness/cem-digest.json`) — if a future component rename
or removal breaks that assertion, THIS table (and `EXPECTED_TASK_A`) is
what's stale, not the digest.

## Do not build these

If you are writing real component code, **stop**: the shipping components that
already cover these use cases are

| You wanted | Build with | Why not the fixture |
|---|---|---|
| a metric / KPI tile | **`al-stat`** (`libs/al-web-components/components/stat/`) | `al-stat-card` duplicates it exactly |
| a small dismissible inline label | **`al-chip`** (`libs/al-web-components/components/chip/`) | `al-tag` duplicates it exactly |

These contracts lived in `AGENTS.md` until 2026-08-23. That was a trap: an
agent reading the agent contract front-to-back would scaffold a redundant
component in good faith, and the eval's answer key sat inside the very document
the eval measures. They live here now — read by the harness and the digest
builder, not by an agent doing product work.

## Why keep them at all

The eval needs a **fixed** target. Task B is only comparable across runs if
"correct" means the same thing every time, and Task C's judge needs an
authoritative shape to score findings against. Both contracts are cited by
`scripts/ai-readiness/build-cem-digest.mjs` (`DO_NOT_FLAG` entries for
`al-stat-card` and `al-tag`) — if you change a row below, update the matching
`citation` string there.

---

## Canonical stat-card contract (`al-stat-card`) — EVAL FIXTURE, NOT A REAL COMPONENT

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

## Canonical al-tag contract (`al-tag`) — EVAL FIXTURE, NOT A REAL COMPONENT

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
