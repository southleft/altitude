#!/usr/bin/env node
/**
 * T1.2 — Token-contract tests.
 *
 * Asserts the public token surface is stable from the legacy baseline
 * captured in `.altitude/baselines/tokens/snapshot.json`. Run after every
 * token build to fail PRs that drift a token name without an alias.
 *
 * Test surfaces:
 *   1. NAME STABILITY: every `--al-*` name in the baseline is still present
 *      somewhere in the current build.
 *   2. FILE STABILITY: every emission file in the baseline `byFile` map is
 *      still emitted. Catches a brand or theme silently dropped from the
 *      `brands`/`themes` arrays in `styles/tokens-config.v5.mjs`, which the
 *      name-level check alone would miss (other files still define the name).
 *   3. COUNTS: total occurrences and unique names match within a tolerance.
 *      Tolerance defaults to 0 (strict); set ALTITUDE_TOKEN_TOLERANCE=N to
 *      allow N additions during in-flight migrations. NOTE: the tolerance
 *      knob covers this check ONLY — never VALUES.
 *   4. VALUES: keyed by `<file>::<name>`, not by name alone.
 *
 *      This matters. Multi-brand builds emit the same `--al-theme-*` name
 *      from every `css/brand/tokens-<brand>-<mode>.css` file with a
 *      different value. A name-keyed, first-occurrence-wins map (what this
 *      script used to do) silently elects whichever brand file sorts first
 *      as the owner of every theme token, so *adding a brand whose name
 *      sorts earlier than the incumbent* re-elects the winner and reports
 *      mass value drift that is purely an artifact of alphabetical
 *      ordering. Keying by file makes each emission's value its own
 *      contract: a new brand adds new keys (no drift), and a real value
 *      regression in an existing file still fails. See `.altitude/TOKENS.md`
 *      § "Rebaselining after a token change".
 *   5. ZERO DANGLING REFS: no value in the current build is the raw `{...}`
 *      form. (After SD resolves, references should be `var(--al-*)` or
 *      literal values, never `{some.reference}` strings.)
 *   6. SOURCE SYNC: the git-tracked SCSS entrypoint
 *      `libs/al-web-components/styles/core/variables.scss` — consumed by
 *      `styles/main.scss` and `styles/component.scss` — still matches the
 *      generated `styles/dist/core/variables.scss`. The v5 config emits that
 *      filename into `dist-v5/core/` (`tokens-config.v5.mjs:229`) and nothing
 *      writes the tracked copy, so it is a frozen artifact that can silently
 *      fall behind the tokens. Compared line-ending-normalized: the repo has
 *      no `.gitattributes`, so a Windows checkout stores the tracked file
 *      CRLF while Style Dictionary always emits LF.
 *
 *      (This is the one non-tautological comparison inherited from the
 *      retired `scripts/check-tokens-parity.js`; see the decision note
 *      `.mm/notes/token-gate-strategy-v3-vestigial-07-28-2026.md`.)
 *
 * Exit codes:
 *   0 — pass
 *   1 — drift / regression
 *   2 — internal error
 */

'use strict';

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..');
const BASELINE = path.join(REPO, '.altitude/baselines/tokens/snapshot.json');
const CAPTURE_SCRIPT = path.join(REPO, 'scripts/capture-token-baseline.js');

// Check 6 (SOURCE SYNC): git-tracked SCSS entrypoint ↔ generated counterpart.
const TRACKED_VARS = path.join(REPO, 'libs/al-web-components/styles/core/variables.scss');
const GENERATED_VARS = path.join(REPO, 'libs/al-web-components/styles/dist/core/variables.scss');

