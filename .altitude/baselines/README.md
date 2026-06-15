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
yarn baselines:capture
```

Runs in order:

1. `yarn build` — fresh library builds.
2. `yarn workspace al-app-web-components build` — fresh fixture for VRT.
3. `yarn baselines:tokens`
4. `yarn baselines:bundle`
5. `yarn baselines:vrt` (Playwright with `--update-snapshots`)

After a re-capture, commit the diff in the same PR as the change that
prompted it; otherwise the G8 gate will reject the PR.

## Re-running against existing baselines

```bash
yarn test:vrt        # Playwright VRT only (fails on screenshot drift)
yarn baselines:tokens   # writes a fresh snapshot; diff against committed version
yarn baselines:bundle   # same
```

## Captured: 2026-06-15 (legacy stack — Lit 3.1, webpack, SD v3, R18, yarn1)

- Token unique names: see `tokens/snapshot.json#uniqueNames`.
- Bundle total: see `bundle/snapshot.json#totalBytes`.
- VRT: 5 PNGs in `screenshots/`.
