#!/usr/bin/env node
/**
 * Public-API vocabulary ceiling with a one-way ratchet.
 *
 * The problem this measures: the `al-*` public API is not predictable. `variant`
 * means emphasis on `al-button`, status on `al-alert`, a SIZE on `al-avatar`,
 * an orientation on `al-divider` and a brand on `al-logo` -- so `variant="sm"`
 * is a size on one element, invalid on the next and a status on a third.
 * Anchored placement is spelled `position`, `align`, `alignment`,
 * `flyoutPosition` and `labelPosition`. Booleans arrive under nine prefix
 * families plus a pile of bare names. None of that is a bug in any one
 * component, so nothing catches it; it is a bug in the vocabulary, and only a
 * whole-library tabulation can see it.
 *
 * `.altitude/api-vocabulary.json` declares the vocabulary: the canonical axis
 * names and their value sets, the reserved (always-wrong) names, the boolean
 * prefix allow-list, and a per-component EXCEPTIONS ledger naming every
 * violation that exists today with the reason it is still there.
 *
 * Two independent failure modes, and they are deliberately different:
 *
 *   1. A violation NOT in the exceptions ledger fails immediately. That is a
 *      new prop, or an existing prop that changed shape. No ratchet involved --
 *      a fresh violation is never acceptable, at any count.
 *
 *   2. The number of LEDGERED violations is pinned in
 *      `.altitude/baselines/api-vocabulary.json` and must match exactly.
 *      Above the pin: something regressed. BELOW the pin: someone fixed a
 *      violation and left the ceiling where it was -- which is how the
 *      coverage ratchet in this repo got seeded once and never turned. That
 *      also fails, and says to run `--update`. A ratchet that only notices
 *      increases is a ratchet that never moves.
 *
 * Usage:
 *   node scripts/check-api-vocabulary.mjs             # check only
 *   node scripts/check-api-vocabulary.mjs --update    # re-pin after a fix
 *   node scripts/check-api-vocabulary.mjs --report    # full vocabulary census
 *   node scripts/check-api-vocabulary.mjs --json      # machine-readable
 *
 * Overrides (used by the self-test to point at a throwaway repo):
 *   --root <dir> --cem <file> --vocabulary <file> --baseline <file>
 *
 * Exit codes: 0 pass · 1 violation or ratchet mismatch · 2 could not measure.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

const HELP = `Usage: node scripts/check-api-vocabulary.mjs [options]

  --report            print the full vocabulary census (every axis, every
                      spelling, every boolean family) and exit
  --json              emit the machine-readable report on stdout
  --update            re-pin the ratchet to the measured count; required
                      after fixing a ledgered violation
  --root <dir>        repo root (default: the repo this script lives in)
  --cem <file>        Custom Elements Manifest path
  --vocabulary <file> vocabulary declaration path
  --baseline <file>   ratchet baseline path
  --help              this text

Exit codes: 0 pass · 1 violation or ratchet mismatch · 2 could not measure.
`;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const [k, inline] = a.replace(/^--/, '').split('=');
    if (inline !== undefined) {
      out[k] = inline;
    } else {
      out[k] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    }
  }
  return out;
}

function die(message) {
  console.error(`api-vocabulary: ${message}`);
  process.exit(2);
}

function readJson(path, what) {
  if (!existsSync(path)) die(`${what} not found at ${path}.`);
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    die(`${what} at ${path} is not valid JSON — ${error.message}`);
  }
}

/**
 * Split a TypeScript union type as the manifest records it into literal values.
 * `undefined` / `null` members are dropped: they say the prop is optional, not
 * that "undefined" is a legal value. Anything non-literal (a named type, an
 * object, a function signature) makes the whole union unanalysable, and the
 * caller must SKIP it by name rather than guess a value set.
 */
export function literalValues(typeText) {
  if (!typeText) return { values: [], analysable: false };
  const parts = typeText
    .split('|')
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => p !== 'undefined' && p !== 'null');
  if (!parts.length) return { values: [], analysable: false };
  const values = [];
  for (const part of parts) {
    const m = part.match(/^'([^']*)'$/) || part.match(/^"([^"]*)"$/);
    if (!m) return { values: [], analysable: false };
    values.push(m[1]);
  }
  return { values, analysable: true };
}

export function isBooleanType(typeText) {
  if (!typeText) return false;
  return typeText
    .split('|')
    .map((p) => p.trim())
    .filter((p) => p && p !== 'undefined' && p !== 'null')
    .every((p) => p === 'boolean' || p === 'true' || p === 'false');
}