/** Normalize CRLF → LF so a Windows checkout doesn't fail on line endings. */
function readNormalized(file) {
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

function fail(msg) {
  console.error('[tokens:contract] FAIL —', msg);
  process.exit(1);
}

function main() {
  if (!fs.existsSync(BASELINE)) {
    console.error('[tokens:contract] missing baseline at', BASELINE);
    process.exit(2);
  }
  const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));

  // Recapture into a tmpfile via the capture script's env override so the
  // committed baseline is never touched (race-safe across parallel jobs).
  const tmpDir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'al-tokens-'));
  const tmp = path.join(tmpDir, 'snapshot.json');
  try {
    execSync(`node ${CAPTURE_SCRIPT}`, {
      cwd: REPO,
      stdio: 'pipe',
      env: { ...process.env, ALTITUDE_TOKEN_SNAPSHOT_OUT: tmp },
    });
  } catch (err) {
    console.error('[tokens:contract] capture failed:', err.message);
    process.exit(2);
  }
  const current = JSON.parse(fs.readFileSync(tmp, 'utf8'));
  fs.rmSync(tmpDir, { recursive: true, force: true });

  const tol = Number(process.env.ALTITUDE_TOKEN_TOLERANCE || '0');

  // 1. NAME STABILITY — global name set, order-independent.
  const baseNameSet = new Set(baseline.variables.map((v) => v.name));
  const curNameSet = new Set(current.variables.map((v) => v.name));
  const missing = [...baseNameSet].filter((n) => !curNameSet.has(n));
  if (missing.length) {
    fail(`${missing.length} baseline token name(s) missing in current build:\n  ${missing.slice(0, 10).join('\n  ')}${missing.length > 10 ? `\n  …and ${missing.length - 10} more` : ''}`);
  }

  // 2. FILE STABILITY — every baseline emission is still produced.
  const missingFiles = Object.keys(baseline.byFile).filter((f) => !(f in current.byFile));
  if (missingFiles.length) {
    fail(`${missingFiles.length} baseline emission file(s) no longer produced — a brand/theme dropped from tokens-config.v5.mjs?\n  ${missingFiles.join('\n  ')}`);
  }

  // 3. COUNTS (the ONLY check ALTITUDE_TOKEN_TOLERANCE relaxes)
  const occDiff = Math.abs(current.totalVariables - baseline.totalVariables);
  if (occDiff > tol) {
    fail(`occurrence count drift ${occDiff} > tolerance ${tol} (baseline ${baseline.totalVariables}, current ${current.totalVariables})`);
  }
  const nameDiff = Math.abs(current.uniqueNames - baseline.uniqueNames);
  if (nameDiff > tol) {
    fail(`unique name count drift ${nameDiff} > tolerance ${tol} (baseline ${baseline.uniqueNames}, current ${current.uniqueNames})`);
  }

  // 4. VALUES — keyed by `<file>::<name>` so brand emissions don't collide.
  // Adding a brand adds new keys; it never re-elects the owner of an
  // existing one. See the header comment for why name-keying was wrong.
  const key = (v) => `${v.file}::${v.name}`;
  const curByKey = new Map();
  for (const v of current.variables) {
    if (!curByKey.has(key(v))) curByKey.set(key(v), v.value);
  }
  const valueDrift = [];
  const seen = new Set();
  for (const v of baseline.variables) {
    const k = key(v);
    if (seen.has(k)) continue; // first occurrence within a file wins (stable)
    seen.add(k);
    if (!curByKey.has(k)) continue; // covered by NAME/FILE STABILITY above
    const curVal = curByKey.get(k);
    if (curVal !== v.value) valueDrift.push({ key: k, base: v.value, cur: curVal });
  }
  if (valueDrift.length) {
    fail(`${valueDrift.length} token value drift(s):\n  ${valueDrift.slice(0, 5).map((d) => `${d.key}: '${d.base}' -> '${d.cur}'`).join('\n  ')}${valueDrift.length > 5 ? `\n  …` : ''}`);
  }

  // 5. ZERO DANGLING REFS
  const dangling = current.variables.filter((v) => /^\s*\{[a-z][\w.-]*\}\s*$/i.test(String(v.value)));
  if (dangling.length) {
    fail(`${dangling.length} dangling reference(s) (unresolved \`{ref}\`):\n  ${dangling.slice(0, 5).map((d) => `${d.name} = ${d.value}`).join('\n  ')}`);
  }

  // 6. SOURCE SYNC — tracked styles/core/variables.scss ↔ generated copy.
  if (!fs.existsSync(GENERATED_VARS)) {
    console.error('[tokens:contract] missing', path.relative(REPO, GENERATED_VARS), '— run `pnpm --filter al-web-components build:tokens` first.');
    process.exit(2);
  }
  if (!fs.existsSync(TRACKED_VARS)) {
    fail(`${path.relative(REPO, TRACKED_VARS)} is missing, but styles/main.scss and styles/component.scss @use it.`);
  }
  if (readNormalized(TRACKED_VARS) !== readNormalized(GENERATED_VARS)) {
    fail(
      `${path.relative(REPO, TRACKED_VARS)} is out of sync with the generated ` +
        `${path.relative(REPO, GENERATED_VARS)}.\n` +
        '  That tracked file is @use\'d by styles/main.scss + styles/component.scss but is NOT a build\n' +
        '  output (tokens-config.v5.mjs emits it into dist-v5/core/ instead). Refresh it with:\n' +
        `    cp ${path.relative(REPO, GENERATED_VARS)} ${path.relative(REPO, TRACKED_VARS)}\n` +
        '  (Comparison is CRLF-normalized, so line endings alone will never trip this.)'
    );
  }

  console.log(`[tokens:contract] PASS — ${current.totalVariables} occurrences / ${current.uniqueNames} names across ${Object.keys(current.byFile).length} files, no drift from baseline; core/variables.scss in sync.`);
}

main();
