#!/usr/bin/env node
/**
 * push-variables.mjs — derive the Southleft design-system variable set from the
 * BUILT css bundles and emit (a) a plan JSON and (b) plugin-context JS chunks
 * that create the variables in the "Southleft V5" Figma file.
 *
 * Direction is code -> Figma. Nothing is ever deleted.
 *
 *   node scripts/figma-southleft/push-variables.mjs              # dry run (default)
 *   node scripts/figma-southleft/push-variables.mjs --apply      # also emit apply chunks
 *   node scripts/figma-southleft/push-variables.mjs --opacity-percent
 *
 * `--apply` does NOT talk to Figma: this process has no MCP client. It writes
 * scripts/figma-southleft/out/NN-*.js, each of which is a self-contained body
 * for `figma_execute`. Run them in numeric order. They are idempotent — a
 * re-run updates existing collections/variables in place by name.
 *
 * TARGET FILE: Southleft V5 — rdhBS9t89V42E7EfiPjmSa. The apply chunks assert
 * figma.fileKey before writing and throw if it is anything else.
 *
 * Conventions mirrored from the live ALTITUDE library
 * (.altitude/figma-sync/figma-live-vars.json), NOT invented here:
 *   - `/` path separator, `@` for the unsuffixed/base stop (`theme/space/@`)
 *   - typography primitives are nested under `typography/`
 *   - paper/ink ramps live under `color/neutral/`, not `color/brand/`
 *   - font-weight is a STRING holding the Figma font-style name
 *   - letter-spacing is a unitless FLOAT (the `%` is lost — see EXCLUSIONS)
 *   - collections: Tier 1 | Tier 2 | Tier 2 Theme (Light,Dark) | Tier 2 Brand
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(ROOT, 'scripts/figma-southleft/out');
const BUNDLES = join(ROOT, 'libs/al-web-components/styles/dist-v5/css/brand');

const FILE_KEY = 'rdhBS9t89V42E7EfiPjmSa';
const FILE_NAME = 'Southleft V5';

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const OPACITY_PERCENT = argv.includes('--opacity-percent');

/* ------------------------------------------------------------------ parse */

function parseBundle(name) {
  const text = readFileSync(join(BUNDLES, name), 'utf8');
  const map = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*(--al-[a-z0-9-]+)\s*:\s*(.+?);\s*$/);
    if (m) map[m[1]] = m[2].trim();
  }
  return map;
}

const SL_LIGHT = parseBundle('tokens-southleft-light.css');
const SL_DARK = parseBundle('tokens-southleft-dark.css');
const AL_LIGHT = parseBundle('tokens-altitude-light.css');
const AL_DARK = parseBundle('tokens-altitude-dark.css');

/* -------------------------------------------------------------- exclusions
 * Tier-1 exclusions cascade: any tier-2 token whose `var()` target is excluded
 * is dropped too, automatically. That is how theme/animation/*,
 * theme/box-shadow/*, theme/typography/* and theme/border/radius/round leave
 * the set without being listed by hand.
 */
const TIER1_EXCLUDE = [
  [/^--al-animation-duration-/, 'code-only: Figma has no duration variable type'],
  [/^--al-animation-timing-/, 'code-only: Figma has no easing/cubic-bezier variable type'],
  [/^--al-z-index-/, 'code-only: no Figma variable representation'],
  [/^--al-box-shadow-/, 'composite shadow: Figma variables are COLOR/FLOAT/STRING/BOOLEAN only (belongs in an effect style)'],
  [/^--al-typography-preset-/, 'composite font shorthand: belongs in a Figma text style, not a variable'],
  [/^--al-border-radius-round$/, '50% — Figma FLOAT is unitless and cannot hold a percentage'],
];

const excluded = []; // {name, figmaName?, reason}
const excludeReason = (cssVar) => {
  for (const [re, why] of TIER1_EXCLUDE) if (re.test(cssVar)) return why;
  return null;
};