/** Walk a directory tree, returning every file whose name matches `test`. */
function walk(dir, test, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(full, test, acc);
    else if (test(entry)) acc.push(full);
  }
  return acc;
}

/**
 * Collect every `@property`-decorated accessor declared in the component
 * sources. This exists to catch the manifest going STALE: `custom-elements.json`
 * is a committed generated artifact, so a prop added without regenerating it is
 * invisible to a manifest-only gate. Anything found here and missing there is
 * reported as a named skip, never silently dropped.
 */
export function propertiesFromSources(componentsDir) {
  const found = new Map(); // relative-ish module path -> Set(prop names)
  for (const file of walk(componentsDir, (n) => n.endsWith('.ts') && !n.endsWith('.d.ts'))) {
    const src = readFileSync(file, 'utf8');
    const names = new Set();
    const re = /@property\s*\([^)]*\)\s*(?:\r?\n\s*)*accessor\s+([A-Za-z_$][\w$]*)/g;
    let m;
    while ((m = re.exec(src)) !== null) names.add(m[1]);
    if (names.size) found.set(file.replace(/\\/g, '/'), names);
  }
  return found;
}

/**
 * Every attribute-backed property in the manifest, with the class it was
 * declared on resolved through the superclass chain. Icon aliases inherit
 * `size` from `ALIconBase`; without the chain the gate would judge 39 copies
 * of one decision.
 */
