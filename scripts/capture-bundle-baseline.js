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
    // Skip dotfiles — macOS `.DS_Store` would otherwise flap the snapshot on
    // every developer rebuild and break the byte-comparability of T1.1/T2.2.
    if (name.startsWith('.')) continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...walk(p, rootStrip));
    // POSIX-normalize the key. `path.relative` yields backslashes on Windows,
    // which flips every key in the snapshot versus a Linux capture: the diff
    // reads as a full add/remove of the package, and `check-bundle-budget.js`'s
    // per-file lookup misses on every entry. The baseline must be identical
    // regardless of which platform captured it. Same class of bug as the one
    // fixed in capture-token-baseline.js (`relPosix`).
    else out.push({ rel: path.relative(rootStrip, p).split(path.sep).join('/'), bytes: st.size });
  }
  return out;
}

const ESC_CR = Buffer.from('\\r', 'latin1'); // the two chars backslash + 'r'

/**
 * Bytes of carriage-return inflation in `file`.
 *
 * WHY THIS EXISTS. The snapshot records file SIZES, and file sizes for this
 * build are EOL-sensitive in two places:
 *
 *   1. Vite's `.js.map` files embed the `.ts` sources verbatim in
 *      `sourcesContent`. JSON-serialized, each CRLF costs the escaped `\r`
 *      sequence — 2 bytes more than a bare LF.
 *   2. `scripts/copy-assets-to-dist.js` mirrors .svg/.hbs/.js assets from
 *      source into dist/ byte-for-byte, carrying their CRs with them.
 *
 * Measured on 2026-07-28, one commit, Node 20.18.1 + pnpm 9.15.0 both sides:
 * a CRLF working tree built 38,547 B (1.094 %) larger than a Linux LF build,
 * with 875 of 1022 files byte-identical and every differing byte a carriage
 * return. `baselines-bundle` allows 1 % — so a snapshot captured from a CRLF
 * tree fails CI by construction, and is worse than a stale file because it
 * looks authoritative.
 *
 * `.gitattributes` pins the working tree to LF on every platform, which is
 * the actual fix. This is the tripwire for the day that stops being true —
 * a clone made before that commit, a `core.autocrlf` override, or an editor
 * that rewrites on save. Fail loudly rather than commit a poisoned baseline.
 */
function crInflation(buf) {
  if (buf.includes(0)) return 0; // binary — CR bytes are content
  let raw = 0;
  for (let i = 0; i < buf.length; i++) if (buf[i] === 13) raw++;
  let esc = 0;
  let i = 0;
  while ((i = buf.indexOf(ESC_CR, i)) !== -1) { esc++; i += ESC_CR.length; }
  return raw + esc * 2;
}

function main() {
  const snapshot = { version: 1, capturedAt: 'baseline', packages: {}, totalBytes: 0 };
  let inflation = 0;
  const inflated = [];

  for (const pkg of PACKAGES) {
    const distRoot = path.join(REPO, 'libs', pkg, 'dist');
    if (!fs.existsSync(distRoot)) {
      console.error(`[bundle] ${distRoot} does not exist; run \`pnpm build\` first.`);
      process.exit(1);
    }
    const entries = walk(distRoot, distRoot).sort((a, b) => a.rel.localeCompare(b.rel));
    for (const e of entries) {
      const n = crInflation(fs.readFileSync(path.join(distRoot, e.rel)));
      if (n) { inflation += n; inflated.push(`${pkg}/${e.rel} (+${n} B)`); }
    }
    const files = Object.fromEntries(entries.map((e) => [e.rel, e.bytes]));
    const totalBytes = entries.reduce((s, e) => s + e.bytes, 0);
    snapshot.packages[pkg] = { totalBytes, fileCount: entries.length, files };
    snapshot.totalBytes += totalBytes;
  }

  if (inflation > 0 && !process.env.ALTITUDE_ALLOW_CRLF_CAPTURE) {
    console.error(`\n[bundle] REFUSING TO CAPTURE: dist/ carries ${inflation} bytes of carriage returns`);
    console.error(`[bundle] across ${inflated.length} file(s). That is ${(inflation / snapshot.totalBytes * 100).toFixed(3)}% of the total, and`);
    console.error('[bundle] `baselines-bundle` in CI allows 1% — a snapshot taken from a CRLF');
    console.error('[bundle] working tree is guaranteed to disagree with the Linux runner.\n');
    for (const f of inflated.slice(0, 5)) console.error(`           ${f}`);
    if (inflated.length > 5) console.error(`           ... and ${inflated.length - 5} more`);
    console.error('\n[bundle] Fix — renormalize the working tree to LF (`.gitattributes` pins it):');
    console.error('           git rm --cached -r . -q && git reset --hard');
    console.error('           pnpm run build');
    console.error('\n[bundle] Override with ALTITUDE_ALLOW_CRLF_CAPTURE=1 only if you know why.\n');
    process.exit(1);
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
