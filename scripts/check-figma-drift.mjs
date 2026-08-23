#!/usr/bin/env node
/**
 * check-figma-drift.mjs — deterministic Figma↔code token drift check (v1).
 *
 * Usage:
 *   node scripts/check-figma-drift.mjs <figma-export.json> [--project <id>] [--json]
 *
 * <figma-export.json> is a DTCG export produced by Figma Console MCP's
 * `figma_export_tokens` (save it to .altitude/figma-sync/last-export.json, or
 * the project-specific figmaSyncDir from .altitude/ds-projects.json — both
 * gitignored; never commit exports).
 *
 * `--project <id>` selects the design-system project (`.altitude/ds-projects.json`,
 * default `altitude`) whose Figma file the export came from. This matters
 * because `tier-2/brand/<brand>/**` is sparse, project-scoped override data —
 * Southleft's file has no "Altitude" brand mode and vice versa, so brand
 * entries for any OTHER project are excluded from every category rather than
 * reported as one-sided drift.
 *
 * Loop + fidelity rules: .altitude/FIGMA-SYNC.md
 *
 * v1 capability (supersedes the v0 name-only stub):
 *   - flattens both sides to dotted token paths, same as v0
 *   - VALUE comparison for paths present on both sides, with values
 *     normalized to a canonical form per declared type (color -> hex,
 *     dimension -> px, alias -> resolved dotted target, composite/shadow ->
 *     structurally normalized), so unit/case/whitespace differences that
 *     Style Dictionary would treat as identical are not reported as drift
 *   - BRAND/MODE awareness: code-side context (tier, brand, light/dark) is
 *     derived from each token file's path under `styles/tokens/`
 *     (tier-1 -> "primitive", tier-2 -> "semantic", tier-2/theme/{light,dark}
 *     -> "theme", tier-2/brand/<brand>[/mode/{light,dark}] -> "brand",
 *     tier-3/theme/{light,dark} -> "composed" — see the mapping table in
 *     .altitude/FIGMA-SYNC.md "What maps to what"). The Figma-export side is
 *     matched into the same buckets by recognizing top-level collection names
 *     (Primitive/Semantic/"Color Scheme"/Brand/Composed, case-insensitive)
 *     whose immediate children are all recognized mode names
 *     (default/light/dark, or a brand id read from `tier-2/brand/*`). A value
 *     that only differs in dark mode is reported against the dark-mode file,
 *     not as a blanket mismatch against every mode.
 *   - RENAME identity: a code-only path and a figma-only path in the SAME
 *     context bucket, with the SAME type family and an EXACTLY matching
 *     canonical value, are reported as `possible rename: old -> new` instead
 *     of two independent add/remove lines. Ambiguous matches (more than one
 *     candidate) are left as separate add/remove — guessing wrong is worse
 *     than not guessing.
 *   - `--json` for machine output; exits 1 on any drift, 0 when clean.
 *
 * Shape validation: confirmed against a REAL `figma_export_tokens` capture on
 * 2026-08-23 (format: dtcg, top-level sets `tier-1` / `tier-2` /
 * `tier-2-brand` / `tier-2-theme` plus `$extensions`) — the parser bucketed
 * all four collections correctly and produced a plausible first-contact
 * report (6 value drifts: px-unit loss on animation.distance + percent-vs-
 * fraction opacity; 30 systematic renames: `color.brand.*`→`color.neutral.*`,
 * bare typography paths→`typography.*`). The synthetic fixture in
 * scripts/__tests__/check-figma-drift.test.mjs remains the regression net;
 * an unrecognized shape still falls back to one flat, unscoped tree rather
 * than mis-bucketing silently.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* ------------------------------------------------------------------------ */
/* CLI args                                                                  */
/* ------------------------------------------------------------------------ */

const rawArgs = process.argv.slice(2);
const jsonOut = rawArgs.includes('--json');
const positional = [];
for (let i = 0; i < rawArgs.length; i++) {
  const a = rawArgs[i];
  if (a === '--') continue; // pnpm 9 forwards the bare `--` separator verbatim
  if (a === '--json') continue;
  if (a === '--project') { i++; continue; }
  if (a.startsWith('--project=')) continue;
  positional.push(a);
}
const exportPath = positional[0];

