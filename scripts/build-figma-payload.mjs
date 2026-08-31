#!/usr/bin/env node
/**
 * build-figma-payload.mjs — generate the Altitude → Figma variable payload.
 *
 * Usage:
 *   node scripts/build-figma-payload.mjs [--out .altitude/figma-sync/altitude-figma-payload.json]
 *
 * Reads the hand-authored DTCG source of truth
 * (libs/al-web-components/styles/tokens-dtcg) and emits a Figma-ready payload: three orthogonal collections, values already
 * converted to the four types Figma variables actually support.
 *
 * Scope (decided 2026-08-20): **Altitude raw tokens only**. No Brand collection,
 * no Southleft. tier-2/brand/** is skipped wholesale — the altitude brand layer is
 * byte-identical to tier-2/theme/**, which is why no tokens-brand-altitude*.scss
 * partial is ever emitted.
 *
 * Collections
 *   Tier 1 | Primitive   Default      tier-1/*            hidden from publishing
 *   Tier 2 | Semantic    Default      tier-2/* (non-colour)
 *   Tier 2 | Theme       Light, Dark  tier-2/theme/{light,dark}/colors + focus-ring
 *   Tier 3 | Component   Light, Dark  tier-3 header/body background
 *
 * Names and placement MIRROR THE LIVE FILE — see the comment at the assembly
 * below for why a mismatch is destructive rather than cosmetic.
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
import { isTokenLeaf, normalizeLeaf } from './lib/dtcg-token.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TOKENS = join(ROOT, 'libs/al-web-components/styles/tokens-dtcg');

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

/** Authored `cssType` (see scripts/lib/dtcg-token.mjs) → Figma resolvedType.
 *  Keyed on cssType, NOT DTCG `$type`: `$type` collapses boxShadow→shadow and
 *  every dimension-ish type→dimension, which would misroute the style types. */
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

/** Flatten the DTCG tree to `{ 'a.b.c': {value, type} }` (type = authored cssType). */
function flatten(node, prefix = '', out = {}) {
  for (const [key, val] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (isTokenLeaf(val)) out[path] = normalizeLeaf(val);
    else if (val && typeof val === 'object') flatten(val, path, out);
  }
  return out;
}

/**
 * Convert a token scalar to a Figma variable value.
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
        report.warnings.push(`${path}: unmapped cssType '${def.type}' — skipped`);
        report.excluded.unmappedType.add(`${path} (${def.type})`);
        continue;
      }
      let value = toFigmaValue(def.value, figmaType, path, report.warnings);
      if (value === null) continue;

      /**
       * OPACITY IS A PERCENTAGE ON THE FIGMA SIDE — 100x the code's fraction.
       *
       * The token tree authors opacity as a 0..1 fraction, which is what CSS
       * wants. Figma's variable for the same thing holds 40, not 0.4, and a
       * node binding its `opacity` to that variable divides by 100. Emitting
       * the fraction is not a rounding difference, it is 100x too transparent:
       * PROVEN LIVE 2026-08-27 on al-field-note State=Disabled —
       *     opacity/40 = 0.4  ->  node.opacity === 0.004  (invisible)
       *     opacity/40 = 40   ->  node.opacity === 0.4    (correct)
       * The live file already holds the percentages (24/40/80/100, dumped and
       * compared 2026-08-30); without this the first push would have silently
       * broken every disabled state in the library, which is the same
       * regression `scripts/figma-var-fixes.mjs` documents at its top.
       *
       * Only the tier-1 LITERALS convert. `theme.opacity.disabled` is an alias
       * (`{opacity.40}`) and passes through as a reference, unscaled.
       */
      if (def.type === 'opacity' && typeof value === 'number') value = value * 100;

      /**
       * A FIGMA FONT-FAMILY VARIABLE HOLDS ONE FAMILY, NOT A CSS STACK.
       *
       * The token authors the full fallback chain ("IBM Plex Mono, ui-monospace,
       * SFMono-Regular, Menlo, Consolas, monospace") because that is what CSS
       * needs. Figma resolves a font-family STRING against installed fonts by
       * exact name: the comma list matches nothing, so any text style bound to
       * it silently falls back to the document default. Only the first family
       * is the design intent; the rest are a browser degradation path Figma has
       * no equivalent for. Quotes are stripped too ("Space Grotesk" arrives
       * unquoted in Figma).
       */
      if (def.type === 'fontFamilies' && typeof value === 'string') {
        value = value.split(',')[0].trim().replace(/^["']|["']$/g, '');
      }

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

  /**
   * COLLECTION NAMES AND PLACEMENT MIRROR THE LIVE FILE — they are not free
   * choices. Figma matches a collection by NAME on import: a payload naming its
   * collections "Primitives"/"Semantic"/"Theme" does not update
   * "Tier 1 | Primitive"/"Tier 2 | Semantic"/"Tier 2 | Theme", it CREATES THREE
   * NEW COLLECTIONS beside them, duplicating ~360 variables and orphaning every
   * binding in the file. Measured against the live file 2026-08-30 (dump via
   * bridge-io -> .altitude/figma-sync/figma-live-vars.json) before the first push.
   *
   * Two collections in the file are deliberately NOT emitted here and must be
   * left alone: `Tier 2 | Brand` (4 modes) is out of scope per the header, and
   * anything else a designer added is not ours to overwrite.
   *
   * The tier-3 SPLIT is also the live file's shape, not the token tree's:
   * `theme/color/{header,body}/background` live in `Tier 3 | Component`, while
   * `theme/color/focus-ring` — authored in the same tier-3 files — lives in
   * `Tier 2 | Theme`. Following the code's tiering instead would move
   * focus-ring between collections and break every node already bound to it.
   */
  // DOT paths, not slash: `flatten()` emits `a.b.c` and `partition()` is what
  // converts to Figma's `a/b/c` later. Matching on the slash form here selects
  // nothing and silently leaves Tier 3 | Component empty.
  const TIER3_COMPONENT = new Set(['theme.color.header.background', 'theme.color.body.background']);
  const pick = (obj, want) => Object.fromEntries(Object.entries(obj).filter(([k]) => TIER3_COMPONENT.has(k) === want));

  const themeLight = {
    ...flatten(readJson(join(TOKENS, 'tier-2/theme/light/colors.json'))),
    ...flatten(readJson(join(TOKENS, 'tier-3/theme/light/colors.json'))),
  };
  const themeDark = {
    ...flatten(readJson(join(TOKENS, 'tier-2/theme/dark/colors.json'))),
    ...flatten(readJson(join(TOKENS, 'tier-3/theme/dark/colors.json'))),
  };

  const raw = [
    buildFlatCollection('Tier 1 | Primitive', tier1, true, report),
    buildFlatCollection('Tier 2 | Semantic', tier2, false, report),
    {
      name: 'Tier 2 | Theme',
      modes: ['Light', 'Dark'],
      hideFromPublishing: false,
      variables: { Light: pick(themeLight, false), Dark: pick(themeDark, false) },
    },
    {
      name: 'Tier 3 | Component',
      modes: ['Light', 'Dark'],
      hideFromPublishing: false,
      variables: { Light: pick(themeLight, true), Dark: pick(themeDark, true) },
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
    generatedFrom: 'libs/al-web-components/styles/tokens-dtcg',
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
