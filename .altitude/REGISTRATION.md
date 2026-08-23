# Component Registration — the Complete Model

> The single authoritative explanation of how Altitude elements get into
> `customElements`. Everything else (README, CLAUDE.md, AGENTS.md) should link
> here rather than re-explain. Verified against source 2026-08-20.

Altitude has **one registry engine and three consumer entry paths**. Pick the
path that matches what you are building; do not mix them in one document.

> Brand-layer note: `@southleft/sl-web-components` deliberately exploits first-come
> `customElements.define` to *capture* the base `al-header`/`al-footer` tags —
> load order is load-bearing. See `.altitude/BRAND-LAYER.md` § tag capture.

## The engine

`libs/al-web-components/directives/register.ts` exposes two functions:

- **`registerAltitude(opts, elements)`** (`register.ts:101`) — the v2 public
  API. `mode: 'stable'` defines plain tags (`al-button`), `mode: 'versioned'`
  defines suffixed tags (`al-button-1-2-3`, `suffix` required — throws in dev
  without it, `register.ts:110-115`), `mode: 'manual'` returns the alias map
  and never touches `customElements` (`register.ts:126`). Always returns
  `Map<originalTag, registeredTag>`.
- **`register({ elements, suffix })`** — the legacy engine. Still used
  *internally* by composites and by the `@southleft/al-react` wrappers. Application code
  should never call it.

**Rule of thumb (from AGENTS.md):** if you are an APP, call `registerAltitude`.
If you are a COMPONENT composing sub-components, call `register`.

## Path 1 — template frameworks and plain HTML: the auto-registry flag

Svelte, Angular, Astro, vanilla HTML, and the public homepage set a global
flag **inline in `<head>`, before any module script**:

```html
<script>
  window.alAutoRegistry = true;
</script>
```

Every component module ends with a guard (e.g.
`components/theme/theme.ts:73`, `components/alert/alert.ts:223-225`):

```ts
if ((globalThis as any).alAutoRegistry === true && customElements.get(ALAlert.el) === undefined) {
  customElements.define(ALAlert.el, ALAlert);
}
```

So a plain side-effect import (`import '@southleft/al-web-components/components/alert'`)
self-registers the plain tag — but **only** if the flag was set before the
module evaluated. Setting it in application JS is too late: ESM imports are
hoisted and evaluate first. That is why the flag must live in the HTML shell
(`apps/svelte/index.html:8`, `apps/angular/src/index.html:9`,
`apps/web-components/index.html:10`, `apps/home/index.html:11`, and an
`<script is:inline>` in `apps/astro/src/pages/index.astro`).

### The flag is load-bearing inside composites

Composites also read the flag **at module-eval time** to decide the suffix for
sub-components they render internally (`components/alert/alert.ts:36`):

```ts
suffix: (globalThis as any).alAutoRegistry === true ? '' : PackageJson.version
```

This keeps an `<al-alert>`'s injected `<al-icon-close>` resolving to the same
tag scheme the page chose. Consequence: the flag is not a boot convenience —
flipping it after modules load changes nothing, and mixing flagged and
unflagged bundles on one page will split the tag namespace.

## Path 2 — React: implicit, versioned, via the wrappers

React apps do **not** set the flag and do **not** call `registerAltitude`.
Every `@southleft/al-react` wrapper registers its own element with the legacy engine and
a version suffix (`libs/al-react/src/components/Button/Button.tsx:6-10`):

```ts
register({ elements: [[ALButton.el, ALButton]], suffix: PackageJson.version });
```

So React consumers get `al-button-1-0-0`-style tags under the hood, rendered
through `@lit/react`'s `createComponent`. This is invisible in JSX but visible
in the DOM inspector — it is expected, not a bug. It also means React apps
coexist safely with another Altitude version on the same page.

## Path 3 — micro-frontends: explicit `registerAltitude`

MFEs must own their tag namespace, so they skip the flag (auto-registration
would claim the plain tags first) and call the API explicitly
(`apps/mfe/src/main.js:18-23`):

```js
registerAltitude({ mode: 'versioned', suffix: '1-0-0' }, [[ALButton.el, ALButton]]);
```

`mode: 'manual'` is the same path for tests and SSR harnesses that need to
control define-timing themselves.

## Quick reference

| Consumer | Flag in `<head>`? | API call | Resulting tags |
|---|---|---|---|
| Svelte / Angular / Astro / vanilla | **yes** | none | plain (`al-button`) |
| React via `@southleft/al-react` | no | none (wrappers do it) | versioned (`al-button-1-0-0`) |
| Micro-frontend | no | `registerAltitude({ mode: 'versioned', suffix })` | versioned, caller-chosen |
| Tests / SSR | no | `registerAltitude({ mode: 'manual' })` + own `define` | caller-owned |

## Gotchas

1. **Flag timing**: inline `<head>` script or nothing. ESM hoisting makes any
   later assignment a silent no-op.
2. **Double registration is safe**: guards check `customElements.get(...)`
   first; `defineSafely` in the engine does the same.
3. **Versioned mode requires a suffix** — dev throws, prod logs and returns an
   empty map (`register.ts:110-115`).
4. **CI enforcement**: `scripts/check-register-altitude` gates the pattern.
