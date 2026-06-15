#!/usr/bin/env node
/**
 * T0.1 — Bundle-size baseline snapshotter.
 *
 * Walks `libs/al-web-components/dist/` and `libs/al-react/dist/` after a
 * fresh `yarn build` and records per-file and per-package sizes. The Gate
 * P2 acceptance and T6.3 bundle-budget enforcement both compare against
 * this baseline.
 *
 * Snapshot shape:
 * {
 *   "version": 1,
 *   "packages": {
 *     "al-web-components": { "totalBytes": <int>, "files": { "<relpath>": <int>, ... } },
 *     "al-react": { ... }
 *   },
 *   "totalBytes": <int>
 * }
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..');
const PACKAGES = ['al-web-components', 'al-react'];
const OUT_DIR = path.join(REPO, '.altitude', 'baselines', 'bundle');
const OUT_FILE = path.join(OUT_DIR, 'snapshot.json');

function walk(dir, rootStrip) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...walk(p, rootStrip));
    else out.push({ rel: path.relative(rootStrip, p), bytes: st.size });
  }
  return out;
}

function main() {
  const snapshot = { version: 1, capturedAt: 'baseline', packages: {}, totalBytes: 0 };

  for (const pkg of PACKAGES) {
    const distRoot = path.join(REPO, 'libs', pkg, 'dist');
    if (!fs.existsSync(distRoot)) {
      console.error(`[bundle] ${distRoot} does not exist; run \`yarn build\` first.`);
      process.exit(1);
    }
    const entries = walk(distRoot, distRoot).sort((a, b) => a.rel.localeCompare(b.rel));
    const files = Object.fromEntries(entries.map((e) => [e.rel, e.bytes]));
    const totalBytes = entries.reduce((s, e) => s + e.bytes, 0);
    snapshot.packages[pkg] = { totalBytes, fileCount: entries.length, files };
    snapshot.totalBytes += totalBytes;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(snapshot, null, 2) + '\n');
  const mb = (n) => (n / 1024 / 1024).toFixed(2);
  for (const [pkg, info] of Object.entries(snapshot.packages)) {
    console.log(`[bundle] ${pkg}: ${info.fileCount} files, ${mb(info.totalBytes)} MB`);
  }
  console.log(`[bundle] total: ${mb(snapshot.totalBytes)} MB → ${path.relative(REPO, OUT_FILE)}`);
}

main();
