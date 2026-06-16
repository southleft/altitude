# `.altitude/baselines/` — Legacy-stack baselines

Per G8 and T0.1, these baselines are the truth before any dependency,
build, or token change. The CI gate at `scripts/check-baselines-gate.js`
fails any PR that bumps a watched file without updating the matching
baseline.

| Subdir | What it captures | Captured by |
|---|---|---|
| `screenshots/` | Playwright VRT PNGs for the 5 pilot components | `tests/pilots.vrt.spec.ts` via `playwright.config.ts` |
| `tokens/` | Deterministic JSON snapshot of every `--al-*` and `$al-*` variable in `styles/dist/`, plus a sha256 of the normalized stream | `scripts/capture-token-baseline.js` |
| `bundle/` | Per-file byte sizes of `libs/*/dist/` | `scripts/capture-bundle-baseline.js` |

## Re-capture all baselines

```bash
pnpm baselines:capture
```

Runs in order:

1. `pnpm build` — fresh library builds.
2. `pnpm --filter al-app-web-components build` — fresh fixture for VRT.
3. `pnpm baselines:tokens`
4. `pnpm baselines:bundle`
5. `pnpm baselines:vrt` (Playwright with `--update-snapshots`)

After a re-capture, commit the diff in the same PR as the change that
prompted it; otherwise the G8 gate will reject the PR.

## Re-running against existing baselines

```bash
pnpm test:vrt        # Playwright VRT only (fails on screenshot drift)
pnpm baselines:tokens   # writes a fresh snapshot; diff against committed version
pnpm baselines:bundle   # same
```

## Baselines committed: 2026-06-15

Captured against the legacy stack (Lit 3.1, webpack 5, Style Dictionary 3,
React 18, yarn 1) as the pre-v2 reference. Token names and bundle totals are
the spine of the **G8** gate; non-trivial drift requires updating the
baseline in the same PR.

- Token unique names: see `tokens/snapshot.json#uniqueNames`.
- Bundle total: see `bundle/snapshot.json#totalBytes`.
- VRT: 5 PNGs in `screenshots/`.

The v2 stack (Vite 5 + Storybook 10 + pnpm 9, see `.altitude/BUILD.md`)
produces byte-identical token output (the v5 pipeline preserves `--al-*`
names via custom transform groups) and a 51% smaller total bundle on the
Vite build versus the legacy webpack baseline. The bundle baseline is
intentionally kept on the webpack reference until the next major bump per
the budget rationale in `.altitude/bundle-budget.json`.