if (!exportPath) {
  console.error('Usage: node scripts/check-figma-drift.mjs <figma-export.json> [--project <id>] [--json]');
  process.exit(2);
}

let project = { id: 'altitude', brand: 'altitude' };
try {
  const { resolveProject } = await import('../libs/altitude-mcp/src/lib/ds-project.mjs');
  project = resolveProject();
} catch (err) {
  console.error(`[check-figma-drift] Could not resolve a DS project (${err.message}); defaulting to "altitude".`);
}

const TOKENS_DIR = join(ROOT, 'libs/al-web-components/styles/tokens');
const BRAND_DIR = join(TOKENS_DIR, 'tier-2/brand');
const KNOWN_BRANDS = existsSync(BRAND_DIR)
  ? readdirSync(BRAND_DIR).filter((n) => statSync(join(BRAND_DIR, n)).isDirectory())
  : [];

/** Paths that exist code-side only — excluded from drift by policy.
 *  See .altitude/FIGMA-SYNC.md "2026-08-20 — verified corrections": icons DO
 *  sync (removed from this list); z-index, breakpoint, and animation
 *  duration/timing genuinely have no Figma variable type. */
const CODE_ONLY_PREFIXES = ['z-index', 'breakpoint', 'animation.duration', 'animation.timing'];
const CODE_ONLY_EXACT = new Set(['border.radius.round']);
const isCodeOnlyPath = (p) =>
  CODE_ONLY_EXACT.has(p) || CODE_ONLY_PREFIXES.some((pre) => p === pre || p.startsWith(`${pre}.`));

/* ------------------------------------------------------------------------ */
/* Code-side loader                                                          */
/* ------------------------------------------------------------------------ */

function* jsonFiles(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('$')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* jsonFiles(full);
    else if (entry.endsWith('.json')) yield full;
  }
}

/** Derive {collection, mode, brand} from a token file's path under TOKENS_DIR. */
function contextFor(relFile) {
  const parts = relFile.split('/');
  const tier = parts[0];
  if (tier === 'tier-1') return { collection: 'primitive', mode: 'default', brand: null };
  if (parts[1] === 'theme') {
    return { collection: tier === 'tier-3' ? 'composed' : 'theme', mode: parts[2], brand: null };
  }
  if (parts[1] === 'brand') {
    const brand = parts[2];
    if (parts[3] === 'mode') return { collection: 'brand', mode: parts[4], brand };
    return { collection: 'brand', mode: 'default', brand };
  }
  return { collection: 'semantic', mode: 'default', brand: null };
}

function isTokenNode(node) {
  if (node === null || typeof node !== 'object') return false;
  if ('$value' in node) return true;
  if ('value' in node && 'type' in node) return true;
  return false;
}

function flattenTokenTree(node, prefix, ctx, file, out) {
  if (node === null || typeof node !== 'object') return;
  if (isTokenNode(node)) {
    const value = '$value' in node ? node.$value : node.value;
    const type = '$type' in node ? node.$type : node.type;
    out.push({ path: prefix, value, type, file, ...ctx });
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    flattenTokenTree(child, prefix ? `${prefix}.${key}` : key, ctx, file, out);
  }
}

function loadCodeEntries(tokensDir) {
  const out = [];
  for (const file of jsonFiles(tokensDir)) {
    const rel = relative(tokensDir, file).split(sep).join('/');
    const ctx = contextFor(rel);
    const json = JSON.parse(readFileSync(file, 'utf8'));
    flattenTokenTree(json, '', ctx, rel, out);
  }
  return out;
}

/* ------------------------------------------------------------------------ */
/* Figma-export-side parser (DTCG or legacy, collection/mode aware)          */
/* ------------------------------------------------------------------------ */

const COLLECTION_ALIASES = {
  primitive: 'primitive', tier1: 'primitive',
  semantic: 'semantic', tier2: 'semantic',
  colorscheme: 'theme', theme: 'theme', tier2theme: 'theme',
  brand: 'brand', tier2brand: 'brand',
  composed: 'composed', tier3: 'composed', tier3theme: 'composed',
};
const normKey = (k) => k.toLowerCase().replace(/[\s_-]/g, '');

const THEME_MODE_NAMES = new Set(['default', 'light', 'dark']);
const BRAND_MODE_NAMES = new Set(KNOWN_BRANDS.map((b) => b.toLowerCase()));

