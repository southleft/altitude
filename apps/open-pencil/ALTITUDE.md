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

## Hosting: `altitude.pages.dev/open-pencil/` (GitHub sign-in)

The editor ships with the docs site's existing Cloudflare Pages project. There's no
separate project and no GitHub Actions secrets.

- **Build.** `pnpm run build:app-open-pencil` (`scripts/build-open-pencil.mjs`) is the last
  step of `build:all`. It runs `build:packages` and `vite build` with
  `OPENPENCIL_BASE=/open-pencil/` into `dist/open-pencil/`, using `bun` from PATH or `npx
  bun@<pinned>` (the Pages image has no Bun). It is **soft**: if the editor fails to build,
  it warns, ships nothing under `/open-pencil/`, and the docs still deploy. CI's strict
  "Build for /open-pencil/" step is what catches that before merge.
- **Access = access to a private GitHub repository.** `functions/open-pencil/_middleware.js`
  gates every request under `/open-pencil/`. A visitor signs in with GitHub and gets in only
  if `GET /repos/southleft/altitude-designs` succeeds with their token, so anyone with at
  least read access to that repository can use the editor, and removing someone from it
  removes them here. The middleware also serves the sign-in routes under
  `/open-pencil/auth/github/`, the SPA fallback for client routes such as
  `/open-pencil/share/<id>`, and the wasm content type, because Cloudflare does not apply
  `_redirects` or `_headers` to Function-served requests.
- **Sessions.** After sign-in the browser holds `op_session`, an HttpOnly, Secure,
  SameSite=Lax cookie scoped to `/open-pencil/`, AES-GCM-sealed with a key derived (HKDF)
  from `OPEN_PENCIL_SESSION_SECRET`. It lasts 12 hours. After an hour, the next request
  re-checks repository access with the stored token: lost access or a revoked token ends
  the session; if GitHub is unreachable or rate limited, the session continues until it
  expires. Page loads without a session go to sign-in and come back to the same URL; other
  requests (scripts, wasm, fetches) get 401. Someone signed in without access sees a page
  naming their account and the repository, with a sign-out button.
