# Token pipeline — Style Dictionary v5 (single pipeline)

> **Status (2026-07-28):** There is exactly **one** token pipeline, built on
> Style Dictionary 5. The Style Dictionary v3 config
> (`libs/al-web-components/styles/tokens-config.js`) was deleted in T6.2
> (`CHANGELOG.md:76`) and the byte-parity gate that compared the two was
> retired in the `verify-token-gate-strategy` spec — see the decision note
> [`.mm/notes/token-gate-strategy-v3-vestigial-07-28-2026.md`](../.mm/notes/token-gate-strategy-v3-vestigial-07-28-2026.md).
>
> **Brand tokens land in one config, not two.**
>
> **Status (2026-08-25):** There is also exactly **one** token *source*.
> Tokens Studio was removed: the legacy `styles/tokens/` tree (`value`/`type`
> shape), its converter `scripts/convert-tokens-to-dtcg.js`, the dead
> `scripts/ingest-tokens-from-studio.js`, the `build:tokens:v5` alias, and the
> `$metadata.json` / `$themes.json` plugin manifests are all deleted.
> `styles/tokens-dtcg/` is now tracked, hand-authored and editable.

## Overview

| Stage | Path | Notes |
|---|---|---|
| Editable source | `libs/al-web-components/styles/tokens-dtcg/**.json` | DTCG `$value`/`$type`. Tracked, hand-authored. **This is what you edit** — there is no other token source. Also published as the package's `./tokens-dtcg/*` subpath export, so it is public API. |
| Build config | `libs/al-web-components/styles/tokens-config.v5.mjs` | The sole config. Its `themes` and `brands` arrays decide which files are emitted. |
| Primary output | `libs/al-web-components/styles/dist-v5/` | What Style Dictionary actually writes. Wiped and rebuilt on every run. |
| Legacy mirror | `libs/al-web-components/styles/dist/` | A **byte-copy** of `dist-v5/` made by `scripts/copy-tokens-to-legacy-dist.js`, so pre-T6.1 `styles/dist/...` import paths keep resolving. Gitignored. |

`dist/` is not an independent build. Anything that reads `dist/` is reading
`dist-v5/` one `copyFileSync` later.

The `dist/` mirror survives until T6.2's "zero legacy components" gate clears
— see §"Remaining T6.2 follow-ups".

## Commands

```bash
# Workspace-relative (most common):
pnpm --filter @southleft/al-web-components build:tokens   # the only build. SD v5 → TS types → legacy mirror → AI digest
pnpm --filter @southleft/al-web-components test:tokens    # contract tests vs .altitude/baselines/tokens/snapshot.json

# Top-level:
node scripts/test-tokens-contract.js        # name / file / count / value / dangling-ref checks
node scripts/capture-token-baseline.js      # rewrite .altitude/baselines/tokens/snapshot.json
node scripts/generate-token-metadata.mjs    # (re)write the $extensions blocks in tokens-dtcg/**.json
node scripts/check-token-metadata.mjs       # drift gate for those $extensions blocks
```

`build:tokens` starts at `node ./styles/tokens-config.v5.mjs` — there is no
conversion step in front of it any more. There is no `build:tokens:v5` alias.

## The two types every token carries

A DTCG token in this repo has **two** type-ish facts, and they answer different
questions. `scripts/lib/dtcg-token.mjs` is the one place that resolves them —
read it before writing anything that walks the tree.

| Key | Helper | What it is |
|---|---|---|
| `$type` | `dtcgType()` | The DTCG standard type. Deliberately **coarse**: `sizing`, `spacing`, `borderRadius`, `borderWidth`, `fontSizes` and `lineHeights` all collapse into `dimension`. Use it for standards conformance — serialising DTCG, talking to a DTCG-aware tool. |
| `$extensions["org.altitude.token"].cssType` | `authoredType()` | The CSS surface the token was **authored for**. Finer than `$type` and **not recoverable from it**. Use it when you need to know what the token is *for*. |

`cssType` is what drives the `com.salesforce.styling.cssProperties` allow-list
(`scripts/generate-token-metadata.mjs`, `scripts/lib/token-metadata-rules.mjs`).
**A token authored without a `cssType` gets no `cssProperties`** — 163 of 555
tokens would silently degrade to a bare `dimension` with no usable semantic if
you drop it. `authoredType()` falls back to `$type` so such a token still
resolves to *something*, but that is a safety net, not a licence to omit it.
Every new token needs a `cssType` (`pull_request_template.md:25`).

## DTCG `$type` conformance

**539 of 555 tokens** carry a spec-conformant `$type`. The remaining 16 are
authored on a non-DTCG type rather than mislabelled, because DTCG cannot
express them:

