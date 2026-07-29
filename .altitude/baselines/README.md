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

## RESOLVED 2026-07-28: `bundle/snapshot.json` recaptured, and no longer Linux-only

`baselines-bundle` was red for six specs. It is green as of `b44d58f`, and the
reason it could not be closed earlier — "you can only capture this on Linux" —
has been removed rather than worked around.

### Capture it wherever you like. Here is the proof.

The snapshot records file **sizes**, and this build's sizes were EOL-sensitive
in two places:

1. Vite's `.js.map` files embed the `.ts` sources verbatim in
   `sourcesContent`. JSON-serialized, every CRLF costs the escaped `\r`
   sequence — 2 bytes more than a bare LF. **18,959 of them = 37,918 B.**
2. `scripts/copy-assets-to-dist.js` mirrors `.svg` / `.hbs` / `.js` assets
   from source into `dist/` byte-for-byte, carrying their CRs along.
   **629 B.**

Measured directly rather than argued: one commit, Node 20.18.1 + pnpm 9.15.0
on both sides, a Windows CRLF working tree against a **real Linux build** of
the same tree.

| | total | files |
|---|---|---|
| Windows, CRLF working tree | 3,563,072 B | 1022 |
| Linux | 3,524,525 B | 1022 |
| **difference** | **38,547 B (1.094 %)** | 0 |

875 of the 1022 built files were byte-identical; 147 differed; **no file
existed on only one platform**, and the snapshot's key order was identical
(so `localeCompare` ordering and the POSIX path normalization are both fine).
Every one of the 38,547 differing bytes was a carriage return — the standalone
CR audit predicted 38,547 and the cross-platform diff measured 38,547. Nothing
else about the build is platform-dependent: not minification, not chunk
hashing, not file ordering, not path separators.

That 1.094 % against a 1 % ceiling is why the gate was unsatisfiable from
Windows *by construction*.

**The fix is `.gitattributes`: `* text=auto eol=lf`.** The working tree is now
LF on every platform (git already stored LF; only the checkout changed). With
that in place a Windows capture is **byte-identical to the Linux capture** —
sha256 `e30e1221…` on both, all 1022 files equal, both totalling 3,524,525 B.

`scripts/capture-bundle-baseline.js` now **refuses to write a snapshot** if
`dist/` contains any carriage returns, naming the offending files and the
renormalize command. Escape hatch: `ALTITUDE_ALLOW_CRLF_CAPTURE=1`. If you
ever see it fire, your checkout predates the `.gitattributes` commit:

```bash
git rm --cached -r . -q && git reset --hard   # re-checkout under the attributes
pnpm run build
```

### What moved, and why

```
totalBytes  3,330,888 -> 3,524,525   (+193,637, +5.81 %)
  al-web-components  2,896,160 -> 3,002,910  (+106,750,  584 -> 590 files)
  al-react             434,728 ->   521,615  ( +86,887,  425 -> 432 files)
```

**al-web-components** — 6 files added, 28 changed, 0 removed:

| bytes | what | spec |
|---|---|---|
| +69,474 | four `altitude` brand bundles (css + scss × dark + light) | `complete-brand-build-matrix` |
| +21,549 | `components/theme/theme.js` — was a **35-byte empty stub**; the Vite entry map spelled two different modules `theme` and the stylesheet entry won, so `<al-theme>` was never built at its documented path | `scoped-token-emission-brand-wiring` |
| +3,446 | `components/theme/theme.js.map` | same |
| +4,891 | `components/theme-switcher/theme-switcher.js` | same |
| +124 | `styles/theme.js` + `.map` (new) | same |
| +6,870 | brand token content across the southleft / odyssey / altitude bundles, `tokens.d.ts`, `aliases.json` | `define-brand-identities` |
| +396 | remainder across the css/scss token files | — |

That reconciles with the three predicted deltas (~+69 KB, ~+12 KB, and the
directly-measured +18,263 B), which is the check worth doing: the recapture is
verifiable rather than a rubber stamp.

**al-react** — +7 files net, and almost none of it is new code:

- 406 files moved `dist/src/**` → `dist/**`. `tsconfig` now pins
  `rootDir: "src"`, so the long-declared `"main": "dist/index.js"` is finally
  a real file. Size-neutral per file.
- `dist/package.json` (1,302 B) is no longer emitted — it was a
  `resolveJsonModule` artifact that also broke every al-react Storybook story
  by shadowing `/package.json` under `staticDirs`.
- +12,074 B across 16 `css/` files mirrored from al-web-components.
- The rest is the new `<ALTheme>` wrapper.

