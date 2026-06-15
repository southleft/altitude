---
"al-web-components": major
"al-react": major
---

Altitude v2 — scoped theming, AI contracts, modern toolchain.

## Highlights

- **Scoped theming.** Every component reads tokens through the nearest
  `<al-theme brand mode density contrast motion>` host instead of a global
  `<style>` mutation. Adjacent `<al-theme>` subtrees compute distinct
  `--al-*` values; multi-brand pages work without subtree contamination.
  See `.altitude/SSR.md` and the `<al-theme>` component docs.
- **Cascade layers.** `@layer al.reset, al.base, al.theme, al.component,
  al.override` is declared up front; every component stylesheet ships in
  `@layer al.component { … }`. Author overrides land in `al.override` so
  Altitude rules never have to compete on specificity.
- **Registry modes.** New `registerAltitude({ mode, suffix?, prefix? }, …)`
  with explicit `stable | versioned | manual` modes replaces the
  flag-driven legacy registration. The legacy `register()` export is
  preserved for backward compatibility through the 3.x line (see
  `.altitude/SEMVER.md` deprecation budget).
- **Headless behavior controllers** for dialog/menu/tabs/tooltip — pure
  state machines that styled components host.
- **AI contracts.** Per-component JSON schemas at
  `libs/al-web-components/schemas/` (one per migration entry); contract
  validator at `scripts/validate-contracts.js`; the agent-facing
  navigation lives in `AGENTS.md` and `llms.txt`.
- **Modern toolchain.** Vite library build alongside webpack; SD v5
  parallel pipeline byte-identical to v3; React 19 wrappers; Lit 3.3;
  date-fns 4; TypeScript 5.9; Node 20 (target 22).

## Migration

See `MIGRATION.md` at the repo root for the consumer-facing migration
guide and codemods. Most consumers can:

1. Wrap their root in `<al-theme>` and remove their global
   `<style id="al-tokens-sheet">` shim.
2. Swap calls to the legacy `register({ elements, suffix })` for
   `registerAltitude({ mode: 'stable' }, elements)`.
3. Pin `react / react-dom` to `^19` if consuming `al-react`.

The 1.x → 2.x migration is staged across all 65 components in
`.altitude/migration.json`; CI rejects feature work on components that
haven't crossed to `scoped-complete`.