| Tokens | `$type` | Why it cannot be mapped |
|---|---|---|
| 12 | `other` (`animation.timing.*`) | DTCG `cubicBezier` is a 4-number array; these are CSS easing strings (`ease`, `linear`, `cubic-bezier(...)`). |
| 2 | `letterSpacing` | DTCG `dimension` admits only `px`/`rem`; these are percentages of the font size (`1%`), which is what Figma exports and what the typography composite means. |
| 2 | `textDecoration` | DTCG has no equivalent type. |

### Why the conformance pass was value-neutral, and the trap it avoided

History, kept because the trap is still live for any *new* `$type`.

Style Dictionary transforms select on `$type`. Five transforms in the
`css-v3-shape` / `scss-v3-shape` groups — `size/rem`, `time/seconds`,
`cubicBezier/css`, `html/icon`, `asset/url` — were **inert only because the
types were non-conformant**. Making the types conformant would have switched all
five on at once, silently: `size/rem` would start rewriting every `dimension`
(racing `formatSpaceValue`, which already does that conversion by hand for the
space scale), `time/seconds` would rewrite a duration scale already authored in
seconds, and `cubicBezier/css` would choke on easing strings it cannot parse.

So the groups were trimmed to the three transforms that actually fire
(`attribute/cti`, `name/kebab`, `color/css`) **first**. Removing a transform
that matches nothing is a no-op by construction, which is what makes the
relabel safe. Verified rather than argued: the full `dist-v5/` emission —
`tokens.json` and every file under `css/` — is **byte-identical** before and
after.

If you add a token type, check whether it activates a dormant transform before
assuming a rename is cosmetic.

## Composite typography: the sub-values the `font` shorthand drops

A `typography` token authors five sub-values. The CSS `font` shorthand can carry
three of them, and `formatTypographyValue` emits exactly that shorthand — so
`letterSpacing` and `textDecoration` were silently discarded. Every
letter-spacing the designers authored (all 10 bold presets, in both the altitude
and southleft brands) was **inert**.

`letterSpacing` is now emitted as a **companion custom property** beside each
preset:

```css
--al-typography-preset-body-md-bold: 600 1rem/1.5rem IBM Plex Sans, sans-serif;
--al-typography-preset-body-md-bold-letter-spacing: 0.01em;
```

Figma authors letter-spacing as a percentage of the font size and CSS
`letter-spacing` rejects `%`, so the pipeline converts `1%` → `0.01em`
(lossless). A companion is emitted for **every** preset, including the ones
whose authored tracking is zero (as the keyword `normal`), so the mixins carry
no hardcoded fallback and a brand can restate any of them.

`textDecoration` is still not emitted, and that is not a formatter bug: it is
only ever non-`none` on the `-underline` presets, and every emitter filters
`-italic`/`-underline` out of the output set entirely. Emitting it on the
presets that DO ship would add 40 declarations of the CSS initial value.
Restoring it means un-filtering the underline presets — a change to the public
token surface, not a formatter fix.

## Phantom tokens are a gate; dead tokens are a report

`scripts/check-token-usage.mjs` classifies every `--al-*` name:

- **PHANTOM** — read through `var()`, never emitted by the token layer. Always a
  defect: the declaration silently falls back and the value has left
  design-system control. Gated in CI via `pnpm run gate:token-usage`
  (`--fail-on-phantom`), wired into the hand-run-gates job of
  `.github/workflows/v2-checks.yml`.
- **DEAD** — emitted, zero `var()` readers. A **report**, not a gate: a tier-1
  palette reserve is a legitimate design choice. A dead *semantic* token is a
  different matter — it means the state it names is being expressed some other
  way, and it is worth finding out how before deleting it.

Read the script's header comment before trusting any number from it. Three
classifications are non-obvious and a naive version gets all three wrong:
component theming hooks (`--al-button-padding`) are unemitted *by design*; the
shape and motion role tokens are declared by the scoped `<al-theme>` host and
the per-brand partials rather than the `:root` bundle; and a component
*overriding* a custom property is not the pipeline *emitting* it.

## Rebaselining after a token change

**Read this before adding a brand, a theme, or any token.**

`.altitude/baselines/tokens/snapshot.json` is a deterministic record of every
`--al-*` / `$al-*` occurrence under `styles/dist/`, plus a sha256 of the
normalized `name: value` stream. Any token change moves it, and CI enforces it.

### The procedure

```bash
# 1. Build. styles/dist/ is gitignored (.gitignore:5), so the capture script
#    exits 1 without this. Use the full `pnpm build` instead when bundle or
#    VRT baselines also move.
pnpm --filter @southleft/al-web-components build:tokens

# 2. Check what changed *before* overwriting the baseline. This is the step
#    that tells you whether the drift is intentional.
node scripts/test-tokens-contract.js

# 3. Regenerate the snapshot.
pnpm run baselines:tokens

# 4. Review the summary fields, not the line diff (see below).
git diff --stat .altitude/baselines/tokens/snapshot.json

# 5. Commit snapshot.json in the SAME PR as the token change.
```

