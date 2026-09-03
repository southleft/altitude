#!/usr/bin/env node
/**
 * Self-test for the evidence-bundle half of scripts/component-check.mjs —
 * `--evidence` (gather) and `--verdict` (derive).
 *
 * Contract under test: .altitude/VERIFICATION.md.
 *
 * Split the same way scripts/__tests__/parity-receipt.test.mjs is split. The
 * PURE parts (`deriveVerdict`, and `writeEvidence`'s overwrite refusal with an
 * injected run id) are imported and called directly, because they are pure
 * precisely so they can be regression-tested for $0 with no network and no
 * build. The parts that only exist as CLI behaviour — exit codes, the
 * staleness refusal, the run-file layout — are exercised by spawning the real
 * script, because that is the surface a caller actually has.
 *
 * Every file this test writes lives under .altitude/verification/ (gitignored,
 * per-run scratch) and is removed on the way out — including on failure.
 *
 * Run: node scripts/__tests__/component-evidence.test.mjs
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CLAIM_STATUS,
  bundleDirFor,
  deriveVerdict,
  newestBundlePath,
  writeEvidence,
} from '../component-check.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = resolve(REPO, 'scripts/component-check.mjs');

/** A tag that cannot collide with a real component, so the bundles this test
 * writes are unambiguously its own to delete. */
const FAKE = 'evidence-self-test';
const FAKE_TAG = `al-${FAKE}`;
/** A real, fully-shipped component — the only way to assert that a bundle over
 * real sources carries real citations. */
const REAL = 'button';
const REAL_TAG = `al-${REAL}`;

let PASS = 0;
let FAIL = 0;
function assert(desc, cond, extra) {
  if (cond) {
    console.log(`  ok - ${desc}`);
    PASS++;
  } else {
    console.log(`  NOT OK - ${desc}`);
    if (extra !== undefined) console.log(`      ${typeof extra === 'string' ? extra : JSON.stringify(extra)}`);
    FAIL++;
  }
}

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd: REPO, encoding: 'utf8' });
}

/** Bundles written by THIS test only — never a directory it did not create. */
const createdByTest = new Set();
function cleanup() {
  for (const dir of createdByTest) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best effort — the tree is gitignored scratch */
    }
  }
}