/* ------------------------------------------------------------------ naming
 * cssVar -> Figma variable path. Ordered; first match wins.
 * `rest` is the remainder after the prefix; `n` splits it into n path segments
 * (the last segment keeps any leftover hyphens).
 */
const splitRest = (rest, n) => {
  if (n <= 1) return [rest];
  const parts = rest.split('-');
  return [...parts.slice(0, n - 1), parts.slice(n - 1).join('-')];
};

const TIER1_RULES = [
  ['--al-base-', 'base', 1],
  ['--al-space-', 'space', 1],
  ['--al-layout-max-width-', 'layout/max-width', 1],
  ['--al-icon-', 'icon', 1],
  ['--al-border-width-', 'border/width', 1],
  ['--al-border-radius-', 'border/radius', 1],
  ['--al-opacity-', 'opacity', 1],
  ['--al-animation-distance-', 'animation/distance', 1],
  ['--al-color-brand-paper-', 'color/neutral/paper', 1],
  ['--al-color-brand-ink-', 'color/neutral/ink', 1],
  ['--al-color-brand-', 'color/brand', 2],
  ['--al-color-neutral-', 'color/neutral', 2],
  ['--al-color-transparent-', 'color/transparent', 2],
  ['--al-color-shadow-', 'color/shadow', 1],
  ['--al-color-status-', 'color/status', 1],
  ['--al-font-size-', 'typography/font-size', 1],
  ['--al-line-height-', 'typography/line-height', 1],
  ['--al-font-family-', 'typography/font-family', 1],
  ['--al-font-weight-', 'typography/font-weight', 1],
  ['--al-letter-spacing-', 'typography/letter-spacing', 1],
  ['--al-text-decoration-', 'typography/text-decoration', 1],
];

// tier-2: applied to the name with `--al-theme-` stripped. `@` marks the base stop.
const TIER2_RULES = [
  [/^space$/, () => 'theme/space/@'],
  [/^space-(.+)$/, (m) => `theme/space/${m[1]}`],
  [/^border-width$/, () => 'theme/border/width/@'],
  [/^border-width-(.+)$/, (m) => `theme/border/width/${m[1]}`],
  [/^border-radius$/, () => 'theme/border/radius/@'],
  [/^border-radius-role-(.+)$/, (m) => `theme/border/radius/role/${m[1]}`],
  [/^border-radius-(.+)$/, (m) => `theme/border/radius/${m[1]}`],
  [/^icon$/, () => 'theme/icon/@'],
  [/^icon-(.+)$/, (m) => `theme/icon/${m[1]}`],
  [/^layout-max-width$/, () => 'theme/layout/max-width/@'],
  [/^layout-max-width-(.+)$/, (m) => `theme/layout/max-width/${m[1]}`],
  [/^layout-width-(.+)$/, (m) => `theme/layout/width/${m[1]}`],
  [/^layout-height-(.+)$/, (m) => `theme/layout/height/${m[1]}`],
  [/^opacity-(.+)$/, (m) => `theme/opacity/${m[1]}`],
  [/^animation-(.+)$/, (m) => `theme/animation/${m[1]}`],
  [/^box-shadow$/, () => 'theme/box-shadow/@'],
  [/^box-shadow-(.+)$/, (m) => `theme/box-shadow/${m[1]}`],
  [/^typography-(body|heading|display)-(.+)$/, (m) => `theme/typography/${m[1]}/${m[2]}`],
  [/^color-(background|content|border|shadow|header|body)-(.+)$/, (m) => `theme/color/${m[1]}/${m[2]}`],
];

