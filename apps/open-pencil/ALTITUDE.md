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

## Hosting (Cloudflare Pages + Access)

The editor is a **second Pages project** in the same Cloudflare account as the docs site
(`altitude.pages.dev`), connected to the same GitHub repo the same way. It is not part of
the docs build: `build:all` is a strict `&&` chain, and a heavy Bun build failing there
would take the docs down with it. It also lets the editor be locked to the team while the
docs stay public.

One-time setup, done by someone with access to the Southleft Cloudflare account:

1. **Create the project.** Workers & Pages → Create → Pages → *Connect to Git* → choose
   `southleft/altitude` (the same repo the docs project uses).
2. **Build settings:**

   | Setting | Value |
   |---|---|
   | Project name | `altitude-open-pencil` |
   | Production branch | `main` |
   | Framework preset | None |
   | Root directory (advanced) | `apps/open-pencil` |
   | Build command | `bun install --frozen-lockfile && bun run build:packages && bunx vite build` |
   | Build output directory | `dist` |
   | Environment variable | `BUN_VERSION` = `1.4.2` |

3. **Build watch paths** (project → Settings → Builds → Build watch paths): include
   `apps/open-pencil/*`. Docs-only commits then don't rebuild the editor. Do the reverse
   on the docs project, excluding `apps/open-pencil/*`, so editor commits don't rebuild the
   docs.
4. **Lock it to Southleft.** Project → Settings → General → *Access policy* → Enable. That
   creates a Cloudflare Access app for preview URLs. For production, Zero Trust → Access →
   Applications → the created app → add `altitude-open-pencil.pages.dev` as a second
   domain. Policy: *Allow*, *Emails ending in* `@southleft.com` (or your IdP group).

Result:

- Production (from `main`): `https://altitude-open-pencil.pages.dev`
- Every other branch and PR: `https://<branch>.altitude-open-pencil.pages.dev`

`public/_headers` and `public/_redirects` already ship in `dist/` (wasm content type and
the SPA fallback). Checks run separately in `.github/workflows/open-pencil.yml`; no
Cloudflare secrets are needed in GitHub.

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
