#!/usr/bin/env node
/**
 * build-figma-payload.mjs — generate the Altitude → Figma variable payload.
 *
 * Usage:
 *   node scripts/build-figma-payload.mjs [--out .altitude/figma-sync/altitude-figma-payload.json]
 *
 * Reads the Tokens Studio source of truth (libs/al-web-components/styles/tokens)
 * and emits a Figma-ready payload: three orthogonal collections, values already
 * converted to the four types Figma variables actually support.
 *
 * Scope (decided 2026-08-20): **Altitude raw tokens only**. No Brand collection,
 * no Southleft. tier-2/brand/** is skipped wholesale — the altitude brand layer is
 * byte-identical to tier-2/theme/**, which is why no tokens-brand-altitude*.scss
 * partial is ever emitted.
 *
 * Collections
 *   Primitives  Default        tier-1/*            hidden from publishing
 *   Semantic    Default        tier-2/* (non-colour)
 *   Theme       Light, Dark    tier-2,3/theme/{light,dark}/colors
 *
 * Not variables — emitted to `styles` instead of `collections`:
 *   - `typography` composites  → Figma text styles
 *   - `boxShadow`              → Figma effect styles
 *   Figma variables are only COLOR | FLOAT | STRING | BOOLEAN.
 *
 * Not synced at all — see `excluded`:
 *   - animation.duration.* / animation.timing.*  (no Figma variable type exists)
 *   - z-index, breakpoints, icons                (FIGMA-SYNC.md rule 3, code-only)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TOKENS = join(ROOT, 'libs/al-web-components/styles/tokens');

/** rem → px. `base.font` is 1rem and the emitted CSS assumes a 16px root. */
const REM_PX = 16;

/** Code-only prefixes (FIGMA-SYNC.md rule 3) — never reach Figma. */
const CODE_ONLY_PREFIXES = ['z-index', 'breakpoint', 'icon', 'theme.icon'];
/** No Figma variable type exists for these. */
const NO_FIGMA_TYPE = [
  'animation.duration',
  'animation.timing',
  'theme.animation.duration',
  'theme.animation.timing',
];
/** Real tokens, but styles rather than variables. */
const STYLE_TYPES = new Set(['typography', 'boxShadow']);
/**
 * Percentage-valued tokens whose meaning does NOT survive as a bare Figma FLOAT.
 * `border.radius.round: 50%` is a pill; importing it as the number 50 would give
 * designers a 50px radius that silently disagrees with the code. Excluded rather
 * than imported wrong.
 */
const WRONG_AS_FLOAT = ['border.radius.round'];

/** Tokens Studio type → Figma resolvedType. */
const FIGMA_TYPE = {
  color: 'COLOR',
  sizing: 'FLOAT',
  spacing: 'FLOAT',
  borderWidth: 'FLOAT',
  borderRadius: 'FLOAT',
  opacity: 'FLOAT',
  fontSizes: 'FLOAT',
  lineHeights: 'FLOAT',
  letterSpacing: 'FLOAT',
  dimension: 'FLOAT',
  number: 'FLOAT',
  other: 'FLOAT',
  fontFamilies: 'STRING',
  fontWeights: 'STRING',
  textDecoration: 'STRING',
  textCase: 'STRING',
};

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const isExcluded = (path, list) => list.some((p) => path === p || path.startsWith(p + '.'));

/** Flatten a Tokens Studio tree to `{ 'a.b.c': {value, type} }`. */
function flatten(node, prefix = '', out = {}) {
  for (const [key, val] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === 'object' && 'value' in val) out[path] = val;
    else if (val && typeof val === 'object') flatten(val, path, out);
  }
  return out;
}

/**
 * Convert a Tokens Studio scalar to a Figma variable value.
 * Brace references pass through untouched — figma_setup_design_tokens resolves
 * `{a.b.c}` to an alias on the variable named `a/b/c`.
 */
