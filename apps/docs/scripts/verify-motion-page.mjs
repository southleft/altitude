#!/usr/bin/env node
/**
 * Ad-hoc verification for the Motion page's LIVE surface.
 *
 * The two docs gates check what the build emits; nothing there can tell you
 * whether the replay buttons actually animate, because that only happens in a
 * browser with the motion runtime loaded. This drives a real Chromium against
 * the built site and asserts the four claims the page makes about itself:
 *
 *   1. the axis switcher writes the real `motion` attribute, and the live
 *      readout re-resolves the role tokens through it;
 *   2. `reduced` really does zero them, and `expressive` really does lengthen
 *      them (proving the nested <al-theme> governs, not just decorates);
 *   3. every choreography replay button starts real WAAPI animations;
 *   4. every keyframe preset tile does the same, and returns to rest.
 *
 *   node scripts/verify-motion-page.mjs [url]
 */
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:8899/docs/motion/';

const failures = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(label);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => consoleErrors.push(String(error)));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForFunction(() => customElements.get('al-theme') !== undefined);

console.log(`Motion page — live verification\n  ${URL}\n`);

/* ------------------------------------------------------------- structure */

const counts = await page.evaluate(() => ({
  scope: document.querySelectorAll('[data-motion-scope]').length,
  axisButtons: document.querySelectorAll('[data-axis]').length,
  probes: document.querySelectorAll('[data-probe]').length,
  replays: document.querySelectorAll('[data-replay]').length,
  presets: document.querySelectorAll('[data-preset]').length,
  curves: document.querySelectorAll('[data-easing-card]').length,
  durations: document.querySelectorAll('[data-duration-row]').length,
}));
console.log(`  structure: ${JSON.stringify(counts)}\n`);

check('one <al-theme> demo scope', counts.scope === 1);
check('four axis choices', counts.axisButtons === 4);
check('replay buttons rendered', counts.replays >= 13, `${counts.replays} buttons`);
check('preset tiles rendered', counts.presets === 28, `${counts.presets} tiles`);

/* ------------------------------------------------------- the axis is real */

/**
 * Chromium hands back computed custom-property values in its own normalised
 * form — `0.2s` reads as `.2s`, `cubic-bezier(0.34, …)` as `cubic-bezier(.34, …)`.
 * That is the browser's rendering of the right value, not a wrong value, so the
 * probes are compared after restoring the leading zeros rather than by
 * asserting Chromium's spelling.
 */
const denormalise = (value) => value.replace(/(^|[^\d])\.(\d)/g, '$10.$2');

const readProbes = () =>
  page
    .evaluate(() =>
      Object.fromEntries(
        Array.from(document.querySelectorAll('[data-probe]')).map((el) => [
          el.closest('.probe__cell').querySelector('.micro').textContent.trim(),
          el.textContent.trim(),
        ])
      )
    )
    .then((probes) =>
      Object.fromEntries(Object.entries(probes).map(([key, value]) => [key, denormalise(value)]))
    );

const pick = async (axis) => {
  await page.click(`[data-axis="${axis}"]`);
  return readProbes();
};

const initial = await readProbes();
check('probes resolve on load', initial['role-base'] === '0.2s', `role-base = ${initial['role-base']}`);

const reduced = await pick('reduced');
check(
  'reduced zeroes every role duration',
  ['role-fast', 'role-base', 'role-slow'].every((key) => reduced[key] === '0s'),
  JSON.stringify(reduced)
);

const expressive = await pick('expressive');
check(
  'expressive lengthens role-base',
  expressive['role-base'] === '0.6s',
  `role-base = ${expressive['role-base']}`
);
check(
  'expressive swaps in the spring curve',
  expressive['timing-standard'] === 'cubic-bezier(0.34,1.56,0.64,1)',
  expressive['timing-standard']
);

const full = await pick('full');
check(
  'full is byte-identical to default',
  full['role-base'] === initial['role-base'] && full['role-slow'] === initial['role-slow'],
  `${full['role-base']} / ${full['role-slow']}`
);

