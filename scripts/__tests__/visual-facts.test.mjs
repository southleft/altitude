#!/usr/bin/env node
/**
 * Self-test for scripts/lib/color.mjs + scripts/lib/visual-facts.mjs — the
 * non-geometric half of Figma↔code verification (T4, spec
 * 2026-08-29-parity-judgement-gates-and-evals).
 *
 * Before T4, `verify-figma.mjs` compared bounding boxes and nothing else and
 * `visual-compare.mjs` compared nothing at all, so colour, glyph identity and
 * label text had no gate anywhere in the repo. These are comparators, not
 * judges: both sides are structured data, so every assertion below is exact.
 *
 * The colour values used are REAL — taken from the southleft hero's measured
 * page JSON (`computed.fc` is `rgb(250, 249, 248)`, and its grid overlay
 * serializes as `color(srgb ...)`, which a naive rgb()-only parser drops on
 * the floor).
 *
 * Run: node scripts/__tests__/visual-facts.test.mjs
 */
import { colorFnToHex, cssColorToHex, figmaPaintToHex, normHex, sameColor } from '../lib/color.mjs';
import {
  compareFill,
  compareFillBinding,
  compareText,
  FACT,
  nodeFacts,
  normalizeText,
  summarizeFacts,
} from '../lib/visual-facts.mjs';

let PASS = 0;
let FAIL = 0;
function assert(desc, cond) {
  if (cond) { console.log(`  ok - ${desc}`); PASS++; }
  else { console.log(`  NOT OK - ${desc}`); FAIL++; }
}

const solid = (r, g, b, opacity = 1) => ({ type: 'SOLID', color: { r, g, b }, opacity });
const WHITE_ISH = 'rgb(250, 249, 248)'; // the southleft hero's real foreground

console.log('== color canonicalization ==');
{
  assert('short hex expands', normHex('#abc') === '#AABBCC');
  assert('opaque alpha is dropped so #FFFFFFFF === #FFFFFF', normHex('#FFFFFFFF') === '#FFFFFF');
  assert('rgb() parses', cssColorToHex('rgb(250, 249, 248)') === '#FAF9F8');
  assert('rgba() with alpha keeps the alpha', cssColorToHex('rgba(0, 0, 0, 0.5)') === '#00000080');
  assert('color(srgb ...) parses — Chromium really emits this', colorFnToHex('color(srgb 1 1 1)') === '#FFFFFF');
  assert('  ...including its alpha form', cssColorToHex('color(srgb 0 0 0 / 0.45)') !== null);

  assert('fully transparent is NOT a colour', cssColorToHex('rgba(0, 0, 0, 0)') === null);
  assert('the transparent keyword is NOT a colour', cssColorToHex('transparent') === null);
  assert('a gradient is NOT a colour', cssColorToHex('linear-gradient(to right, #fff, #000)') === null);
  assert('currentColor is NOT a colour', cssColorToHex('currentColor') === null);

  assert('a Figma SOLID paint converts', figmaPaintToHex(solid(1, 1, 1)) === '#FFFFFF');
  assert('paint opacity becomes hex alpha', figmaPaintToHex(solid(0, 0, 0, 0.5)) === '#00000080');
  assert('a gradient paint is not a flat colour', figmaPaintToHex({ type: 'GRADIENT_LINEAR' }) === null);
  assert('an invisible paint is not a colour', figmaPaintToHex({ ...solid(1, 1, 1), visible: false }) === null);

  assert('float/int round-trip is tolerated by one channel', sameColor('#FAF9F8', '#FBF9F8', 1));
  assert('a real difference is not', !sameColor('#FF0000', '#00FF00', 1));
  assert('tolerance 0 demands exact equality', !sameColor('#FAF9F8', '#FBF9F8', 0));
  assert('two nulls are NOT equal — incomparable is not agreement', !sameColor(null, null));
}