function toFigmaValue(raw, figmaType, path, warnings) {
  if (typeof raw === 'string' && raw.startsWith('{') && raw.endsWith('}')) return raw;

  if (figmaType === 'COLOR') {
    const s = String(raw).trim();
    if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s)) return s.toUpperCase();

    // Figma takes hex; the source carries a few rgba() shadow colours.
    const rgba = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
    if (rgba) {
      const [r, g, b] = rgba.slice(1, 4).map((n) => Math.round(Number(n)));
      const a = rgba[4] === undefined ? 1 : Number(rgba[4]);
      const h = (n) => n.toString(16).padStart(2, '0').toUpperCase();
      const alpha = a >= 1 ? '' : h(Math.round(a * 255));
      return `#${h(r)}${h(g)}${h(b)}${alpha}`;
    }

    warnings.push(`${path}: unrecognised colour ${JSON.stringify(raw)} — passed through verbatim`);
    return s;
  }

  if (figmaType === 'FLOAT') {
    const s = String(raw).trim();
    if (s.endsWith('rem')) return parseFloat(s) * REM_PX;
    if (s.endsWith('px')) return parseFloat(s);
    if (s.endsWith('%')) {
      // Figma stores letterSpacing/percent-ish values as a bare number; the unit
      // does not survive as a variable. Recorded so it is not a silent loss.
      warnings.push(`${path}: '%' unit dropped — Figma FLOAT is unitless (${s} → ${parseFloat(s)})`);
      return parseFloat(s);
    }
    const n = Number(s);
    if (Number.isNaN(n)) {
      warnings.push(`${path}: cannot coerce ${JSON.stringify(raw)} to FLOAT — skipped`);
      return null;
    }
    return n;
  }

  return String(raw);
}

/** Build one single-mode collection from a list of token files. */
function buildFlatCollection(name, files, hideFromPublishing, report) {
  const tokens = {};
  for (const file of files) {
    const full = join(TOKENS, file);
    if (!existsSync(full)) {
      report.warnings.push(`missing token file: ${file}`);
      continue;
    }
    Object.assign(tokens, flatten(readJson(full)));
  }
  return { name, modes: ['Default'], hideFromPublishing, variables: { Default: tokens } };
}

/** Partition raw tokens into variables / styles / excluded, converting values. */
function partition(rawByMode, report) {
  const variables = {};
  for (const [mode, tokens] of Object.entries(rawByMode)) {
    variables[mode] = {};
    for (const [path, def] of Object.entries(tokens)) {
      if (isExcluded(path, CODE_ONLY_PREFIXES)) {
        report.excluded.codeOnly.add(path);
        continue;
      }
      if (isExcluded(path, NO_FIGMA_TYPE)) {
        report.excluded.noFigmaType.add(path);
        continue;
      }
      if (isExcluded(path, WRONG_AS_FLOAT)) {
        report.excluded.wrongAsFloat.add(`${path} (${def.value})`);
        continue;
      }
      if (STYLE_TYPES.has(def.type)) {
        (def.type === 'typography' ? report.styles.text : report.styles.effect)[path] = def;
        continue;
      }
      const figmaType = FIGMA_TYPE[def.type];
      if (!figmaType) {
        report.warnings.push(`${path}: unmapped Tokens Studio type '${def.type}' — skipped`);
        report.excluded.unmappedType.add(`${path} (${def.type})`);
        continue;
      }
      const value = toFigmaValue(def.value, figmaType, path, report.warnings);
      if (value === null) continue;
      variables[mode][path.replace(/\./g, '/')] = { value, resolvedType: figmaType };
    }
  }
  return variables;
}