**Why al-react moved at all**, when the last handoff predicted it would not:
`libs/al-react`'s two build copies used `cp -r … 2>/dev/null || true`, and
`cp` does not exist in the shell npm uses on Windows. Both copies failed on
every Windows build and the errors were swallowed, so `dist/` was missing the
entire `dist/css` tree and the manager logo — 422,358 B across 22 files. They
now run through `libs/al-react/scripts/copy-dist-assets.mjs`, which fails
loudly. That silent failure is what made `check-bundle-budget.js` report
`3253KB -> 3060KB (−5.94 %)` — a measurement artifact, not a saving.

### Recapture: the `feature/v2` merge (Phosphor + AI theme console)

Merging `feature/v2` roughly doubled `dist/`, so the snapshot was recaptured
again. Almost all of the absolute growth is the icon migration, which is on the
other side of the merge and documented in `MIGRATION.md § 4b`; what is worth
recording here is the delta **this branch** contributed on top of it.

```
totalBytes  6,814,415 -> 6,976,100   (+161,685, +2.37 %)
  al-web-components   +74,705 B  (+6 files)
  al-react            +86,980 B  (+7 files)
```

Both numbers reproduce the per-package table above, unchanged by the merge:

- **al-web-components** — the four `altitude` brand bundles, and
  `components/theme/theme.js` growing +21,549 B as it stops being a 35-byte
  stub and starts carrying the six `:host([brand])` partials.
- **al-react** — the `dist/src/**` → `dist/**` move, `dist/package.json` no
  longer emitted, the mirrored `css/` tree, and the `<ALTheme>` wrapper.

The CR guard in `capture-bundle-baseline.js` did **not** fire on this capture,
which is the standing proof that `.gitattributes` is doing its job across the
~1,560 newly-tracked Phosphor modules as well as the original tree. Two
consecutive `pnpm run build` runs leave `git status` clean.

### Current gate state

```
$ node scripts/check-bundle-budget.js
[bundle-budget] total: 6813KB -> 6813KB (0.00%)
[bundle-budget] PASS: within budget.
```

The two per-file violations against `perFileDriftRatio 4.00` are gone with the
baseline; both were ratios taken against the 35-byte `theme.js` stub, where any
ratio is meaningless.

### Note on the gate's design

`baselines-bundle` compares `totalBytes` with a **1 % tolerance**, while
`.altitude/bundle-budget.json` allows **10 %** total drift. The tighter of the
two is the reproducibility check, not the budget — it is asserting "a fresh
build of this commit equals the committed snapshot", which should really be an
equality test now that the build is byte-reproducible. The 1 % was described in
the workflow as absorbing "gzip/minifier non-determinism"; there is none
measurable. Tightening it to equality (like `baselines-tokens`, which is a
sha256 with no tolerance) would turn a fuzzy gate into a precise one — left as
a follow-up because it should land with a green run to point at.

## Provenance

| Baseline | Committed | Captured against |
|---|---|---|
| `bundle/snapshot.json` | **2026-07-28** | v2 stack — Vite 5, Lit 3.3, Style Dictionary 5, React 19, pnpm 9. LF working tree; platform-independent (see above). |
| `tokens/snapshot.json` | 2026-06-15, maintained since | v2 token pipeline |
| `screenshots/` | 2026-06-15, maintained since | Playwright, 5 pilots |

The original 2026-06-15 set was captured against the legacy stack (Lit 3.1,
webpack 5, Style Dictionary 3, React 18, yarn 1) as the pre-v2 reference. Token
names and bundle totals are the spine of the **G8** gate; non-trivial drift
requires updating the baseline in the same PR.

- Token unique names: see `tokens/snapshot.json#uniqueNames`.
- Bundle total: see `bundle/snapshot.json#totalBytes`.
- VRT: 5 PNGs in `screenshots/`.

The v2 stack (Vite 5 + Storybook 10 + pnpm 9, see `.altitude/BUILD.md`)
preserved the `--al-*` token names through the Style Dictionary v3 → v5
migration via custom transform groups. (The byte-parity gate that policed that
migration was retired once v3 was deleted — see `.altitude/TOKENS.md`.)

**The bundle baseline is no longer the webpack reference.** Keeping it there
was the plan in `.altitude/bundle-budget.json` ("re-capture under the new
builder and tighten"), but `baselines-bundle` compares a *fresh build of the
current commit* against it with a 1 % tolerance, so a stale reference is not a
policy choice — it is a permanently red job. It now tracks the current build.
`bundle-budget.json`'s 10 % / 400 % ratios are still sized for the old
cross-builder comparison and could be tightened considerably now that baseline
and build are the same stack; that is the remaining half of the T6.3 follow-up.
