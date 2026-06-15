#!/usr/bin/env node
/**
 * T4.1 — Cascade-layer + specificity lint.
 *
 * For every component stylesheet under `libs/al-web-components/components/`:
 *   1. Reports an error if no `@layer al.component` declaration is present
 *      (waived until T4.8 migrates the component to `scoped-complete`).
 *   2. Reports an error if a selector exceeds the `0,3,0` specificity budget
 *      (waived for any selector in
 *      `.altitude/css-specificity-allowlist.json`).
 *
 * Today the gate is **advisory** for components in `migration.json` state
 * `legacy` — they print as `[skip]`. As each component flips to
 * `scoped-complete`, its file MUST satisfy both rules.
 *
 * Run: `node scripts/check-css-layers.js [--strict]`
 *   --strict: enforce on every component regardless of migration state.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..');
const COMPONENTS = path.join(REPO, 'libs/al-web-components/components');
const MIGRATION = path.join(REPO, '.altitude/migration.json');
const ALLOWLIST = path.join(REPO, '.altitude/css-specificity-allowlist.json');

const STRICT = process.argv.includes('--strict');

function parseSelectors(scss) {
  // Strip block comments + line comments to avoid false positives.
  const stripped = scss
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  // Match "selector list" followed by `{` (top-level rules). Keep simple —
  // the goal is to catch the `,3,0` budget violators, not to be a full parser.
  const out = [];
  const re = /([^{}@;\n][^{}@;]*?)\s*\{/g;
  let m;
  while ((m = re.exec(stripped))) {
    const raw = m[1].trim();
    if (!raw || raw.startsWith('@')) continue;
    for (const sel of raw.split(',')) out.push(sel.trim());
  }
  return out;
}

function specificity(sel) {
  // Heuristic: count IDs, classes/attrs/pseudo-classes, type selectors.
  let ids = 0, classes = 0, types = 0;
  const cleaned = sel
    .replace(/::[a-z-]+/g, '') // pseudo-elements (don't count toward our budget pivot)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ');
  ids += (cleaned.match(/#[A-Za-z_][\w-]*/g) || []).length;
  classes += (cleaned.match(/\.[A-Za-z_][\w-]*/g) || []).length;
  classes += (cleaned.match(/\[[^\]]+\]/g) || []).length;
  classes += (cleaned.match(/:[A-Za-z][\w-]*(?:\([^)]*\))?/g) || []).length;
  const tokens = cleaned
    .replace(/[#.][\w-]+|\[[^\]]+\]|:[A-Za-z][\w-]*(?:\([^)]*\))?/g, '')
    .split(/\s+|>|\+|~/)
    .filter((t) => t && /^[A-Za-z][\w-]*$/.test(t));
  types += tokens.length;
  return [ids, classes, types];
}

function loadAllowlist() {
  try {
    return new Set(JSON.parse(fs.readFileSync(ALLOWLIST, 'utf8')).selectors || []);
  } catch {
    return new Set();
  }
}

function main() {
  const migration = JSON.parse(fs.readFileSync(MIGRATION, 'utf8'));
  const allow = loadAllowlist();
  let errors = 0;
  let skipped = 0;
  let ok = 0;
  const componentDirs = fs.readdirSync(COMPONENTS).filter((n) =>
    fs.statSync(path.join(COMPONENTS, n)).isDirectory() && !n.startsWith('.')
  ).sort();

  for (const name of componentDirs) {
    const scss = path.join(COMPONENTS, name, `${name}.scss`);
    if (!fs.existsSync(scss)) continue;
    const state = migration.components?.[name]?.state || 'legacy';
    const strict = STRICT || state !== 'legacy';
    const text = fs.readFileSync(scss, 'utf8');

    // `al.theme` is accepted for theme-host components; everything else
    // must use `al.component`. The plan's "exactly one @layer al.component"
    // wording is for component stylesheets; theme hosts are part of the
    // theme layer.
    const hasComponentLayer = /@layer\s+al\.component\b/.test(text);
    const hasThemeLayer = /@layer\s+al\.theme\b/.test(text);
    const localErrors = [];
    if (!hasComponentLayer && !hasThemeLayer) {
      localErrors.push('missing `@layer al.component { … }` wrapper');
    }

    for (const sel of parseSelectors(text)) {
      if (allow.has(sel)) continue;
      const [i, c, t] = specificity(sel);
      // Budget: 0,3,0. Anything with IDs or > 3 classes/types-combined fails.
      const overC = i > 0 || c > 3 || (c + t) > 3;
      if (overC) localErrors.push(`selector exceeds 0,3,0 budget (specificity ${i},${c},${t}): '${sel}'`);
    }

    if (localErrors.length === 0) {
      ok++;
      continue;
    }
    if (!strict) {
      skipped++;
      continue;
    }
    errors += localErrors.length;
    console.error(`[css-layers] FAIL — ${name}.scss:`);
    for (const e of localErrors.slice(0, 5)) console.error(`    ${e}`);
    if (localErrors.length > 5) console.error(`    …and ${localErrors.length - 5} more`);
  }

  if (errors === 0) {
    console.log(`[css-layers] ${STRICT ? 'STRICT ' : ''}PASS — ${ok} component(s) compliant; ${skipped} legacy waiver(s).`);
    process.exit(0);
  }
  console.error(`[css-layers] FAIL — ${errors} violation(s) across ${componentDirs.length} components.`);
  process.exit(1);
}

main();