function main() {
  const outArg = process.argv.indexOf('--out');
  const outPath = resolve(
    ROOT,
    outArg > -1 ? process.argv[outArg + 1] : '.altitude/figma-sync/altitude-figma-payload.json'
  );

  const report = {
    warnings: [],
    styles: { text: {}, effect: {} },
    excluded: {
      codeOnly: new Set(), noFigmaType: new Set(),
      unmappedType: new Set(), wrongAsFloat: new Set(),
    },
  };

  const tier1 = [
    'animations', 'base', 'borders', 'breakpoints', 'colors', 'icons',
    'layout', 'opacity', 'shadows', 'spacing', 'typography', 'z-index',
  ].map((f) => `tier-1/${f}.json`);

  const tier2 = [
    'animations', 'borders', 'icons', 'layout',
    'opacity', 'shadows', 'spacing', 'typography',
  ].map((f) => `tier-2/${f}.json`);

  const raw = [
    buildFlatCollection('Primitives', tier1, true, report),
    buildFlatCollection('Semantic', tier2, false, report),
    {
      name: 'Theme',
      modes: ['Light', 'Dark'],
      hideFromPublishing: false,
      variables: {
        Light: {
          ...flatten(readJson(join(TOKENS, 'tier-2/theme/light/colors.json'))),
          ...flatten(readJson(join(TOKENS, 'tier-3/theme/light/colors.json'))),
        },
        Dark: {
          ...flatten(readJson(join(TOKENS, 'tier-2/theme/dark/colors.json'))),
          ...flatten(readJson(join(TOKENS, 'tier-3/theme/dark/colors.json'))),
        },
      },
    },
  ];

  const collections = raw.map((c) => ({
    name: c.name,
    modes: c.modes,
    hideFromPublishing: c.hideFromPublishing,
    variables: partition(c.variables, report),
  }));

  // An alias whose target was excluded would import as a dangling reference.
  // Prune dependents transitively rather than shipping a broken variable.
  const defined = new Set(
    collections.flatMap((c) => c.modes.flatMap((m) => Object.keys(c.variables[m])))
  );
  const dangling = [];
  for (let changed = true; changed; ) {
    changed = false;
    for (const c of collections) {
      for (const m of c.modes) {
        for (const [name, def] of Object.entries(c.variables[m])) {
          if (typeof def.value !== 'string' || !def.value.startsWith('{')) continue;
          const target = def.value.slice(1, -1).replace(/\./g, '/');
          if (defined.has(target)) continue;
          dangling.push({ collection: c.name, mode: m, variable: name, missingTarget: target });
          delete c.variables[m][name];
          defined.delete(name);
          changed = true;
        }
      }
    }
  }

  // Figma requires a value in EVERY mode. Report asymmetry rather than papering
  // over it — a token present in one mode only cannot be imported honestly.
  const asymmetry = [];
  for (const c of collections) {
    if (c.modes.length < 2) continue;
    const union = new Set(c.modes.flatMap((m) => Object.keys(c.variables[m])));
    for (const name of union) {
      const missing = c.modes.filter((m) => !(name in c.variables[m]));
      if (missing.length) asymmetry.push({ collection: c.name, variable: name, missingModes: missing });
    }
  }

  const payload = {
    generatedFrom: 'libs/al-web-components/styles/tokens',
    scope: 'altitude-only (no Brand collection, no Southleft)',
    collections,
    styles: {
      text: report.styles.text,
      effect: report.styles.effect,
      note: 'Figma variables are COLOR|FLOAT|STRING|BOOLEAN only. These become text/effect styles.',
    },
    excluded: {
      codeOnly_ruleThree: [...report.excluded.codeOnly].sort(),
      noFigmaVariableType: [...report.excluded.noFigmaType].sort(),
      unmappedType: [...report.excluded.unmappedType].sort(),
      wrongAsFloat: [...report.excluded.wrongAsFloat].sort(),
    },
    asymmetry,
    danglingAliases: dangling,
    warnings: report.warnings,
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n');

  for (const c of collections) {
    const counts = c.modes.map((m) => `${m}=${Object.keys(c.variables[m]).length}`).join(' ');
    console.log(`${c.name.padEnd(11)} ${counts}`);
  }
  console.log(`text styles   ${Object.keys(report.styles.text).length}`);
  console.log(`effect styles ${Object.keys(report.styles.effect).length}`);
  console.log(`excluded      ${[...report.excluded.codeOnly].length + [...report.excluded.noFigmaType].length}`);
  if (dangling.length) {
    console.log(`
pruned ${dangling.length} dangling alias(es) — target excluded from Figma:`);
    for (const d of dangling) console.log(`  ${d.collection}/${d.variable} -> ${d.missingTarget}`);
  }
  if (asymmetry.length) {
    console.log(`\nMODE ASYMMETRY (blocks import — Figma needs a value in every mode):`);
    for (const a of asymmetry) console.log(`  ${a.collection}/${a.variable} missing in ${a.missingModes.join(',')}`);
  }
  if (report.warnings.length) {
    console.log(`\nwarnings (${report.warnings.length}):`);
    for (const w of report.warnings) console.log(`  ${w}`);
  }
  console.log(`\nwrote ${outPath}`);
}

main();
