# Repairing Altitude usage violations

You (an agent, or a human) ran the Altitude usage validator and got one or more violations. This
guide tells you how to fix each one. It is keyed by the **stable error `CODE`** the validator
prints — find the code, apply the recipe. The same recipes are available machine-readably in
[`repair-map.json`](./repair-map.json).

```bash
npx altitude-validate src/            # human report
npx altitude-validate --json src/     # one JSON envelope on stdout (for programmatic self-heal)
npx altitude-validate --strict src/   # warnings fail the run too
```

Every violation carries: a `code` (stable), a `rule` (human name), a `severity`,
`file:line:column`, a `detail`, sometimes a `suggestion` (nearest valid name), and a `fix` (the
actionable recipe, already specialized to your case). The `--json` envelope is:

```json
{ "apiVersion": 1, "type": "validation.result",
  "data": { "passRate": 0.9, "totalUsages": 53, "passingUsages": 49,
            "errorCount": 4, "warningCount": 2,
            "violations": [ { "code": "ERR_INVALID_ENUM", "component": "al-button", "severity": "error", "fix": "...", "...": "..." } ],
            "byComponent": { "al-button": { "usages": 17, "errors": 0 } } } }
```

**`passRate` measures per-usage checks only** — element, attribute and value, one score per
`<al-*>` usage. The rules that are about a *document* or a *nesting relationship*
(`ERR_UNKNOWN_SLOT`, `ERR_PHANTOM_TOKEN`, `WARN_RAW_VALUE`, `WARN_HANDROLLED_LAYOUT`,
`ERR_MISSING_THEME_HOST`, `WARN_MIXED_REGISTRATION`) are reported in `violations` and counted in
`errorCount` / `warningCount`, but they do not move `passRate` or `byComponent`. **Read
`errorCount`, not `passRate`, to decide whether the run passed.**

**Severity.** A code beginning `ERR_` is an error; a code beginning `WARN_` is advisory. Exit code
is `1` when any **error** exists, `0` when there are none — warnings alone do not fail a build, and
do not move `passRate`. Pass `--strict` to make warnings fail too. `2` means the validator itself
malfunctioned. So a self-heal loop is: **run → parse `violations` → apply each `fix` → re-run until
exit 0**, and then read the remaining warnings, which are advice rather than a gate.

**Contract sources.** Elements, attributes and enum values come from the shipped
`custom-elements.json`; slot names from the shipped compiled components in `dist/` (the CEM's
`slots` array is JSDoc and is incomplete); token names from `dist/css/tokens.json` unioned with the
tracked DTCG source in `styles/tokens-dtcg/`. Nothing in this CLI is a second source of truth, and
no element, attribute, slot or token name is hardcoded in it.

---

## The one rule that matters most: don't fake it

If the validator says an element, attribute, or value doesn't exist, your job is **not** to make the
red go away by any means. Do **not** invent an attribute, hard-code a hex color, or reach past
Altitude to approximate something the design system doesn't offer. If nothing in Altitude expresses
what the design needs, **stop and report the gap** — "Altitude has no X for this" is useful signal,
whereas a faked workaround is silent drift the next person inherits.

---

## Codes

### `ERR_UNKNOWN_COMPONENT`
An `<al-*>` tag isn't a registered Altitude element — a typo or a hallucinated name.
- **Fix:** Replace it with a real element. A `suggestion` gives the nearest registered tag
  (e.g. `al-buton` → `al-button`). If no real element fits, don't invent one — report the gap.
- **Before:** `<al-buton variant="secondary">` → **After:** `<al-button variant="secondary">`

### `ERR_UNKNOWN_ATTRIBUTE`
An attribute was set that the element's contract doesn't declare.
- **Fix:** Remove it, or replace it with a valid one (the `detail`/`fix` lists the allowed
  attributes; a `suggestion` gives the nearest match). `slot`, `id`, `class`, `style`, `part`,
  `aria-*`, `data-*`, the inherited `styleModifier`, and event/framework bindings
  (`(click)`, `on:click`, `?attr=`, `[attr]=`, `:attr=`, `{expr}`) are always allowed.
- **Before:** `<al-card href="/x">` → **After:** wrap the card in an `<a href="/x">`, or if a
  linkable card is genuinely needed and Altitude has no attribute for it, report the gap. (Real
  example: `al-card` declares only `layout` and `variant` — it has no `href`.)

### `ERR_INVALID_ENUM`
An attribute got a value outside its allowed set.
- **Fix:** Use one of the allowed values (listed in the `fix`). A `suggestion` gives the nearest.
- **Before:** `<al-button variant="primary">` → **After:** `<al-button variant="secondary">`
  (allowed: secondary, tertiary, bare, danger — the default/unnamed variant is the primary action
  style, so there is no `variant="primary"`).

### `ERR_TYPE_MISMATCH`
An attribute got a value of the wrong type.
- **Fix:** Pass the expected type. Boolean attributes take `true`/`false` or bare presence.
- **Before:** `<al-button hideText="maybe">` → **After:** `<al-button hideText="true">` or
  `<al-button hideText>`.

