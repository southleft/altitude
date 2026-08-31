// Reads two generated surfaces:
//
//  - dist/css/tokens.json + dist/css/aliases.json — the flat, fully-resolved
//    `--al-*` -> value map Style Dictionary v5 ships (the "default" build:
//    altitude brand, light mode).
//  - styles/tokens-dtcg/{tier-1,tier-2,tier-3}/** — the DTCG source tree
//    those flat files are built from, which is the only place tier / brand /
//    mode metadata lives (a token's CSS custom-property NAME is stable
//    across brand/mode; only its VALUE changes, via a different directory).
//
// Both are read-only inputs. This module never writes to either.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS, HINTS, requireFile } from './paths.mjs';

let flatCache = null;
let dtcgCache = null;

export function loadFlatTokens() {
  if (flatCache) return flatCache;
  // Prefer the packaged copy (full build); fall back to the styles/dist/
  // output that `build:tokens` — the command HINTS.tokens names — produces.
  const tokensPath = existsSync(PATHS.tokensJson) ? PATHS.tokensJson : PATHS.tokensJsonFallback;
  const aliasesPath = existsSync(PATHS.aliasesJson) ? PATHS.aliasesJson : PATHS.aliasesJsonFallback;
  requireFile(tokensPath, HINTS.tokens);
  requireFile(aliasesPath, HINTS.tokens);
  const tokens = JSON.parse(readFileSync(tokensPath, 'utf8'));
  const aliasesDoc = JSON.parse(readFileSync(aliasesPath, 'utf8'));
  flatCache = { tokens, aliases: aliasesDoc.aliases ?? {} };
  return flatCache;
}

/** Recursively flatten a DTCG token tree into {name, value, type} leaves. */
function flattenDtcg(node, pathSegs, out) {
  if (node && typeof node === 'object' && '$value' in node) {
    out.push({ name: `al-${pathSegs.join('-')}`, value: node.$value, type: node.$type });
    return;
  }
  if (!node || typeof node !== 'object') return;
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    flattenDtcg(child, [...pathSegs, key], out);
  }
}

function flattenFile(file, tier, extra) {
  const doc = JSON.parse(readFileSync(file, 'utf8'));
  const leaves = [];
  flattenDtcg(doc, [], leaves);
  return leaves.map((l) => ({ ...l, tier, ...extra }));
}

function jsonFilesIn(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => join(dir, f));
}

/**
 * Every .json under `dir`, at any depth, paired with the path segments between
 * `dir` and the file.
 *
 * `jsonFilesIn` above is deliberately flat and stays that way — tier-1/tier-2
 * roots are single-level. A BRAND directory is not: a brand may carry its own
 * mode overrides at `<brand>/mode/<mode>/*.json`, and reading it flat silently
 * dropped every one of them. Measured before this fix: southleft's 18 mode
 * tokens (9 dark + 9 light) never entered the index, so `altitude_get_tokens`
 * under-reported and no caller could see that southleft themes differently per
 * mode at all.
 */
function jsonFilesUnder(dir, prefix = []) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...jsonFilesUnder(full, [...prefix, entry.name]));
    else if (entry.name.endsWith('.json')) out.push({ file: full, segments: prefix });
  }
  return out;
}

/** Build (and cache) the full tier/brand/mode-tagged token record list. */
export function loadDtcgIndex() {
  if (dtcgCache) return dtcgCache;
  requireFile(PATHS.tokensDtcgDir, HINTS.tokens);
  const root = PATHS.tokensDtcgDir;
  const records = [];

  for (const f of jsonFilesIn(join(root, 'tier-1'))) records.push(...flattenFile(f, 1, {}));
  for (const f of jsonFilesIn(join(root, 'tier-2'))) records.push(...flattenFile(f, 2, {}));

  const brandDir = join(root, 'tier-2', 'brand');
  if (existsSync(brandDir)) {
    for (const brand of readdirSync(brandDir)) {
      // Recursive: a brand may nest per-mode overrides under `mode/<mode>/`.
      // The segments between the brand root and the file tell us which.
      for (const { file, segments } of jsonFilesUnder(join(brandDir, brand))) {
        const modeIdx = segments.indexOf('mode');
        const mode = modeIdx >= 0 ? segments[modeIdx + 1] : undefined;
        records.push(...flattenFile(file, 2, mode ? { brand, mode } : { brand }));
      }
    }
  }

  for (const tier of [2, 3]) {
    const themeDir = join(root, tier === 2 ? 'tier-2' : 'tier-3', 'theme');
    if (!existsSync(themeDir)) continue;
    for (const mode of readdirSync(themeDir)) {
      for (const f of jsonFilesIn(join(themeDir, mode))) {
        records.push(...flattenFile(f, tier, { mode }));
      }
    }
  }

  dtcgCache = records;
  return records;
}

