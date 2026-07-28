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

## Rebaselining tokens specifically

Adding a brand, a theme, or any token moves `tokens/snapshot.json`. The full
procedure — including the failure modes that are ordering artifacts rather than
regressions — lives in
[`.altitude/TOKENS.md` § "Rebaselining after a token change"](../TOKENS.md#rebaselining-after-a-token-change).
The short version:

```bash
pnpm --filter al-web-components build:tokens   # styles/dist/ is gitignored; capture exits 1 without this
node scripts/test-tokens-contract.js           # inspect the drift BEFORE overwriting
pnpm run baselines:tokens                      # regenerate
git diff --stat .altitude/baselines/tokens/snapshot.json
```

Then commit `snapshot.json` in the **same PR** as the token change.

Two things to know before you debug a failure:

- The enforcing gate is `.github/workflows/v2-checks.yml:161-189`
  (`baselines-tokens`), a **sha256 equality test with no tolerance**.
  `ALTITUDE_TOKEN_TOLERANCE` relaxes the *count* checks in
  `scripts/test-tokens-contract.js` only — never value drift, never the CI job.
- A one-brand addition produces a ~5000-line diff in `snapshot.json` because
  the sorted `variables` array shifts. Review `totalVariables`, `uniqueNames`,
  and the `byFile` key set, not the line diff.

## OUTSTANDING: `bundle/snapshot.json` needs a Linux recapture

**Do not capture it on Windows.** Two Windows-only faults make a local capture
worse than the stale file:

- `libs/al-react/package.json`'s `cp -r ../al-web-components/dist/css ./dist`
  silently fails, so `al-react/dist` reads ~340 KB / 18 files light (measured
  2026-07-28: 93,794 B against a 434,728 B baseline). That alone swings the
  total by −6 %, which is why `check-bundle-budget.js` currently reports
  `3253KB -> 3060KB (−5.94 %)` here — a measurement artifact, not a saving.
- `pnpm run build` inflates ~160 dist files by a few bytes each (LF → CRLF in
  emitted sourcemaps / svgs / hbs; the repo still has no `.gitattributes`).

### What the recapture must show

Accumulated across three specs, none of which could capture it:

| Spec | al-web-components delta |
|---|---|
| `2026-07-28-complete-brand-build-matrix` | ~+69 KB (four `altitude` bundles) |
| `2026-07-28-define-brand-identities` | ~+12 KB (brand token content) |
| `2026-07-28-scoped-token-emission-brand-wiring` | **+18,263 B**, measured |
| `2026-07-28-react-storybook-preset-switcher` | **0 B on al-web-components**; al-react gains one wrapper (`src/components/Theme/`) |

The last one was measured directly — same machine, same commit, only the two
source files reverted — as 3,020,929 B → 3,039,192 B, 588 → 590 files. It
lands entirely in three entries:

```
+21,549  components/theme/theme.js        (35 B -> 21,584 B)
 +3,578  components/theme/theme.js.map
 -3,415  components/bundle/bundle.js      (27,102 B -> 5,760 B)
 -3,573  components/bundle/bundle.js.map
    +35  styles/theme.js                  (new)
    +89  styles/theme.js.map
```

`al-react` is **unchanged**: it copies only `dist/css`, and `dist/css` is
byte-identical (the scoped host partials are deliberately not mirrored there —
see `scripts/copy-tokens-to-legacy-dist.js`).

`2026-07-28-react-storybook-preset-switcher` touched no al-web-components
source at all, so it moves nothing on that side. On al-react it adds one
wrapper folder; `tsc` emits it into `dist/src/components/Theme/`, a few hundred
bytes. **It was also not captured on Windows, and the reason is now measured
rather than inherited:** `pnpm --filter al-react build` prints "The system
cannot find the path specified." twice — once for `cp -r ./.storybook/static/
images ./dist/images` and once for `cp -r ../al-web-components/dist/css
./dist`. Both are swallowed by `2>/dev/null || true`, which is exactly the
silent failure described above. A Linux recapture picks this spec's delta up
with the other three.

Noticed while confirming that: `libs/al-react/package.json` declares
`"main": "dist/index.js"`, but `tsc` resolves its rootDir across the imported
`package.json` and emits to `dist/src/index.js`. The entry point has been wrong
independently of any of this; worth its own fix.

Against the CI ceiling — 1 % of `totalBytes: 3330888` = **33,309 bytes across
both packages** (`.github/workflows/v2-checks.yml:191-220`) — this spec spends
**55 % of the whole allowance**, and the two predecessors have already
overspent it. `baselines-bundle` is red until someone recaptures on Linux; it
was red before this change too.

`check-bundle-budget.js` additionally reports two per-file violations against
`perFileDriftRatio 4.00`, both from the same structural fix:
`components/theme/theme.js` and its map. That file was a 35-byte EMPTY stub —
the Vite entry map spelled two different modules `theme` and the stylesheet
entry won, so `<al-theme>` was never built at its documented path. Any ratio
against 35 bytes is meaningless; the recapture resolves it.

## Baselines committed: 2026-06-15

Captured against the legacy stack (Lit 3.1, webpack 5, Style Dictionary 3,
React 18, yarn 1) as the pre-v2 reference. Token names and bundle totals are
the spine of the **G8** gate; non-trivial drift requires updating the
baseline in the same PR.

- Token unique names: see `tokens/snapshot.json#uniqueNames`.
- Bundle total: see `bundle/snapshot.json#totalBytes`.
- VRT: 5 PNGs in `screenshots/`.

The v2 stack (Vite 5 + Storybook 10 + pnpm 9, see `.altitude/BUILD.md`)
preserved the `--al-*` token names through the Style Dictionary v3 → v5
migration via custom transform groups, and produces a 51% smaller total bundle
on the Vite build versus the legacy webpack baseline. (The byte-parity gate
that policed that migration was retired once v3 was deleted — see
`.altitude/TOKENS.md`.) The bundle baseline is
intentionally kept on the webpack reference until the next major bump per
the budget rationale in `.altitude/bundle-budget.json`.
