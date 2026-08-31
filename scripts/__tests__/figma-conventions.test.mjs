#!/usr/bin/env node
/**
 * Self-test for scripts/lib/figma-conventions.mjs (T3, spec
 * 2026-08-29-parity-judgement-gates-and-evals).
 *
 * The fixtures below are SHAPED FROM THE REAL EXTRACTED CANVAS CONTRACTS, and
 * the two failing cases are the two real defects this lint found on its first
 * run against the live library (al-banner's placeholder property name,
 * al-divider's "Verical"). The passing cases are equally load-bearing: an
 * earlier draft of the State rule validated against `STATE_ORDER` alone and
 * failed all ELEVEN form components that legitimately carry `State=Error`. A
 * gate with eleven false positives is a gate nobody keeps green, so "Error is
 * accepted" is tested as deliberately as "Verical is rejected".
 *
 * Run: node scripts/__tests__/figma-conventions.test.mjs
 */
import {
  isTitleCase,
  lintCanvasContract,
  RULE,
  skippedDimensions,
  VALIDATION_STATES,
} from '../lib/figma-conventions.mjs';

let PASS = 0;
let FAIL = 0;
function assert(desc, cond) {
  if (cond) { console.log(`  ok - ${desc}`); PASS++; }
  else { console.log(`  NOT OK - ${desc}`); FAIL++; }
}

const canvas = (over = {}) => ({
  component: 'al-thing',
  figma: { name: 'Thing', nodeId: '1:1' },
  variantAxes: [{ name: 'State', values: ['Default', 'Hover'] }],
  componentProperties: [{ name: 'Label', type: 'TEXT', values: null }],
  ...over,
});

const rules = (vs) => vs.map((v) => v.rule);

console.log('== figma-conventions self-test ==');

console.log('\n1. isTitleCase, against labels the real library actually uses');
{
  for (const good of ['Default', 'Icon After', 'Display Lg', 'Xs', 'Is Full Width', 'Slot Before']) {
    assert(`accepts "${good}"`, isTitleCase(good));
  }
  for (const bad of ['primary', 'Is everything all good?', 'icon after', '']) {
    assert(`rejects "${bad}"`, !isTitleCase(bad));
  }
}

console.log('\n2. A conforming set produces nothing');
{
  assert('no violations', lintCanvasContract(canvas(), { figma: { name: 'Thing' } }).length === 0);
}

console.log('\n3. The two real defects this found in the live library');
{
  const banner = lintCanvasContract(canvas({
    component: 'al-banner',
    componentProperties: [{ name: 'Is everything all good?', type: 'BOOLEAN', values: null }],
  }));
  assert('al-banner: a placeholder property name is caught', rules(banner).includes(RULE.PROP_NAME_CASE));

  const divider = lintCanvasContract(canvas({
    component: 'al-divider',
    variantAxes: [{ name: 'State', values: ['Default', 'Verical'] }],
  }));
  assert('al-divider: "Verical" on the State axis is caught', rules(divider).includes(RULE.STATE_AXIS_VALUES));
  assert('  ...and the message offers both readings — typo, or wrong axis', /typo, or a non-state axis value/.test(divider[0].detail));
}

console.log('\n4. The eleven-false-positive regression — Error is a real library state');
{
  assert('"Error" is in the validation vocabulary', VALIDATION_STATES.includes('Error'));
  const input = lintCanvasContract(canvas({
    component: 'al-input',
    variantAxes: [{ name: 'State', values: ['Default', 'Error', 'Focus', 'Hover', 'Disabled'] }],
  }));
  assert('a form component carrying State=Error passes clean', input.length === 0);
}

console.log('\n5. Title Case applies to axis names and values too');
{
  const v = lintCanvasContract(canvas({ variantAxes: [{ name: 'variant', values: ['primary', 'Secondary'] }] }));
  assert('a lower-case axis NAME is caught', rules(v).includes(RULE.AXIS_NAME_CASE));
  assert('a lower-case VALUE is caught', rules(v).includes(RULE.VALUE_CASE));
  assert('only the offending value is reported, not its well-formed sibling', v.filter((x) => x.rule === RULE.VALUE_CASE).length === 1);
  assert('a non-State axis is not held to the State vocabulary', !rules(v).includes(RULE.STATE_AXIS_VALUES));
}

console.log('\n6. The set-name cross-check is skipped, not guessed, without a manifest entry');
{
  const withEntry = lintCanvasContract(canvas(), { figma: { name: 'Something Else' } });
  assert('a name disagreeing with the manifest is caught', rules(withEntry).includes(RULE.SET_NAME));
  assert('no manifest entry -> the rule does not fire at all', !rules(lintCanvasContract(canvas(), null)).includes(RULE.SET_NAME));
}

console.log('\n7. What it cannot check is NAMED, never silent');
{
  const skipped = skippedDimensions();
  assert('at least one dimension is declared uncoverable', skipped.length > 0);
  assert('variant order is one of them', skipped.some((s) => /variant order/.test(s.dimension)));
  assert('  ...with the reason, not just the fact', skipped.every((s) => typeof s.reason === 'string' && s.reason.length > 40));
  assert('page name is the other', skipped.some((s) => /page name/.test(s.dimension)));
}

console.log(`\n${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
