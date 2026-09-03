// The authored METADATA on a design token, which the flat query dropped.
//
// WHAT WAS BEING LOST. `tokens.mjs` flattens the DTCG tree to
// `{ name, value, type }`, and `type` there is the DTCG `$type` — deliberately
// COARSE. `sizing`, `spacing`, `borderRadius`, `borderWidth`, `fontSizes` and
// `lineHeights` all collapse into `dimension`. So `altitude_get_tokens` told a
// caller that `al-theme-space-md` is a "dimension", which is true and useless:
// it does not say the token is for `margin`/`padding`/`gap` and not for
// `border-width`. The finer fact is authored, lives in
// `$extensions["org.altitude.token"].cssType`, and is NOT recoverable from
// `$type` — see scripts/lib/dtcg-token.mjs, whose `authoredType()` /
// `dtcgType()` split exists for exactly this question. Getting it backwards
// silently degrades 163 of 555 tokens.
//
// Alongside it, `$extensions["com.salesforce.styling"].cssProperties` is the
// DERIVED allow-list of concrete CSS properties the token may set
// (scripts/generate-token-metadata.mjs). That is the machine-checkable form of
// "which declarations is this token legal in", and it was not exposed at all.
//
// WHY THIS IS A DECORATOR AND NOT A REWRITE OF tokens.mjs. The query, the
// brand/mode scope map and the alias resolution in `tokens.mjs` are correct and
// well-tested; what was missing is metadata, not query logic. This module
// builds a name -> metadata index straight from the DTCG source and decorates
// whatever `queryTokens()` returned. One walk, no second query implementation,
// and the flat (non-DTCG) fast path gets the metadata too — a token's CSS
// custom-property NAME is stable across brand and mode, so the authored type of
// `al-theme-space-md` is the same fact whichever build produced its value.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { PATHS, HINTS, requireFile } from './paths.mjs';
import { queryTokens } from './tokens.mjs';

const ALTITUDE_EXT = 'org.altitude.token';
const STYLING_EXT = 'com.salesforce.styling';
const LLM_EXT = 'org.primer.llm';

let cache = null;
let cacheRoot = null;

/** Every `.json` under `dir`, at any depth. */
function jsonFilesUnder(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...jsonFilesUnder(full));
    else if (entry.name.endsWith('.json')) out.push(full);
  }
  return out;
}

/**
 * Walk a DTCG document, recording one metadata entry per token leaf.
 *
 * The SAME NAME may appear in several files — that is the whole point of the
 * brand and mode directories, which override a token's `$value` without
 * changing what the token is for. So a later file may fill in metadata a
 * previous one lacked, but never blanks metadata already recorded: the authored
 * type of a token is a property of the token, not of the brand that retunes it.
 */
function walk(node, segments, out) {
  if (node && typeof node === 'object' && '$value' in node) {
    const name = `al-${segments.join('-')}`;
    const extensions = node.$extensions ?? {};
    const entry = out.get(name) ?? {};
    // `authoredType()`'s rule, applied here rather than imported: this package
    // depends on nothing outside itself (scripts/lib is not published with it).
    const cssType = extensions[ALTITUDE_EXT]?.cssType;
    if (cssType && !entry.cssType) entry.cssType = cssType;
    const cssProperties = extensions[STYLING_EXT]?.cssProperties;
    if (Array.isArray(cssProperties) && !entry.cssProperties) entry.cssProperties = cssProperties;
    // `$description` is the DTCG standard field and takes precedence; the
    // Primer `usage` string is this repo's populated equivalent and is the one
    // that actually carries the "legal CSS surface" sentence today.
    const description = node.$description ?? extensions[LLM_EXT]?.usage;
    if (description && !entry.description) entry.description = description;
    if (!entry.dtcgType && node.$type) entry.dtcgType = node.$type;
    out.set(name, entry);
    return;
  }
  if (!node || typeof node !== 'object') return;
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    walk(child, [...segments, key], out);
  }
}

/** Build (and cache) the token-name -> authored-metadata index. */
export function loadTokenMetadata() {
  const root = PATHS.tokensDtcgDir;
  if (cache && cacheRoot === root) return cache;
  requireFile(root, HINTS.tokens);

  const index = new Map();
  for (const file of jsonFilesUnder(root)) {
    try {
      walk(JSON.parse(readFileSync(file, 'utf8')), [], index);
    } catch {
      // A single malformed token file must not blind the whole index. The
      // token-source gates (pnpm run generate:token-metadata) own that failure;
      // here the honest outcome is metadata missing for that file's tokens,
      // which surfaces as `cssType: null` rather than as a dead tool.
    }
  }
  cache = index;
  cacheRoot = root;
  return index;
}

/**
 * `queryTokens()` plus the authored metadata on every returned token.
 *
 * `cssType` and `cssProperties` are ALWAYS present, `null` / `[]` when the
 * token carries none — a token authored without a `cssType` gets no allow-list
 * (CLAUDE.md), and saying so is more useful than omitting the field and letting
 * a caller assume the allow-list is unbounded.
 */
export function queryTokensDetailed(options = {}) {
  const result = queryTokens(options);
  const metadata = loadTokenMetadata();

  return {
    ...result,
    tokens: result.tokens.map((token) => {
      const meta = metadata.get(token.name) ?? {};
      return {
        ...token,
        /**
         * The AUTHORED CSS surface — finer than `type`/`$type` and not
         * derivable from it. This is the field that says what the token is FOR.
         */
        cssType: meta.cssType ?? null,
        /** Concrete CSS properties this token is legal in. Empty = none derived. */
        cssProperties: meta.cssProperties ?? [],
        /** The DTCG standard type, for a caller that needs conformance not intent. */
        dtcgType: meta.dtcgType ?? token.type ?? null,
        description: meta.description ?? null,
      };
    }),
  };
}