function figmaName(cssVar) {
  if (cssVar.startsWith('--al-theme-')) {
    const rest = cssVar.slice('--al-theme-'.length);
    for (const [re, fn] of TIER2_RULES) {
      const m = rest.match(re);
      if (m) return fn(m);
    }
    throw new Error(`no tier-2 name rule for ${cssVar}`);
  }
  for (const [prefix, out, n] of TIER1_RULES) {
    if (cssVar.startsWith(prefix)) {
      return [out, ...splitRest(cssVar.slice(prefix.length), n)].join('/');
    }
  }
  throw new Error(`no tier-1 name rule for ${cssVar}`);
}

/* ------------------------------------------------------------------ values */

const WEIGHT_NAMES = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };

const hexToRgba = (hex) => {
  let s = hex.replace('#', '');
  if (s.length === 3) s = s.split('').map((c) => c + c).join('');
  const n = (i) => parseInt(s.slice(i, i + 2), 16) / 255;
  return { r: n(0), g: n(2), b: n(4), a: s.length === 8 ? n(6) : 1 };
};
const rgbaFnToRgba = (v) => {
  const p = v.match(/^rgba?\(([^)]+)\)$/i)[1].split(',').map((x) => parseFloat(x.trim()));
  return { r: p[0] / 255, g: p[1] / 255, b: p[2] / 255, a: p.length > 3 ? p[3] : 1 };
};

