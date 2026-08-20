#!/usr/bin/env node
/**
 * check-figma-drift.mjs — deterministic Figma↔code token drift check (stub).
 *
 * Usage:
 *   node scripts/check-figma-drift.mjs <figma-export.json>
 *
 * <figma-export.json> is a DTCG export produced by Figma Console MCP's
 * `figma_export_tokens` (save it to .altitude/figma-sync/last-export.json —
 * gitignored; never commit exports).
 *
 * Loop + fidelity rules: .altitude/FIGMA-SYNC.md
 *
 * Current capability (v0 — name-level drift):
 *   - flattens the Figma DTCG export and the local Tokens Studio source
 *     (libs/al-web-components/styles/tokens) to dotted token paths
 *   - reports paths present on only one side
 *   - exits 1 when drift is found, 0 when clean
 *
 * Deliberately NOT here yet (see FIGMA-SYNC.md "What is deliberately missing"):
 *   - value comparison (needs the unit-conversion table so raw Figma values
 *     compare against pre-conversion source values, never built output)
 *   - stable per-token identity across renames
 *   - collection/mode-aware matching for brand + light/dark modes
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TOKENS_DIR = join(ROOT, 'libs/al-web-components/styles/tokens');

/** Paths that exist code-side only — excluded from drift by policy (FIGMA-SYNC.md rule 3). */
const CODE_ONLY_PREFIXES = ['z-index', 'breakpoints', 'icons'];

const exportPath = process.argv[2];
if (!exportPath) {
  console.error('Usage: node scripts/check-figma-drift.mjs <figma-export.json>');
  process.exit(2);
}

/** Flatten a token tree ({group:{token:{value|$value}}}) to dotted paths. */
function flatten(node, prefix = '', out = new Set()) {
  if (node === null || typeof node !== 'object') return out;
  const isToken = 'value' in node || '$value' in node;
  if (isToken && prefix) {
    out.add(prefix);
    return out;
  }
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$')) continue; // $metadata / $type / $extensions etc.
    flatten(child, prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
}

function* jsonFiles(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('$')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* jsonFiles(full);
    else if (entry.endsWith('.json')) yield full;
  }
}

const local = new Set();
for (const file of jsonFiles(TOKENS_DIR)) {
  flatten(JSON.parse(readFileSync(file, 'utf8')), '', local);
}

const figma = flatten(JSON.parse(readFileSync(exportPath, 'utf8')));

const isCodeOnly = (p) => CODE_ONLY_PREFIXES.some((pre) => p === pre || p.startsWith(`${pre}.`));
const onlyLocal = [...local].filter((p) => !figma.has(p) && !isCodeOnly(p)).sort();
const onlyFigma = [...figma].filter((p) => !local.has(p)).sort();

console.log(`Local token paths:  ${local.size} (excluding ${CODE_ONLY_PREFIXES.length} code-only groups)`);
console.log(`Figma token paths:  ${figma.size}`);
console.log('');

if (onlyLocal.length === 0 && onlyFigma.length === 0) {
  console.log('✔ No name-level drift.');
  process.exit(0);
}

if (onlyLocal.length) {
  console.log(`In code but not Figma (${onlyLocal.length}):`);
  for (const p of onlyLocal) console.log(`  - ${p}`);
}
if (onlyFigma.length) {
  console.log(`In Figma but not code (${onlyFigma.length}):`);
  for (const p of onlyFigma) console.log(`  + ${p}`);
}
console.log('\nReconcile per .altitude/FIGMA-SYNC.md, then re-run.');
process.exit(1);
