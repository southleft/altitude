# OpenPencil inside Altitude

This folder is [OpenPencil](https://github.com/open-pencil/open-pencil) (MIT), an
open-source canvas editor, imported into Altitude as a **git subtree**. We are using it as
an experiment: a canvas that expresses Altitude's components and tokens, with **Altitude
code as the source of truth** and the canvas checked against it.

- Direction and audit: [`.slate/AUDIT.md`](.slate/AUDIT.md)
- Design↔code round-trip contract: [`packages/docs/development/round-trip.md`](packages/docs/development/round-trip.md)
- Heavy-load performance baseline: [`.slate/PERF.md`](.slate/PERF.md)
- Upstream architecture and conventions: [`AGENTS.md`](AGENTS.md). They still apply inside
  this folder.

## Library from code

Altitude code generates the canvas component library, and a gate checks that the canvas
agrees with the code it came from.

```sh
# in apps/open-pencil
bun run open-pencil altitude build-library ../.. --out altitude.fig
bun run open-pencil altitude build-library ../.. --publish --catalog ./libraries
# at the Altitude root
pnpm run canvas:parity
```

- **Builder** (`tools/altitude/src/library/`): imports the DTCG tokens, then builds one
  component set per code contract with measured anatomy. Variant axes come from the
  contracts' Figma bindings, case dimensions and uncurated enums (`plan.mjs` curation: no
  omitted or behavioural fan-out); layout comes from the measured anatomy; fills, strokes,
  radii, spacing and text colour bind to the imported variables per variant and state.
  Every set carries a `codeBinding` (tag, `@southleft/al-react` wrapper, attribute and slot
  mapping). Contracts without measured anatomy are named skips. Rebuilds are idempotent:
  `--publish` adds a library revision only when an asset changed.
- **Canvas contracts**: `open-pencil altitude canvas-contracts` emits
  `canvas-contract.schema.json` files; `figma.fileKey`/`figma.nodeId` hold OpenPencil
  identifiers (`open-pencil:altitude`, the set's `componentKey`) because the schema has no
  other place for them.
- **Gate** (`scripts/contracts/canvas-parity.mjs`, `needs: [install, open-pencil]`): runs
  the unchanged `diffContracts()` per component and reports API parity, token parity and the
  disagreements; exit 1 below the floors. Not blocking yet: CI does not install Bun, and
  the remaining disagreements are curation decisions for the component owners.
- **Codegen**: instances of library components export as `<al-*>` elements in HTML and as
  `<AL*>` wrappers in React JSX, valid under `altitude-validate`.

Details: [`packages/docs/development/code-bound-library.md`](packages/docs/development/code-bound-library.md).

## It is a separate toolchain

OpenPencil is a **Bun** workspace with its own lockfile, lint (oxlint) and type gate. It is
excluded from Altitude's pnpm workspace, ESLint and Stylelint, so `pnpm install` at the
Altitude root never touches it.

```sh
cd apps/open-pencil
bun install
bun run build:packages   # required once; dom-css peer-depends on core's dist/
bun run dev              # http://localhost:1420
```

Requires Bun 1.4.2 (pinned in `package.json` → `packageManager`). The desktop app
(`bun run tauri dev`) also needs Rust.

## Checks

```sh
bun run lint
bunx tsgo --noEmit
bun test packages/dom-css/tests
bun run conformance:gate
bun run check            # the full upstream gate
```

CI: `.github/workflows/open-pencil.yml` at the Altitude root runs on any change under
`apps/open-pencil/**`. The upstream workflows in `apps/open-pencil/.github/` are kept for
reference only. GitHub never runs workflows from a nested folder.

## Hosting: `altitude.pages.dev/open-pencil/` (password-protected)

The editor ships with the docs site's existing Cloudflare Pages project. There's no
separate project and no GitHub secrets.

- **Build.** `pnpm run build:app-open-pencil` (`scripts/build-open-pencil.mjs`) is the last
  step of `build:all`. It runs `build:packages` and `vite build` with
  `OPENPENCIL_BASE=/open-pencil/` into `dist/open-pencil/`, using `bun` from PATH or `npx
  bun@<pinned>` (the Pages image has no Bun). It is **soft**: if the editor fails to build,
  it warns, ships nothing under `/open-pencil/`, and the docs still deploy. CI's strict
  "Build for /open-pencil/" step is what catches that before merge.
- **Password.** `functions/open-pencil/_middleware.js` puts HTTP Basic auth on every
  request under `/open-pencil/` (any username). It also provides the SPA fallback for
  client routes such as `/open-pencil/share/<id>`, and the wasm content type, because
  Cloudflare does not apply `_redirects` or `_headers` to Function-served requests. It
  fails closed: without a password configured, the editor returns 503.

**One-time setup (Cloudflare dashboard):** the docs Pages project → Settings → Variables and
Secrets → add `OPEN_PENCIL_PASSWORD` as a **Secret** for **Production and Preview** → redeploy.
Share the password with the team, not in the repo.

URLs:

- Production (from `main`): `https://altitude.pages.dev/open-pencil/`
- This branch / PR previews: `https://<branch>.altitude.pages.dev/open-pencil/`

The build adds roughly 4–5 minutes to the Pages build. The editor's own
`public/_headers`/`_redirects` land in `dist/open-pencil/` but are ignored by Cloudflare,
which reads them only from the site root. The root rules live in `pages-root/`.

Documents stay in each person's browser (IndexedDB) unless saved to a file. Hosting does
not create shared storage. Connecting an AI agent works from the desktop app or a local
`bun run dev`, not from the hosted site (see the Connect AI popover).

## Pulling upstream OpenPencil updates

The import was squashed (`git-subtree-dir: apps/open-pencil`), so upstream history is not in
Altitude. To update:

```sh
git subtree pull --prefix apps/open-pencil https://github.com/open-pencil/open-pencil.git master --squash
```

Keep fork changes in new modules where possible, and keep upstream files' edits small. That
is what keeps these pulls cheap. On Windows, `git subtree` may stage the merge and then
exit without committing. If that happens, commit the staged result with a message
containing `git-subtree-dir: apps/open-pencil` and `git-subtree-split: <squash sha>`, as
the import commit does.

## Large test fixtures

`tests/fixtures/*.fig` and the test fonts are Git LFS objects (~148 MB, mostly
`material3.fig` and `nuxtui.fig`, used only by the heavy Figma-import tests). CI does not
pull them. Run `git lfs pull --include="apps/open-pencil/tests/fixtures/*"` locally when you
need those suites.

The Altitude design-system `.fig` used for fidelity measurements is **never** committed;
keep it at `apps/open-pencil/.slate/fixture.fig` (gitignored).
