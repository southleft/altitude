#!/usr/bin/env node
/**
 * T4.8 / T6.1 — Component codemod to `scoped-complete`.
 *
 * For each named component:
 *   1. Wraps every top-level CSS rule in the component's `.scss` file in
 *      `@layer al.component { ... }` (idempotent — re-running is a no-op).
 *   2. Sets `migration.json[name] = { state: 'scoped-complete', … }`.
 *   3. Compares the codemod output to a golden snapshot at
 *      `.altitude/golden-snapshots/<name>.scss.expected`. If a snapshot
 *      doesn't exist yet, writes it (first-run seed).
 *
 * Usage:
 *   node scripts/codemod-scoped.js <component-name> [<component-name> …]
 *   node scripts/codemod-scoped.js --all-pilots
 *   node scripts/codemod-scoped.js --dry-run <component-name>
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..');
const COMPONENTS = path.join(REPO, 'libs/al-web-components/components');
const MIGRATION = path.join(REPO, '.altitude/migration.json');
const GOLDEN_DIR = path.join(REPO, '.altitude/golden-snapshots');

const PILOTS = ['button', 'input', 'select', 'dialog', 'theme-switcher', 'theme'];
const DRY_RUN = process.argv.includes('--dry-run');
const ALL_PILOTS = process.argv.includes('--all-pilots');
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));

function wrapInLayer(scss) {
  // Idempotent: if any `@layer al.*` declaration already exists, no-op
  // (the theme host, for example, uses `al.theme`, not `al.component`).
  if (/@layer\s+al\.(component|theme|reset|base|override)\b/.test(scss)) return scss;
  // Walk lines, tracking multi-line-comment state, and find the index of
  // the first line that is actual CSS — not blank, not an `@import`, not
  // inside or at the start of a block comment.
  const lines = scss.split('\n');
  let inBlockComment = false;
  let headerEnd = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const stripped = line.trim();
    if (inBlockComment) {
      if (line.includes('*/')) inBlockComment = false;
      continue;
    }
    // Block comment opens on this line (may also close).
    if (stripped.startsWith('/*')) {
      if (!stripped.includes('*/') || stripped.lastIndexOf('/*') > stripped.lastIndexOf('*/')) {
        inBlockComment = true;
      }
      continue;
    }
    if (stripped === '') continue;
    if (stripped.startsWith('//')) continue;
    if (stripped.startsWith('@import')) continue;
    if (stripped.startsWith('@use')) continue;
    if (stripped.startsWith('@forward')) continue;
    // First actual CSS line.
    headerEnd = i;
    break;
  }
  const header = lines.slice(0, headerEnd).join('\n').replace(/\s+$/, '');
  const body = lines.slice(headerEnd).join('\n').trimEnd();
  if (!body) return scss;
  return `${header}\n\n@layer al.component {\n${indent(body)}\n}\n`;
}

function indent(text) {
  return text.split('\n').map((l) => (l ? `  ${l}` : '')).join('\n');
}

function applyCodemod(name) {
  const dir = path.join(COMPONENTS, name);
  const scss = path.join(dir, `${name}.scss`);
  if (!fs.existsSync(scss)) {
    console.warn(`[codemod] skip — ${name}.scss missing`);
    return { changed: false, name };
  }
  const before = fs.readFileSync(scss, 'utf8');
  const after = wrapInLayer(before);

  // Golden snapshot check.
  const golden = path.join(GOLDEN_DIR, `${name}.scss.expected`);
  if (!DRY_RUN) {
    fs.mkdirSync(GOLDEN_DIR, { recursive: true });
    if (fs.existsSync(golden)) {
      const expected = fs.readFileSync(golden, 'utf8');
      if (expected !== after) {
        console.error(`[codemod] FAIL — ${name}.scss output differs from golden snapshot.`);
        console.error(`         Update the snapshot if intentional: ${path.relative(REPO, golden)}`);
        process.exit(1);
      }
    } else {
      fs.writeFileSync(golden, after);
      console.log(`[codemod] seeded golden snapshot for ${name}`);
    }
  }

  if (before === after) {
    console.log(`[codemod] ${name} already at scoped-complete (no change)`);
    return { changed: false, name };
  }

  if (DRY_RUN) {
    console.log(`[codemod] ${name} — would rewrite ${scss.replace(REPO, '')}`);
    return { changed: true, name, dryRun: true };
  }

  fs.writeFileSync(scss, after);
  console.log(`[codemod] ${name} — wrapped in @layer al.component`);
  return { changed: true, name };
}

function flipMigration(names) {
  const data = JSON.parse(fs.readFileSync(MIGRATION, 'utf8'));
  for (const name of names) {
    if (!data.components[name]) {
      console.warn(`[codemod] migration entry missing for ${name}; creating`);
      data.components[name] = { state: 'scoped-complete', react19: true, headless: false, ssr: false };
      continue;
    }
    data.components[name] = {
      ...data.components[name],
      state: 'scoped-complete',
      react19: true,
    };
  }
  if (!DRY_RUN) {
    fs.writeFileSync(MIGRATION, JSON.stringify(data, null, 2) + '\n');
    console.log(`[codemod] flipped migration.json for ${names.length} component(s) → scoped-complete`);
  } else {
    console.log(`[codemod] would flip migration.json for ${names.length} component(s)`);
  }
}

function main() {
  const targets = ALL_PILOTS ? PILOTS : args;
  if (!targets.length) {
    console.error('[codemod] usage: codemod-scoped.js <name>+ | --all-pilots [--dry-run]');
    process.exit(2);
  }
  const results = targets.map(applyCodemod);
  flipMigration(targets);
  const changed = results.filter((r) => r.changed).length;
  console.log(`[codemod] done — ${changed}/${targets.length} component(s) rewritten.`);
}

main();
