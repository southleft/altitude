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
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TMPDIR } from './lib.mjs';
import { authoredType, dtcgType, isTokenLeaf } from '../lib/dtcg-token.mjs';
import { describeToken, findCollapsedLadders, inkPair, contrastRatio, parseTokenName } from '../lib/token-describe.mjs';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const TOKENS_PATH = resolve(ROOT, 'libs/al-web-components/styles/dist/tokens.json');
const DTCG_DIR = resolve(ROOT, 'libs/al-web-components/styles/tokens-dtcg');
const BRAND_CSS_DIR = resolve(ROOT, 'libs/al-web-components/styles/dist-v5/css/brand');
const TMP_OUT = resolve(TMPDIR, 'ai-readiness-tokens-digest.json');
const REPO_OUT = resolve(ROOT, '.altitude/ai-readiness/tokens-digest.json');

/** The brand every `description` sentence quotes values from (the base identity). */
const DESCRIPTION_BRAND = 'altitude';
const BUILD_TOKENS_HINT = 'pnpm --filter @southleft/al-web-components build:tokens';

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

// --- per-token DESCRIPTIONS + the emphasis-ladder map (2026-09-03) ---------
//
// WHY HERE, AND NOT IN THE TOKEN SOURCE. Not one of the tokens in
// styles/tokens-dtcg/** carries a DTCG `$description`, and the answer is NOT to
// hand-write 607 of them: prose about a value goes stale the moment the value
// moves, which is the exact failure the `conventions` block above was rewritten
// to stop. So each description is COMPUTED, here, at build time, by
// scripts/lib/token-describe.mjs — from the token's name, its authored
// `cssType`, its tier, and its value RESOLVED PER MODE. The token tree is not
// written to at all.
//
// The resolved-per-mode part is what makes the descriptions worth reading, and
// it needs the EMITTED bundles rather than tokens.json: `styles/dist/tokens.json`
// is one build (altitude brand, light mode), so it cannot say what a token
// becomes in dark, and it cannot say that `background.neutral-{weak,strong}` are
// the same colour in light and different in dark. `styles/dist-v5/css/brand/
// tokens-<brand>-<mode>.css` is a full flat `:root` block per (brand, mode) —
// measured truth, the same artifact scripts/check-palette-contrast.mjs gates on.
//
// dist-v5/ is gitignored, so a checkout that has not run `build:tokens` has none
// of it. That degrades to a NAMED miss (`palette.available: false` with the
// command that fixes it) and descriptions are simply absent — never guessed, and
// never silently skipped.

/** Every `--al-*` declaration in one emitted bundle, with `var()` chains dereferenced. */
function readBrandScope(file) {
  const css = readFileSync(file, 'utf8');
  const vars = {};
  for (const m of css.matchAll(/(--al-[a-z0-9-]+)\s*:\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
  const deref = (v, depth = 0) => {
    if (depth > 16) return v;
    const m = /^var\(\s*(--al-[a-z0-9-]+)\s*\)$/.exec(String(v).trim());
    return m && vars[m[1]] !== undefined ? deref(vars[m[1]], depth + 1) : String(v).trim();
  };
  const out = {};
  for (const name of Object.keys(vars)) out[name.slice(2)] = deref(vars[name]);
  return out;
}

/** `{ 'altitude:light': {name: value}, … }` — every (brand, mode) bundle on disk. */
function discoverScopes() {
  if (!existsSync(BRAND_CSS_DIR)) return {};
  const scopes = {};
  for (const file of readdirSync(BRAND_CSS_DIR)) {
    const m = /^tokens-([a-z0-9]+)-(light|dark)\.css$/.exec(file);
    if (!m) continue;
    scopes[`${m[1]}:${m[2]}`] = readBrandScope(join(BRAND_CSS_DIR, file));
  }
  return scopes;
}

/** name -> { cssType, dtcgType, tier, cssProperties }, walked straight off the DTCG source. */
function tokenMetadataIndex() {
  const index = {};
  const walk = (node, segs, tier) => {
    if (isTokenLeaf(node)) {
      const name = `al-${segs.join('-')}`;
      const entry = (index[name] ??= {});
      entry.cssType ??= authoredType(node) ?? null;
      entry.dtcgType ??= dtcgType(node) ?? null;
      entry.tier ??= tier;
      entry.cssProperties ??= node.$extensions?.['com.salesforce.styling']?.cssProperties ?? [];
      return;
    }
    if (!node || typeof node !== 'object') return;
    for (const [k, child] of Object.entries(node)) {
      if (k.startsWith('$')) continue;
      walk(child, [...segs, k], tier);
    }
  };
  const visit = (dir, tier) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) visit(full, tier);
      else if (entry.name.endsWith('.json')) {
        try {
          walk(JSON.parse(readFileSync(full, 'utf8')), [], tier);
        } catch {
          // One malformed file must not blind the whole index; the token gates
          // (pnpm run generate:token-metadata) own that failure, and the honest
          // outcome here is metadata missing for that file's tokens.
        }
      }
    }
  };
  for (const [dir, tier] of [['tier-1', 1], ['tier-2', 2], ['tier-3', 3]]) visit(join(DTCG_DIR, dir), tier);
  return index;
}