/** Classify + convert one resolved CSS value. Returns {type, value} or null. */
function toFigma(cssVar, raw) {
  if (/^#[0-9a-f]{3,8}$/i.test(raw)) return { type: 'COLOR', value: hexToRgba(raw) };
  if (/^rgba?\(/i.test(raw)) return { type: 'COLOR', value: rgbaFnToRgba(raw) };

  if (cssVar.startsWith('--al-font-weight-')) {
    const n = Number(raw);
    const name = WEIGHT_NAMES[n];
    if (!name) throw new Error(`unmapped font-weight ${raw}`);
    return { type: 'STRING', value: name, note: `code value ${n}` };
  }
  if (cssVar.startsWith('--al-letter-spacing-')) {
    // `0%` / `1%` -> unitless FLOAT. The `%` is lost; Figma FLOAT has no unit.
    return { type: 'FLOAT', value: parseFloat(raw), note: `code value ${raw} (unit lost)` };
  }
  if (cssVar.startsWith('--al-opacity-')) {
    const f = parseFloat(raw);
    return OPACITY_PERCENT
      ? { type: 'FLOAT', value: Math.round(f * 100), note: `code fraction ${raw} -> percent` }
      : { type: 'FLOAT', value: f };
  }
  if (/rem$/.test(raw)) return { type: 'FLOAT', value: parseFloat(raw) * 16 };
  if (/px$/.test(raw)) return { type: 'FLOAT', value: parseFloat(raw) };
  if (/^-?[0-9.]+$/.test(raw)) return { type: 'FLOAT', value: Number(raw) };
  if (/%$/.test(raw)) return null; // percentages other than the handled ones
  return { type: 'STRING', value: raw };
}

const aliasTarget = (raw) => {
  const m = raw.match(/^var\((--al-[a-z0-9-]+)\)$/);
  return m ? m[1] : null;
};

/* -------------------------------------------------------------------- plan */

const allKeys = [...new Set([...Object.keys(SL_LIGHT), ...Object.keys(SL_DARK)])];
const tier1Keys = allKeys.filter((k) => !k.startsWith('--al-theme-'));
const tier2Keys = allKeys.filter((k) => k.startsWith('--al-theme-'));

/** cssVar -> figma name, only for tokens that survive exclusion. */
const kept = new Map();

const tier1Vars = [];
for (const k of tier1Keys.sort()) {
  const why = excludeReason(k);
  if (why) { excluded.push({ token: k, tier: 1, reason: why }); continue; }
  const raw = SL_LIGHT[k] ?? SL_DARK[k];
  const conv = toFigma(k, raw);
  if (!conv) { excluded.push({ token: k, tier: 1, reason: `unconvertible value "${raw}"` }); continue; }
  const name = figmaName(k);
  kept.set(k, name);
  tier1Vars.push({ token: k, name, resolvedType: conv.type, values: { Default: conv.value }, source: raw, note: conv.note });
}

/* tier-2. Every tier-2 token in these bundles is `var(--al-...)` except a
 * couple of literals; aliases are preserved as `{alias: <figma name>}`. */
function tier2Value(cssVar, raw) {
  if (raw === undefined) return { missing: true };
  const target = aliasTarget(raw);
  if (target) {
    if (!kept.has(target) && !tier2Kept.has(target)) return { dropped: `aliases ${target}, which is excluded` };
    return { alias: kept.get(target) ?? tier2Kept.get(target) };
  }
  const conv = toFigma(cssVar, raw);
  if (!conv) return { dropped: `unconvertible literal "${raw}"` };
  return { literal: conv.value, type: conv.type };
}

// tier-2 names are needed before value resolution (intra-collection aliases).
const tier2Kept = new Map();
for (const k of tier2Keys) {
  const target = aliasTarget(SL_LIGHT[k] ?? SL_DARK[k] ?? '');
  if (target && excludeReason(target)) continue;
  tier2Kept.set(k, figmaName(k));
}

const tier2Plain = [];   // Tier 2 (Default)
const tier2Theme = [];   // Tier 2 Theme (Light, Dark)
const tier2Brand = [];   // Tier 2 Brand (Southleft)

for (const k of tier2Keys.sort()) {
  const name = tier2Kept.get(k);
  if (!name) {
    const t = aliasTarget(SL_LIGHT[k] ?? SL_DARK[k] ?? '');
    excluded.push({ token: k, tier: 2, reason: `aliases ${t} — ${excludeReason(t)}` });
    continue;
  }
  const L = tier2Value(k, SL_LIGHT[k]);
  const D = tier2Value(k, SL_DARK[k]);
  if (L.dropped || D.dropped) { excluded.push({ token: k, tier: 2, reason: L.dropped || D.dropped }); continue; }

  const isColor = name.startsWith('theme/color/');
  const type = isColor ? 'COLOR' : (L.type || 'FLOAT');
  if (isColor) {
    tier2Theme.push({ token: k, name, resolvedType: 'COLOR', values: { Light: L, Dark: D }, source: { Light: SL_LIGHT[k], Dark: SL_DARK[k] } });
  } else {
    // non-colour tier-2 is mode-independent in these bundles; assert it
    if (JSON.stringify(L) !== JSON.stringify(D)) throw new Error(`${k} varies by mode but is not a colour`);
    tier2Plain.push({ token: k, name, resolvedType: type, values: { Default: L }, source: SL_LIGHT[k] });
  }
}

/* Tier 2 Brand — the mode-independent tier-2 deltas vs the neutral `altitude`
 * reference bundle. Mode-varying deltas are NOT duplicated here; they already
 * carry their per-mode values in Tier 2 Theme. */
for (const k of tier2Keys.sort()) {
  const name = tier2Kept.get(k);
  if (!name) continue;
  const slL = SL_LIGHT[k], slD = SL_DARK[k];
  const alL = AL_LIGHT[k], alD = AL_DARK[k];
  const isDelta = slL !== alL || slD !== alD;
  if (!isDelta) continue;
  if (slL !== slD) continue; // mode-varying -> lives in Tier 2 Theme
  const v = tier2Value(k, slL);
  if (v.dropped) continue;
  tier2Brand.push({
    token: k, name,
    resolvedType: name.startsWith('theme/color/') ? 'COLOR' : (v.type || 'FLOAT'),
    values: { Southleft: v },
    source: slL, altitude: alL,
  });
}

const plan = {
  generated: new Date().toISOString(),
  file: { name: FILE_NAME, key: FILE_KEY },
  source: ['tokens-southleft-light.css', 'tokens-southleft-dark.css', 'tokens-altitude-light.css', 'tokens-altitude-dark.css'],
  opacityConvention: OPACITY_PERCENT ? 'percent (0-100)' : 'fraction (0-1) — matches the live Altitude library',
  collections: [
    { name: 'Tier 1', modes: ['Default'], variables: tier1Vars },
    { name: 'Tier 2', modes: ['Default'], variables: tier2Plain },
    { name: 'Tier 2 Theme', modes: ['Light', 'Dark'], variables: tier2Theme },
    { name: 'Tier 2 Brand', modes: ['Southleft'], variables: tier2Brand },
  ],
  excluded,
};

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'plan.json'), JSON.stringify(plan, null, 1) + '\n');

