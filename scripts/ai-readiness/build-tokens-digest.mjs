#!/usr/bin/env node
// Build the AI-readiness tokens digest from libs/al-web-components/styles/dist/tokens.json.
//
// The digest groups every --al-* token by family and emits a `conventions`
// block documenting the suffix scheme. Pointed at the OS tmp dir by the
// fleet probe so agents can verify token names without source-tree
// exploration.
//
// Usage:  node scripts/ai-readiness/build-tokens-digest.js
// Writes: <os.tmpdir()>/ai-readiness-tokens-digest.json (see lib.mjs TMPDIR —
//           NOT a literal /tmp; that resolves to a different directory than
//           os.tmpdir() on Windows)
//         .altitude/ai-readiness/tokens-digest.json (durable copy)

import { EOL } from 'node:os';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TMPDIR } from './lib.mjs';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const TOKENS_PATH = resolve(ROOT, 'libs/al-web-components/styles/dist/tokens.json');
const TMP_OUT = resolve(TMPDIR, 'ai-readiness-tokens-digest.json');
const REPO_OUT = resolve(ROOT, '.altitude/ai-readiness/tokens-digest.json');

const t = JSON.parse(readFileSync(TOKENS_PATH, 'utf8'));
const keys = Object.keys(t).sort();
const groups = {};
for (const k of keys) {
  const fam = k.replace(/^al-/, '').split('-').slice(0, 3).join('-');
  (groups[fam] = groups[fam] || []).push({ name: '--' + k, value: t[k] });
}

// Build the role-suffix matrix for content/background/border color families
// from the actual tokens. Role-suffix combinations that don't exist are
// hallucination targets — the matrix below is the authoritative list, derived
// from the live tokens.json.
function roleMatrix(prefix) {
  const m = {};
  for (const k of keys) {
    if (!k.startsWith(prefix)) continue;
    const tail = k.slice(prefix.length);
    const parts = tail.split('-');
    const role = parts[0];
    const suffix = parts.slice(1).join('-') || '(none)';
    (m[role] = m[role] || new Set()).add(suffix);
  }
  const out = {};
  for (const [role, set] of Object.entries(m)) out[role] = [...set].sort();
  return out;
}

/** Every numeric/named stop under a prefix, in the order tokens.json ships them. */
function stopsUnder(prefix) {
  return keys.filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length));
}

/** Sort numeric stops numerically, everything else alphabetically. */
function sortStops(stops) {
  const numeric = stops.every((s) => /^\d+$/.test(s));
  return numeric ? [...stops].sort((a, b) => Number(a) - Number(b)) : [...stops].sort();
}

// --- conventions, DERIVED (2026-09-02) -------------------------------------
// Every claim below used to be hand-written prose, and every one of them went
// stale the moment the token tree moved: the digest asserted font sizes ran
// 10..36 (they run to 112), that only `regular`/`bold` weights exist (medium
// and semibold ship), and listed `--al-font-weight-{semibold,medium}` plus
// `--al-theme-border-radius-pill` as names that "do not exist" — all three DO.
// The MCP serves this file, so those were three confident lies told to agents.
// Anything stated here is now computed from tokens.json, the same way the
// role x suffix matrix below already was.

const fontSizeStops = sortStops(stopsUnder('al-font-size-'));
const fontWeightNames = sortStops(stopsUnder('al-font-weight-'));

/** Weight words a model is likely to reach for; only the ABSENT ones are warned about. */
const COMMON_WEIGHT_WORDS = ['thin', 'extralight', 'light', 'regular', 'medium', 'semibold', 'bold', 'extrabold', 'heavy', 'black'];
const absentWeights = COMMON_WEIGHT_WORDS.filter((w) => !fontWeightNames.includes(w));

/** Top-level primitive prefixes actually present (everything that is not --al-theme-*). */
const primitivePrefixes = [
  ...new Set(keys.filter((k) => !k.startsWith('al-theme-')).map((k) => k.split('-').slice(0, 2).join('-'))),
]
  .sort()
  .map((p) => `--${p}-*`);

/**
 * Hand-maintained "do not invent" list, FILTERED against the live token set.
 *
 * A name that actually exists can never survive this filter — that is the whole
 * point. Entries may be a bare name, a `-*` wildcard, or a name followed by a
 * parenthetical explanation; only the leading `--al-...` token is matched on.
 */
const CANDIDATE_NON_EXISTENT = [
  '--al-theme-focus-ring-*',
  '--al-theme-transition-duration-* (use --al-animation-duration-*)',
  '--al-theme-color-content-neutral-bold',
  '--al-theme-color-content-default-weaker',
  // REMOVED 2026-09-02: `--al-font-weight-{semibold,medium}` and
  // `--al-theme-border-radius-pill` all SHIP today. They sat here asserting the
  // opposite, and the MCP served that. The filter below is the standing guard —
  // it would have dropped them anyway, loudly — but they are pruned at source
  // so a clean run stays quiet and the warning only ever means NEW drift.
];

const existsNow = [];
const notExistDoNotInvent = CANDIDATE_NON_EXISTENT.filter((entry) => {
  const name = entry.match(/^--[a-z0-9-]+\*?/)?.[0] ?? entry;
  const bare = name.replace(/^--/, '');
  const exists = bare.endsWith('*')
    ? keys.some((k) => k.startsWith(bare.slice(0, -1)))
    : keys.includes(bare);
  if (exists) existsNow.push(name);
  return !exists;
});

const digest = {
  source: 'libs/al-web-components/styles/dist/tokens.json',
  total: keys.length,
  conventions: {
    cssVariablePrefix: '--al-',
    fontSizeNamingScheme:
      `numeric — --al-font-size-{${fontSizeStops.join(',')}} ` +
      `(${fontSizeStops.length} stops; NOT t-shirt sizes like -sm/-md/-lg/-2xl)`,
    fontSizeStops,
    fontWeights:
      `--al-font-weight-{${fontWeightNames.join(',')}} ONLY` +
      (absentWeights.length ? ` (no ${absentWeights.map((w) => `-${w}`).join(', ')})` : ''),
    fontWeightNames,
    themeTokensPrefix:
      '--al-theme-* (single layer of indirection over the --al-color-* / --al-font-size-* primitives)',
    primitiveTokensPrefix: primitivePrefixes.join(', '),
    contentColorSuffixesByRole: roleMatrix('al-theme-color-content-'),
    backgroundColorSuffixesByRole: roleMatrix('al-theme-color-background-'),
    borderColorSuffixesByRole: roleMatrix('al-theme-color-border-'),
    notExistDoNotInvent,
  },
  groups,
};

const payload = JSON.stringify(digest, null, 2);
writeFileSync(TMP_OUT, payload);
mkdirSync(dirname(REPO_OUT), { recursive: true });
writeFileSync(REPO_OUT, payload);

if (existsNow.length) {
  // Loud, not silent: an entry dropped from notExistDoNotInvent means the
  // hand-maintained list has drifted behind the token tree and should be
  // pruned at source.
  const bullets = existsNow.map((n) => `  ${n}`).join(EOL);
  console.warn(
    `[tokens-digest] dropped ${existsNow.length} stale "does not exist" claim(s) — ` +
      `these token(s) DO exist now:${EOL}${bullets}`
  );
}

console.log(`Wrote ${keys.length} tokens across ${Object.keys(groups).length} families`);
console.log(`  ${TMP_OUT}`);
console.log(`  ${REPO_OUT}`);