try {
  console.log('== component-check --evidence / --verdict self-test ==');

  // -------------------------------------------------------------------------
  console.log('\n1. A bundle is written, and a run file is NEVER overwritten');
  {
    const dir = bundleDirFor(FAKE_TAG);
    createdByTest.add(dir);
    rmSync(dir, { recursive: true, force: true });

    const first = writeEvidence(FAKE, { runId: '20260101T000000Z-aaaaaa' });
    assert('the first write succeeds', first.ok === true, first.reason);
    assert('it lands under .altitude/verification/<tag>/<run-id>.json', existsSync(first.path));

    const bytesBefore = readFileSync(first.path, 'utf8');
    const again = writeEvidence(FAKE, { runId: '20260101T000000Z-aaaaaa' });
    assert('a second write with the same run id is REFUSED', again.ok === false);
    assert('the refusal says so out loud', /refusing to overwrite/.test(again.reason ?? ''), again.reason);
    assert('the existing run file is byte-identical afterwards', readFileSync(first.path, 'utf8') === bytesBefore);

    // A distinct run against the same component is a NEW file, not an update.
    const second = writeEvidence(FAKE, { runId: '20260101T000001Z-bbbbbb' });
    assert('a distinct run id writes an additional file', second.ok === true && second.path !== first.path);
    assert('both run files coexist', readdirSync(dir).filter((f) => f.endsWith('.json')).length === 2);
  }

  // -------------------------------------------------------------------------
  console.log('\n2. `unobserved` is recorded, and it never counts as a pass');
  {
    // The pure rule first, over synthetic rows — this is the invariant, and it
    // must hold regardless of what any particular machine can measure.
    const row = (claim, severity, status) => ({
      claim,
      severity,
      requires: 'offline',
      status,
      detail: `${claim} is ${status}`,
      citation: { command: 'test', reads: 'test' },
      evidence: null,
    });

    const warnUnobserved = deriveVerdict([
      row('a', 'blocker', CLAIM_STATUS.PASS),
      row('b', 'warning', CLAIM_STATUS.UNOBSERVED),
    ]);
    assert('an unobserved warning is NOT counted in `pass`', warnUnobserved.counts.pass === 1, warnUnobserved.counts);
    assert('it is counted in `unobserved`', warnUnobserved.counts.unobserved === 1, warnUnobserved.counts);
    assert('the verdict drops to verified-with-caveats', warnUnobserved.verdict === 'verified-with-caveats', warnUnobserved.verdict);
    assert(
      'the derivation names the unobserved claim',
      warnUnobserved.reasons.some((r) => /"b" unobserved/.test(r)),
      warnUnobserved.reasons,
    );

    const blockerUnobserved = deriveVerdict([
      row('a', 'blocker', CLAIM_STATUS.UNOBSERVED),
      row('b', 'warning', CLAIM_STATUS.PASS),
    ]);
    assert(
      'an unobserved BLOCKER yields insufficient-evidence, never verified',
      blockerUnobserved.verdict === 'insufficient-evidence',
      blockerUnobserved.verdict,
    );

    const allUnobserved = deriveVerdict([
      row('a', 'blocker', CLAIM_STATUS.UNOBSERVED),
      row('b', 'warning', CLAIM_STATUS.UNOBSERVED),
    ]);
    assert('a bundle that measured nothing has zero passes', allUnobserved.counts.pass === 0, allUnobserved.counts);
    assert('and is never `verified`', allUnobserved.verdict !== 'verified', allUnobserved.verdict);

    const clean = deriveVerdict([row('a', 'blocker', CLAIM_STATUS.PASS), row('b', 'warning', CLAIM_STATUS.PASS)]);
    assert('all-pass really is `verified`', clean.verdict === 'verified', clean.verdict);

    // Then the same rule as it actually shows up in a bundle: the fabricated
    // component has no build output and no Figma receipt entry, so at least one
    // claim MUST come back unobserved rather than silently absent.
    const bundle = JSON.parse(readFileSync(newestBundlePath(FAKE_TAG), 'utf8'));
    const statuses = new Set(bundle.claims.map((c) => c.status));
    assert(
      'every claim carries one of the three statuses — no fourth, no blank',
      bundle.claims.every((c) => Object.values(CLAIM_STATUS).includes(c.status)),
      [...statuses],
    );
    assert(
      'a claim that could not be measured is present and marked unobserved',
      bundle.claims.some((c) => c.status === CLAIM_STATUS.UNOBSERVED),
      bundle.claims.map((c) => `${c.claim}=${c.status}`),
    );
    assert(
      "the bundle's own recorded counts exclude unobserved from pass",
      bundle.derivedVerdict.counts.pass === bundle.claims.filter((c) => c.status === CLAIM_STATUS.PASS).length,
      bundle.derivedVerdict.counts,
    );
  }

  // -------------------------------------------------------------------------
  console.log('\n3. Every claim row carries a citation');
  {
    const dir = bundleDirFor(REAL_TAG);
    const preexisting = existsSync(dir) ? new Set(readdirSync(dir)) : new Set();
    const r = run([REAL_TAG, '--evidence', '--json']);
    assert('--evidence over a real component exits 0', r.status === 0, `status=${r.status} stderr=${r.stderr.slice(0, 300)}`);

    let bundle = null;
    try {
      bundle = JSON.parse(r.stdout);
    } catch (e) {
      console.log(`      parse: ${e.message}`);
      console.log(`      stdout head: ${JSON.stringify(r.stdout.slice(0, 300))}`);
    }
    assert('--evidence --json emits one parseable bundle on stdout', bundle !== null);

    if (bundle) {
      // Only delete what this run added; another session's bundles stay put.
      const added = readdirSync(dir).filter((f) => !preexisting.has(f));
      for (const f of added) rmSync(join(dir, f), { force: true });

      assert('the bundle covers more than one claim', bundle.claims.length > 1);
      assert(
        'every claim names the command that produced it',
        bundle.claims.every((c) => typeof c.citation?.command === 'string' && c.citation.command.length > 0),
        bundle.claims.filter((c) => !c.citation?.command).map((c) => c.claim),
      );
      assert(
        'every claim names the artifact it read',
        bundle.claims.every((c) => typeof c.citation?.reads === 'string' && c.citation.reads.length > 0),
        bundle.claims.filter((c) => !c.citation?.reads).map((c) => c.claim),
      );
      assert(
        'citations are repo-relative, never absolute machine paths',
        bundle.claims.every((c) => !/^[A-Za-z]:[\\/]/.test(c.citation.reads) && !c.citation.reads.startsWith('/')),
        bundle.claims.map((c) => c.citation.reads).filter((p) => /^[A-Za-z]:[\\/]/.test(p) || p.startsWith('/')),
      );
      assert(
        'a passing claim carries a measured value in `evidence`',
        bundle.claims.filter((c) => c.status === CLAIM_STATUS.PASS).some((c) => c.evidence),
      );
      assert(
        'the bundle fingerprints the source it describes',
        typeof bundle.source?.digest === 'string' && bundle.source.files.length > 0,
        bundle.source?.digest,
      );
      // The bundle.ts citation is the one with a line number — prove citations
      // are precise enough to reopen, not just a directory name.
      const bundleClaim = bundle.claims.find((c) => c.claim === 'bundle');
      assert(
        'the bundle.ts claim cites a file:line',
        /^libs\/al-web-components\/components\/bundle\.ts:\d+$/.test(bundleClaim?.citation.reads ?? ''),
        bundleClaim?.citation.reads,
      );
    }
  }

  // -------------------------------------------------------------------------
  console.log('\n4. --verdict REFUSES a bundle older than the source it describes');
  {
    const dir = bundleDirFor(FAKE_TAG);
    const newest = newestBundlePath(FAKE_TAG);
    assert('there is a bundle to reason over', newest !== null);

    // Fresh bundle, unmodified: the verdict computes.
    const ok = run([FAKE_TAG, '--verdict', '--json']);
    let okPayload = null;
    try {
      okPayload = JSON.parse(ok.stdout);
    } catch {
      /* asserted below */
    }
    assert('a matching bundle is NOT refused', okPayload !== null && okPayload.refused !== true, ok.stdout.slice(0, 200));
    assert(
      'the fabricated component derives gaps-remain (blockers measured, and failing)',
      okPayload?.verdict === 'gaps-remain',
      okPayload?.verdict,
    );
    assert('gaps-remain exits 1', ok.status === 1, `status=${ok.status}`);

    // Now make the newest bundle describe a DIFFERENT source state. This is the
    // same refusal mm_verify's promote step makes for a summary older than the
    // spec it read: a verdict is evidence about content, not a credential.
    const bundle = JSON.parse(readFileSync(newest, 'utf8'));
    bundle.source.digest = 'deadbeef'.repeat(8);
    writeFileSync(newest, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');

    const stale = run([FAKE_TAG, '--verdict']);
    assert('a stale bundle is refused', /VERDICT REFUSED/.test(stale.stdout), stale.stdout.slice(0, 300));
    assert('the refusal says the source moved', /stale bundle/.test(stale.stdout), stale.stdout.slice(0, 300));
    assert('a refusal exits 3, distinct from a failing verdict (1)', stale.status === 3, `status=${stale.status}`);
    assert('a refusal computes NO verdict', !/verdict: (VERIFIED|GAPS)/.test(stale.stdout), stale.stdout.slice(0, 300));

    const staleJson = run([FAKE_TAG, '--verdict', '--json']);
    let stalePayload = null;
    try {
      stalePayload = JSON.parse(staleJson.stdout);
    } catch {
      /* asserted below */
    }
    assert('--json reports the refusal as data, not as a verdict', stalePayload?.refused === true, staleJson.stdout.slice(0, 200));
    assert('and carries no `verdict` key at all', stalePayload !== null && !('verdict' in stalePayload), Object.keys(stalePayload ?? {}));

    // With no bundle at all, the refusal is different and equally explicit.
    rmSync(dir, { recursive: true, force: true });
    const none = run([FAKE_TAG, '--verdict']);
    assert('no bundle is also a refusal, not a pass', none.status === 3, `status=${none.status}`);
    assert('and it says which command to run first', /--evidence/.test(none.stdout), none.stdout.slice(0, 300));
  }
} finally {
  cleanup();
}

console.log(`\nSelf-test: ${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
