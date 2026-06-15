# `.altitude/` — Refactor metadata

This directory holds machine-readable state for the v2 refactor described in
`/NEXT-GEN-UPGRADE-PLAN.md`. CI, generators, and validators read from here.

| File | Purpose | Created by |
|---|---|---|
| `targets.json` | Pinned target versions and decisions for the end-state | T0.5 |
| `migration.json` | Per-component migration state (`legacy`/`dual`/`scoped-complete`) | T0.2 |
| `migration.schema.json` | JSON Schema for `migration.json` | T0.2 |
| `baselines/` | Token snapshot, bundle size, VRT screenshots from the legacy stack | T0.1 |

Do not hand-edit `migration.json` outside of migration-PRs — it is the spine
of the G2 CI gate.
