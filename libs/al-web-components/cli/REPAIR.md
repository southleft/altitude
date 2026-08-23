# Repairing Altitude usage violations

You (an agent, or a human) ran the Altitude usage validator and got one or more violations. This
guide tells you how to fix each one. It is keyed by the **stable error `CODE`** the validator
prints — find the code, apply the recipe. The same recipes are available machine-readably in
[`repair-map.json`](./repair-map.json).

```bash
npx altitude-validate src/            # human report
npx altitude-validate --json src/     # one JSON envelope on stdout (for programmatic self-heal)
```

Every violation carries: a `code` (stable), a `rule` (human name), `file:line:column`, a `detail`,
sometimes a `suggestion` (nearest valid name), and a `fix` (the actionable recipe, already
specialized to your case). The `--json` envelope is:

```json
{ "apiVersion": 1, "type": "validation.result",
  "data": { "passRate": 0.9, "totalUsages": 53, "passingUsages": 49,
            "violations": [ { "code": "ERR_INVALID_ENUM", "component": "al-button", "fix": "...", "...": "..." } ],
            "byComponent": { "al-button": { "usages": 17, "errors": 0 } } } }
```

Exit code is `1` when any violation exists, `0` when clean, `2` on validator malfunction. So a
self-heal loop is: **run → parse `violations` → apply each `fix` → re-run until exit 0.**

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
- It does **not** yet validate slot names or required-attribute/composition rules. Those are
  natural follow-ons on the same CEM.
- Because the CEM doesn't surface inherited base-class members per element, the one inherited prop
  Altitude components share — `styleModifier` (from `ALElement`) — is allowlisted explicitly.
