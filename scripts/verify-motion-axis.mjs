/**
 * Behavioural verification for the `<al-theme motion>` axis and the Tier 3
 * runtime that rides on it.
 *
 * Covers two claims that are easy to reason about wrongly and cheap to measure:
 *
 *   1. Token resolution is ELEMENT-scoped, so a scoped `<al-theme motion>`
 *      governs the WAAPI layer, and reduced motion collapses it.
 *      (spec 2026-08-20-altitude-motion-library, R3/R4)
 *
 *   2. Each motion value asserts the COMPLETE token set the axis governs, so a
 *      nested `<al-theme>` never inherits a conflicting decision from an outer
 *      one. (issue: motion="full" cannot opt back in when <al-theme> hosts nest)
 *
 * It reads the timing off the animations the runtime actually created, plus the
 * computed legacy token, because those are the only things that prove the
 * values LANDED rather than merely being resolvable.
 *
 * Nothing here hardcodes a duration. Every assertion is relative — "matches the
 * default theme", "longer than full" — so repointing tier 2 moves the whole
 * suite together instead of silently invalidating it.
 *
 *   node scripts/verify-motion-axis.mjs [port]
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('./../node_modules/.pnpm/playwright@1.61.0/node_modules/playwright/index.js');

const PORT = process.argv[2] ?? '6010';
const story = (id) => `http://localhost:${PORT}/iframe.html?id=foundations-motion--${id}&viewMode=story`;

/** Click every replay button, then report what WAAPI and the cascade produced. */
const CLICK_ALL = async () => {
  document.querySelectorAll('[data-panel] al-button').forEach((b) => b.click());
  await new Promise((r) => setTimeout(r, 120));
};

const PROBE = () =>
  [...document.querySelectorAll('[data-panel]')].map((panel) => {
    const grid = panel.querySelector('[data-grid]');
    const anims = grid ? grid.getAnimations({ subtree: true }) : [];
    const timings = anims.map((a) => a.effect.getTiming());
    return {
      key: panel.getAttribute('data-case') ?? panel.getAttribute('motion') ?? 'unset',
      // The stagger's signature: distinct delays mean a real cascade, a single
      // shared delay means it collapsed to simultaneous.
      delays: [...new Set(timings.map((t) => t.delay))].sort((a, b) => a - b),
      durations: [...new Set(timings.map((t) => t.duration))],
      // The 23 components still on the legacy pair read THIS, not the role
      // tokens — a theme can animate on one and be frozen on the other.
      legacy: grid ? getComputedStyle(grid).getPropertyValue('--al-theme-animation-duration').trim() : '',
      readout: panel.querySelector('[data-readout]')?.textContent?.trim() ?? '',
    };
  });

let failures = 0;
const check = (ok, message) => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${message}`);
  if (!ok) failures++;
};

const toMs = (v) => (v.includes('ms') ? parseFloat(v) : parseFloat(v) * 1000);
const maxDur = (row) => Math.max(...row.durations);
const allZero = (row) => row.durations.every((d) => d === 0);
const cascades = (row) => row.delays.length > 1;
/** Same role duration AND same legacy duration — a theme must agree with itself. */
const matches = (a, b) =>
  JSON.stringify(a.durations) === JSON.stringify(b.durations) && toMs(a.legacy) === toMs(b.legacy);

async function collect(page, url, label) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-panel]');
  await page.evaluate(CLICK_ALL);
  const rows = await page.evaluate(PROBE);
  console.log(`\n--- ${label} ---`);
  for (const r of rows) {
    console.log(
      `  ${r.key.padEnd(22)} role=${JSON.stringify(r.durations).padEnd(9)} ` +
        `legacy=${r.legacy.padEnd(6)} delays=${JSON.stringify(r.delays)}`
    );
  }
  return Object.fromEntries(rows.map((r) => [r.key, r]));
}

const browser = await chromium.launch();
try {
  // === 1. The axis reaches the JS layer =====================================
  const normal = await browser.newContext({ reducedMotion: 'no-preference' });
  const p1 = await normal.newPage();
  const axis = await collect(p1, story('motion-axis'), 'Axis / OS: no-preference');

  console.log('\nAxis (OS no-preference):');
  check(Object.keys(axis).length === 3, 'three themed panels rendered');
  check(allZero(axis.reduced), 'motion="reduced" zeroes every WAAPI duration');
  check(!cascades(axis.reduced), 'motion="reduced" collapses the stagger to simultaneous');
  check(maxDur(axis.full) > 0 && cascades(axis.full), 'motion="full" animates and cascades');
  check(
    maxDur(axis.expressive) > maxDur(axis.full),
    'motion="expressive" is slower than motion="full" (axis reaches the JS layer)'
  );
  await normal.close();

  // === 2. OS reduce, and the documented opt-back-in =========================
  const reduced = await browser.newContext({ reducedMotion: 'reduce' });
  const p2 = await reduced.newPage();
  const axisR = await collect(p2, story('motion-axis'), 'Axis / OS: reduce');

  console.log('\nAxis (OS reduce):');
  check(allZero(axisR.expressive), 'OS reduce beats motion="expressive" (accessibility-first)');
  check(allZero(axisR.reduced), 'OS reduce keeps motion="reduced" at zero');
  check(
    maxDur(axisR.full) > 0 && toMs(axisR.full.legacy) > 0,
    'motion="full" is the documented opt-back-in and still animates, on BOTH token sets'
  );

  // Nesting under OS reduce is the case that was broken: Storybook wraps every
  // story in an outer <al-theme>, which the media query zeroes.
  const nestR = await collect(p2, story('nested-themes'), 'Nested / OS: reduce');
  console.log('\nNesting (OS reduce):');
  check(
    maxDur(nestR['reduced>full']) > 0,
    'reduced > full opts back in even though the ancestor zeroed the tokens'
  );
  await reduced.close();

  // === 3. The nesting matrix ================================================
  const normal2 = await browser.newContext({ reducedMotion: 'no-preference' });
  const p3 = await normal2.newPage();
  const nest = await collect(p3, story('nested-themes'), 'Nested / OS: no-preference');

  const base = nest['none>unset'];
  console.log('\nNesting (OS no-preference):');
  check(maxDur(base) > 0, 'the reference default theme animates');
  check(
    matches(nest['reduced>full'], base),
    'reduced > full matches the default theme exactly (role AND legacy)'
  );
  check(
    matches(nest['expressive>full'], base),
    'expressive > full drops the ancestor spring and long durations'
  );
  check(
    maxDur(nest['reduced>expressive']) > maxDur(base) && toMs(nest['reduced>expressive'].legacy) > 0,
    'reduced > expressive animates on BOTH role and legacy tokens (no split brain)'
  );
  check(
    allZero(nest['expressive>reduced']) && toMs(nest['expressive>reduced'].legacy) === 0,
    'expressive > reduced is fully inert'
  );
  await normal2.close();
} finally {
  await browser.close();
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
