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

## Reconciliation loop

Docs panel shows drift → call `altitude_check_parity({ tag })` (or `GET
/parity.json?project=<id>` from a loopback session) → its `aiPrompt` field is
a ready-to-paste reconciliation prompt naming the component, the Figma set and
node, the status, and the exact pipeline (altitude-figma-sync skill →
measure/build ops → repair in place → `check-parity.mjs` → `parity:synced`).
There is no docs-page button for this today — it is agent-only via the MCP
tool / HTTP endpoint (see `.mm/ideas/` for the open question on whether a UI
entry point should replace the retired Storybook one).