function walk(node, prefix, ctx, out) {
  if (node === null || typeof node !== 'object') return;
  if (isTokenNode(node)) {
    const value = '$value' in node ? node.$value : node.value;
    const type = '$type' in node ? node.$type : node.type;
    out.push({ path: prefix, value, type, ...ctx });
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    walk(child, prefix ? `${prefix}.${key}` : key, ctx, out);
  }
}

/** Recurse through a collection node, peeling off mode/brand-named wrapper
 *  levels (Light/Dark, Altitude/Southleft) until the remaining keys stop
 *  being entirely mode names, then walk the rest as a plain token tree. */
function resolveCollectionNode(node, ctxBase, out) {
  const keys = node && typeof node === 'object' && !isTokenNode(node) ? Object.keys(node).filter((k) => !k.startsWith('$')) : [];
  const modeLike = keys.length > 0 && keys.every((k) => THEME_MODE_NAMES.has(k.toLowerCase()) || BRAND_MODE_NAMES.has(k.toLowerCase()));
  if (!modeLike) {
    walk(node, '', ctxBase, out);
    return;
  }
  for (const key of keys) {
    const lower = key.toLowerCase();
    if (BRAND_MODE_NAMES.has(lower) && ctxBase.brand == null) {
      resolveCollectionNode(node[key], { ...ctxBase, brand: lower }, out);
    } else if (THEME_MODE_NAMES.has(lower)) {
      resolveCollectionNode(node[key], { ...ctxBase, mode: lower }, out);
    } else {
      resolveCollectionNode(node[key], ctxBase, out);
    }
  }
}

function parseFigmaExport(raw) {
  const out = [];
  const topKeys = Object.keys(raw).filter((k) => !k.startsWith('$'));
  const anyCollectionKey = topKeys.some((k) => COLLECTION_ALIASES[normKey(k)]);
  if (!anyCollectionKey) {
    // No recognized collection wrapper — treat the whole export as one flat,
    // unscoped tree (v0-compatible fallback; see the header comment).
    walk(raw, '', { collection: 'unknown', mode: 'default', brand: null }, out);
    return out;
  }
  for (const key of topKeys) {
    const collection = COLLECTION_ALIASES[normKey(key)] ?? 'unknown';
    const node = raw[key];
    if (collection === 'primitive' || collection === 'semantic' || collection === 'unknown') {
      // These collections have only a Default mode — see FIGMA-SYNC.md.
      walk(node, '', { collection, mode: 'default', brand: null }, out);
    } else {
      resolveCollectionNode(node, { collection, mode: 'default', brand: null }, out);
    }
  }
  return out;
}

/* ------------------------------------------------------------------------ */
/* Value canonicalization                                                    */
/* ------------------------------------------------------------------------ */

const REM = 16;
function parseNum(v) {
  if (typeof v === 'number') return v;
  const s = String(v).trim();
  if (/^-?\d+(\.\d+)?rem$/.test(s)) return parseFloat(s) * REM;
  if (/^-?\d+(\.\d+)?px$/.test(s)) return parseFloat(s);
  if (/^-?\d+(\.\d+)?%$/.test(s)) return { pct: parseFloat(s) };
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}
function normHex(h) {
  let s = String(h).replace('#', '').toUpperCase();
  if (s.length === 3 || s.length === 4) s = s.split('').map((c) => c + c).join('');
  if (s.length === 8 && s.slice(6) === 'FF') s = s.slice(0, 6);
  return '#' + s;
}
function rgbaToHex(s) {
  const m = String(s).match(/^rgba?\(([^)]+)\)$/i);
  if (!m) return null;
  const parts = m[1].split(',').map((x) => parseFloat(x.trim()));
  const h = (n) => Math.round(n).toString(16).padStart(2, '0').toUpperCase();
  const a = parts.length > 3 ? parts[3] : 1;
  return '#' + h(parts[0]) + h(parts[1]) + h(parts[2]) + (a < 1 ? h(a * 255) : '');
}

/** Tokens Studio `type` (and DTCG `$type`) -> comparison family. Mirrors the
 *  vocabulary `scripts/convert-tokens-to-dtcg.js` maps to DTCG types — kept
 *  in step deliberately rather than importing (that script is CommonJS). */
