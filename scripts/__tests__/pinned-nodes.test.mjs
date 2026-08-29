#!/usr/bin/env node
/**
 * Self-test for scripts/lib/pinned-nodes.mjs — the classifier behind
 * `scripts/figma-parity/check-pinned-nodes.mjs` (T2, spec
 * 2026-08-29-parity-judgement-gates-and-evals).
 *
 * The probe itself needs a live Figma connection through the shim, so the
 * DECISION is a pure function on a probe result and is tested here offline,
 * for $0, the same way scripts/ai-readiness/lib/grader.mjs is.
 *
 * The case that matters most is `ghost`: a pinned id that RESOLVES while the
 * node is detached. That is the shape of the real 2026-08-27 incident, where
 * 11 of 20 pinned ids in the parity manifest pointed at deleted sets and the
 * tooling reported a deleted set as in-sync.
 *
 * Run: node scripts/__tests__/pinned-nodes.test.mjs
 */
import { classifyPin, classifyPins, findings, jsonAscii, repairable, VERDICT } from '../lib/pinned-nodes.mjs';

let PASS = 0;
let FAIL = 0;
function assert(desc, cond) {
  if (cond) { console.log(`  ok - ${desc}`); PASS++; }
  else { console.log(`  NOT OK - ${desc}`); FAIL++; }
}

const PIN = { tag: 'al-button', name: 'Button', nodeId: '3435:877' };
const LIVE_SET = { resolved: true, live: true, type: 'COMPONENT_SET', name: 'Button' };

console.log('== pinned-nodes classifier self-test ==');

console.log('\n1. A live, correctly-typed, correctly-named pin passes');
{
  const r = classifyPin(PIN, LIVE_SET, { Button: [{ id: '3435:877', page: 'X Button' }] });
  assert('verdict is ok', r.verdict === VERDICT.OK);
  assert('no repin is suggested for a pin that is already right', r.repinTo === null);
  assert('findings() drops it', findings([r]).length === 0);
}

console.log('\n2. GHOST — the trap: it resolved, but it is not in the document');
{
  const probe = { resolved: true, live: false, type: 'COMPONENT_SET', name: 'Button' };
  const r = classifyPin(PIN, probe, { Button: [{ id: '9999:1', page: 'X Button' }] });
  assert('resolving is NOT treated as proof of presence', r.verdict === VERDICT.GHOST);
  assert('the reason names detachment, not absence', /detached/.test(r.detail));
  assert('the live set of that name is offered as a repin', r.repinTo?.id === '9999:1');
  assert('a ghost with a single live namesake is repairable', repairable([r]).length === 1);
}

console.log('\n3. Ambiguity is never guessed at');
{
  const probe = { resolved: true, live: false, type: 'COMPONENT_SET', name: 'Button' };
  const two = classifyPin(PIN, probe, { Button: [{ id: '1:1', page: 'X Button' }, { id: '2:2', page: 'X Button (old)' }] });
  assert('two sets share the name -> no repin suggested', two.repinTo === null);
  assert('  ...so it is reported, not auto-repaired', repairable([two]).length === 0);
  assert('  ...but it is still a finding', two.verdict === VERDICT.GHOST);

  const none = classifyPin(PIN, probe, {});
  assert('no live namesake at all -> still a ghost, just unrepairable', none.verdict === VERDICT.GHOST && none.repinTo === null);
}

console.log('\n4. The other three verdicts');
{
  const missing = classifyPin(PIN, { resolved: false, live: false, type: null, name: null }, {});
  assert('an id that does not resolve is `missing`, not `ghost`', missing.verdict === VERDICT.MISSING);

  const wrongType = classifyPin(PIN, { resolved: true, live: true, type: 'FRAME', name: 'Button' }, {});
  assert('a live node of the wrong type is caught', wrongType.verdict === VERDICT.WRONG_TYPE);
  assert('  ...and the detail names the type it actually found', /FRAME/.test(wrongType.detail));

  const renamed = classifyPin(PIN, { ...LIVE_SET, name: 'Button (v2)' }, {});
  assert('a live set under a different name is `renamed`', renamed.verdict === VERDICT.RENAMED);
  assert('  ...and is NOT auto-repairable — the id is right, the name is the question', repairable([renamed]).length === 0);
}

console.log('\n5. A dropped probe must never read as a pass');
{
  const r = classifyPin(PIN, undefined, {});
  assert('an absent probe is `missing`, not silently ok', r.verdict === VERDICT.MISSING);
  const all = classifyPins([PIN], {}, {});
  assert('classifyPins over an empty probe map yields a finding, not an empty pass', findings(all).length === 1);
}

console.log('\n6. jsonAscii — injected values reach the plugin as pure ASCII');
{
  const wrench = String.fromCodePoint(0x1f6e0) + ' ';
  const out = jsonAscii(wrench);
  assert('output is ASCII-only', /^[\x20-\x7e]*$/.test(out));
  assert('the emoji became a surrogate PAIR of escapes, not one bad escape', /\\ud83d\\udee0/.test(out));
  // eval is the assertion: the point is that a REAL JS parser accepts what we
  // emit, which is exactly what the Figma plugin host will do with it.
  assert('it round-trips through a JS parser back to the original value', eval(`(${out})`) === wrench);

  const ids = jsonAscii(['3435:877', '9999:1']);
  assert('plain ASCII input is passed through untouched', ids === '["3435:877","9999:1"]');
}

console.log(`\n${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