### `ERR_UNKNOWN_SLOT` — llms.txt rule 3
A `slot="…"` names a slot on the **parent** element, and that parent renders no slot by that name.
This is not a cosmetic mistake: content aimed at a slot that does not exist is dropped from the
rendered output entirely. It does **not** fall back to the default slot.
- **Fix:** Point `slot` at a slot the parent actually declares (the `fix` lists them; a
  `suggestion` gives the nearest). To use the default slot, drop the `slot` attribute.
- **Before:** `<al-card><span slot="meta">3 min read</span></al-card>` → **After:** put it in the
  default slot, or in one `al-card` really has (`header`, `footer`, `image`, `actions-start`,
  `actions-end`). If the parent has no slot for this content, report the gap.
- Slot names are read from the **compiled component**, not from the CEM's `@slot` JSDoc — the
  JSDoc is incomplete (`al-drawer` documents only its default slot while rendering `header`,
  `footer` and `trigger`). When that evidence is unavailable, the element is skipped rather than
  guessed at.

### `ERR_PHANTOM_TOKEN` — llms.txt rule 2
A `--al-*` custom property is read through `var()` that is not in the shipped token set. **This is
the failure mode with no symptom:** CSS resolves an unknown custom property silently — to the
fallback you wrote, or to nothing — so the page renders, looks plausible, and is wrong. No browser
error, no build error.
- **Fix:** Use a real token name (`altitude_get_tokens`, or
  <https://altitude.pages.dev/docs/llms-tokens.txt>). A `suggestion` gives the nearest real one.
- **Before:** `var(--al-space-32)` → **After:** `var(--al-theme-space-lg)` (there is no
  `--al-space-*` family; spacing is `--al-theme-space-*`).
- An explicit fallback does not make it legal: `var(--al-theme-animation-duration-role-base,
  var(--al-theme-animation-duration, 0.2s))` still reads a name that does not exist, and the first
  two thirds of that expression are dead. Delete the phantom, keep the real token.
- A `--al-*` your own file **declares** is fine to read in that file.

### `WARN_RAW_VALUE` — llms.txt rule 1
A hard-coded hex colour or px length in a declaration that styles an Altitude element, on a
property the token set covers. It renders identically today and stops following brand, mode,
density and contrast the moment any of those change.
- **Fix:** Replace the literal with the `var(--al-…)` token for that role — colours from
  `--al-theme-color-*`, spacing from `--al-theme-space-*`, radii from `--al-theme-border-radius-*`,
  type from `--al-theme-typography-*`.
- **Before:** `<al-button style="background-color:#0b5cff">` → **After:**
  `<al-button style="background-color: var(--al-theme-color-background-primary-default)">` — or,
  better, use `variant` and stop styling the button from outside.
- **Deliberately not flagged**, because a token does not cover them: one-off `width`/`height` and
  other geometry, positional offsets, `1px`/`2px` hairlines, the offsets inside a `box-shadow`, and
  a consuming page's own chrome rules (a stylesheet rule is only checked when its selector names an
  `al-*` element, and an inline `style=` only on an Altitude element). This is a warning, not an
  error — it never fails a build without `--strict`.

### `WARN_HANDROLLED_LAYOUT` — llms.txt rule 5
An element sets `display: flex` or `display: grid` and arranges two or more sibling Altitude
components inside it. Arrangement belongs to the layout primitive, not to ad-hoc CSS.
- **Fix:** Replace the wrapper with `<al-layout>` and express the arrangement as props:
  `direction`, `gap`, `align`, `justify`, `wrap`, `grow`, `stretchItems`, `responsive`,
  `fullHeight`, `noCollapse`, plus the `constrained` / `grid` / `bento` variants with `size` /
  `gutter` / `columns`.
- **Before:** `<div style="display:flex;gap:8px"><al-button>Save</al-button><al-button
  variant="secondary">Cancel</al-button></div>` → **After:** `<al-layout direction="row" gap="sm">…`
- Do **not** answer this by writing a new `*-group` wrapper. `al-button-group`, `al-chip-group`,
  `al-toast-group` and friends were removed precisely because they owned arrangement and nothing
  else. The groups that survive (`checkbox-group`, `radio-group`) exist for their semantics —
  fieldset/legend, roving keyboard selection — not their spacing.

### `ERR_MISSING_THEME_HOST` — llms.txt rule 4
The source is a document root — it has a paired `<html>`/`<body>` element, or it owns registration
— and it renders Altitude components with no `<al-theme>` ancestor. Tokens are set on that host,
not on `:root`, so every component falls back to unthemed values.
- **Fix:** Wrap the rendered components in `<al-theme brand="…">`, adding `mode`, `density`,
  `contrast` or `motion` as needed. One host near the root is enough; nesting more is a real SSR
  cost (~19.6KB of serialized token block per host), not a safety measure.
- **Before:** `<body><al-button>Go</al-button></body>` → **After:**
  `<body><al-theme brand="altitude"><al-button>Go</al-button></al-theme></body>`