const scopes = discoverScopes();
const scopeIds = Object.keys(scopes).sort();
const metadata = tokenMetadataIndex();

const descriptionModes = ['light', 'dark'].filter((m) => scopes[`${DESCRIPTION_BRAND}:${m}`]);
const lookup = (name, mode) => scopes[`${DESCRIPTION_BRAND}:${mode}`]?.[name];

/** name -> the one-sentence derived description, for the default brand. */
const descriptions = {};
if (descriptionModes.length) {
  const named = new Set();
  for (const m of descriptionModes) for (const n of Object.keys(scopes[`${DESCRIPTION_BRAND}:${m}`])) named.add(n);
  for (const n of [...named].sort()) {
    const modeValues = {};
    for (const m of descriptionModes) if (lookup(n, m) != null) modeValues[m] = lookup(n, m);
    const meta = metadata[n] ?? {};
    descriptions[n] = describeToken({
      name: n,
      cssType: meta.cssType ?? null,
      dtcgType: meta.dtcgType ?? null,
      tier: meta.tier ?? null,
      cssProperties: meta.cssProperties ?? [],
      modeValues,
      lookup,
    });
  }
}

// Descriptions ride along with the token they describe, rather than in a
// parallel map a consumer has to join by hand.
for (const list of Object.values(groups)) {
  for (const entry of list) {
    const d = descriptions[entry.name.replace(/^--/, '')];
    if (d) entry.description = d;
  }
}

/** Colour tokens only — the family the emphasis ladder exists in. */
const paletteScopes = {};
const collapsedLadders = {};
for (const id of scopeIds) {
  const colours = {};
  for (const [name, value] of Object.entries(scopes[id])) {
    if (parseTokenName(name)?.family === 'color') colours[name] = value;
  }
  paletteScopes[id] = colours;
  collapsedLadders[id] = findCollapsedLadders(colours);
}

/**
 * The measured contrast for every ink/fill pair the naming scheme implies.
 *
 * `content.<role>-weak` is the ink painted ON `background.<role>-default` —
 * the single most misleading name in the set (see token-describe.mjs's
 * `inkPair()` and check-palette-contrast.mjs's header). Recording the ratio per
 * scope means a caller can be told which pair a token is legible on without
 * re-deriving WCAG maths from raw hexes.
 */
