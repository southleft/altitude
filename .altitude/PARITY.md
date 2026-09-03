# Figma ↔ Code Parity (MCP tool + docs-site panel)

> **Storybook was retired 2026-08-25** (commit `23c5f3a`) — every mention of a
> Storybook sidebar badge or docs-page banner below is history, not a live
> surface. The live surfaces today are:
> - **`altitude_check_parity`** (MCP tool) — the same report, agent-facing,
>   filterable by `tag` / `status` / `project`; each entry carries the
>   `aiPrompt` reconciliation string.
> - **`GET /parity.json`** — served by the `altitude` MCP server in
>   streamable-HTTP mode (loopback-only; see "Serving the report" below).
> - **The docs site's `ParityPanel`** (`apps/docs/src/components/ParityPanel.astro`)
>   — a read-only, build-time-rendered per-component panel on every component's
>   docs page. It has no interactive actions (no "Open in Figma" / "Copy AI fix
>   prompt" buttons — those were Storybook-sidebar-only and did not survive the
>   retirement); an agent reconciling drift uses `altitude_check_parity`
>   instead, which is where the copy-paste `aiPrompt` still lives.

Every component tracked by a design-system project carries a parity status
(1:1 with Figma, drifted, missing) computed from the snapshot manifest below.

> **Parity is MULTI-PROJECT.** One component library backs several design
> systems (Altitude, Southleft), each checked against its own Figma file. Which
> design systems exist, and what each points at, is declared in
> **`.altitude/ds-projects.json`** — see **[`DS-PROJECTS.md`](./DS-PROJECTS.md)**.
> Everything below describes ONE project; pass `--project <id>` (or set
> `DS_PROJECT`) to act on another. Omitting it means the default, `altitude`.

## The model — snapshot manifest

Source of truth: the active project's **parity manifest**
(`paths.parityManifest` — `.altitude/figma-sync/parity-manifest.json` for
altitude, `.altitude/figma-sync/southleft/parity-manifest.json` for southleft;
git-tracked, while the rest of `figma-sync/` stays ignored). Per component it
records:

- `figma` — the mapped Figma component set (`{ name, nodeId }`). Atoms pin
  node ids; molecules map by name only (`nodeId: null`) because molecule pages
  are rebuilt and re-mint ids (see `scripts/figma-atoms/instance-map.mjs`).
- `lastSync` — the code hash + Figma digest captured when the two sides were
  last **confirmed** to match. As of T11 (spec 2026-08-25-contract-backed-
  figma-parity-and-generation) it also carries `contractHash` (sha256 of the
  tracked `.altitude/contracts/<project>/<tag>.contract.json` at stamp time)
  and `contractVersion` (that contract's `version` field) — OPTIONAL, present
  only for a tag that had a tracked contract when it was stamped; a tag
  stamped with no contract on disk (not yet seeded) simply omits both.
- `figmaCurrentDigest` — the last **observed** Figma digest.

Status is computed live in `libs/altitude-mcp/src/lib/parity.mjs`:

| Status | Docs-panel tone | Meaning |
| --- | --- | --- |
| `in-sync` | green | code hash and Figma digest both match `lastSync` |
| `code-drift` | yellow | component source changed since last sync — Figma is behind |
| `figma-drift` | yellow | Figma changed since last sync — code is behind |
| `conflict` | yellow | both drifted; reconcile deliberately |
| `missing-in-figma` | red | exists in code, no Figma set at all |
| `missing-in-code` | red | Figma set with no code component (report/MCP only — no docs page exists for it) |
| `excluded` | none | deliberately untracked (per-project `excluded` in `ds-projects.json` — e.g. `al-icon`, `al-theme`, `al-theme-switcher` — plus titles under `library.excludeTitlePrefixes`, e.g. `Foundations/`) |

**Code drift is always live** — the component's `.ts`/`.scss` (stories and
tests excluded, CRLF-normalised) are re-hashed on every read. Since the docs
site renders `ParityPanel` at Astro build time (not a client-side poll), a
source edit shows up on the next docs build, not instantly. **Figma drift
is as fresh as the last refresh run** (`figmaLastRefreshed` in the manifest);
no network or Figma dependency at build time.

**`contractDrifted` is an annotation, not a status (T11).** When a component
was stamped with a `contractHash` and the tracked contract file's CURRENT
hash no longer matches it, the report entry carries `contractDrifted: true`
alongside whatever `status` the digest engine already decided — it never
changes `status` itself. It means "the contract was edited (or regenerated)
after the last confirmed sync, go look," independent of whether code or
Figma also drifted. Absent entirely (not `false`) for every component with
no stamped `contractHash` — which, until an operator runs `parity:synced` on
a component whose contract is tracked, is every component today; see the
regression note on `computeParity()` in `libs/altitude-mcp/src/lib/parity.mjs`.

