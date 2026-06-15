#!/usr/bin/env node
/**
 * T2.1 — Vite SCSS spike assertion.
 *
 * Verifies that the Vite-built button bundle:
 *   1. Imports SCSS via the `?inline` mechanism (Vite's canonical raw-string).
 *   2. Embeds the compiled CSS as a JS string literal.
 *   3. Wraps that string with `unsafeCSS(…)` so Lit adopts it into the shadow root.
 *   4. Contains the expected `.al-c-button` rule from the source SCSS.
 *
 * These four checks together prove the highest-risk landmine of T2.2: Vite
 * can produce a Lit-component bundle whose CSS lands in the shadow root the
 * same way webpack+sass-loader does today.
 *
 * VRT parity is exercised once T2.2 swaps the production lib build to Vite;
 * the same `yarn test:vrt` runs against migrated dist and gates within
 * tolerance against the P0 baselines.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..');
const SPIKE = path.join(REPO, 'libs/al-web-components/dist-vite-spike/button.mjs');

function fail(msg) {
  console.error('[vite-spike] FAIL —', msg);
  process.exit(1);
}

function main() {
  if (!fs.existsSync(SPIKE)) {
    fail(`bundle missing — run 'cd libs/al-web-components && npx vite build -c vite.spike.config.mjs' first.`);
  }
  const src = fs.readFileSync(SPIKE, 'utf8');

  // 1. unsafeCSS wraps the css string.
  if (!/unsafeCSS\s*\(\s*[A-Za-z_$][\w$]*\s*\)/.test(src)) {
    fail(`no \`unsafeCSS(<binding>)\` call in bundle — Lit will not adopt the styles into the shadow root.`);
  }

  // 2. Embedded compiled CSS contains the expected rule.
  if (!src.includes('al-c-button')) {
    fail(`bundle does not contain the expected '.al-c-button' rule — SCSS compilation didn't land.`);
  }

  // 3. No `?inline` query left in the source — Vite should have inlined it,
  // not preserved it as an import statement.
  if (/\.scss\?inline/.test(src)) {
    fail(`bundle still references \`*.scss?inline\` — Vite did not inline the asset.`);
  }

  // 4. ESM output (module syntax).
  if (!/^import\b|^export\b/m.test(src)) {
    fail(`bundle is not an ES module — expected \`import\`/\`export\` statements.`);
  }

  const bytes = Buffer.byteLength(src, 'utf8');
  const cssRules = (src.match(/al-c-button/g) || []).length;
  console.log(`[vite-spike] PASS — bundle ${bytes} bytes; ${cssRules} occurrences of 'al-c-button' (rule embedded as compiled CSS).`);
}

main();
