#!/usr/bin/env node
/**
 * Self-test for scripts/lib/parity-receipt.mjs — the gate that makes `in-sync`
 * a verified state (T1, spec 2026-08-29-parity-judgement-gates-and-evals).
 *
 * This tests `receiptAuthorises()` directly rather than spawning the CLIs,
 * because the two CLIs it sits between cannot both be exercised offline:
 * check-parity.mjs needs a live Figma connection through the shim. The
 * decision logic is a pure function precisely so it can be regression-tested
 * for $0 with no network — the same argument scripts/ai-readiness/lib/grader.mjs
 * makes for its deterministic grader.
 *
 * The CLI half is covered by libs/altitude-mcp/test/mark-synced.mjs, which
 * spawns the real script and asserts it refuses, stamps nothing, and records
 * `verifiedBy.how = "human"` when overridden.
 *
 * Run: node scripts/__tests__/parity-receipt.test.mjs
 */
import { MAX_AGE_HOURS, receiptAuthorises } from '../lib/parity-receipt.mjs';

let PASS = 0;
let FAIL = 0;
function assert(desc, cond) {
  if (cond) { console.log(`  ok - ${desc}`); PASS++; }
  else { console.log(`  NOT OK - ${desc}`); FAIL++; }
}

const NOW = Date.parse('2026-08-29T12:00:00.000Z');
const FRESH = '2026-08-29T11:00:00.000Z';   // 1h old
const KEY = { codeHash: 'abc123', contractDigest: 'def456' };

const receiptWith = (entry, checkedAt = FRESH) => ({
  schemaVersion: 1,
  project: 'altitude',
  checkedAt,
  tolerancePx: 4,
  components: { 'al-button': entry },
});

const auth = (receipt, key = KEY, opts = {}) =>
  receiptAuthorises(receipt, 'al-button', key, { now: NOW, ...opts });

console.log('== parity-receipt receiptAuthorises() self-test ==');

console.log('\n1. The happy path');
{
  const res = auth(receiptWith({ ok: true, checked: 12, off: 0, missing: 0, sourceKey: KEY }));
  assert('a fresh passing receipt for the same source authorises the stamp', res.ok === true);
  assert('success still carries a reason, so the caller can record HOW it was authorised', /passed at/.test(res.reason));
  assert('the check timestamp is handed back for the manifest stamp', res.checkedAt === FRESH);
}

console.log('\n2. Refusals — each one names why');
{
  const cases = [
    ['no receipt at all', auth(null), /no check-parity receipt/i],
    [
      'the run did not cover this component',
      receiptAuthorises(receiptWith({ ok: true, sourceKey: KEY }), 'al-badge', KEY, { now: NOW }),
      /did not cover/i,
    ],
    [
      'the check failed',
      auth(receiptWith({ ok: false, checked: 12, off: 3, missing: 1, sourceKey: KEY })),
      /3 variant\(s\) outside tolerance and 1 missing/,
    ],
    [
      'nothing was actually compared',
      auth(receiptWith({ ok: false, checked: 0, off: 0, missing: 0, sourceKey: KEY, unverifiable: 'no ops row carried an expected box — nothing was compared' })),
      /nothing was compared/,
    ],
    [
      'the component is not in the roster, so no source digests were recorded',
      auth(receiptWith({ ok: true, checked: 4, off: 0, missing: 0, sourceKey: null })),
      /no source digests/i,
    ],
  ];
  for (const [desc, res, pattern] of cases) {
    assert(`refuses: ${desc}`, res.ok === false);
    assert(`  ...and says so: ${desc}`, pattern.test(res.reason));
  }
}

console.log('\n3. Staleness — the CODE side is bound by hash, not by clock');
{
  const receipt = receiptWith({ ok: true, checked: 12, off: 0, missing: 0, sourceKey: KEY });
  const edited = auth(receipt, { codeHash: 'CHANGED', contractDigest: KEY.contractDigest });
  assert('a source edit after the check refuses the stamp', edited.ok === false);
  assert('  ...named as staleness, not as a failed check', /source changed after it was checked/.test(edited.reason));

  const apiOnly = auth(receipt, { codeHash: KEY.codeHash, contractDigest: 'CHANGED' });
  assert('a public-surface (contract digest) change alone is enough to refuse', apiOnly.ok === false);
}

console.log('\n4. Staleness — the FIGMA side is bound by clock, because no digest exists at check time');
{
  const old = new Date(NOW - (MAX_AGE_HOURS + 1) * 3600_000).toISOString();
  const res = auth(receiptWith({ ok: true, checked: 12, off: 0, missing: 0, sourceKey: KEY }, old));
  assert(`a receipt older than the default ${MAX_AGE_HOURS}h is refused`, res.ok === false);
  assert('  ...and the reason names the age and the limit', /old \(limit 24h\)/.test(res.reason));

  const justUnder = new Date(NOW - (MAX_AGE_HOURS - 1) * 3600_000).toISOString();
  assert('one just inside the window is accepted', auth(receiptWith({ ok: true, checked: 1, off: 0, missing: 0, sourceKey: KEY }, justUnder)).ok === true);

  const tightened = auth(receiptWith({ ok: true, checked: 1, off: 0, missing: 0, sourceKey: KEY }), KEY, { maxAgeHours: 0.5 });
  assert('--max-receipt-age-hours can tighten the window below the default', tightened.ok === false);

  // Built by hand: receiptWith()'s default parameter would supply a fresh
  // timestamp, so passing `undefined` does NOT produce a receipt missing one.
  const undated = { schemaVersion: 1, project: 'altitude', tolerancePx: 4, components: { 'al-button': { ok: true, checked: 1, off: 0, missing: 0, sourceKey: KEY } } };
  assert('a receipt with no readable timestamp is refused, not treated as fresh', auth(undated).ok === false);
}

console.log(`\n${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