## How it reaches the docs site

`apps/docs/src/lib/parity.mjs` calls the same engine
(`libs/altitude-mcp/src/lib/parity.mjs`) at Astro **build time** and keys the
result by tag; `apps/docs/src/components/ParityPanel.astro` renders one row
per design-system project that tracks the component. There is no client-side
fetch and no poll — a docs page is a static artifact, so a parity change only
shows up on the next docs build. `publicParityReport()` is a strict allowlist
that drops the `aiPrompt` field (and everything else agent-only) before it
reaches this public projection — see "Full report vs. public projection"
below for the two paths this splits into.

## The MCP tool + HTTP endpoint

`pnpm --filter @southleft/al-web-components start` runs the altitude MCP in
streamable-HTTP mode on **:6017** (Storybook, which used to share this dev
command, was retired 2026-08-25). Endpoints: `POST /mcp` (stateless MCP — any
client can attach), `GET /parity.json`, `GET /healthz`. Stdio mode (what
`.mcp.json` launches for an agent session) is unchanged and remains the
default when `--http` is absent.

**`altitude_check_parity`** (MCP tool) — the full report, filterable by
`tag`, `status`, or **`project`**; each entry carries the `aiPrompt` string an
agent uses to reconcile drift, naming that project's Figma file, skill and
commands. **`altitude_list_ds_projects`** enumerates the design systems and
what each points at. Over HTTP: `GET /parity.json?project=<id>` and
`GET /ds-projects.json`.

## Full report vs. public projection

**`GET /parity.json` serves the FULL report, `aiPrompt` included** —
`libs/altitude-mcp/src/server.mjs`'s HTTP handler calls `computeParity()`
directly and returns it verbatim (`server.mjs:103-122`). That `aiPrompt`
string embeds the Figma file key, the component's node id, every
`scripts/figma-*` path and the `.claude/skills` path — repo internals, not
something meant to leave a developer's machine. This is safe ONLY because the
server is loopback-only by construction: it binds `127.0.0.1` by default,
rejects any request whose `Host` header is not a loopback hostname, and only
reflects a loopback `Origin` in its CORS header (`server.mjs`'s
`isLoopback` check, ~line 55-75) — there is no code path that serves
this port to a non-loopback client today, and no auth layer if that ever
changed.

**The docs site never uses this endpoint.** `apps/docs/src/lib/parity.mjs`
imports the parity engine directly at Astro build time and calls
`publicParityReport()` — a separate allowlist function that drops `aiPrompt`
(and every other agent-only field) before a single byte reaches a page that
`altitude.pages.dev` will serve publicly. `apps/docs/scripts/check-status-panels.mjs`
re-checks the BUILT HTML for those dropped strings, so the rule is enforced
on the output, not just trusted at the source. Two different consumers, two
different projections, by design — `GET /parity.json` for a trusted local
agent, `publicParityReport()` for anything that reaches the public site.

## The tracked canvas projection (why CI can compare at all)

`contract-diff.mjs` computes the property-level disagreements behind every
`disagreements` array — which prop, which variant value, which state, which
token binding. It needs two inputs: the tracked CODE contract, and a CANVAS
contract extracted live from Figma into
`<figmaSyncDir>/canvas-contracts/<tag>.canvas.json`.

**Those dumps are gitignored live observations, so they do not exist anywhere
but a maintainer's laptop.** Measured 2026-09-03: 36 code/canvas pairs
compared locally, 3 clean, **259 disagreements**. In CI and on the deployed
docs site the same code compares **0 pairs**, and both the `ParityPanel` and
the parity summary can only ever say "not compared". The offline conventions
lint is out of CI for exactly the same reason (see T3 below).

`.altitude/figma-sync/canvas-projection.json` is the fix: **one tracked file
per project**, carved out of the ignore rules alongside the parity manifest,
carrying precisely the fields the differ reads —

| projected | why it is there |
|---|---|
| `variantAxes` | the offline conventions lint (Title Case, State vocabulary) |
| `componentProperties` | the prop / variant-axis / variant-value passes |
| `states` | the state pass |
| `textStyles` | the only honest comparison for text weight (unbindable as a variable) |
| `tokensOwn`, `tokensNested`, `tokens` | bound-variable NAMES — the token-binding pass |
| `degradations` | the `degraded()` gates; dropping them turns a degraded fact into four false disagreements |
| `anatomySource` | the token pass runs only when it is `observed` |
| `figma.name` | set-name-vs-manifest, name only |

