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

function convertTree(node) {
  if (Array.isArray(node)) return node.map(convertTree);
  if (node === null || typeof node !== 'object') return node;
  if (isTokenLeaf(node)) {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === 'value') out.$value = v;
      else if (k === 'type') out.$type = v;
      else out[k] = v;
    }
    return out;
  }
  const out = {};
  for (const [k, v] of Object.entries(node)) out[k] = convertTree(v);
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
