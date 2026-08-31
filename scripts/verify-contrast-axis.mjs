#!/usr/bin/env node
/**
 * Behavioural verification for the `<al-theme contrast>` axis
 * (spec 2026-08-22-token-debt-and-machine-readable-metadata, "make
 * contrast='more' a real axis").
 *
 * Modelled on `scripts/verify-motion-axis.mjs` — same `check()`/PASS-FAIL
 * ledger, same "nothing hardcodes a value that could legitimately drift"
 * discipline — but delivered through a Vite-served static harness
 * (`.altitude/visual-compare/harness/contrast-axis.{html,js}`), the same
 * infrastructure `scripts/check-scoped-theming.mjs` uses, rather than a
 * live Storybook. Storybook itself was removed from this repo on
 * 2026-08-25 (`libs/al-web-components/package.json`'s `//sideEffects`
 * comment) and the `foundations-motion--motion-axis` /
 * `--nested-themes` stories `verify-motion-axis.mjs` points at were never
 * committed as `.stories.ts` files — grep confirms zero matches — so that
 * script cannot run in this repo as written. This script deliberately does
 * NOT depend on a dev server staying up on a magic port; `pnpm --filter
 * @southleft/al-web-components build` is the only precondition.
 *
 * Covers two claims:
 *
 *   1. `contrast='more'` actually raises `--al-theme-opacity-disabled` on a
 *      REAL rendered element (a disabled `<al-field-note>`, the same
 *      single-property probe pattern `check-scoped-theming.mjs` uses for
 *      `al-button`'s transition-duration) — and the raised value clears
 *      WCAG AA text contrast (4.5:1) against the worst realistic disabled
 *      pairing in the codebase, where the pre-existing baseline does not.
 *      The WCAG math replicates `theme-engine/oklch.ts`'s
 *      `luminance()`/`contrast()` (byte-for-byte, same relative-luminance
 *      formula) rather than importing the compiled module, so this script
 *      has no build-order dependency on the library beyond the CSS build.
 *
 *   2. The nesting case: `contrast` has a default initializer but Lit never
 *      reflects it to the DOM attribute (verified separately, see
 *      `theme.scss`'s contrast-axis comment), so a bare inner `<al-theme>`
 *      — or one with an explicit `contrast="normal"` — nested inside
 *      `<al-theme contrast="more">` must RESET to the default opacity, not
 *      inherit the ancestor's raised one.
 *
 * Requires `pnpm --filter @southleft/al-web-components build` (dist
 * components + css). First page load compiles the whole component graph
 * through Vite's dev-server transform on demand, which can take a minute —
 * that is normal, not a hang.
 *
 *   node scripts/verify-contrast-axis.mjs
 */

import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const require_ = createRequire(path.join(REPO, 'libs', 'al-web-components', 'package.json'));
const viteEntry = path.join(path.dirname(require_.resolve('vite/package.json')), 'dist', 'node', 'index.js');
const { createServer } = await import(pathToFileURL(viteEntry).href);

const PAGE = '/.altitude/visual-compare/harness/contrast-axis.html';
const PORT = 5199;

const distDir = path.join(REPO, 'libs', 'al-web-components', 'dist', 'components');
const cssFile = path.join(REPO, 'libs', 'al-web-components', 'dist', 'css', 'main.css');
for (const p of [distDir, cssFile]) {
  if (!fs.existsSync(p)) {
    console.error(
      `[contrast-axis] ${path.relative(REPO, p)} missing — run \`pnpm --filter @southleft/al-web-components build\` first.`
    );
    process.exit(1);
  }
}

const failures = [];
const check = (ok, message) => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${message}`);
  if (!ok) failures.push(message);
};

// ---- WCAG relative luminance / contrast ratio ------------------------------
// Replicated from libs/al-web-components/theme-engine/oklch.ts's
// luminance()/contrast() — same formula, not imported (see header comment).
function luminance(hex) {
  const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const r = lin(parseInt(hex.slice(1, 3), 16) / 255);
  const g = lin(parseInt(hex.slice(3, 5), 16) / 255);
  const b = lin(parseInt(hex.slice(5, 7), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrastRatio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
/** `opacity: N` on an element painted over `bg` — plain sRGB alpha compositing. */
function blend(fgRgb, bgRgb, alpha) {
  const c = fgRgb.map((v, i) => alpha * v + (1 - alpha) * bgRgb[i]);
  return `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}
const rgbStringToArray = (s) => {
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  return m[1].split(',').slice(0, 3).map((n) => parseFloat(n));
};
const rgbToHex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

const server = await createServer({
  root: REPO,
  configFile: false,
  logLevel: 'warn',
  server: { port: PORT, strictPort: true },
});
await server.listen();

const browser = await chromium.launch();
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
page.on('console', (m) => m.type() === 'error' && pageErrors.push(m.text()));

console.log('\n[contrast-axis] <al-theme contrast> — opacity remedy + nesting\n');

await page.goto(`http://localhost:${PORT}${PAGE}`, { waitUntil: 'load', timeout: 120_000 });
await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', null, { timeout: 120_000 });

/** Custom property on a probe's `<al-theme>` host (outer, or `${id}-inner`). */
const token = (probe) =>
  page.evaluate(
    (p) =>
      getComputedStyle(document.querySelector(`[data-probe="${p}"]`))
        .getPropertyValue('--al-theme-opacity-disabled')
        .trim(),
    probe
  );

/**
 * Real rendered opacity + text colour of a probe's `<al-field-note>` root,
 * plus the ACTUAL painted background it sits on (that probe's own
 * `data-surface` div, scoped through its own `<al-theme mode>` — not
 * `document.body`, which stays whatever `:root`'s unlayered default is
 * regardless of any individual column's `mode`).
 */
