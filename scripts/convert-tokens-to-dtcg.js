#!/usr/bin/env node
/**
 * T1.1 — Convert legacy Altitude token JSON into DTCG (`$value`/`$type`).
 *
 * Reads:  libs/al-web-components/styles/tokens/{tier-1,tier-2,tier-3}/**.json
 * Writes: libs/al-web-components/styles/tokens-dtcg/{tier-1,tier-2,tier-3}/**.json
 *
 * Conversion is mechanical: any leaf object that has a `value` key is treated
 * as a token; we rename `value` → `$value`, `type` → `$type`, and keep all
 * other keys as-is (so Tokens Studio metadata survives). The tree shape is
 * preserved so existing aliases like `{color.neutral.light.800}` keep
 * resolving with no path edit.
 *
 * Also passes through:
 *   - $metadata.json, $themes.json (untouched, Tokens Studio compatibility).
 *
 * Idempotent: re-running over an already-converted tree is a no-op.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..');
const SRC = path.join(REPO, 'libs', 'al-web-components', 'styles', 'tokens');
const DST = path.join(REPO, 'libs', 'al-web-components', 'styles', 'tokens-dtcg');

/**
 * Tokens Studio `type` -> DTCG `$type`.
 *
 * The source tree under `styles/tokens/` is authored in, and round-trips
 * through, Tokens Studio, whose type vocabulary predates the DTCG spec and does
 * not match it: `sizing`, `fontSizes`, `boxShadow`, `other` and friends are not
 * DTCG types, so a spec-conformant tool reading the published tree cannot
 * interpret 196 of its 554 tokens. Translating here — at the one point that
 * already rewrites `type` to `$type` — makes the PUBLISHED tree conformant
 * while leaving the Tokens Studio source untouched, which is the only way to
 * keep the design-tool round trip working.
 *
 * Deliberately absent, because DTCG has no type that fits and inventing one
 * would be worse than an honest gap:
 *
 *   letterSpacing  — DTCG's `dimension` admits only `px` and `rem`; these are
 *                    authored as percentages of the font size (`1%`), which is
 *                    what Figma exports and what the typography composite
 *                    means. Retyping without re-authoring the values would
 *                    produce a conformant label on a non-conformant value.
 *   textDecoration — DTCG has no equivalent type at all.
 *   the `animation.timing` easings — DTCG's `cubicBezier` is a 4-number array;
 *                    these are CSS easing strings (`ease`, `linear`,
 *                    `cubic-bezier(...)`), which that type cannot express.
 *
 * Those are left on their Tokens Studio type rather than mislabelled. See
 * `.altitude/TOKENS.md`.
 */
const DTCG_TYPE_MAP = {
  // dimensional scales
  sizing: 'dimension',
  spacing: 'dimension',
  borderRadius: 'dimension',
  borderWidth: 'dimension',
  fontSizes: 'dimension',
  lineHeights: 'dimension',
  // typography atoms
  fontFamilies: 'fontFamily',
  fontWeights: 'fontWeight',
  // composites
  boxShadow: 'shadow',
  // scalars
  opacity: 'number',
};

/**
 * `other` is Tokens Studio's escape hatch and covers three unrelated scales
 * here, so it cannot be mapped by type alone — the token's path decides.
 */
function dtcgTypeFor(type, pathSegments) {
  if (type === 'other') {
    const path = pathSegments.join('.');
    if (path.startsWith('animation.duration')) return 'duration';
    if (path.startsWith('animation.distance')) return 'dimension';
    if (path.startsWith('z-index')) return 'number';
    return type; // animation.timing — see the note above.
  }
  return DTCG_TYPE_MAP[type] || type;
}

function isTokenLeaf(node) {
  if (node === null || typeof node !== 'object') return false;
  // DTCG (idempotency)
  if ('$value' in node) return true;
  // Legacy: presence of both `value` AND `type` marks a token, regardless of
  // whether `value` is a scalar, array, or object (composite tokens like
  // boxShadow and typography have object `value`s).
  if ('value' in node && 'type' in node) return true;
  return false;
}

function convertTree(node, pathSegments = []) {
  if (Array.isArray(node)) return node.map((child) => convertTree(child, pathSegments));
  if (node === null || typeof node !== 'object') return node;
  if (isTokenLeaf(node)) {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === 'value') out.$value = v;
      else if (k === 'type' || k === '$type') out.$type = dtcgTypeFor(v, pathSegments);
      else out[k] = v;
    }
    return out;
  }
  const out = {};
  for (const [k, v] of Object.entries(node)) out[k] = convertTree(v, [...pathSegments, k]);
  return out;
}

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('.') && name !== '.') continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`[dtcg] ${SRC} does not exist`);
    process.exit(1);
  }
  // Clean dst so deleted source files don't linger.
  fs.rmSync(DST, { recursive: true, force: true });
  fs.mkdirSync(DST, { recursive: true });

  let converted = 0;
  let passthrough = 0;
  for (const src of walk(SRC)) {
    const rel = path.relative(SRC, src);
    const dst = path.join(DST, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    if (!src.endsWith('.json')) {
      fs.copyFileSync(src, dst);
      passthrough++;
      continue;
    }
    const raw = JSON.parse(fs.readFileSync(src, 'utf8'));
    // $metadata.json / $themes.json: Tokens Studio passthrough.
    if (rel.startsWith('$') || path.basename(rel).startsWith('$')) {
      fs.writeFileSync(dst, JSON.stringify(raw, null, 2) + '\n');
      passthrough++;
      continue;
    }
    const out = convertTree(raw);
    fs.writeFileSync(dst, JSON.stringify(out, null, 2) + '\n');
    converted++;
  }
  console.log(`[dtcg] wrote ${converted} converted + ${passthrough} passthrough files → ${path.relative(REPO, DST)}`);
}

main();
