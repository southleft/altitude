#!/usr/bin/env node
/**
 * Self-test for scripts/lib/canvas-parity.mjs — the scoring behind `pnpm run canvas:parity`.
 *
 * The gate's build half needs Bun and an OpenPencil checkout, so it is not exercised here.
 * The scoring is pure over diffContracts() output, so it is tested offline against a
 * hand-written code contract and a canvas contract shaped like the ones OpenPencil emits
 * (OpenPencil identifiers in the `figma` fields).
 *
 * Run: node scripts/__tests__/canvas-parity.test.mjs
 */
import { DEFAULT_FLOORS, scoreComponent, summarize } from '../lib/canvas-parity.mjs';

let PASS = 0;
let FAIL = 0;
function assert(desc, cond) {
  if (cond) { console.log(`  ok - ${desc}`); PASS++; }
  else { console.log(`  NOT OK - ${desc}`); FAIL++; }
}

const binding = (figma) => ({ code: `--al-${figma.replace(/\//g, '-')}`, figma });

const codeContract = {
  id: 'al-button',
  props: [
    { name: 'variant', type: 'enum', values: ['primary', 'secondary'], bindings: { figma: { kind: 'VARIANT', property: 'Variant', options: ['Primary', 'Secondary'] } } },
    { name: 'label', type: 'string', bindings: { figma: null } },
    { name: 'href', type: 'string', bindings: { figma: { omit: true } } },
  ],
  slots: [{ name: '' }, { name: 'before', figmaPlaceholder: 'check-circle' }],
  events: [],
  states: ['hover'],
  anatomySource: 'measured',
  anatomy: {
    root: { tag: 'button', tokens: { 'background-color': binding('theme/color/background/primary'), gap: binding('theme/space/xs') }, children: [] },
    stateOverrides: { hover: { 0: { 'background-color': binding('theme/color/background/primary-strong') } } },
  },
  conditionalBindings: { variant: { secondary: { 'background-color': binding('theme/color/background/secondary') } } },
};

const canvasContract = (over = {}) => ({
  $schema: '../canvas-contract.schema.json',
  component: 'al-button',
  figma: { name: 'Button', nodeId: 'altitude/al-button', fileKey: 'open-pencil:altitude' },
  variantAxes: [
    { name: 'State', values: ['Default', 'Hover'] },
    { name: 'Variant', values: ['Primary', 'Secondary'] },
  ],
  componentProperties: [
    { name: 'Icon Before', type: 'INSTANCE_SWAP', values: null },
    { name: 'Slot Before', type: 'BOOLEAN', values: null },
    { name: 'State', type: 'VARIANT', values: ['Default', 'Hover'] },
    { name: 'Text', type: 'TEXT', values: null },
    { name: 'Variant', type: 'VARIANT', values: ['Primary', 'Secondary'] },
  ],
  states: ['hover'],
  textStyles: [],
  tokens: ['theme/color/background/primary', 'theme/space/xs'],
  tokensOwn: ['theme/color/background/primary', 'theme/color/background/primary-strong', 'theme/color/background/secondary', 'theme/space/xs'],
  tokensNested: {},
  anatomySource: 'observed',
  anatomyCase: 'State=Default, Variant=Primary',
  anatomy: null,
  bindings: { code: { tagName: 'al-button' }, figma: { fileKey: 'open-pencil:altitude', componentSetName: 'Button', nodeId: 'altitude/al-button', url: null } },
  degradations: [],
  ...over,
});

console.log('canvas-parity scoring');

const exact = scoreComponent({ codeContract, canvasContract: canvasContract() });
assert('a generated canvas that expresses the whole contract scores 100% API parity', exact.api.percent === 100 && exact.api.total > 0);
assert('…and 100% token parity across variant and state bindings', exact.token.percent === 100 && exact.token.total === 4);
assert('…with no disagreements', exact.disagreements.length === 0);

const missingToken = scoreComponent({
  codeContract,
  canvasContract: canvasContract({ tokensOwn: ['theme/color/background/primary', 'theme/space/xs'] }),
});
assert('a variant binding absent from the canvas lowers token parity only', missingToken.token.matched === 2 && missingToken.api.percent === 100);
assert('…and is named as a token-binding disagreement', missingToken.disagreements.every((d) => d.dimension === 'token-binding'));

const missingAxis = scoreComponent({
  codeContract,
  canvasContract: canvasContract({
    variantAxes: [{ name: 'State', values: ['Default', 'Hover'] }],
    componentProperties: canvasContract().componentProperties.filter((p) => p.name !== 'Variant'),
  }),
});
assert('a missing variant axis lowers API parity', missingAxis.api.percent < 100 && missingAxis.disagreements.some((d) => d.dimension === 'variant-axis'));

const summary = summarize([exact, missingToken]);
assert('the summary keeps API and token parity separate', summary.api.percent === 100 && summary.token.percent === 75);
assert('a token aggregate below the floor fails the gate', !summary.ok && summary.failures.some((f) => f.startsWith('token parity')));
assert('the default floors are the documented ones', DEFAULT_FLOORS.api === 95 && DEFAULT_FLOORS.token === 90);
assert('disagreement kinds are counted for the report', summary.kinds[0]?.kind === 'token-binding:missing-in-canvas');
assert('a clean set passes', summarize([exact]).ok);

console.log(`\n${PASS} passed, ${FAIL} failed`);
process.exit(FAIL ? 1 : 0);
