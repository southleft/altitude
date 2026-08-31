#!/usr/bin/env node
/**
 * Self-test for scripts/check-figma-drift.mjs (v1: value comparison,
 * brand/mode awareness, rename detection). Plain node test, no framework —
 * matches the style of gate-self-test.sh (spawn the real CLI, assert on its
 * exit code + output) rather than importing internals, since the whole point
 * is proving the CLI contract behaves correctly end to end.
 *
 * The structured fixture (fixtures/figma-export.drift.json) is built against
 * REAL paths/values read out of libs/al-web-components/styles/tokens-dtcg/ so the
 * assertions below double as a live check that the script's understanding of
 * that tree hasn't drifted. Run: node scripts/__tests__/check-figma-drift.test.mjs
 */
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const SCRIPT = join(ROOT, 'scripts/check-figma-drift.mjs');
const DRIFT_FIXTURE = join(HERE, 'fixtures/figma-export.drift.json');
const FLAT_FIXTURE = join(HERE, 'fixtures/figma-export.flat.json');

let PASS = 0;
let FAIL = 0;
function assert(desc, cond) {
  if (cond) {
    console.log(`  ok - ${desc}`);
    PASS++;
  } else {
    console.log(`  NOT OK - ${desc}`);
    FAIL++;
  }
}

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
}

console.log('== check-figma-drift.mjs self-test ==');

console.log('\n1. Usage — no export path');
{
  const res = run([]);
  assert('exits 2 with no export path', res.status === 2);
}

console.log('\n2. Unreadable export path');
{
  const res = run([join(HERE, 'fixtures/does-not-exist.json')]);
  assert('exits 2 on unreadable export file', res.status === 2);
}

console.log('\n3. Structured fixture — value-drift, possible-renames, missing-in-figma, missing-in-code');
{
  const res = run([DRIFT_FIXTURE, '--json']);
  assert('exits 1 (drift found)', res.status === 1);

  let report = null;
  try {
    report = JSON.parse(res.stdout);
  } catch (err) {
    assert(`--json output parses (${err.message})`, false);
  }

  if (report) {
    // value-drift: primitive opacity.40 (code 0.4 vs figma 0.5)
    const opacityDrift = report.valueDrift.find((d) => d.path === 'opacity.40' && d.context === 'primitive:-:default');
    assert('value-drift: opacity.40 flagged (code 0.4 vs figma 0.5)', !!opacityDrift);
    if (opacityDrift) assert('value-drift: reports both raw values side by side', opacityDrift.code === '0.4' && opacityDrift.figma === '0.5');

    // brand/mode awareness: dark-only mismatch on a path shared with light
    const darkDrift = report.valueDrift.find((d) => d.path === 'theme.color.background.default-weak' && d.context === 'theme:-:dark');
    assert('value-drift: dark-mode default-weak flagged', !!darkDrift);
    const lightDrift = report.valueDrift.find((d) => d.path === 'theme.color.background.default-weak' && d.context === 'theme:-:light');
    assert('value-drift: light-mode default-weak NOT flagged (mode isolation, same path)', !lightDrift);

    /**
     * Rewritten 2026-08-31. These two used to assert brand-scoped drift and
     * alias-prefix normalization against `brand:altitude:default`. The v2
     * restyle DELETED tier-2/brand/altitude/colors.json — altitude is the
     * neutral reference and now overrides nothing — so that context no longer
     * exists and both assertions had gone VACUOUS: passing because there was
     * nothing to compare, not because the comparison worked. southleft is not a
     * substitute (this report covers the default project only, which the
     * brand-scoping assertion below pins).
     *
     * Both mechanisms are still real and still tested, now on Color Scheme
     * tokens where a context genuinely exists.
     */
    const csDrift = report.valueDrift.find((d) => d.path === 'theme.color.background.default-strong' && d.context.startsWith('theme:'));
    assert('value-drift: light-mode default-strong flagged (alias target differs)', !!csDrift);

    // alias normalization: figma's collection-prefixed alias form must not
    // read as drift when the target is the same token
    const normalized = report.valueDrift.find((d) => d.path === 'theme.color.background.default' && d.context.startsWith('theme:'));
    assert('value-drift: prefixed alias NOT flagged (Figma alias prefix normalized away)', !normalized);

    // rename identity
    const rename = report.possibleRenames.find((r) => r.from === 'font-family.editorial');
    assert('possible-renames: font-family.editorial detected as a rename', !!rename);
    if (rename) assert('possible-renames: renamed to typography.font-family.legacy-editorial', rename.to === 'typography.font-family.legacy-editorial');
    assert('possible-renames: renamed pair excluded from missing-in-figma', !report.missingInFigma.some((e) => e.path === 'font-family.editorial'));
    assert('possible-renames: renamed pair excluded from missing-in-code', !report.missingInCode.some((e) => e.path === 'typography.font-family.legacy-editorial'));

    // plain add/remove (not renames — values don't match anything on the other side)
    assert('missing-in-figma: opacity.100 (real code token, not mirrored in the fixture)', report.missingInFigma.some((e) => e.path === 'opacity.100' && e.context === 'primitive:-:default'));
    assert('missing-in-code: opacity.87 (figma-only, no code counterpart)', report.missingInCode.some((e) => e.path === 'opacity.87' && e.context === 'primitive:-:default'));

    // brand scoping symmetry: the default project is "altitude", so
    // Southleft's brand data must not surface in ANY category.
    const asText = JSON.stringify(report);
    assert('brand scoping: southleft brand context absent from the report (default project is altitude)', !asText.includes('brand:southleft'));
  }
}

console.log('\n4. Flat/unscoped export — v0-compatible fallback still works');
{
  const res = run([FLAT_FIXTURE, '--json']);
  assert('exits 1 (rest of the real tree is unmirrored, so it reads as missing-in-figma)', res.status === 1);
  const report = JSON.parse(res.stdout);
  assert('flat mode: space.2 matched cleanly (no value-drift)', !report.valueDrift.some((d) => d.path === 'space.2'));
  assert('flat mode: space.2 not reported missing', !report.missingInFigma.some((e) => e.path === 'space.2'));
  assert('flat mode: everything else the fixture omits is missing-in-figma', report.missingInFigma.length > 0);
}

console.log(`\n${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
