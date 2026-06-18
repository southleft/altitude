#!/usr/bin/env node
// Build the AI-readiness tokens digest from libs/al-web-components/styles/dist/tokens.json.
//
// The digest groups every --al-* token by family and emits a `conventions`
// block documenting the suffix scheme. Pointed at /tmp by the fleet probe so
// agents can verify token names without source-tree exploration.
//
// Usage:  node scripts/ai-readiness/build-tokens-digest.js
// Writes: /tmp/ai-readiness-tokens-digest.json
//         .altitude/ai-readiness/tokens-digest.json (durable copy)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const TOKENS_PATH = resolve(ROOT, 'libs/al-web-components/styles/dist/tokens.json');
const TMP_OUT = '/tmp/ai-readiness-tokens-digest.json';
const REPO_OUT = resolve(ROOT, '.altitude/ai-readiness/tokens-digest.json');

const t = JSON.parse(readFileSync(TOKENS_PATH, 'utf8'));
const keys = Object.keys(t).sort();
const groups = {};
for (const k of keys) {
  const fam = k.replace(/^al-/, '').split('-').slice(0, 3).join('-');
  (groups[fam] = groups[fam] || []).push({ name: '--' + k, value: t[k] });
}

const digest = {
  source: 'libs/al-web-components/styles/dist/tokens.json',
  total: keys.length,
  conventions: {
    cssVariablePrefix: '--al-',
    contentColorSuffixes: ['-default', '-weak', '-weaker', '-strong', '-stronger', '-strongest'],
    fontSizeNamingScheme: 'numeric — --al-font-size-10..36 (NOT t-shirt sizes like -sm/-md/-lg/-2xl)',
    themeTokensPrefix: '--al-theme-* (single-layer of indirection over the al-color-* / al-font-size-* primitives)',
    primitiveTokensPrefix: '--al-color-*, --al-font-size-*, --al-space-*, --al-border-*, --al-shadow-*, --al-animation-*',
  },
  groups,
};

const payload = JSON.stringify(digest, null, 2);
writeFileSync(TMP_OUT, payload);
mkdirSync(dirname(REPO_OUT), { recursive: true });
writeFileSync(REPO_OUT, payload);

console.log(`Wrote ${keys.length} tokens across ${Object.keys(groups).length} families`);
console.log(`  ${TMP_OUT}`);
console.log(`  ${REPO_OUT}`);