const TYPE_FAMILY = {
  color: 'color',
  dimension: 'dimension', sizing: 'dimension', spacing: 'dimension',
  borderRadius: 'dimension', borderWidth: 'dimension', fontSizes: 'dimension', lineHeights: 'dimension',
  fontFamily: 'fontFamily', fontFamilies: 'fontFamily',
  fontWeight: 'fontWeight', fontWeights: 'fontWeight',
  number: 'number', opacity: 'number',
  shadow: 'shadow', boxShadow: 'shadow',
};
const typeFamily = (type) => TYPE_FAMILY[type] || String(type ?? 'other').toLowerCase();

const COLLECTION_PREFIXES = ['primitive.', 'semantic.', 'theme.', 'brand.', 'composed.', 'tier-1.', 'tier-2.', 'tier-3.'];
function normalizeAliasTarget(raw) {
  let s = raw.trim();
  if (s.startsWith('{') && s.endsWith('}')) s = s.slice(1, -1);
  s = s.replace(/\//g, '.').trim();
  const lower = s.toLowerCase();
  for (const pre of COLLECTION_PREFIXES) {
    if (lower.startsWith(pre)) { s = s.slice(pre.length); break; }
  }
  return s;
}
const isAliasValue = (v) => typeof v === 'string' && /^\{.*\}$/.test(v.trim());

const COMPOSITE_FIELD_TYPE = {
  fontFamily: 'fontFamily', fontWeight: 'fontWeight', fontSize: 'dimension',
  lineHeight: 'dimension', paragraphSpacing: 'dimension',
};
function canonComposite(value) {
  if (Array.isArray(value)) return value.map(canonComposite);
  if (value === null || typeof value !== 'object') return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (COMPOSITE_FIELD_TYPE[k]) out[k] = canon(v, COMPOSITE_FIELD_TYPE[k]);
    else if (v !== null && typeof v === 'object') out[k] = canonComposite(v);
    else out[k] = v;
  }
  return out;
}

/** `x`/`y` (Tokens Studio) vs `offsetX`/`offsetY` (DTCG) name the same
 *  field; `type: "dropShadow"|"innerShadow"` (Tokens Studio) vs DTCG's
 *  `inset` boolean likewise — normalized here so a shadow that round-trips
 *  through DTCG naming doesn't read as drift against its own source. */
const SHADOW_KEY_MAP = { x: 'offsetX', y: 'offsetY', offsetX: 'offsetX', offsetY: 'offsetY', blur: 'blur', spread: 'spread' };
function canonShadowLayer(layer) {
  if (!layer || typeof layer !== 'object') return layer;
  const out = {};
  for (const [k, v] of Object.entries(layer)) {
    if (k === 'type') { out.inset = v === 'innerShadow'; continue; }
    if (k === 'inset') { out.inset = !!v; continue; }
    if (k === 'color') { out.color = canon(v, 'color'); continue; }
    const key = SHADOW_KEY_MAP[k] || k;
    out[key] = canon(v, 'dimension');
  }
  if (!('inset' in out)) out.inset = false;
  return out;
}
const canonShadow = (value) => (Array.isArray(value) ? value : [value]).map(canonShadowLayer);

/** Normalize a raw token value into a comparable, type-aware shape. */
function canon(value, type) {
  if (isAliasValue(value)) return { kind: 'alias', target: normalizeAliasTarget(value) };
  const family = typeFamily(type);
  if (family === 'color') {
    if (typeof value === 'string') {
      if (value.startsWith('#')) return { kind: 'color', hex: normHex(value) };
      const hex = rgbaToHex(value);
      if (hex) return { kind: 'color', hex: normHex(hex) };
    }
    return { kind: 'raw', value: String(value) };
  }
  if (family === 'dimension') {
    const n = parseNum(value);
    if (n && typeof n === 'object' && 'pct' in n) return { kind: 'percent', value: n.pct };
    if (typeof n === 'number') return { kind: 'number', value: n };
    return { kind: 'raw', value: String(value) };
  }
  if (family === 'number') {
    const n = typeof value === 'number' ? value : parseFloat(value);
    return Number.isNaN(n) ? { kind: 'raw', value: String(value) } : { kind: 'number', value: n };
  }
  if (family === 'shadow') return { kind: 'shadow', value: canonShadow(value) };
  if (value !== null && typeof value === 'object') return { kind: 'composite', value: canonComposite(value) };
  return { kind: 'raw', value: String(value) };
}