### Which gate enforces it

`.github/workflows/v2-checks.yml:161-189`, job **`baselines-tokens`**. It runs
`build:tokens`, re-runs `pnpm run baselines:tokens`, and fails if the
regenerated `hash` differs from the committed one.

It is a **sha256 equality test. There is no tolerance and no escape hatch.**
`ALTITUDE_TOKEN_TOLERANCE` does not exist for this job. Forget to commit the
snapshot and the PR is red.

The G8 gate (`.github/workflows/v2-checks.yml:64-73` →
`scripts/check-baselines-gate.js`) separately fails any PR that edits
`styles/tokens-dtcg/**` or `styles/tokens-config.v5.mjs` without touching
`.altitude/baselines/`.

### Reviewing the diff

Don't read it line by line. Adding one brand produced a **5262-insertion /
2040-deletion** diff in `snapshot.json`, almost all of it the sorted
`variables` array shifting. Check the summary fields instead:

```bash
node -e "const a=JSON.parse(require('child_process').execSync('git show HEAD:.altitude/baselines/tokens/snapshot.json').toString()),b=require('./.altitude/baselines/tokens/snapshot.json');
console.log('total ',a.totalVariables,'->',b.totalVariables);
console.log('unique',a.uniqueNames,'->',b.uniqueNames);
console.log('new   ',Object.keys(b.byFile).filter(f=>!(f in a.byFile)));
console.log('gone  ',Object.keys(a.byFile).filter(f=>!(f in b.byFile)));"
```

`gone` must be empty unless you deliberately removed an emission.

### Failure modes, and which are real

| Symptom | Real regression? | What to do |
|---|---|---|
| `occurrence count drift N > tolerance 0` | **No**, if you added tokens on purpose | Expected. Rebaseline (step 3). |
| `N baseline token name(s) missing` | **Yes** | You renamed or dropped a token without an alias. Fix the tokens, don't rebaseline. |
| `N baseline emission file(s) no longer produced` | **Yes** | A brand/theme fell out of the `brands`/`themes` arrays in `tokens-config.v5.mjs`. |
| `N token value drift(s)` | **Yes** | An existing token in an existing file changed value. Confirm it was intended, then rebaseline. |
| `core/variables.scss is out of sync` | **Yes** | See §"The frozen `core/variables.scss`". |
| `dangling reference(s)` | **Yes** | A `{ref}` didn't resolve — usually a typo'd alias path. |

`ALTITUDE_TOKEN_TOLERANCE=N` relaxes the **count checks only**
(`scripts/test-tokens-contract.js`, check 3). It has never covered value drift,
name loss, or missing files, and it does nothing at all for the CI hash job.
Reaching for it is almost always the wrong move — rebaseline instead.

### The ordering hazard (historical, now fixed — don't reintroduce it)

Every brand emits the same `--al-theme-*` **names** with different **values**,
one file per brand. `scripts/test-tokens-contract.js` used to build its
name→value map first-occurrence-wins over files sorted alphabetically, so
whichever brand CSS sorted first was silently elected the owner of every theme
token's value.

Consequence: adding a brand whose name sorts *earlier* than the incumbent
re-elected the winner and reported value drift for tokens nobody touched.
Measured against a scratch `altitude` brand (sorts before `northright`): **6
`--al-theme-*` tokens** reported as drifted, all of them
`var(--al-color-brand-green-*)` → `var(--al-color-brand-blue-*)` — i.e. exactly
the tokens `tier-2/brand/altitude/colors.json` overrode at the time. Nothing had
regressed. (That file no longer exists — altitude overrides nothing since the
v2 restyle, 2026-08-30 — but the ordering hazard it illustrates is unchanged
for any brand that DOES define tokens.) The blast radius equals the number of tokens the earlier-sorting
brand defines, so it grows as brand palettes diverge.

The VALUES check is now keyed by `<file>::<name>`, which makes each emission's
value its own contract: a new brand adds new keys and cannot re-elect an
existing one. **If you ever refactor that check, keep it file-keyed.**

### Keep the capture reproducible

Two properties the snapshot depends on, both of which have bitten us:

- **Path separators are normalized to `/`** (`relPosix` in
  `scripts/capture-token-baseline.js`). Without it a Windows capture writes
  backslash paths and a Linux capture writes forward slashes, so the committed
  JSON flips wholesale depending on who ran it — while the `hash` matched,
  because the hash covers `name: value` only.