const rendered = (probe) =>
  page.evaluate((p) => {
    const note = document.querySelector(`[data-probe-note="${p}"]`);
    const el = note?.shadowRoot?.querySelector('.al-c-field-note');
    const surface = document.querySelector(`[data-surface="${p}"]`);
    if (!el || !surface) return null;
    const st = getComputedStyle(el);
    return { opacity: st.opacity, color: st.color, bg: getComputedStyle(surface).backgroundColor };
  }, probe);

const PROBES = {
  default: { outer: 'default', note: 'default' },
  more: { outer: 'more', note: 'more' },
  normalExplicit: { outer: 'normal-explicit', note: 'normal-explicit' },
  nestOuter: { outer: 'nest-more', note: null },
  nestInnerBare: { outer: 'nest-more-inner', note: 'nest-more' },
  nestInnerNormal: { outer: 'nest-more-normal-inner', note: 'nest-more-normal' },
  lightDefault: { outer: 'light-default', note: 'light-default' },
  lightMore: { outer: 'light-more', note: 'light-more' },
};

const tokens = {};
const rend = {};
for (const [key, { outer, note }] of Object.entries(PROBES)) {
  tokens[key] = await token(outer);
  if (note) rend[key] = await rendered(note);
}

console.log('  tokens (--al-theme-opacity-disabled):');
for (const [key, val] of Object.entries(tokens)) console.log(`      ${key.padEnd(16)} ${val}`);
console.log('\n  rendered al-field-note (opacity, colour, surface bg):');
for (const [key, val] of Object.entries(rend)) console.log(`      ${key.padEnd(16)} ${JSON.stringify(val)}`);

// ---- 1. more raises the token, on the host AND the real component ---------

console.log('\n  1. more raises --al-theme-opacity-disabled\n');
check(tokens.default !== '' && tokens.more !== '', 'both default and more resolve a value');
check(
  parseFloat(tokens.more) > parseFloat(tokens.default),
  `more (${tokens.more}) > default (${tokens.default})`
);
check(
  parseFloat(rend.default.opacity) === parseFloat(tokens.default),
  `the rendered field note's opacity (${rend.default.opacity}) matches the default token — the axis reaches a real component`
);
check(
  parseFloat(rend.more.opacity) === parseFloat(tokens.more),
  `the rendered field note's opacity (${rend.more.opacity}) matches the more token`
);
check(
  parseFloat(rend.more.opacity) > parseFloat(rend.default.opacity),
  'the RENDERED component is measurably less transparent under more, not just the custom property'
);

// ---- 2. the raised opacity clears WCAG AA text contrast --------------------

console.log('\n  2. WCAG AA text contrast (4.5:1)\n');
/** blend `rend[key]`'s fg/alpha against ITS OWN measured surface bg. */
const ratioFor = (key) => {
  const fgRgb = rgbStringToArray(rend[key].color);
  const bgRgb = rgbStringToArray(rend[key].bg);
  const bg = rgbToHex(bgRgb);
  const alpha = parseFloat(rend[key].opacity);
  const blended = blend(fgRgb, bgRgb, alpha);
  const ratio = contrastRatio(blended, bg);
  console.log(
    `      ${key.padEnd(12)} fg=${rgbToHex(fgRgb)} alpha=${alpha} blended=${blended} vs bg=${bg} -> ${ratio.toFixed(2)}:1`
  );
  return ratio;
};

console.log('  dark mode (:root default):');
const results = { default: ratioFor('default'), more: ratioFor('more') };
check(
  results.default < 4.5,
  `default (0.4 baseline) does NOT clear AA text at ${results.default.toFixed(2)}:1 — WCAG exempts disabled content, but this is the gap 'more' exists to close`
);
check(results.more >= 4.5, `more clears AA text at ${results.more.toFixed(2)}:1`);
check(results.more > results.default, 'more is a strict improvement over default');

console.log('  light mode (the tighter worst-case pairing theme.scss cites):');
const light = { default: ratioFor('lightDefault'), more: ratioFor('lightMore') };
check(
  light.default < 4.5,
  `light-mode default does NOT clear AA text at ${light.default.toFixed(2)}:1 either`
);
check(light.more >= 4.5, `light-mode more clears AA text at ${light.more.toFixed(2)}:1`);

// ---- 3. nesting resets rather than inherits --------------------------------

console.log('\n  3. nesting: an inner theme under contrast="more" resets, not inherits\n');
check(tokens.nestOuter === tokens.more, "the outer ancestor of the nested case still reads 'more' itself");
check(
  tokens.nestInnerBare === tokens.default,
  `a BARE inner <al-theme> (no contrast attribute) resets to the default token (${tokens.default}), not the ancestor's more value (${tokens.more}) — the literal nesting-bug reproduction`
);
check(
  tokens.nestInnerNormal === tokens.default,
  `an inner <al-theme contrast="normal"> resets identically (${tokens.nestInnerNormal})`
);
check(
  parseFloat(rend.nestInnerBare.opacity) === parseFloat(rend.default.opacity),
  'the REAL rendered field note under the bare inner theme matches the default-theme rendering, not the ancestor'
);
check(
  parseFloat(rend.nestInnerNormal.opacity) === parseFloat(rend.default.opacity),
  'same for the explicit contrast="normal" inner theme'
);

if (pageErrors.length) {
  console.error(`\n[contrast-axis] ${pageErrors.length} page error(s):`);
  for (const e of pageErrors.slice(0, 5)) console.error(`    ${e}`);
  failures.push('page errors');
}

await browser.close();
await server.close();

console.log(`\n${failures.length === 0 ? 'ALL CHECKS PASSED' : `${failures.length} CHECK(S) FAILED`}`);
process.exit(failures.length === 0 ? 0 : 1);
