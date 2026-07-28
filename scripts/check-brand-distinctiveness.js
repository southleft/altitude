#!/usr/bin/env node
/**
 * Token-level gate for the brand-identity contract (`.altitude/BRANDS.md`).
 *
 * A brand that only re-points colour tokens is a skin, not a brand. This
 * script asserts, against the built bundles in
 * `libs/al-web-components/styles/dist-v5/css/`, that:
 *
 *   1. `--al-theme-border-radius-xs` is emitted everywhere (R4 — it is
 *      referenced by components/button/button.scss:173).
 *   2. `altitude` is byte-identical to the base theme bundle for its mode
 *      (R12 — altitude is the neutral reference and the default an adopter
 *      renders with no `brand` set).
 *   3. Every pair of brands in a given mode differs on non-colour properties,
 *      on at least MIN_MARKERS of the five marker properties below. A diff
 *      confined to `--al-theme-color-*` means the brand work has not landed.
 *   4. Every expressive brand differs from `altitude` on at least
 *      MIN_AXES of the five non-colour axes.
 *   5. No brand carries a `--al-theme-typography-*` override without the
 *      matching `--al-typography-preset-*` change. That combination is the
 *      inert-override smell: components resolve typography through Sass
 *      mixins to the tier-1 preset property and never read the tier-2 one.
 *
 * Run after `pnpm --filter al-web-components build:tokens`.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..');
const CSS = path.join(REPO, 'libs', 'al-web-components', 'styles', 'dist-v5', 'css');

const NEUTRAL_BRAND = 'altitude';
const MIN_MARKERS = 3;
const MIN_AXES = 3;

const MARKERS = [
  '--al-theme-border-radius',
  '--al-theme-space-xs',
  '--al-theme-space',
  '--al-theme-box-shadow',
  '--al-typography-preset-16',
];

const AXES = {
  typography: (n) => n.startsWith('--al-typography-preset-') || n.startsWith('--al-font-family-'),
  radius: (n) => n.startsWith('--al-theme-border-radius'),
  'border-width': (n) => n.startsWith('--al-theme-border-width'),
  shadow: (n) => n.startsWith('--al-theme-box-shadow') || n.startsWith('--al-box-shadow-'),
  spacing: (n) => /^--al-theme-space(-|$)/.test(n),
};

const failures = [];
const notes = [];

function fail(msg) {
  failures.push(msg);
}

function parse(file) {
  const map = new Map();
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*(--al-[a-z0-9-]+)\s*:\s*(.+?);\s*$/.exec(line);
    if (m) map.set(m[1], m[2]);
  }
  return map;
}

function diffNames(a, b) {
  const out = [];
  for (const [name, value] of a) if (b.get(name) !== value) out.push(name);
  for (const [name] of b) if (!a.has(name)) out.push(name);
  return out;
}

// ---------- discover what was built ----------

if (!fs.existsSync(CSS)) {
  console.error(`[brands] ${path.relative(REPO, CSS)} missing — run \`pnpm --filter al-web-components build:tokens\` first.`);
  process.exit(1);
}

const bundles = new Map(); // "<brand>-<mode>" -> Map
const byMode = new Map(); //  mode -> [brand]
for (const f of fs.readdirSync(path.join(CSS, 'brand'))) {
  const m = /^tokens-(.+)-(light|dark)\.css$/.exec(f);
  if (!m) continue;
  const [, brand, mode] = m;
  bundles.set(`${brand}-${mode}`, parse(path.join(CSS, 'brand', f)));
  if (!byMode.has(mode)) byMode.set(mode, []);
  byMode.get(mode).push(brand);
}
for (const list of byMode.values()) list.sort();

if (bundles.size === 0) fail('no brand bundles found');

// ---------- 1. border-radius-xs everywhere (R4) ----------

for (const [key, tokens] of bundles) {
  if (!tokens.has('--al-theme-border-radius-xs')) fail(`${key}: --al-theme-border-radius-xs missing (R4)`);
}
for (const mode of byMode.keys()) {
  const base = parse(path.join(CSS, 'theme', `tokens-${mode}.css`));
  if (!base.has('--al-theme-border-radius-xs')) fail(`theme/${mode}: --al-theme-border-radius-xs missing (R4)`);
}

// ---------- 2. altitude is the neutral reference (R12) ----------

for (const mode of byMode.keys()) {
  if (!byMode.get(mode).includes(NEUTRAL_BRAND)) continue;
  const a = fs.readFileSync(path.join(CSS, 'brand', `tokens-${NEUTRAL_BRAND}-${mode}.css`), 'utf8');
  const b = fs.readFileSync(path.join(CSS, 'theme', `tokens-${mode}.css`), 'utf8');
  if (a !== b) {
    const drift = diffNames(bundles.get(`${NEUTRAL_BRAND}-${mode}`), parse(path.join(CSS, 'theme', `tokens-${mode}.css`)));
    fail(`${NEUTRAL_BRAND}-${mode} is not byte-identical to the base theme bundle (R12); drifted: ${drift.join(', ') || '(formatting only)'}`);
  } else {
    notes.push(`${NEUTRAL_BRAND}-${mode} === theme/${mode} (neutral reference intact)`);
  }
}

// ---------- 3 + 4. pairwise distinctiveness (R5) ----------

for (const [mode, brands] of byMode) {
  if (brands.length < 2) continue;
  for (let i = 0; i < brands.length; i++) {
    for (let j = i + 1; j < brands.length; j++) {
      const [x, y] = [brands[i], brands[j]];
      const drift = diffNames(bundles.get(`${x}-${mode}`), bundles.get(`${y}-${mode}`));
      const nonColour = drift.filter((n) => !n.includes('color'));
      if (nonColour.length === 0) {
        fail(`${x} vs ${y} (${mode}): differ only on colour properties — this is a skin, not a brand (R5)`);
        continue;
      }
      const hit = MARKERS.filter((m) => drift.includes(m));
      if (hit.length < MIN_MARKERS) {
        fail(`${x} vs ${y} (${mode}): only ${hit.length}/${MARKERS.length} marker properties differ (need ${MIN_MARKERS}) — [${hit.join(', ')}] (R5)`);
      } else {
        notes.push(`${x} vs ${y} (${mode}): ${hit.length}/${MARKERS.length} markers, ${nonColour.length} non-colour properties`);
      }
    }
  }

  if (!brands.includes(NEUTRAL_BRAND)) continue;
  for (const brand of brands) {
    if (brand === NEUTRAL_BRAND) continue;
    const drift = diffNames(bundles.get(`${brand}-${mode}`), bundles.get(`${NEUTRAL_BRAND}-${mode}`));
    const varied = Object.entries(AXES)
      .filter(([, match]) => drift.some(match))
      .map(([axis]) => axis);
    if (varied.length < MIN_AXES) {
      fail(`${brand} (${mode}): varies ${varied.length} non-colour axes vs ${NEUTRAL_BRAND} (need ${MIN_AXES}) — [${varied.join(', ')}] (R5)`);
    } else {
      notes.push(`${brand} (${mode}): varies [${varied.join(', ')}] vs ${NEUTRAL_BRAND}`);
    }
  }
}

// ---------- 5. inert-override smell test (R7) ----------

for (const [mode, brands] of byMode) {
  const base = parse(path.join(CSS, 'theme', `tokens-${mode}.css`));
  for (const brand of brands) {
    const tokens = bundles.get(`${brand}-${mode}`);
    const typographyDrift = diffNames(tokens, base).filter((n) => n.startsWith('--al-theme-typography-'));
    const presetDrift = diffNames(tokens, base).filter((n) => n.startsWith('--al-typography-preset-'));
    if (typographyDrift.length > 0 && presetDrift.length === 0) {
      fail(
        `${brand}-${mode}: overrides ${typographyDrift.length} --al-theme-typography-* propert(ies) with no --al-typography-preset-* change. ` +
          `Components never read --al-theme-typography-* (see .altitude/BRANDS.md section 2) — this override is inert (R7).`
      );
    }
  }
}

// ---------- report ----------

for (const n of notes) console.log(`  · ${n}`);
if (failures.length) {
  console.error(`\n[brands] FAIL — ${failures.length} problem(s):`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`\n[brands] PASS — ${bundles.size} brand bundle(s) checked; every pair reads as a distinct brand.`);
