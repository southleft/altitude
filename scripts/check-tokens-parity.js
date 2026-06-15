#!/usr/bin/env node
/**
 * T1.1 acceptance — byte-comparability gate for the SD v3 → v5 transition.
 *
 * Diffs every file under `libs/al-web-components/styles/dist/` against the
 * matching file under `libs/al-web-components/styles/dist-v5/`. Both must be
 * fresh; this script assumes `yarn build:tokens && yarn build:tokens:v5` ran
 * immediately before.
 *
 * Per the plan: `yarn build:tokens:v5 emits CSS whose --al-* variable set is
 * byte-identical to v3 output (snapshot diff = empty)`.
 *
 * Exit codes:
 *   0 — byte-identical (all watched files match exactly)
 *   1 — drift detected
 *   2 — internal error / missing inputs
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..');
const V3 = path.join(REPO, 'libs/al-web-components/styles/dist');
const V5 = path.join(REPO, 'libs/al-web-components/styles/dist-v5');

// What we hold byte-identical. tokens.json + core/variables.scss are emitted
// from the dark theme build (see tokens-config.v5.mjs build()).
const TARGETS = [
  { v3: 'css/theme', v5: 'css/theme', kind: 'dir' },
  { v3: 'scss/theme', v5: 'scss/theme', kind: 'dir' },
  { v3: 'css/brand', v5: 'css/brand', kind: 'dir' },
  { v3: 'scss/brand', v5: 'scss/brand', kind: 'dir' },
  { v3: 'tokens.json', v5: 'tokens.json', kind: 'file' },
  // variables.scss lives outside dist/ in v3 (it writes to ../core/), but
  // v5 emits it INTO dist-v5/core/. Compare against the v3 source-of-truth
  // location instead.
  { v3path: 'libs/al-web-components/styles/core/variables.scss', v5: 'core/variables.scss', kind: 'absfile' },
];

function listFiles(root) {
  const out = [];
  if (!fs.existsSync(root)) return out;
  for (const name of fs.readdirSync(root)) {
    if (name.startsWith('.')) continue;
    const p = path.join(root, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      for (const c of listFiles(p)) out.push(path.join(name, c));
    } else {
      out.push(name);
    }
  }
  return out.sort();
}

function bytesEqual(a, b) {
  if (!fs.existsSync(a) || !fs.existsSync(b)) return false;
  const A = fs.readFileSync(a);
  const B = fs.readFileSync(b);
  if (A.length !== B.length) return false;
  return A.equals(B);
}

function main() {
  if (!fs.existsSync(V3) || !fs.existsSync(V5)) {
    console.error('[parity] missing dist roots. Run `yarn build:tokens && yarn build:tokens:v5` first.');
    console.error('  v3:', V3, fs.existsSync(V3));
    console.error('  v5:', V5, fs.existsSync(V5));
    process.exit(2);
  }

  let mismatches = 0;
  let totalCompared = 0;
  for (const t of TARGETS) {
    if (t.kind === 'dir') {
      const v3root = path.join(V3, t.v3);
      const v5root = path.join(V5, t.v5);
      const v3files = listFiles(v3root);
      const v5files = listFiles(v5root);
      const all = new Set([...v3files, ...v5files]);
      for (const rel of all) {
        const v3p = path.join(v3root, rel);
        const v5p = path.join(v5root, rel);
        totalCompared++;
        if (!bytesEqual(v3p, v5p)) {
          mismatches++;
          console.error(`[parity] MISMATCH ${t.v3}/${rel}`);
        }
      }
    } else if (t.kind === 'file') {
      totalCompared++;
      if (!bytesEqual(path.join(V3, t.v3), path.join(V5, t.v5))) {
        mismatches++;
        console.error(`[parity] MISMATCH ${t.v3}`);
      }
    } else if (t.kind === 'absfile') {
      totalCompared++;
      const v3abs = path.join(REPO, t.v3path);
      if (!bytesEqual(v3abs, path.join(V5, t.v5))) {
        mismatches++;
        console.error(`[parity] MISMATCH ${t.v3path}`);
      }
    }
  }

  if (mismatches === 0) {
    console.log(`[parity] PASS — ${totalCompared} files byte-identical between SD v3 and v5.`);
    process.exit(0);
  }
  console.error(`[parity] FAIL — ${mismatches}/${totalCompared} files diverged.`);
  process.exit(1);
}

main();