and **nothing else**. No node id, no Figma file key, no absolute path, no
pixel geometry. That is asserted, not assumed: the generator walks its own
output and throws on a forbidden key, a node-id-shaped or file-key-shaped or
path-shaped string, a `figma.com` URL, or **any number at all** — every
projected fact is a name or a list of names, so a number in that subtree
could only be geometry or an index. `apps/docs/scripts/check-status-panels.mjs`
is the leak gate for the built docs HTML; this must not become the hole in it.

**Staleness is stamped, because a projection is a point-in-time read.**
`source.newestMtime` (the newest source-dump mtime), `source.digest` (over
every dump's bytes), `source.figmaFileKeyHash`, `generatedAt`, and
`generator.commit`. The file key is **hashed, never published** — that is
enough to detect a repoint without the tracked file carrying the key.

```bash
node scripts/figma-parity/build-canvas-projection.mjs            # regenerate for the default project
node scripts/figma-parity/build-canvas-projection.mjs --check    # regenerate-and-diff gate
```

`--check` is the same discipline `scripts/check-mcp-docs.mjs` states for every
generated artifact in this repo: gate it by re-running its generator, not by a
second parser that drifts on its own. It compares the substance (the
`components` map, the source digest, the file-key hash) and ignores
`generatedAt` / `generator.commit`, which move with the clock and the branch
rather than with the facts. **With no dumps on disk it still checks the half
it can** — that the projection was built against the Figma file the registry
names today — and reports `SKIPPED` for the rest rather than passing
vacuously. A repoint (Southleft's, 2026-09-02) fails it outright.

**A projected answer is never rendered as a live one.** `diffContracts()`
returns `source: 'live-dump' | 'projection' | 'none'`, plus `sourceStamp` and
a `skipped` line naming the projection when it used one. A live dump always
outranks the projection when both are available. Verified 2026-09-03: across
all 36 pairs the projection reproduces the live disagreement lists
**byte-identically** — 259 either way — so the fallback loses nothing.

**Southleft has no projection, on purpose.** That project was repointed to a
re-duplicated Figma file on 2026-09-02; its canvas dumps are observations of
the retired file. Projecting them would encode facts about a file that no
longer backs the project. Re-extract first (`contracts:canvas --project
southleft`), then project.

## Commands

**This table is the canonical home of the parity CLIs** — other docs link here
rather than carrying their own copies.

```bash
pnpm run parity:projects          # every design system: Figma file, manifest, live summary (--json for machine output)
pnpm run parity:seed              # (re)build the manifest from instance-map + ops + CEM; merges new components
                                  #   --force rebuilds EVERY entry — destructive: discards lastSync history
pnpm run parity:synced <tag...>   # stamp components as confirmed-matching (turns them green); --all for everything
pnpm run parity:refresh           # observe live Figma digests + figma-only sets (needs scripts/figma-atoms/mcp-shim.mjs running)
                                  #   --port <n> if the shim is not on :9401
pnpm run parity:freshness         # figmaLastRefreshed age + everObserved per project; --max-age-days N turns it into a gate
pnpm run parity:tokens-drift -- .altitude/figma-sync/last-export.json   # token VALUE drift vs a saved figma_export_tokens dump

# The TRACKED canvas projection (see the section above). No package.json key yet:
node scripts/figma-parity/build-canvas-projection.mjs           # rebuild it from the dumps on disk
node scripts/figma-parity/build-canvas-projection.mjs --check   # gate: does the tracked file still agree?

# Same against another design system (or pass `--project <id>` / `--project=<id>` to any of them):
pnpm run parity:seed:sl
pnpm run parity:synced:sl <tag...>
pnpm run parity:refresh:sl
```

The refresh script guards against the active project's declared decoy files
(`figma.decoys[]` — for altitude, the "Altitude DS" scratch file) and rebases
`lastSync.figmaDigest` on first observation (the seed stores an ops-derived
stand-in that can never equal a live digest).

**Contracts (T10/T11)** — `.altitude/contracts/**/*.contract.json` are
editable source, not a derived artifact. **`.altitude/contracts/README.md` is
the canonical home of the contract CLIs and the contract-PR flow** — no copy
of that command table here.

`parity:synced` reads the tag's tracked contract (if any) and stamps
`lastSync.contractHash`/`lastSync.contractVersion` alongside the code hash
and Figma digest — no separate command. A tag with no tracked contract yet
still stamps normally; it just warns and stamps neither field.

## `in-sync` is a VERIFIED state, not an asserted one (T1)

Until 2026-08-29 it was asserted. `check-parity.mjs` compared built Figma
variant sizes against the measured browser sizes and then **returned 0
whatever it found** — it exited non-zero only when it could not read an ops
file or reach the shim. `parity:synced` stamped whatever it was handed. Its
header said "Run AFTER a verified sync (check-parity.mjs passing)", and that
was a comment, not a check. So the green badge on the docs panel, the
`in-sync` status from `altitude_check_parity`, and `GET /parity.json` all
meant *an agent said so*.

Now (spec `2026-08-29-parity-judgement-gates-and-evals`, T1):

- **`check-parity.mjs` exits 1** when any checked variant is outside the 4px
  tolerance or missing from Figma. `--no-fail` restores print-and-exit-0 for
  an exploratory survey; it changes this process's exit code, never what the
  receipt records.
- **It writes a receipt** to `<figmaSyncDir>/verify/check-parity.json`
  (gitignored — it is an observation, same tier as the canvas dumps) naming,
  per component, whether the comparison passed and **which source digests it
  passed against**.
- **`parity:synced` refuses** to stamp a component whose receipt is missing,
  failing, or stale. Two staleness rules, one per side, for a reason:
  the **code** side is bound by hash (`sourceKeyFor()` in
  `scripts/lib/parity-receipt.mjs` is called by both scripts, so an edit
  between check and stamp cannot slip through), and the **Figma** side by time
  (no digest exists at check time), default 24h, `--max-receipt-age-hours N`.
- **The escape hatch records itself.** `--human-verified "<reason>"` stamps
  anyway and writes `lastSync.verifiedBy = { how: "human", reason, ... }`.
  `{ how: "check-parity" }` is what a measured stamp looks like. The manifest
  therefore never loses the distinction between measured and asserted — audit
  the `human` ones.

Tested by `scripts/__tests__/parity-receipt.test.mjs` (the decision logic,
offline, `pnpm run test:scripts`) and `libs/altitude-mcp/test/mark-synced.mjs`
(the real CLI refuses, stamps nothing, and records the override).

## Pinned node ids go stale silently (T2)

```bash
pnpm run parity:pins            # 34 pinned ids (altitude) / 15 (southleft); needs the shim
pnpm run parity:pins -- --json  # machine output
pnpm run parity:pins -- --repin # rewrite the unambiguous ones
pnpm run parity:pins:sl
```

`figma.getNodeByIdAsync()` returns a **detached** node after its page is
deleted: `removed` is `false` and the parent chain reaches no PAGE. **"It
resolved" is not proof it is in the document.** On 2026-08-27, 11 of 20 pinned
ids in the manifest were ghosts after the owner rebuilt those pages, and
`extract-canvas.mjs` extracted from the ghost — so the tooling reported a
*deleted* set as in-sync, carrying the old set's axes
(`altitude-figma-repair/SKILL.md` trap 1).

`extract-canvas.mjs` was fixed at the point of use (liveness check, then
by-name fallback). **The manifest was not.** A stale pin keeps reaching agents
through `buildAiPrompt()` ("node 3435:877") and keeps producing dead deep
links through `figmaNodeUrlFor()`. `check-pinned-nodes.mjs` is the report:

| Verdict | Meaning |
| --- | --- |
| `ok` | resolves, live, is a `COMPONENT_SET`, name matches the manifest |
| `ghost` | resolves but is detached — **the trap** |
| `missing` | does not resolve in this file at all |
| `renamed` | live, but the set's name disagrees with the manifest |
| `wrong-type` | live, but the pinned node is not a component set |

`--repin` rewrites `ghost` and `missing` pins **only when exactly one live set
carries that name**. Two sets sharing a name is its own trap (repair skill
trap 10) — that case is reported, never guessed. `renamed` is never
auto-repaired: the id is right and it is the name that is in question, which
is a curation call.

Entries mapped by name with `nodeId: null` (molecules — their pages are
rebuilt and re-mint ids) are skipped: there is nothing there to go stale.
Classifier tested offline by `scripts/__tests__/pinned-nodes.test.mjs`.

## The hand-applied conventions are linted (T3)

```bash
pnpm run check:figma-conventions        # offline — reads the extracted canvas contracts
pnpm run check:figma-conventions -- --json
pnpm run check:figma-conventions:sl
```

`buildAiPrompt()`'s `missing-in-figma` branch tells an agent to "follow the
library conventions: page `<prefix><Component>`,
`Labels`/`Instances`/`COMPONENT SET`, State axis, Title Case variant values".
Every one of those was an instruction with nothing checking it: a set could be
built wrong and still pass every gate, because the determinism and schema gates
assert self-consistency, never correctness.

Rules (offline, over `<figmaSyncDir>/canvas-contracts/*.canvas.json`):
`set-name` (vs the manifest), `axis-name-case`, `value-case`,
`prop-name-case`, `state-axis-values`.

**What it deliberately cannot check, printed on every run rather than
silently skipped:**

- **Variant order.** `extract-canvas.mjs:314` sorts every axis's options, so a
  canvas contract records the SET of values and destroys their on-canvas order.
  `STATE_ORDER` is therefore unverifiable from this artifact — it needs a live
  read.
- **Page name and page structure.** Not captured by a canvas contract; the page
  half is checked live by `check-pinned-nodes.mjs`.

**The `State` vocabulary is `STATE_ORDER` + `Error`, and that is a measured
fact, not a preference.** An earlier draft validated against `STATE_ORDER`
alone and failed 11 of the 37 sets — every form-ish component carries
`State=Error`. Eleven components is a convention. Note the code contracts do
NOT declare it: every one inspected carries a uniform
`["hover","focus","active","disabled"]` with no `error`, so the two sides
genuinely disagree about validation state and neither gates it today. Worth
fixing in the contract pipeline; not something this lint should decide by
failing.

**Not a CI gate yet, deliberately.** Its first real run found two genuine
defects in the live file (`al-banner`'s placeholder BOOLEAN property "Is
everything all good?", `al-divider`'s `State=Verical` — a typo *and* an
orientation value on the State axis; both tracked as issues). Wiring it as a
gate today would land CI red on a pre-existing problem rather than on a
regression. Fix those two in Figma, re-extract, then gate it.

The *other* half of that blocker is now gone. The script reads
`<figmaSyncDir>/canvas-contracts/*.canvas.json` directly and correctly exits 1
when it finds none, which on a clone is every run — the structural reason it
could never be a CI gate. `variantAxes`, `componentProperties` and
`figma.name` (every field its rules read) are all carried by the tracked
canvas projection above, so pointing it at that file when no dumps are present
is a mechanical change, not a new source of truth. It has not been made yet;
`scripts/check-figma-conventions.mjs` still reads the dumps only.

## The judgement ledger (T12)

```bash
pnpm run check:judgement-ledger          # offline, zero-dependency, runs in CI
pnpm run check:judgement-ledger -- --json
```

`.altitude/judgement-ledger.json` records every point in this pipeline where an
agent makes a JUDGEMENT rather than a computation — 13 of them, found by a
one-off read-only sweep on 2026-08-29. Each carries what is decided, where, what
a wrong answer looks like, and a `disposition`:

| Disposition | Meaning | Count today |
| --- | --- | --- |
| `gated` | a deterministic check now refuses the wrong answer | 3 |
| `evaluated` | an eval measures it; the wrong answer is possible but scored | 7 |
| `open` | nothing checks it yet | 3 |

**The `open` entries are the point, not an oversight.** J9 (classifying a verify
miss into a fix layer), J10 (convergence / "accepted degradation") and J12 (is a
`missingVars` entry real?) are still unchecked, and the ledger exists so that
stays visible instead of being rediscovered by another sweep in six months.

The checker enforces two things: every point's anchor string still resolves in
the file it names (an entry cannot go on describing something that moved), and
every source file carrying one of this repo's own judgement-call markers —
`judgment call`, `decide with a human`, `not a derivable fact` — either backs a
ledger point or is listed in `markerFilesAcknowledged`. **A new judgement point
fails the check until somebody records which it is.** That is the whole
mechanism: the 13 were found by hand, and nothing would have surfaced the 14th.

File-level rather than line-level on purpose — line numbers churn on every edit,
and a checker that cries wolf is a checker that gets turned off.

## Reconciliation loop

Docs panel shows drift → call `altitude_check_parity({ tag })` (or `GET
/parity.json?project=<id>` from a loopback session) → its `aiPrompt` field is
a ready-to-paste reconciliation prompt naming the component, the Figma set and
node, the status, and the exact pipeline (altitude-figma-sync skill →
measure/build ops → repair in place → `check-parity.mjs` → `parity:synced`).
There is no docs-page button for this today — it is agent-only via the MCP
tool / HTTP endpoint (see `.mm/ideas/` for the open question on whether a UI
entry point should replace the retired Storybook one).
