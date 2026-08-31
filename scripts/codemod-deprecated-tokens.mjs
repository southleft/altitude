#!/usr/bin/env node
/**
 * codemod-deprecated-tokens.mjs — R8's real test: is the lifecycle metadata
 * good enough to DRIVE a codemod, not just annotate a token.
 *
 * Reads `com.atlassian.token` off every leaf in
 * `libs/al-web-components/styles/tokens-dtcg/**.json` (written by
 * scripts/generate-token-metadata.mjs), builds the deprecated-name ->
 * replacement-name map for every `state: "deprecated"` entry, and scans the
 * same source roots `scripts/check-token-usage.mjs` scans for real
 * `var(--al-<deprecated-name>)` call sites.
 *
 * Two migration shapes, and this script keeps them separate on purpose:
 *   - SAME-PROPERTY (`sameProperty: true` in the source lifecycle entry) —
 *     the fix is a mechanical var() name swap on the same CSS property.
 *     `--write` performs it as a literal string replacement.
 *   - CROSS-PROPERTY (`sameProperty: false`) — the fix changes WHAT KIND of
 *     declaration is needed (e.g. a colour token superseded by an opacity
 *     token), which is not a text substitution. These are always reported,
 *     never rewritten, regardless of --write.
 *
 * Usage:
 *   node scripts/codemod-deprecated-tokens.mjs             # dry run, report only
 *   node scripts/codemod-deprecated-tokens.mjs --write      # apply same-property rewrites
 *   node scripts/codemod-deprecated-tokens.mjs --fixture <dir>  # scan/rewrite under <dir> instead
 *                                                                 of the real source roots (used by
 *                                                                 the synthetic before/after proof)
 */
'use strict';

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TOKENS_DIR = join(REPO, 'libs/al-web-components/styles/tokens-dtcg');
const WRITE = process.argv.includes('--write');
const fixtureIdx = process.argv.indexOf('--fixture');
const FIXTURE_DIR = fixtureIdx !== -1 ? resolve(process.argv[fixtureIdx + 1]) : null;

const SOURCE_ROOTS = FIXTURE_DIR
  ? [FIXTURE_DIR]
  : [
      'libs/al-web-components/components',
      'libs/al-web-components/styles',
      'libs/al-web-components/directives',
      'libs/al-web-components/controllers',
      'libs/al-web-components/motion',
      'libs/al-react/src',
      'libs/sl-web-components',
      'apps',
    ].map((r) => join(REPO, r));
const SOURCE_EXTS = new Set(['.scss', '.css', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.astro', '.svelte', '.html', '.vue']);
const SKIP_DIRS = new Set(['node_modules', 'dist', 'dist-vite', 'dist-v5', 'storybook-static', '.astro', '.angular', '.svelte-kit', 'build', 'tokens-dtcg']);

function isTokenLeaf(node) {
  return node !== null && typeof node === 'object' && '$value' in node;
}
function walkJsonFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith('$')) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walkJsonFiles(p));
    else if (name.endsWith('.json')) out.push(p);
  }
  return out;
}
function collectDeprecations(node, segs, out) {
  if (Array.isArray(node) || node === null || typeof node !== 'object') return out;
  if (isTokenLeaf(node)) {
    const atlassian = node.$extensions?.['com.atlassian.token'];
    if (atlassian?.state === 'deprecated' && atlassian.replacement) {
      out.push({ path: segs.join('.'), replacement: atlassian.replacement, reason: atlassian.reason });
    }
    return out;
  }
  for (const [k, v] of Object.entries(node)) collectDeprecations(v, [...segs, k], out);
  return out;
}

/** dot-path -> `--al-*` custom-property name, matching the v5 pipeline's `name/kebab` transform. */
function toVarName(dotPath) {
  return `--al-${dotPath.replace(/\./g, '-').replace(/@/g, '')}`.replace(/--al--/, '--al-');
}

function* walkSourceFiles(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name.startsWith('.') && e.name !== '.storybook') continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      yield* walkSourceFiles(full);
    } else if (SOURCE_EXTS.has(extname(e.name))) {
      yield full;
    }
  }
}

async function main() {
  const deprecations = [];
  for (const f of walkJsonFiles(TOKENS_DIR)) collectDeprecations(JSON.parse(readFileSync(f, 'utf8')), [], deprecations);

  // De-dupe by path (the same dot-path can be deprecated identically in
  // both light/dark mode files — one deprecated NAME either way).
  const byName = new Map();
  for (const d of deprecations) {
    const name = toVarName(d.path);
    if (!byName.has(name)) byName.set(name, { ...d, varName: name, replacementVarName: toVarName(d.replacement) });
  }

  // Real sameProperty flag comes from the KNOWN_LIFECYCLE table (source of
  // truth for the migration SHAPE); re-derive it here rather than trusting
  // free text, by importing the same rules module.
  const { KNOWN_LIFECYCLE } = await import('./lib/token-metadata-rules.mjs');
  const sameProperty = new Map(KNOWN_LIFECYCLE.map((e) => [toVarName(e.path), e.sameProperty]));

  console.log(`[codemod:deprecated-tokens] ${byName.size} deprecated token name(s) with a replacement:`);
  for (const [name, d] of byName) {
    console.log(`  ${name} -> ${d.replacementVarName}  (${sameProperty.get(name) ? 'same-property, auto-rewritable' : 'cross-property, MANUAL migration only'})`);
  }
  console.log('');

  let filesScanned = 0;
  let totalHits = 0;
  let filesRewritten = 0;
  for (const root of SOURCE_ROOTS) {
    if (!existsSync(root)) continue;
    for (const file of walkSourceFiles(root)) {
      filesScanned++;
      const text = readFileSync(file, 'utf8');
      if (!text.includes('--al-')) continue;
      let rewritten = text;
      let fileHits = 0;
      for (const [name, d] of byName) {
        const re = new RegExp(`var\\(\\s*${name}\\b`, 'g');
        const matches = [...text.matchAll(re)];
        if (matches.length === 0) continue;
        fileHits += matches.length;
        totalHits += matches.length;
        console.log(`  FOUND ${matches.length}x ${name} in ${relative(REPO, file)}`);
        if (sameProperty.get(name)) {
          rewritten = rewritten.replace(new RegExp(`var\\(\\s*${name}\\b`, 'g'), `var(${d.replacementVarName}`);
        } else {
          console.log(`    -> cross-property replacement (${d.replacementVarName}); NOT auto-rewritten. ${d.reason ?? ''}`);
        }
      }
      if (WRITE && fileHits > 0 && rewritten !== text) {
        writeFileSync(file, rewritten);
        filesRewritten++;
        console.log(`    WROTE ${relative(REPO, file)}`);
      }
    }
  }

  console.log(`\n[codemod:deprecated-tokens] scanned ${filesScanned} source file(s), ${totalHits} deprecated-token call site(s) found${WRITE ? `, ${filesRewritten} file(s) rewritten` : ' (dry run — pass --write to rewrite same-property call sites)'}.`);
}

main().catch((err) => {
  console.error('[codemod:deprecated-tokens] FAIL:', err);
  process.exit(2);
});