- **Editor integration.** The hosted editor reads `/open-pencil/auth/github/session` on
  startup and, if no GitHub credential is stored yet, stores the session's token through the
  credential manager, so version control is signed in without a second popup ("Signed in as
  @login"). The token is returned only to same-origin requests carrying
  `X-OpenPencil-Request: 1`. **Sign out** in Settings → Version control also ends the site
  session (`POST /open-pencil/auth/github/logout`, same guard) and shows a signed-out page.

**Setup (Cloudflare dashboard → the docs Pages project → Settings → Variables and Secrets),
then redeploy:**

| Variable | Production | Preview | Notes |
| --- | --- | --- | --- |
| `GITHUB_OAUTH_CLIENT_ID` | plain text | plain text | The OAuth app (see "Version control" below). |
| `GITHUB_OAUTH_CLIENT_SECRET` | **Secret** | not needed | Only production exchanges codes. |
| `OPEN_PENCIL_SESSION_SECRET` | **Secret** | **Secret**, same value | At least 32 bytes: `openssl rand -base64 48`. Rotating it signs everyone out. |
| `OPEN_PENCIL_ACCESS_REPO` | optional | optional | `owner/repo`, default `southleft/altitude-designs`. Must be **private**: on a public repository every GitHub account has read access. |
| `OPEN_PENCIL_ACCESS_MIN_PERMISSION` | optional | optional | `pull` (default, read access) or `push` (write access). |
| `OPEN_PENCIL_PREVIEW_ORIGINS` | optional | optional | Comma-separated preview origins; `*` is one DNS label. Default `https://*.altitude.pages.dev`. |
| `OPEN_PENCIL_PASSWORD` | rollout only | rollout only | The old Basic-auth password; see below. |

Also optional: `OPEN_PENCIL_SESSION_TTL_SECONDS` (default 43200),
`OPEN_PENCIL_SESSION_REVERIFY_SECONDS` (default 3600) and `OPEN_PENCIL_PRODUCTION_ORIGIN`
(default `https://altitude.pages.dev`).

**Fallbacks, so the editor is never open or broken during rollout.** The GitHub gate is
active only when `GITHUB_OAUTH_CLIENT_ID` and a valid `OPEN_PENCIL_SESSION_SECRET` are set
(plus `GITHUB_OAUTH_CLIENT_SECRET` outside previews). Until then, if `OPEN_PENCIL_PASSWORD`
is set, the previous HTTP Basic password gate applies (any username), with the app's
popup sign-in still behind it. With neither, every request returns 503: an unconfigured
gate fails closed. Configure production before previews (a preview in GitHub mode sends
sign-in to production). Once GitHub sign-in works in production and previews, **delete
`OPEN_PENCIL_PASSWORD`**; it is ignored while the GitHub gate is active.

**Previews.** Cookies cannot be shared between `altitude.pages.dev` and
`<branch>.altitude.pages.dev` (pages.dev is on the public suffix list), and the OAuth app
has a single callback URL. A preview therefore sends sign-in to production with its own URL
as `return_to` (accepted only for origins matching `OPEN_PENCIL_PREVIEW_ORIGINS`). After
checking access, production redirects to `<preview>/open-pencil/auth/github/accept?ticket=…`:
a ticket sealed with the shared session secret, valid for 60 seconds and bound to that
preview origin, from which the preview sets its own `op_session` and redirects the ticket
out of the address bar. Residual risks: tickets cannot be made single-use without storage,
so a ticket copied from that URL within 60 seconds could be replayed on the same preview;
the URL may appear in Cloudflare's own request logs (this code logs nothing); and anyone
who can deploy a preview branch can read Preview variables, including the session secret
shared with production. Only people with push access to this repository can do that.

**Offline cache.** The editor's service worker can open the cached app shell without a
network request. On startup the editor asks for its session, and sends the page to sign-in
when the site says it has ended; uncached files are refused without a session anyway.

URLs:

- Production (from `main`): `https://altitude.pages.dev/open-pencil/`
- This branch / PR previews: `https://<branch>.altitude.pages.dev/open-pencil/`

The build adds roughly 4–5 minutes to the Pages build. The editor's own
`public/_headers`/`_redirects` land in `dist/open-pencil/` but are ignored by Cloudflare,
which reads them only from the site root. The root rules live in `pages-root/`.

Documents stay in each person's browser (IndexedDB) unless saved to a file or committed to
GitHub (see "Version control (GitHub)"). AI agents reach the hosted editor through the hosted
MCP relay below; without it, Connect AI says agents need the desktop app or a local
`bun run dev`.

## Hosted MCP relay

`packages/relay` is a Cloudflare Worker (`altitude-open-pencil-mcp`) that lets Claude Code,
Cursor and other MCP clients drive the hosted editor:

```text
agent ──Streamable HTTP MCP──▶ Worker ──▶ Durable Object (one per connection key) ◀──WebSocket── editor tab
```

The relay stores no document and no tool definitions. Each person creates a connection key
in Connect AI; the tab connects to the relay with it, and agents send it as
`Authorization: Bearer <key>`. Tool calls run in the tab through the same path as local
MCP. Behaviour, limits and the threat model: `packages/docs/programmable/mcp-server.md`
("Hosted editor (remote relay)"). In short: a key lets its holder edit whatever is open in
that person's tab, so treat it like a password and use **Regenerate key** to revoke it.
A later version will bind keys to the GitHub sign-in instead.

It lives inside the Bun workspace (shared TypeScript, oxlint and test runner, and the
protocol module the editor imports), so it is excluded from Altitude's pnpm workspace,
ESLint, Stylelint and export scans along with the rest of `apps/open-pencil`.

**One-time setup (Cloudflare dashboard, Workers Builds):**

1. Workers & Pages → **Create** → Workers → **Import a repository** → `southleft/altitude`.
2. Project name: `altitude-open-pencil-mcp` (must match `name` in `wrangler.toml`).
3. Build configuration:
   - Root directory: `apps/open-pencil/packages/relay`
   - Build command: `cd ../.. && bun install --frozen-lockfile --filter @open-pencil/relay`
   - Deploy command: `bunx wrangler@4 deploy`
   - Non-production branch deploy command: `bunx wrangler@4 versions upload`
4. Build variables: `BUN_VERSION` = `1.4.2` and `SKIP_DEPENDENCY_INSTALL` = `1` (the
   lockfile is two levels up, so the build command installs instead). Use `bunx`, not
   `npx`: npm reads the parent Bun workspace's `overrides` and refuses to run.
5. Deploy. `wrangler deploy` creates the `OpenPencilRelay` Durable Object class from the
   `v1` migration (`new_sqlite_classes`); nothing else to provision. Check
   `https://altitude-open-pencil-mcp.<account-subdomain>.workers.dev/health` returns `ok`.
6. Allowed tab origins are `ALLOWED_ORIGINS` in `wrangler.toml` (production, branch
   previews, localhost). Change them there: each deploy replaces dashboard values.
   `RELAY_TIMEOUT_MS`, `RELAY_RATE_BURST` and `RELAY_RATE_PER_SECOND` are optional overrides.
7. The editor learns the relay URL at build time. `scripts/build-open-pencil.mjs` defaults it
   to `https://altitude-open-pencil-mcp.southleft-llc.workers.dev` and logs which URL it used
   (`[open-pencil] MCP relay: …`). Set `VITE_OPENPENCIL_RELAY_URL` (plain text) on the docs
   Pages project only to point at a different relay. Without a valid URL, the hosted Connect
   AI popover shows its "not available on the web" message.

Then in the editor: Connect AI → **Create connection key** → copy the one-line command,
for example
`claude mcp add --scope user --transport http open-pencil https://altitude-open-pencil-mcp.<account-subdomain>.workers.dev/mcp --header "Authorization: Bearer <key>"`.

Local development:

```sh
cd apps/open-pencil/packages/relay
bun run dev                     # wrangler dev, http://127.0.0.1:8787
bun test tests && bun run typecheck
bunx wrangler@4 deploy --dry-run   # proves it bundles
```

Build or run the editor with `VITE_OPENPENCIL_RELAY_URL=http://127.0.0.1:8787` to use it.

## Version control (GitHub)

Documents can be committed to a GitHub repository, by default the private
**southleft/altitude-designs** (branch `main`, folder `documents`), configurable in
**Settings → Version control**. Each save is one commit to the document's bound branch
(the configured branch until you switch). The user guide
(`packages/docs/user-guide/version-control.md`) covers the flow, branches and pull requests,
comments and the JSON format.

- Format: `packages/core/src/io/formats/document-json/` (`@open-pencil/core/io/formats/document-json`).
- App: `src/app/integrations/storage/github/` (client, repository/commit flow, OAuth,
  settings workflows, per-document session). The token lives in the credential store under
  `github:default:token`; the signed-in login, id and avatar are non-secret settings.
- OAuth: the sign-in routes in `functions/open-pencil/_middleware.js` at the Altitude root
  (see "Hosting"). In the hosted editor, the site sign-in also signs in version control;
  the Settings popup and the token remain for re-authorizing and for desktop and local
  development. Tested by `node scripts/__tests__/open-pencil-github-oauth.test.mjs` and
  `node scripts/__tests__/open-pencil-site-access.test.mjs`.
- Branches and pull requests: `src/app/integrations/storage/github/branches/` (names, pull
  request lookup and body, the `useGitHubBranches` workflow); UI in
  `src/components/version-control/GitHubBranchPicker.vue`. A branch belongs to the document's
  binding, not to the settings; switching loads that branch's copy through
  `src/app/tabs/open/github.ts`. Pull request bodies list changed pages; preview images are not
  generated yet.
- Comments: `src/app/integrations/storage/github/comments/` (anchor block, issue mapping, pin
  placement, per-document session created next to the GitHub session). Each comment is an
  issue labelled `design-comment` and `doc:<slug>`; the body ends with
  `<!-- openpencil:anchor {...} -->` (document path, page and node ids, offsets, branch,
  commit), parsed defensively. Pins are a DOM overlay (`src/components/comments/CommentLayer.vue`)
  positioned from the viewport, like the canvas label editor. Comment mode needs a committed
  document because `.fig` imports get new node ids on each open.
- Multiplayer identity: `src/app/collab/identity.ts` maps the signed-in GitHub account into
  the awareness `user` (name, login, avatar). Peers' values are validated and avatars load only
  from `https://avatars.githubusercontent.com`; cursor pills draw them in CanvasKit
  (`packages/core/src/canvas/cursor-avatars.ts`). **Display-only:** P2P rooms are still
  protected by the link secret alone, so anyone with the link can claim any name until rooms
  are relay-gated.

**One-time setup: the OAuth app** (GitHub → southleft organization → Settings → Developer
settings → OAuth Apps → New OAuth App):

| Field | Value |
| --- | --- |
| Application name | OpenPencil (Southleft) |
| Homepage URL | `https://altitude.pages.dev/open-pencil/` |
| Authorization callback URL | `https://altitude.pages.dev/open-pencil/auth/github/callback` |
| Enable Device Flow | off |

The app requests the `repo` scope (private repository contents, branches, pull requests,
issues and labels). Then generate a client secret and set the variables in
the "Hosting" table above. If the organization restricts OAuth app access, an owner must
approve the app for southleft (GitHub → organization settings → Third-party access);
until then GitHub hides the private repository from the app's tokens and every member is
shown the access-denied page.

**Preview deployments** (`<branch>.altitude.pages.dev`) sign in through production and
receive a short-lived ticket (see "Hosting"), so they need no OAuth app of their own.

**Desktop and local `bun run dev`:** Pages Functions do not run there. Use **Use a personal
access token instead** in the same settings section: a
[fine-grained token](https://github.com/settings/personal-access-tokens/new) with resource
owner `southleft`, repository access limited to `altitude-designs`, and **Contents: Read and
write**. For branches, pull requests and comments also grant **Pull requests: Read and write**
and **Issues: Read and write** (labels are created through the issues permission). It is stored
the same way as the OAuth token.

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