- An inner fragment is never flagged — its `<al-theme>` lives in a layout file the validator
  cannot see. Only something that plausibly *is* a root gets this check.

### `WARN_MIXED_REGISTRATION` — llms.txt rule 6
The document sets `window.alAutoRegistry = true` **and** takes a second registration path —
importing `@southleft/al-react` wrappers, or calling `registerAltitude({ mode: 'versioned' })`.
This is a real footgun with a quiet failure: with the flag set, the deep import self-registers the
plain tag first, the wrapper's suffixed `customElements.define` then throws `NotSupportedError`,
that throw is caught and downgraded to a `console.error` — so the suffixed tag is never defined and
the element silently never upgrades.
- **Fix:** Pick ONE path per document and delete the other.
  - Template frameworks / plain HTML: `window.alAutoRegistry = true` inline in `<head>` (ESM
    imports hoist, so setting it from application JS is too late) plus deep imports.
  - React: import the wrappers from `@southleft/al-react`, set **no** flag.
  - Micro-frontends: no flag, `registerAltitude({ mode: 'versioned' })`.
- Full model: [`.altitude/REGISTRATION.md`](../../../.altitude/REGISTRATION.md).
- Prose *about* the paths does not count — quoted code (fenced blocks, `<pre>`/`<code>`, and
  single-backtick spans) is masked before this check runs.

### `WARN_A11Y_NAME`
The component's own guidance states an accessible-name obligation this usage does not meet. The
rule set is deliberately small and evidence-backed; today it is one case.
- **al-button with `hideText` and no name.** `hideText` only *visually* hides the slotted text, so
  the text cannot serve as the accessible name. With no `label`, the button ships with no
  accessible name at all
  ([`apps/docs/src/content/guidance/button.yaml`](../../../apps/docs/src/content/guidance/button.yaml)).
- **Fix:** add `label="…"` describing the action — it becomes `aria-label` on both the `<button>`
  and `<a>` branches — put the glyph in the `before` slot, and do **not** also leave visible text
  (a hidden text node plus a label produces a redundant accessible name). `aria-label` /
  `aria-labelledby` satisfy the obligation too.
- **Before:** `<al-button hideText><al-icon-dots-vertical slot="before"></al-icon-dots-vertical></al-button>`
  → **After:** `<al-button hideText label="Open actions menu"><al-icon-dots-vertical slot="before" iconTitle="Actions"></al-icon-dots-vertical></al-button>`

---

## Scope (honest limits)

This CLI is the **lite, shippable** face of Altitude's contracts — dependency-free, so it runs
anywhere with just Node. Its contract source is the shipped `custom-elements.json` (CEM), so it can
never drift from the real component API.

- It validates two surfaces off the same CEM: **`<al-*>` custom-element usage** (plain HTML, Svelte,
  Astro, Angular/Vue templates, Lit templates) and **`@southleft/al-react` JSX wrappers**
  (`<ALButton variant="…">` imported from `@southleft/al-react`). In JSX the same checks apply to props.
  Framework binding syntax (`[x]=`, `:x=`, `?x=`, `.x=`, `bind:x`, `{expr}`, `${expr}`) and JSX
  `{...spread}` are recognized and treated as dynamic — the attribute/prop is still checked for
  existence, but its value isn't enum/type-checked (it can't be known statically).
- Because the CEM doesn't surface inherited base-class members per element, the one inherited prop
  Altitude components share — `styleModifier` (from `ALElement`) — is allowlisted explicitly.
- It does **not** validate required attributes, or composition rules beyond slot names and
  arrangement. Those are natural follow-ons.

### What is deliberately NOT enforced, and why

False positives cost more here than misses do. The MCP self-heal loop tells an agent to iterate
until the validator reports zero violations, so a rule an agent cannot satisfy is an agent that
never finishes. These are the lines that were drawn, all of them measured against real repo code:

- **Raw values in a consuming app's own chrome.** A stylesheet rule is checked only when its
  selector names an `al-*` element, and an inline `style=` only on an Altitude element. Checking
  every rule produced 241 warnings against `apps/docs` alone — a site whose own header, code
  panels and page furniture are not design-system surface.
- **Geometry.** `width`, `height`, positional offsets, hairlines and the offsets inside a
  `box-shadow` are not token-covered concepts, so a px there is not a violation.
- **Slot names on a component whose rendered template can't be read**, or that builds a slot name
  dynamically. Skipped, not guessed.
- **Accessible-name obligations that aren't written down.** `WARN_A11Y_NAME` covers only cases the
  component's own guidance states. Contrast, focus order, and heading structure are for axe and a
  human, not for a static markup scan.
- **`<al-theme>` on anything that isn't plausibly a document root.** An inner fragment's theme host
  lives in a file this scan cannot see.
- **Anything inside quoted code** — fenced blocks, `<pre>`/`<code>`, single-backtick spans, and
  `/* … */` comments — for the style, registration and root-detection rules. A README that
  *describes* two registration paths is not taking both.