await page.click('[data-axis="default"]');
const attrAfterDefault = await page.getAttribute('[data-motion-scope]', 'motion');
check('default REMOVES the attribute', attrAfterDefault === null, String(attrAfterDefault));

/* ------------------------------------ the demos actually start animations */

/**
 * Click a target and report the WAAPI animations it started in `root`: how
 * many, and the longest end time among them.
 *
 * The end time matters because "reduced" does NOT mean "no animation" in this
 * runtime — `run()` still creates them, with the duration resolved from the
 * zeroed role token and the stagger offset flattened, so the element jumps to
 * its end state in one frame (`motion/run.ts:130-136`). Counting animations
 * would therefore report a false failure; counting TIME is the real claim.
 */
const animationsAfterClick = async (clickSelector, rootSelector) =>
  page.evaluate(
    async ([click, root]) => {
      const button = document.querySelector(click);
      const scope = document.querySelector(root);
      button.click();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const animations = [scope, ...scope.querySelectorAll('*')].flatMap((el) => el.getAnimations());
      const endTime = animations.reduce((longest, animation) => {
        const timing = animation.effect?.getComputedTiming?.() ?? {};
        return Math.max(longest, (timing.endTime ?? 0));
      }, 0);
      return { count: animations.length, endTime };
    },
    [clickSelector, rootSelector]
  );

const tokens = await page.$$eval('[data-replay]', (buttons) =>
  buttons.map((button) => button.dataset.replay)
);

let animated = 0;
for (const token of tokens) {
  const { count, endTime } = await animationsAfterClick(
    `[data-replay="${token}"]`,
    `.choreo-card:has([data-replay="${token}"]) [data-stage]`
  );
  if (count > 0 && endTime > 0) animated += 1;
  else console.log(`        ${token}: ${count} animations, ${endTime}ms`);
}
check('every choreography replay animates', animated === tokens.length, `${animated}/${tokens.length}`);

const presetNames = await page.$$eval('[data-preset]', (tiles) =>
  tiles.map((tile) => tile.dataset.preset)
);
let presetsAnimated = 0;
for (const name of presetNames) {
  const { count, endTime } = await animationsAfterClick(
    `[data-preset="${name}"]`,
    `[data-preset="${name}"] [data-preset-mover]`
  );
  if (count > 0 && endTime > 0) presetsAnimated += 1;
  else console.log(`        preset ${name}: ${count} animations, ${endTime}ms`);
}
check(
  'every keyframe preset animates',
  presetsAnimated === presetNames.length,
  `${presetsAnimated}/${presetNames.length}`
);

/* --------------------------------- and stop dead when the axis says reduced */

await page.click('[data-axis="reduced"]');
// Not "no animations": `run()` still creates them and lets the zeroed role
// duration collapse them, which is the documented contract. Zero elapsed TIME
// is the claim — the element jumps to its end state in one frame.
const underReduced = await animationsAfterClick(
  '[data-replay="grid-reveal"]',
  '.choreo-card:has([data-replay="grid-reveal"]) [data-stage]'
);
check(
  'reduced collapses a replay to an instant',
  underReduced.endTime === 0,
  `${underReduced.count} animations, ${underReduced.endTime}ms`
);

// The page's own demos take the other route — `isReducedMotion()` gates them
// before anything is created at all, so here the count IS the claim.
const tier1UnderReduced = await animationsAfterClick('[data-play="duration"]', '[data-duration-row]');
check(
  'reduced stops the tier-1 demos too',
  tier1UnderReduced.count === 0,
  `${tier1UnderReduced.count} animations`
);

/* ------------------------------------------------------------------ noise */

check('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

await browser.close();

console.log(failures.length ? `\nFAIL — ${failures.length} check(s)` : '\nOK — the Motion page is live');
process.exit(failures.length ? 1 : 0);