function sameCanon(a, b) {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case 'alias': return a.target === b.target;
    case 'color': return a.hex === b.hex;
    case 'number':
    case 'percent': return Math.abs(a.value - b.value) < 0.001;
    case 'shadow':
    case 'composite': return JSON.stringify(a.value) === JSON.stringify(b.value);
    default: return String(a.value) === String(b.value);
  }
}
function showCanon(c) {
  switch (c.kind) {
    case 'alias': return `{${c.target}}`;
    case 'color': return c.hex;
    case 'number': return String(c.value);
    case 'percent': return `${c.value}%`;
    default: return JSON.stringify(c.value);
  }
}
const showRaw = (v) => (typeof v === 'object' ? JSON.stringify(v) : String(v));

/* ------------------------------------------------------------------------ */
/* Diff                                                                       */
/* ------------------------------------------------------------------------ */

function groupByContext(entries) {
  const map = new Map();
  for (const e of entries) {
    const key = `${e.collection}:${e.brand ?? '-'}:${e.mode}`;
    if (!map.has(key)) map.set(key, new Map());
    map.get(key).set(e.path, e);
  }
  return map;
}

/** Preferred flat view of the code tree for an unscoped (name-only) export:
 *  prefer each path's Default/no-brand entry; fall back to the first seen
 *  (e.g. a light-mode value) when no Default entry exists for that path. */
function mergedDefaultCodeMap(entries) {
  const fallback = new Map();
  const preferred = new Map();
  for (const e of entries) {
    if (!fallback.has(e.path)) fallback.set(e.path, e);
    if (e.mode === 'default' && e.brand === null) preferred.set(e.path, e);
  }
  return new Map([...fallback, ...preferred]);
}

function detectRenames(codeOnly, figmaOnly) {
  const renames = [];
  const usedCode = new Set();
  const usedFigma = new Set();
  for (const c of codeOnly) {
    const cFam = typeFamily(c.type);
    const cCanon = JSON.stringify(canon(c.value, c.type));
    const candidates = figmaOnly.filter(
      (f) => !usedFigma.has(f) && typeFamily(f.type) === cFam && JSON.stringify(canon(f.value, f.type)) === cCanon,
    );
    if (candidates.length === 1) {
      renames.push({ context: c.__ctxLabel, from: c.path, to: candidates[0].path, type: cFam });
      usedCode.add(c);
      usedFigma.add(candidates[0]);
    }
  }
  return { renames, usedCode, usedFigma };
}

function compareContext(codeMap, figmaMap, contextLabel, report) {
  const paths = new Set([...codeMap.keys(), ...figmaMap.keys()]);
  const codeOnly = [];
  const figmaOnly = [];

  for (const p of paths) {
    if (isCodeOnlyPath(p)) continue;
    const c = codeMap.get(p);
    const f = figmaMap.get(p);
    if (c && f) {
      const cc = canon(c.value, c.type);
      const fc = canon(f.value, f.type);
      if (!sameCanon(cc, fc)) {
        report.valueDrift.push({
          context: contextLabel, path: p,
          code: showRaw(c.value), figma: showRaw(f.value),
          codeCanon: showCanon(cc), figmaCanon: showCanon(fc),
        });
      }
    } else if (c) {
      codeOnly.push({ ...c, __ctxLabel: contextLabel });
    } else if (f) {
      figmaOnly.push({ ...f, __ctxLabel: contextLabel });
    }
  }

  const { renames, usedCode, usedFigma } = detectRenames(codeOnly, figmaOnly);
  report.possibleRenames.push(...renames);
  for (const e of codeOnly) if (!usedCode.has(e)) report.missingInFigma.push({ context: contextLabel, path: e.path, file: e.file, value: showRaw(e.value) });
  for (const e of figmaOnly) if (!usedFigma.has(e)) report.missingInCode.push({ context: contextLabel, path: e.path, value: showRaw(e.value) });
}

/* ------------------------------------------------------------------------ */
/* Main                                                                       */
/* ------------------------------------------------------------------------ */

let figmaRaw;
try {
  figmaRaw = JSON.parse(readFileSync(exportPath, 'utf8'));
} catch (err) {
  console.error(`[check-figma-drift] Could not read/parse ${exportPath}: ${err.message}`);
  process.exit(2);
}

