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

The editor deploys to its **own** Pages project, `altitude-open-pencil`, separate from the
public docs site (`altitude.pages.dev`), so it can be restricted to the team.

One-time setup, done by someone with Cloudflare admin rights:

1. **Create the Pages project.** Cloudflare dashboard → Workers & Pages → Create → Pages →
   *Direct Upload*, named `altitude-open-pencil`. Do not connect Git; CI uploads the build.
2. **Add GitHub secrets** to `southleft/altitude`: `CLOUDFLARE_API_TOKEN` (a token with
   *Cloudflare Pages: Edit*) and `CLOUDFLARE_ACCOUNT_ID`. Until both exist, the deploy job
   skips with a notice and the checks still run.
3. **Lock it down with Access.** Zero Trust → Access → Applications → Add → Self-hosted:
   - domains `altitude-open-pencil.pages.dev` **and** `*.altitude-open-pencil.pages.dev`
     (preview deploys);
   - policy *Allow*, rule *Emails ending in* `@southleft.com` (or a Southleft IdP group).

   Alternatively: Pages project → Settings → *Enable access policy*, which sets up the same
   for previews.

Pushes to `main` publish production. Same-repo PRs publish a preview at
`<branch>.altitude-open-pencil.pages.dev`.

Documents stay in each person's browser (IndexedDB) unless saved to a file. Hosting does
not create shared storage.

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