console.log('\n== text ==');
{
  assert('whitespace is collapsed, so DOM indentation does not read as drift',
    normalizeText('  Get   started\n ') === 'Get started');
  assert('case is NOT normalized — "Get started" vs "Get Started" is real drift in a design system',
    normalizeText('Get Started') !== normalizeText('Get started'));

  const same = compareText({ text: 'Get started' }, { type: 'TEXT', characters: 'Get started ' });
  assert('matching words pass', same.status === FACT.OK);

  const diff = compareText({ text: 'Get started' }, { type: 'TEXT', characters: 'Get Started' });
  assert('a one-character difference is caught', diff.status === FACT.MISMATCH);
  assert('  ...and the detail shows both sides', /measured "Get started" vs Figma "Get Started"/.test(diff.detail));

  const notText = compareText({ text: 'Hello' }, { type: 'FRAME' });
  assert('a non-TEXT Figma node is skipped, not failed', notText.status === FACT.SKIPPED);
  assert('  ...with the reason stated', /not a TEXT node/.test(notText.detail));

  const empty = compareText({ text: 'Hello' }, { type: 'TEXT', characters: '   ' });
  assert('an empty Figma text node against real copy is a mismatch', empty.status === FACT.MISMATCH);
}

console.log('\n== fill ==');
{
  const bgOk = compareFill({ bg: 'rgb(255, 255, 255)' }, { type: 'FRAME', fill: solid(1, 1, 1) });
  assert('a matching background passes', bgOk.status === FACT.OK);

  const bgBad = compareFill({ bg: 'rgb(255, 0, 0)' }, { type: 'FRAME', fill: solid(0, 1, 0) });
  assert('a wrong background colour is caught', bgBad.status === FACT.MISMATCH);
  assert('  ...naming both values', /#FF0000/.test(bgBad.detail) && /#00FF00/.test(bgBad.detail));

  // The single most common way this comparison gets written backwards.
  const textFill = compareFill({ bg: 'rgb(0, 0, 0)', fc: WHITE_ISH }, { type: 'TEXT', fill: solid(0.98, 0.976, 0.973) });
  assert('a TEXT node is compared against the FOREGROUND colour, not the background', textFill.status === FACT.OK);
  assert('  ...and says which side it read', /computed\.fc/.test(textFill.detail));

  const gradient = compareFill({ bg: 'linear-gradient(to right, #fff, #000)' }, { type: 'FRAME', fill: solid(1, 1, 1) });
  assert('an unrepresentable measured paint is SKIPPED, never a false match', gradient.status === FACT.SKIPPED);

  const noPaint = compareFill({ bg: 'rgb(255, 255, 255)' }, { type: 'FRAME', fill: null });
  assert('a real measured colour against no Figma paint IS a mismatch', noPaint.status === FACT.MISMATCH);

  const neither = compareFill({ bg: 'rgba(0, 0, 0, 0)' }, { type: 'FRAME', fill: null });
  assert('nothing painted on either side is skipped, not passed', neither.status === FACT.SKIPPED);
}

console.log('\n== fill binding (repair skill trap 4) ==');
{
  const unbound = compareFillBinding({ type: 'FRAME', fill: solid(1, 1, 1), fillBound: false });
  assert('a right-coloured but UNBOUND fill is still reported', unbound.status === FACT.MISMATCH);
  assert('  ...explaining the consequence, not just the fact', /mode switch or a token change/.test(unbound.detail));

  const bound = compareFillBinding({ type: 'FRAME', fill: solid(1, 1, 1), fillBound: true });
  assert('a bound fill passes', bound.status === FACT.OK);

  const nothing = compareFillBinding({ type: 'FRAME', fill: null, fillBound: false });
  assert('nothing to bind is skipped', nothing.status === FACT.SKIPPED);

  const colourAgrees = compareFill({ bg: 'rgb(255, 255, 255)' }, { type: 'FRAME', fill: solid(1, 1, 1), fillBound: false });
  assert('and the colour check PASSES on that same node — which is why binding is a separate fact',
    colourAgrees.status === FACT.OK);
}

console.log('\n== rollup ==');
{
  const facts = nodeFacts(
    { text: 'Hi', bg: 'rgb(0, 0, 0)', fc: 'rgb(255, 255, 255)' },
    { type: 'TEXT', characters: 'Hi', fill: solid(1, 1, 1), fillBound: true },
  );
  assert('a fully-correct text node produces three clean facts', facts.length === 3 && facts.every((f) => f.status === FACT.OK));

  const summary = summarizeFacts([{ facts }, { facts: [{ status: FACT.MISMATCH }, { status: FACT.SKIPPED }] }]);
  assert('the rollup counts every category', summary.ok === 3 && summary.mismatch === 1 && summary.skipped === 1);

  assert('an unpaired node contributes no facts at all', nodeFacts(null, { type: 'TEXT' }).length === 0);
}

console.log(`\n${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