/** "{a.b.c}" -> "al-a-b-c" (a whole-string DTCG alias reference). */
function refToName(value) {
  const m = /^\{([\w.-]+)\}$/.exec(String(value));
  return m ? `al-${m[1].replace(/\./g, '-')}` : null;
}

/** Best-effort alias resolution within a (brand, mode) scope, depth-capped. */
function resolveValue(name, scopeMap, flat, depth = 0) {
  if (depth > 5) return { value: undefined, unresolved: true };
  const raw = scopeMap.get(name) ?? flat.tokens[name];
  if (raw === undefined) return { value: undefined, unresolved: true };
  const refName = refToName(raw);
  if (!refName) return { value: raw, unresolved: false };
  return resolveValue(refName, scopeMap, flat, depth + 1);
}

function buildScopeMap(records, { brand, mode }) {
  const map = new Map();
  for (const r of records) {
    if (r.tier === 1 && !r.brand && !r.mode) map.set(r.name, r.value);
  }
  for (const r of records) {
    if (r.tier === 2 && !r.brand && !r.mode) map.set(r.name, r.value);
  }
  if (brand) for (const r of records) if (r.tier === 2 && r.brand === brand) map.set(r.name, r.value);
  if (mode) for (const r of records) if (r.tier === 2 && r.mode === mode) map.set(r.name, r.value);
  if (mode) for (const r of records) if (r.tier === 3 && r.mode === mode) map.set(r.name, r.value);
  return map;
}

/**
 * @param {{tier?: string|number, brand?: string, mode?: string, name?: string, limit?: number}} opts
 */
export function queryTokens({ tier, brand, mode, name, limit = 200 } = {}) {
  const flat = loadFlatTokens();
  const tierNum = tier == null || tier === '' ? undefined : Number(String(tier).replace(/[^0-9]/g, ''));
  const nameQuery = name?.toLowerCase().trim();

  // Fast path: no DTCG-scoped filters requested — just the flat resolved set.
  if (tierNum === undefined && !brand && !mode) {
    const entries = Object.entries(flat.tokens)
      .filter(([n]) => !nameQuery || n.toLowerCase().includes(nameQuery))
      .slice(0, limit)
      .map(([n, value]) => ({ name: n, value, alias: flat.aliases[n] ?? null, source: 'tokens.json' }));
    return { count: entries.length, tokens: entries };
  }

  const records = loadDtcgIndex();
  const scopeMap = buildScopeMap(records, { brand, mode });
  const filtered = records.filter((r) => {
    if (tierNum !== undefined && r.tier !== tierNum) return false;
    if (brand && r.brand !== brand) return false;
    if (mode && r.mode !== mode) return false;
    if (nameQuery && !r.name.toLowerCase().includes(nameQuery)) return false;
    return true;
  });

  const out = filtered.slice(0, limit).map((r) => {
    const resolved = resolveValue(r.name, scopeMap, flat);
    return {
      name: r.name,
      tier: r.tier,
      brand: r.brand ?? null,
      mode: r.mode ?? null,
      rawValue: r.value,
      resolvedValue: resolved.unresolved ? null : resolved.value,
      type: r.type ?? null,
    };
  });
  return { count: out.length, totalMatched: filtered.length, tokens: out };
}