export function collectProperties(cem) {
  const byModule = new Map();
  for (const mod of cem.modules || []) {
    for (const decl of mod.declarations || []) {
      if (decl.kind === 'class') byModule.set(`${mod.path}::${decl.name}`, { mod, decl });
    }
  }
  const findSuper = (decl) => {
    if (!decl.superclass) return null;
    const wanted = decl.superclass.name;
    const modHint = (decl.superclass.module || '').replace(/^\//, '');
    for (const [, entry] of byModule) {
      if (entry.decl.name !== wanted) continue;
      if (!modHint || entry.mod.path.replace(/\.[tj]s$/, '') === modHint.replace(/\.[tj]s$/, '')) {
        return entry;
      }
    }
    return null;
  };

  const rows = [];
  const skips = [];
  for (const mod of cem.modules || []) {
    for (const decl of mod.declarations || []) {
      if (decl.kind !== 'class' || !decl.customElement) continue;
      const tag = decl.tagName;
      if (!tag) {
        skips.push({ tag: `${mod.path}::${decl.name}`, reason: 'custom element with no tagName in the manifest' });
        continue;
      }
      // Own members plus inherited ones, own winning.
      const seen = new Set();
      let node = { mod, decl };
      let depth = 0;
      while (node && depth < 12) {
        for (const mem of node.decl.members || []) {
          if (mem.kind !== 'field' || mem.static || !mem.attribute) continue;
          if (seen.has(mem.name)) continue;
          seen.add(mem.name);
          rows.push({
            tag,
            prop: mem.name,
            attribute: typeof mem.attribute === 'string' ? mem.attribute : mem.name,
            type: (mem.type && mem.type.text) || '',
            declaredOn: node.mod.path,
            inherited: depth > 0,
            module: mod.path,
          });
        }
        node = findSuper(node.decl);
        depth += 1;
      }
    }
  }
  return { rows, skips };
}

/**
 * Judge one property against the declared vocabulary.
 * Returns null when the property carries no opinion (free-form strings such as
 * `label`, `href`, `value`), otherwise a violation object.
 */
export function judge(row, vocab) {
  const { prop, type } = row;
  const axes = vocab.axes || {};
  const reserved = vocab.reserved || {};
  const booleans = vocab.booleans || {};

  if (Object.prototype.hasOwnProperty.call(reserved, prop)) {
    return { category: 'reserved-name', detail: reserved[prop] };
  }

  if (Object.prototype.hasOwnProperty.call(axes, prop)) {
    const { values, analysable } = literalValues(type);
    if (!analysable) {
      if (isBooleanType(type)) {
        return {
          category: 'axis-not-enumerated',
          detail: `\`${prop}\` is a canonical axis but is typed boolean; an axis must enumerate its values.`,
        };
      }
      return null; // unanalysable — reported as a named skip by the caller
    }
    const allowed = new Set(axes[prop].values || []);
    const bad = values.filter((v) => !allowed.has(v));
    if (bad.length) {
      return {
        category: 'axis-values',
        detail: `${bad.map((v) => `'${v}'`).join(', ')} not in the \`${prop}\` set (${[...allowed].join(', ')}).`,
      };
    }
    return null;
  }

  if (isBooleanType(type)) {
    const prefixes = booleans.prefixes || [];
    const bare = new Set(booleans.bareAllowed || []);
    const hasPrefix = prefixes.some((p) => new RegExp(`^${p}[A-Z0-9]`).test(prop));
    if (hasPrefix) return null;
    if (bare.has(prop)) return null;
    return {
      category: 'boolean-name',
      detail: `boolean \`${prop}\` uses none of the allowed prefixes (${prefixes
        .map((p) => `${p}*`)
        .join(', ')}) and is not a standard HTML boolean attribute.`,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  console.log(HELP);
  process.exit(0);
}

const ROOT = resolve(options.root === true || !options.root ? resolve(HERE, '..') : options.root);
const CEM = resolve(
  options.cem && options.cem !== true ? options.cem : join(ROOT, 'libs/al-web-components/custom-elements.json')
);
const VOCAB_PATH = resolve(
  options.vocabulary && options.vocabulary !== true ? options.vocabulary : join(ROOT, '.altitude/api-vocabulary.json')
);
const BASELINE = resolve(
  options.baseline && options.baseline !== true ? options.baseline : join(ROOT, '.altitude/baselines/api-vocabulary.json')
);
const COMPONENTS_DIR = join(ROOT, 'libs/al-web-components/components');

const cem = readJson(CEM, 'custom-elements.json');
const vocab = readJson(VOCAB_PATH, 'api-vocabulary.json');
const exceptions = vocab.exceptions || {};

const { rows, skips } = collectProperties(cem);
if (!rows.length) die(`no attribute-backed properties found in ${CEM} — cannot measure.`);

// --- Manifest staleness: props in the source that never reached the CEM. ---
const sourceProps = propertiesFromSources(COMPONENTS_DIR);
const cemPropsByModule = new Map();
for (const row of rows) {
  if (row.inherited) continue;
  if (!cemPropsByModule.has(row.declaredOn)) cemPropsByModule.set(row.declaredOn, new Set());
  cemPropsByModule.get(row.declaredOn).add(row.prop);
}
const staleness = [];
for (const [file, names] of sourceProps) {
  const rel = file.slice(file.indexOf('libs/al-web-components/') + 'libs/al-web-components/'.length);
  const known = cemPropsByModule.get(rel);
  if (!known) continue; // module carries no custom element, or is not in the manifest at all
  for (const name of names) {
    if (!known.has(name)) staleness.push({ module: rel, prop: name });
  }
}

// --- Judge every property. ---
const violations = [];
const unanalysable = [];
for (const row of rows) {
  if (row.inherited) continue; // judge the decision where it was made, once
  const axes = vocab.axes || {};
  if (Object.prototype.hasOwnProperty.call(axes, row.prop) && !isBooleanType(row.type)) {
    const { analysable } = literalValues(row.type);
    if (!analysable) {
      unanalysable.push({ tag: row.tag, prop: row.prop, type: row.type || '(no type in manifest)' });
      continue;
    }
  }
  const verdict = judge(row, vocab);
  if (!verdict) continue;
  const reason = exceptions[row.tag] && exceptions[row.tag][row.prop];
  violations.push({ ...row, ...verdict, ledgered: Boolean(reason), reason: reason || null });
}

// --- Library-wide spelling collisions: a bare HTML boolean that the rest of
//     the library spells with an `is` prefix. `disabled` and `isDisabled` both
//     exist today, and a consumer cannot know which element takes which. ---
const allBooleanNames = new Set(rows.filter((r) => isBooleanType(r.type)).map((r) => r.prop));
for (const row of rows) {
  if (row.inherited) continue;
  if (!isBooleanType(row.type)) continue;
  const camel = row.prop.charAt(0).toUpperCase() + row.prop.slice(1);
  if (!allBooleanNames.has(`is${camel}`)) continue;
  const reason = exceptions[row.tag] && exceptions[row.tag][row.prop];
  violations.push({
    ...row,
    category: 'spelling-collision',
    detail: `\`${row.prop}\` and \`is${camel}\` both exist in the library; a consumer cannot tell which element takes which.`,
    ledgered: Boolean(reason),
    reason: reason || null,
  });
}

const fresh = violations.filter((v) => !v.ledgered);
const ledgered = violations.filter((v) => v.ledgered);

const byCategory = {};
for (const v of ledgered) byCategory[v.category] = (byCategory[v.category] || 0) + 1;

// --- Stale ledger entries: an exception for a violation that no longer
//     exists. Left alone these make the ledger look like debt that is gone. ---
const live = new Set(violations.map((v) => `${v.tag}::${v.prop}`));
const staleExceptions = [];
for (const [tag, props] of Object.entries(exceptions)) {
  if (tag.startsWith('//')) continue;
  for (const prop of Object.keys(props)) {
    if (prop.startsWith('//')) continue;
    if (!live.has(`${tag}::${prop}`)) staleExceptions.push({ tag, prop });
  }
}

// ---------------------------------------------------------------------------
// --report: the census. This is the data, reproducible on demand, rather than
// a paragraph in an audit document that is wrong six weeks later.
// ---------------------------------------------------------------------------
function census() {
  const own = rows.filter((r) => !r.inherited);
  const byName = new Map();
  for (const r of own) {
    if (!byName.has(r.prop)) byName.set(r.prop, []);
    byName.get(r.prop).push(r);
  }
  console.log('Altitude — public API vocabulary census');
  console.log(
    `  ${own.length} attribute-backed properties on ${new Set(own.map((r) => r.tag)).size} elements ` +
      `(${rows.length - own.length} more inherited)\n`
  );

  console.log('  CANONICAL AXES');
  for (const [axis, def] of Object.entries(vocab.axes || {})) {
    const uses = byName.get(axis) || [];
    console.log(`    ${axis} (${uses.length} use${uses.length === 1 ? '' : 's'}) — ${def.means}`);
    for (const u of uses) {
      const { values, analysable } = literalValues(u.type);
      const bad = analysable ? values.filter((v) => !(def.values || []).includes(v)) : [];
      const shown = analysable ? values.join(' | ') : `${u.type || '(untyped)'}  [unanalysable]`;
      console.log(`      ${bad.length ? '!' : ' '} ${u.tag.padEnd(24)} ${shown}`);
    }
  }

  console.log('\n  RESERVED NAMES IN USE');
  for (const name of Object.keys(vocab.reserved || {})) {
    const uses = byName.get(name) || [];
    if (!uses.length) continue;
    console.log(`    ${name} (${uses.length})`);
    for (const u of uses) {
      const { values, analysable } = literalValues(u.type);
      console.log(`      ${u.tag.padEnd(24)} ${analysable ? values.join(' | ') : u.type || '(untyped)'}`);
    }
  }

  console.log('\n  BOOLEAN FAMILIES');
  const families = new Map();
  for (const r of own.filter((r) => isBooleanType(r.type))) {
    const m = r.prop.match(/^(is|has|show|hide|full|disable|enable|auto|no|allow|can|use|with)(?=[A-Z0-9])/);
    const key = m ? `${m[1]}*` : '(bare)';
    if (!families.has(key)) families.set(key, []);
    families.get(key).push(r);
  }
  for (const [key, list] of [...families].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`    ${String(list.length).padStart(4)}  ${key}`);
  }
  const bare = families.get('(bare)') || [];
  if (bare.length) {
    console.log('    bare boolean names:');
    for (const b of bare) console.log(`      ${b.tag.padEnd(24)} ${b.prop}`);
  }

  console.log('\n  PROPERTY NAMES BY FREQUENCY (top 25)');
  for (const [name, list] of [...byName].sort((a, b) => b[1].length - a[1].length).slice(0, 25)) {
    console.log(`    ${String(list.length).padStart(4)}  ${name}`);
  }
}

const report = {
  root: ROOT,
  properties: rows.length,
  elements: new Set(rows.map((r) => r.tag)).size,
  ledgered: ledgered.length,
  fresh: fresh.length,
  byCategory,
  violations: violations.map((v) => ({
    tag: v.tag,
    prop: v.prop,
    type: v.type,
    category: v.category,
    detail: v.detail,
    ledgered: v.ledgered,
  })),
  unanalysable,
  staleness,
  staleExceptions,
  manifestSkips: skips,
};

if (options.json) console.log(JSON.stringify(report, null, 2));
if (options.report) {
  if (!options.json) census();
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Gate
// ---------------------------------------------------------------------------
if (!options.json) {
  console.log('Altitude — API vocabulary ratchet');
  console.log(`  properties measured   : ${rows.length} on ${report.elements} elements`);
  console.log(`  ledgered violations   : ${ledgered.length}`);
  for (const [cat, n] of Object.entries(byCategory).sort()) {
    console.log(`      ${String(n).padStart(4)}  ${cat}`);
  }
}

// Silence is the only forbidden failure: name everything that could not be judged.
if (unanalysable.length && !options.json) {
  console.log(`\n  SKIPPED — ${unanalysable.length} axis prop(s) whose value set is not statically knowable:`);
  for (const u of unanalysable) console.log(`      ${u.tag} .${u.prop} : ${u.type}`);
}
if (staleness.length && !options.json) {
  console.log(`\n  SKIPPED — ${staleness.length} @property declaration(s) present in source but absent from the manifest`);
  console.log('           (custom-elements.json is a committed generated artifact — regenerate it):');
  for (const s of staleness) console.log(`      ${s.module} .${s.prop}`);
}
if (skips.length && !options.json) {
  console.log(`\n  SKIPPED — ${skips.length} manifest entr(ies) that could not be attributed to an element:`);
  for (const s of skips) console.log(`      ${s.tag} — ${s.reason}`);
}

let failed = false;

if (fresh.length) {
  console.error(`\nFAIL — ${fresh.length} NEW vocabulary violation(s), not in the exceptions ledger:`);
  for (const v of fresh) {
    console.error(`  ${v.tag} .${v.prop}  [${v.category}]`);
    console.error(`      ${v.detail}`);
  }
  console.error(
    '\nRename the prop to a canonical axis (see .altitude/API-VOCABULARY.md), or — if it genuinely\n' +
      'cannot be fixed now — add it to `exceptions` in .altitude/api-vocabulary.json with a reason\n' +
      'and re-pin with --update. The ledger is debt, not permission.'
  );
  failed = true;
}

if (staleExceptions.length) {
  console.error(`\nFAIL — ${staleExceptions.length} exception(s) in the ledger no longer match any violation:`);
  for (const s of staleExceptions) console.error(`  ${s.tag} .${s.prop}`);
  console.error('Delete them from .altitude/api-vocabulary.json and re-pin with --update.');
  failed = true;
}

if (!existsSync(BASELINE)) {
  mkdirSync(dirname(BASELINE), { recursive: true });
  writeFileSync(
    BASELINE,
    `${JSON.stringify(
      { ceiling: byCategory, total: ledgered.length, updated: new Date().toISOString(), note: 'seeded' },
      null,
      2
    )}\n`
  );
  console.log(`\napi-vocabulary: seeded baseline at ${ledgered.length} ledgered violation(s).`);
  process.exit(failed ? 1 : 0);
}

const baseline = readJson(BASELINE, 'baseline');
const pinned = baseline.total ?? 0;

if (options.update) {
  if (fresh.length) {
    console.error('\n--update refuses to run while NEW violations are unresolved.');
    process.exit(1);
  }
  writeFileSync(
    BASELINE,
    `${JSON.stringify(
      {
        ceiling: byCategory,
        total: ledgered.length,
        updated: new Date().toISOString(),
        note: ledgered.length < pinned ? `tightened from ${pinned}` : `re-pinned from ${pinned}`,
      },
      null,
      2
    )}\n`
  );
  console.log(`\nRe-pinned: ${pinned} -> ${ledgered.length}.`);
  process.exit(failed ? 1 : 0);
}

if (ledgered.length > pinned) {
  console.error(
    `\nFAIL — ledgered violations rose: ${pinned} -> ${ledgered.length}.\n` +
      'A PR may not add API-vocabulary debt. Fix the prop, or justify the rise and re-pin with --update.'
  );
  failed = true;
} else if (ledgered.length < pinned) {
  // The failure mode this gate exists to prevent: a ratchet seeded once and
  // never turned. A fix that leaves the ceiling high buys back the slack it
  // just earned, so dropping below the pin is an error too.
  console.error(
    `\nFAIL — ledgered violations DROPPED: ${pinned} -> ${ledgered.length}, but the ceiling is still ${pinned}.\n` +
      'Something was fixed and the ratchet was not turned; the slack would silently permit a future regression.\n' +
      'Remove the fixed entr(ies) from `exceptions` in .altitude/api-vocabulary.json and run:\n' +
      '  node scripts/check-api-vocabulary.mjs --update'
  );
  failed = true;
}

if (failed) process.exit(1);

if (!options.json) {
  console.log(`\nOK — ${ledgered.length} ledgered violation(s), exactly at the pin; no new ones.`);
}