const inkContrast = {};
for (const id of scopeIds) {
  // The rungs a ladder actually ships decide whether `-weak` is the misleading
  // "ink" name or an honest muted tint — see inkPair() in token-describe.mjs.
  const rungsOf = new Map();
  for (const name of Object.keys(paletteScopes[id])) {
    const p = parseTokenName(name);
    if (!p?.surface || !p.role || !p.emphasis) continue;
    const key = `${p.surface}-${p.role}`;
    if (!rungsOf.has(key)) rungsOf.set(key, new Set());
    rungsOf.get(key).add(p.emphasis);
  }
  for (const name of Object.keys(paletteScopes[id])) {
    const p = parseTokenName(name);
    const pair = inkPair(name, { rungs: [...(rungsOf.get(`${p?.surface}-${p?.role}`) ?? [])] });
    if (!pair) continue;
    const r = contrastRatio(paletteScopes[id][name], paletteScopes[id][pair.fill]);
    if (r == null) continue;
    const entry = (inkContrast[name] ??= {
      fill: pair.fill,
      min: pair.minRatio,
      /**
       * True only where the `-weak` name genuinely reads backwards: the token is
       * the ink PAINTED ON its own fill (a button/badge label), not a muted tint
       * of the hue. False for neutral/inverse/disabled, where `-weak` means what
       * it says.
       */
      misleadingName: pair.misleadingName,
      byScope: {},
    });
    entry.byScope[id] = { ratio: Number(r.toFixed(2)), passes: r >= pair.minRatio };
  }
}

const palette = scopeIds.length
  ? {
      available: true,
      source: 'libs/al-web-components/styles/dist-v5/css/brand/tokens-<brand>-<mode>.css',
      descriptionBrand: DESCRIPTION_BRAND,
      scopes: scopeIds,
      values: paletteScopes,
      /**
       * Emphasis ladders where two rungs resolve to the SAME value — i.e. the
       * ladder advertises a distinction the palette does not make. A fact about
       * the token set, deliberately REPORTED and not fixed here.
       */
      collapsedLadders,
      inkContrast,
    }
  : {
      available: false,
      reason:
        'libs/al-web-components/styles/dist-v5/css/brand/ is absent (it is a gitignored build artifact), ' +
        `so no per-mode values, descriptions, ladder or contrast facts could be derived. Run: ${BUILD_TOKENS_HINT}`,
      hint: BUILD_TOKENS_HINT,
    };

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
    /**
     * The emphasis ladder, and the warning that it is not always a ladder.
     *
     * Both strings are assembled from the measured `palette` block below, so
     * neither can claim a step count or a collapse the emitted CSS does not
     * show.
     */
    emphasisLadder:
      'weakest → strongest: faint → weak → default → strong → bold. NOT every role ships every rung, ' +
      'and NOT every rung that ships resolves to a different value — see palette.collapsedLadders, ' +
      'which lists every ladder where two steps are the same colour in a given brand+mode.',
    inkNamingWarning:
      'content.<role>-weak is the INK PAINTED ON background.<role>-default (button labels, badge labels; ' +
      '26 call sites), NOT a muted tint of the hue. Use it as a foreground for its own fill, never as ' +
      'body text. palette.inkContrast carries the measured ratio for every such pair.',
    descriptions:
      'Every token in `groups` carries a `description` DERIVED at build time by ' +
      'scripts/lib/token-describe.mjs — surface, role, emphasis step, the value it resolves to in each ' +
      `mode (for the "${DESCRIPTION_BRAND}" brand), any rung it collapses onto, and the measured contrast ` +
      'pair where one exists. Nothing here is hand-written prose, so nothing here can go stale ' +
      'independently of the token it describes.',
  },
  palette,
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

if (!palette.available) {
  // A NAMED miss, not a silent skip: the digest is still written and still
  // useful, but a consumer must be able to tell "no descriptions were derived"
  // from "these tokens have no description".
  console.warn(`[tokens-digest] ${palette.reason}`);
} else {
  const described = Object.keys(descriptions).length;
  const collapsedTotal = scopeIds.reduce((n, id) => n + collapsedLadders[id].length, 0);
  console.log(
    `Derived ${described} descriptions from ${scopeIds.length} brand+mode bundles ` +
      `(${scopeIds.join(', ')}); ${collapsedTotal} collapsed emphasis ladder(s) across them:`
  );
  for (const id of scopeIds) {
    const c = collapsedLadders[id];
    const collisions = c.reduce((n, l) => n + l.collisions.length, 0);
    console.log(`  ${id}: ${c.length} ladder(s), ${collisions} colliding step group(s)`);
  }
}

console.log(`Wrote ${keys.length} tokens across ${Object.keys(groups).length} families`);
console.log(`  ${TMP_OUT}`);
console.log(`  ${REPO_OUT}`);
