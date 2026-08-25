# Figma ↔ Code Parity (Storybook badges + MCP)

Every component in the @southleft/al-web-components Storybook sidebar carries a parity
badge showing whether it is 1:1 with its Figma component set, and every
autodocs page opens with a parity banner offering actions (open the Figma
node, copy its id, copy a ready-to-run AI reconciliation prompt).

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

| Status | Sidebar badge | Meaning |
| --- | --- | --- |
| `in-sync` | green check | code hash and Figma digest both match `lastSync` |
| `code-drift` | yellow `</>` | component source changed since last sync — Figma is behind |
| `figma-drift` | yellow Figma mark | Figma changed since last sync — code is behind |
| `conflict` | yellow `</>` + Figma | both drifted; reconcile deliberately |
| `missing-in-figma` | red `</>` | exists in code, no Figma set at all |
| `missing-in-code` | red Figma mark | Figma set with no code component (report/MCP only — no sidebar node exists) |
| `excluded` | none | deliberately untracked (Foundations/*, `al-icon`, `al-theme-switcher`) |

**Code drift is always live** — the component's `.ts`/`.scss` (stories and
tests excluded, CRLF-normalised) are re-hashed on every read, and Storybook
watches the sources so a save flips the badge within a second. **Figma drift
is as fresh as the last refresh run** (`figmaLastRefreshed` in the manifest);
no network or Figma dependency at Storybook startup.

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

## How it flows into Storybook

`libs/al-web-components/.storybook/parity-emitter.mjs` (called from
`main.ts` `viteFinal`) writes `dist/parity.json`, served at `/parity.json` in
dev and baked into static builds. `manager.js` renders the sidebar badges via
`sidebar.renderLabel` (polls every 10s); `.storybook/blocks/figma-parity.tsx`
renders the docs-page banner (wired in `docs-page.tsx`, same pattern as the
a11y report — docsMode has no addon panels).

## The MCP pairing

`pnpm --filter @southleft/al-web-components start` now runs **Storybook (6006) and the
altitude MCP in streamable-HTTP mode (6017)** via concurrently. Endpoints on
6017: `POST /mcp` (stateless MCP — any client can attach while Storybook is
up), `GET /parity.json`, `GET /healthz`. Stdio mode (what `.mcp.json`
launches) is unchanged and remains the default when `--http` is absent.

New MCP tool: **`altitude_check_parity`** — the same report the sidebar
renders, filterable by `tag`, `status`, or **`project`**; each entry carries the
`aiPrompt` string the "Copy AI fix prompt" button hands out, naming that
project's Figma file, skill and commands. **`altitude_list_ds_projects`**
enumerates the design systems and what each points at. Over HTTP:
`GET /parity.json?project=<id>` and `GET /ds-projects.json`.

## Commands

```bash
pnpm run parity:projects          # every design system: Figma file, Storybook port, manifest, live summary
pnpm run parity:seed              # (re)build the manifest from instance-map + ops + CEM; merges new components
pnpm run parity:synced <tag...>   # stamp components as confirmed-matching (turns them green); --all for everything
pnpm run parity:refresh           # observe live Figma digests + figma-only sets (needs scripts/figma-atoms/mcp-shim.mjs running)

# Same three against another design system (or pass `--project <id>` to any of them):
pnpm run parity:seed:sl
pnpm run parity:synced:sl <tag...>
pnpm run parity:refresh:sl
```

The refresh script guards against the active project's declared decoy files
(`figma.decoys[]` — for altitude, the "Altitude DS" scratch file) and rebases
`lastSync.figmaDigest` on first observation (the seed stores an ops-derived
stand-in that can never equal a live digest).

**Contracts (T10/T11)** — `.altitude/contracts/**/*.contract.json` are
editable source, not a derived artifact; see `.altitude/contracts/README.md`
for the full contract-PR flow. The commands that matter here:

```bash
pnpm run contracts:seed           # bootstrap a contract for a NEW component only (refuses to overwrite; --force to override)
pnpm run contracts:seed:sl
pnpm run contracts:check          # contract <-> code DRIFT CHECK (--check-drift): re-derives every tracked component and diffs it against the on-disk contract
node scripts/contracts/emit-contracts.mjs --check-drift --project southleft
```

`parity:synced` reads the tag's tracked contract (if any) and stamps
`lastSync.contractHash`/`lastSync.contractVersion` alongside the code hash
and Figma digest — no separate command. A tag with no tracked contract yet
still stamps normally; it just warns and stamps neither field.

## Reconciliation loop

Badge shows drift → open the component's docs page → **Copy AI fix prompt** →
paste into a Claude session. The prompt names the component, the Figma set and
node, the status, and the exact pipeline (altitude-figma-sync skill →
measure/build ops → repair in place → `check-parity.mjs` → `parity:synced`).
`altitude_check_parity` gives an agent the same data programmatically.