// Brand overrides are project-scoped: a project's Figma file only carries
// its own brand's mode, so another project's sparse overrides are out of
// scope entirely (never "missing", never diffed) — see the header comment.
// Applied to BOTH sides so a foreign-brand context never appears in either
// grouping (filtering only the code side would make any stray foreign-brand
// data in the export read as false missing-in-code).
const inProjectScope = (e) => !(e.collection === 'brand' && e.brand && e.brand !== project.brand);

const allCodeEntries = loadCodeEntries(TOKENS_DIR);
const codeEntries = allCodeEntries.filter(inProjectScope);

const allFigmaEntries = parseFigmaExport(figmaRaw);
const figmaEntries = allFigmaEntries.filter(inProjectScope);
const scopedFigmaEntries = figmaEntries.filter((e) => e.collection !== 'unknown');

const report = { missingInFigma: [], missingInCode: [], valueDrift: [], possibleRenames: [] };

if (scopedFigmaEntries.length) {
  const codeByCtx = groupByContext(codeEntries);
  const figmaByCtx = groupByContext(scopedFigmaEntries);
  const allCtx = new Set([...codeByCtx.keys(), ...figmaByCtx.keys()]);
  for (const ctx of [...allCtx].sort()) {
    compareContext(codeByCtx.get(ctx) ?? new Map(), figmaByCtx.get(ctx) ?? new Map(), ctx, report);
  }
  const strayFigma = figmaEntries.filter((e) => e.collection === 'unknown');
  if (strayFigma.length) {
    compareContext(mergedDefaultCodeMap(codeEntries), new Map(strayFigma.map((e) => [e.path, e])), 'flat(unscoped keys)', report);
  }
} else {
  compareContext(mergedDefaultCodeMap(codeEntries), new Map(figmaEntries.map((e) => [e.path, e])), 'flat', report);
}

/* ------------------------------------------------------------------------ */
/* Output                                                                     */
/* ------------------------------------------------------------------------ */

const totalDrift = report.missingInFigma.length + report.missingInCode.length + report.valueDrift.length + report.possibleRenames.length;
const summary = {
  missingInFigma: report.missingInFigma.length,
  missingInCode: report.missingInCode.length,
  valueDrift: report.valueDrift.length,
  possibleRenames: report.possibleRenames.length,
  total: totalDrift,
};

if (jsonOut) {
  console.log(JSON.stringify({ project: project.id, summary, ...report }, null, 2));
} else {
  console.log(`Project: ${project.id}${project.brand ? ` (brand: ${project.brand})` : ''}`);
  console.log(`Code token entries:  ${codeEntries.length}`);
  console.log(`Figma token entries: ${figmaEntries.length}${scopedFigmaEntries.length ? '' : ' (no recognized collection wrapper — flat comparison)'}`);
  console.log('');

  if (totalDrift === 0) {
    console.log('✔ No drift.');
  } else {
    if (report.valueDrift.length) {
      console.log(`value-drift (${report.valueDrift.length}):`);
      for (const d of report.valueDrift) console.log(`  [${d.context}] ${d.path}  code=${d.code} (${d.codeCanon})  figma=${d.figma} (${d.figmaCanon})`);
      console.log('');
    }
    if (report.possibleRenames.length) {
      console.log(`possible-renames (${report.possibleRenames.length}):`);
      for (const r of report.possibleRenames) console.log(`  [${r.context}] possible rename: ${r.from} -> ${r.to}`);
      console.log('');
    }
    if (report.missingInFigma.length) {
      console.log(`missing-in-figma (${report.missingInFigma.length}):`);
      for (const e of report.missingInFigma) console.log(`  [${e.context}] - ${e.path} (${e.value})`);
      console.log('');
    }
    if (report.missingInCode.length) {
      console.log(`missing-in-code (${report.missingInCode.length}):`);
      for (const e of report.missingInCode) console.log(`  [${e.context}] + ${e.path} (${e.value})`);
      console.log('');
    }
    console.log(`Summary: ${summary.valueDrift} value-drift, ${summary.possibleRenames} possible-renames, ${summary.missingInFigma} missing-in-figma, ${summary.missingInCode} missing-in-code (total: ${summary.total})`);
    console.log('\nReconcile per .altitude/FIGMA-SYNC.md, then re-run.');
  }
}

process.exit(totalDrift === 0 ? 0 : 1);
