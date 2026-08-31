#!/usr/bin/env node
/**
 * T0.1 — Token baseline snapshotter.
 *
 * Reads every `--al-*` CSS variable emitted under
 * `libs/al-web-components/styles/dist/` and writes a deterministic JSON
 * snapshot to `.altitude/baselines/tokens/snapshot.json`. The plan demands
 * byte-comparability of the SD v3 → v5 transition (T1.1); this snapshot
 * is the input to that comparison.
 *
 * Snapshot shape:
 * {
 *   "version": 1,
 *   "totalVariables": <int>,
 *   "byFile": { "<relpath>": <int> },
 *   "variables": [
 *     { "name": "--al-color-foo", "value": "#abc", "file": "<relpath>", "raw": "<name>: <value>" }
 *   ],
 *   "hash": "<sha256 of normalized output>"
 * }
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const REPO = path.resolve(__dirname, '..');
const TOKEN_DIST = path.join(REPO, 'libs', 'al-web-components', 'styles', 'dist');
// Allow tests to redirect output to a temp file via env var so they can
// re-run the capture without mutating the committed baseline.
const OUT_FILE = process.env.ALTITUDE_TOKEN_SNAPSHOT_OUT
  ? path.resolve(process.env.ALTITUDE_TOKEN_SNAPSHOT_OUT)
  : path.join(REPO, '.altitude', 'baselines', 'tokens', 'snapshot.json');
const OUT_DIR = path.dirname(OUT_FILE);

function walk(dir, exts) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('.')) continue; // skip .DS_Store etc.
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...walk(p, exts));
    else if (exts.some((e) => p.endsWith(e))) out.push(p);
  }
  return out;
}

/**
 * Repo-relative path with POSIX separators.
 *
 * `path.relative` yields backslashes on Windows, which would make the snapshot
 * platform-dependent: `byFile` keys and `variables[].file` would differ between
 * a Windows checkout and the Linux CI runner even though the token output is
 * identical. (The `hash` is computed from the `name: value` stream only, so it
 * would still match — the divergence used to hide in the JSON body as a
 * whole-file diff.) Normalize so a re-capture is byte-reproducible anywhere.
 */
function relPosix(file) {
  return path.relative(REPO, file).split(path.sep).join('/');
}

function extractVars(file) {
  const text = fs.readFileSync(file, 'utf8');
  const out = [];
  if (file.endsWith('.json')) {
    // Walk every leaf path in the JSON tree; flatten to "tier1.color.brand.primary"
    // style names so the SD v5 byte-comparison (T1.1) can target the JSON emit too.
    let tree;
    try { tree = JSON.parse(text); } catch { return out; }
    const visit = (node, prefix) => {
      if (node === null || typeof node !== 'object') {
        out.push({ name: prefix, value: String(node), file: relPosix(file) });
        return;
      }
      for (const [k, v] of Object.entries(node)) {
        visit(v, prefix ? `${prefix}.${k}` : k);
      }
    };
    visit(tree, '');
    return out;
  }
  // Match both CSS custom props (`--al-foo: value;`) and SCSS variables (`$al-foo: value;`).
  const re = /(?:^|[\s{;])(?:--|\$)(al-[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let m;
  while ((m = re.exec(text))) {
    out.push({ name: '--' + m[1], value: m[2].trim(), file: relPosix(file) });
  }
  return out;
}

function main() {
  if (!fs.existsSync(TOKEN_DIST)) {
    console.error(`[tokens] ${TOKEN_DIST} does not exist; did you run \`yarn workspace @southleft/al-web-components build:tokens\`?`);
    process.exit(1);
  }

  const files = walk(TOKEN_DIST, ['.css', '.scss', '.json']);
  const all = files.flatMap(extractVars);
  // Deterministic order: by file, then by name.
  all.sort((a, b) => (a.file === b.file ? a.name.localeCompare(b.name) : a.file.localeCompare(b.file)));

  // Per-file counts.
  const byFile = {};
  for (const v of all) byFile[v.file] = (byFile[v.file] || 0) + 1;

  // Hash the normalized "name: value" stream so we can detect *any* change.
  const stream = all.map((v) => `${v.name}: ${v.value}`).join('\n');
  const hash = crypto.createHash('sha256').update(stream).digest('hex');

  const snapshot = {
    version: 1,
    capturedAt: 'baseline',
    totalVariables: all.length,
    uniqueNames: new Set(all.map((v) => v.name)).size,
    byFile,
    variables: all,
    hash,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(snapshot, null, 2) + '\n');
  console.log(`[tokens] wrote ${all.length} variable occurrences (${snapshot.uniqueNames} unique names) across ${Object.keys(byFile).length} files → ${path.relative(REPO, OUT_FILE)}`);
  console.log(`[tokens] hash: ${hash}`);
}

main();