/* ------------------------------------------------------------------ report */

const aliasCount = (vars) => vars.reduce((n, v) => n + Object.values(v.values).filter((x) => x && x.alias).length, 0);
console.log(`plan -> scripts/figma-southleft/out/plan.json`);
console.log(`target: ${FILE_NAME} (${FILE_KEY})   opacity: ${plan.opacityConvention}`);
for (const c of plan.collections) {
  console.log(`  ${c.name.padEnd(14)} modes=${c.modes.join(',').padEnd(12)} vars=${String(c.variables.length).padStart(3)}  aliases=${aliasCount(c.variables)}`);
}
const total = plan.collections.reduce((n, c) => n + c.variables.length, 0);
console.log(`  TOTAL ${total} variables, ${excluded.length} tokens excluded`);
const byReason = {};
for (const e of excluded) byReason[e.reason] = (byReason[e.reason] || 0) + 1;
console.log('\nexclusions:');
for (const [r, n] of Object.entries(byReason).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${r}`);

if (!APPLY) {
  console.log('\nDRY RUN — nothing written to Figma. Re-run with --apply to emit the figma_execute chunks.');
  process.exit(0);
}

/* ------------------------------------------------------- emit apply chunks */

/* The chunks are pasted into `figma_execute`, so payload size matters. Values
 * are emitted as a compact TSV blob parsed inside the plugin rather than as
 * JSON — same data, roughly a third of the bytes.
 *   line := name <TAB> TYPE <TAB> modeValue [ <US> modeValue ]*
 *   modeValue := '@' + aliasName | '#rrggbb[aa]' | number | raw string
 */
const TAB = String.fromCharCode(9);
const US = String.fromCharCode(31);

const rgbaToHex = (c) => {
  const h = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
  return '#' + h(c.r) + h(c.g) + h(c.b) + (c.a < 1 ? h(c.a) : '');
};
const encodeSpec = (spec, type) => {
  // Tier 1 stores the bare converted value; tier 2 wraps it as {alias}|{literal}.
  if (spec && typeof spec === 'object' && spec.alias) return '@' + spec.alias;
  const v = spec && typeof spec === 'object' && 'literal' in spec ? spec.literal : spec;
  return type === 'COLOR' ? rgbaToHex(v) : String(v);
};

const PRELUDE = [
  `const EXPECT_KEY = ${JSON.stringify(FILE_KEY)};`,
  "if (figma.fileKey && figma.fileKey !== EXPECT_KEY) throw new Error('WRONG FILE: ' + figma.fileKey);",
  'const cols = await figma.variables.getLocalVariableCollectionsAsync();',
  'const col = cols.find((c) => c.name === COL);',
  "if (!col) throw new Error('missing collection ' + COL);",
  'const all = await figma.variables.getLocalVariablesAsync();',
  'const inCol = {}; const anyName = {};',
  'for (const v of all) { anyName[v.name] = v; if (v.variableCollectionId === col.id) inCol[v.name] = v; }',
  "const mid = MODES.map((m) => { const x = col.modes.find((y) => y.name === m); if (!x) throw new Error('no mode ' + m); return x.modeId; });",
  "const hex = (s) => { let t = s.slice(1); if (t.length === 3) t = t.split('').map((c) => c + c).join('');",
  '  const n = (i) => parseInt(t.substr(i, 2), 16) / 255;',
  '  return { r: n(0), g: n(2), b: n(4), a: t.length === 8 ? n(6) : 1 }; };',
  'let created = 0, aliases = 0, literals = 0;',
  `const rows = DATA.split('\\n').filter(Boolean).map((l) => l.split(String.fromCharCode(9)));`,
  'for (const r of rows) {',
  '  if (!inCol[r[0]]) { inCol[r[0]] = figma.variables.createVariable(r[0], col, r[1]); anyName[r[0]] = inCol[r[0]]; created++; }',
  '}',
  'const missing = [];',
  'for (const r of rows) {',
  '  const v = inCol[r[0]]; const type = r[1];',
  '  const parts = r[2].split(String.fromCharCode(31));',
  '  for (let i = 0; i < mid.length; i++) {',
  '    const raw = parts[i];',
  "    if (raw[0] === '@') {",
  '      const t = anyName[raw.slice(1)];',
  "      if (!t) { missing.push(r[0] + ' -> ' + raw.slice(1)); continue; }",
  '      v.setValueForMode(mid[i], figma.variables.createVariableAlias(t)); aliases++;',
  "    } else if (type === 'COLOR') { v.setValueForMode(mid[i], hex(raw)); literals++; }",
  "    else if (type === 'FLOAT') { v.setValueForMode(mid[i], Number(raw)); literals++; }",
  '    else { v.setValueForMode(mid[i], raw); literals++; }',
  '  }',
  '}',
  'return { collection: COL, rows: rows.length, created, aliases, literals, missingAliasTargets: missing };',
].join('\n');

const chunkFile = (n, title, body) => {
  const file = join(OUT, `${String(n).padStart(2, '0')}-${title}.js`);
  writeFileSync(file, body + '\n');
  return file;
};

chunkFile(1, 'collections', [
  `const EXPECT_KEY = ${JSON.stringify(FILE_KEY)};`,
  "if (figma.fileKey && figma.fileKey !== EXPECT_KEY) throw new Error('WRONG FILE: ' + figma.fileKey);",
  `const want = ${JSON.stringify(plan.collections.map((c) => ({ name: c.name, modes: c.modes })))};`,
  'const existing = await figma.variables.getLocalVariableCollectionsAsync();',
  'const out = [];',
  'for (const w of want) {',
  '  let c = existing.find((x) => x.name === w.name);',
  '  if (!c) { c = figma.variables.createVariableCollection(w.name); }',
  '  c.renameMode(c.modes[0].modeId, w.modes[0]);',
  '  for (const m of w.modes.slice(1)) if (!c.modes.some((x) => x.name === m)) c.addMode(m);',
  '  out.push({ name: c.name, id: c.id, modes: c.modes.map((m) => m.name) });',
  '}',
  'return out;',
].join('\n'));

let n = 2;
const files = [];
for (const c of plan.collections) {
  const CHUNK = 240;
  for (let i = 0; i < c.variables.length; i += CHUNK) {
    const slice = c.variables.slice(i, i + CHUNK);
    const tsv = slice
      .map((v) => [v.name, v.resolvedType, c.modes.map((m) => encodeSpec(v.values[m], v.resolvedType)).join(US)].join(TAB))
      .join('\n');
    const label = c.name.toLowerCase().replace(/\s+/g, '-') + (c.variables.length > CHUNK ? `-${Math.floor(i / CHUNK) + 1}` : '');
    files.push(chunkFile(n++, label, [
      `const COL = ${JSON.stringify(c.name)};`,
      `const MODES = ${JSON.stringify(c.modes)};`,
      `const DATA = ${JSON.stringify(tsv)};`,
      PRELUDE,
    ].join('\n')));
  }
}

console.log('\nAPPLY chunks written to scripts/figma-southleft/out/ (run in numeric order via figma_execute):');
console.log('  01-collections.js');
for (const f of files) console.log('  ' + f.split(/[\\/]/).pop());