- **`styles/dist/` is wiped before the mirror**
  (`scripts/copy-tokens-to-legacy-dist.js`). Without it, a brand removed from
  the `brands` array leaves its emission in `dist/` forever on a machine that
  built it earlier, and the capture picks up phantom tokens that CI's clean
  checkout will never produce.

If a local baseline disagrees with CI, delete `styles/dist/` and
`styles/dist-v5/` and rebuild before investigating anything else.


### Baselines already rebaselined on this branch

The snapshot was regenerated for the token-debt pass. Two things moved:

1. **Additions** (1200 -> 1323 unique names): the `--al-theme-color-focus-ring`
   token, and the 40 typography `-letter-spacing` companions across both tiers
   and every brand/mode file.
2. **One inherited value drift, now accepted.** `--al-theme-border-width` on
   the southleft brand reads `var(--al-border-width-1)` where the old baseline
   recorded `var(--al-border-width-2)`. That is the deliberate hairline change
   documented in the `comment` field of
   `styles/tokens-dtcg/tier-2/brand/southleft/borders.json` ("southleft.com draws
   every rule as a hairline ... the brand shipped 2px, which doubled every one
   of them"). It landed in `7961425` together with a snapshot regeneration that
   evidently ran against a stale `styles/dist/`, so `test:tokens` had been
   failing on it since. It is source-of-truth intent, not a regression.

Nothing else drifted: the whole token-debt change set is value-neutral on the
pre-existing surface.

## The frozen `core/variables.scss`

`libs/al-web-components/styles/core/variables.scss` is git-tracked and `@use`d
by `styles/main.scss:1,3` and `styles/component.scss:1` — but it is **not a
build output**. `tokens-config.v5.mjs:229` emits that filename into
`dist-v5/core/` instead, so nothing rewrites the tracked copy. It can silently
fall behind the tokens.

`scripts/test-tokens-contract.js` check 6 (SOURCE SYNC) guards this. To refresh
it after a token change that affects it:

```bash
cp libs/al-web-components/styles/dist/core/variables.scss \
   libs/al-web-components/styles/core/variables.scss
```

The comparison is CRLF-normalized. That was load-bearing when the repo had no
line-ending policy: a Windows checkout put CRLF on disk while Style Dictionary
always emits LF, and that alone failed the old parity gate. As of 2026-07-28
`.gitattributes` pins the working tree to LF on every platform, so the two
sides agree natively — the normalization is now belt-and-braces and should
stay, since it costs nothing and covers a checkout made before that commit.

## How the v5 pipeline preserves the `--al-*` names

Non-obvious, and worth keeping so a future agent doesn't unwind it while
"modernizing":

1. **Source format**: DTCG (`$value`/`$type`), hand-authored. The tree *shape*
   is what the `--al-*` names are derived from, so `{color.neutral.light.800}`
   aliases resolve and the emitted name follows the path. Renaming a group
   renames the public custom property.
2. **Custom transform groups (`css-v3-shape`, `scss-v3-shape`)**: SD v5's
   built-in `css`/`scss` groups inject DTCG shorthand transforms
   (`typography/css/shorthand`, `shadow/css/shorthand`, `fontFamily/css`, …)
   that coerce composite tokens to strings *before* our format runs. Our
   helpers (`formatTypographyValue`, `formatBoxShadowValue`) need the raw
   value objects, so the custom groups strip the shorthands.
3. **Format names**: `tokens`, `al-scss-vars`, `al-json-flat`. Renamed from
   `scss/variables` and `json/flat` because v5 forbids overriding built-ins of
   the same name.
4. **Reference helpers**: `dictionary.usesReferences(…)` /
   `getReferences(…)` moved to `style-dictionary/utils` in v5 and need
   `{ usesDtcg: true }` passed explicitly.
5. **Build order**: `variables.scss` and `tokens.json` are emitted from the
   **dark** theme build, because light → dark writes the same destination and
   the last write wins on disk.

## Remaining T6.2 follow-ups

One left, gated on the "zero legacy components" sign-off — don't pre-empt:

- `styles/dist/` and `scripts/copy-tokens-to-legacy-dist.js` are deleted;
  `capture-token-baseline.js` is repointed at `dist-v5/`.

Done:

- `styles/tokens-config.js` deleted (T6.2).
- `scripts/check-tokens-parity.js` and `build:tokens:parallel` retired
  (`verify-token-gate-strategy`).
- **Tokens Studio removed (2026-08-25).** `libs/al-web-components/styles/tokens/`
  deleted; `tokens-dtcg/` promoted to the tracked, hand-authored, editable
  source and published as `./tokens-dtcg/*`;
  `scripts/convert-tokens-to-dtcg.js` and `scripts/ingest-tokens-from-studio.js`
  deleted; the `build:tokens:v5` alias removed; the `$metadata.json` /
  `$themes.json` plugin manifests deleted (nothing ever read their contents).
