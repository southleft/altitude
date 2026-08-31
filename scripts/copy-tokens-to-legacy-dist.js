#!/usr/bin/env node
/**
 * T6.2 — copy v5 token output to `styles/dist/`.
 *
 * After T6.2 swaps `build:tokens` to run the v5 pipeline, the rest of the
 * webpack/Vite build chain still references `styles/dist/` for the legacy
 * CSS/SCSS paths (theme-switcher.ts imports
 * `../../styles/dist/scss/theme/tokens-dark.scss`). Mirror the v5 dist into
 * the legacy dist so existing import paths keep resolving.
 *
 * Once T6.1's downstream codemod removes every direct `styles/dist/`
 * import, this script — and the dual dist — can be deleted.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..');
const V5 = path.join(REPO, 'libs/al-web-components/styles/dist-v5');
const LEGACY = path.join(REPO, 'libs/al-web-components/styles/dist');

// Emitted by `tokens-config.v5.mjs` for `components/theme/theme.scss` to
// `@use` at compile time. Deliberately NOT mirrored into the legacy dist:
//
//   * it is a new artifact, so no legacy import path resolves to it and
//     mirroring would only create fresh coupling to a directory this script's
//     header already schedules for deletion;
//   * `scripts/copy-assets-to-dist.js:37` copies all of `styles/dist/` into
//     the published `dist/css/`, and `libs/al-react/package.json:11` copies
//     that again — so a mirrored copy would ship ~15 KB of `:host` rules twice
//     into places where `:host` can never match anything; and
//   * `scripts/capture-token-baseline.js` walks `styles/dist/`, so mirroring
//     would add ~200 duplicate declarations to the token baseline for no
//     signal.
const SKIP_RELATIVE = new Set(['scss/host']);

function copy(srcRoot, dstRoot, rel = '') {
  if (!fs.existsSync(srcRoot)) return;
  for (const name of fs.readdirSync(srcRoot)) {
    if (name.startsWith('.')) continue;
    if (SKIP_RELATIVE.has(rel ? `${rel}/${name}` : name)) continue;
    const src = path.join(srcRoot, name);
    const dst = path.join(dstRoot, name);
    const st = fs.statSync(src);
    if (st.isDirectory()) {
      fs.mkdirSync(dst, { recursive: true });
      copy(src, dst, rel ? `${rel}/${name}` : name);
    } else {
      fs.copyFileSync(src, dst);
    }
  }
}

if (!fs.existsSync(V5)) {
  console.error('[copy-tokens-legacy] missing v5 dist; run build:tokens first.');
  process.exit(1);
}
// Clear `dist/` first so this is a true mirror, not an accumulation.
//
// `tokens-config.v5.mjs` rm -rf's `dist-v5/` at the top of build(), so
// deletions surface there. Without the same treatment here, a brand or theme
// removed from the `brands`/`themes` arrays leaves its emission behind in
// `dist/` forever on any machine that had built it before. That matters
// because `scripts/capture-token-baseline.js` walks `dist/`, not `dist-v5/`:
// a stale file becomes phantom tokens in a locally-captured baseline, which
// then disagrees with the CI runner's clean-checkout build for reasons that
// are invisible in the diff. See `.altitude/TOKENS.md`
// § "Rebaselining after a token change".
fs.rmSync(LEGACY, { recursive: true, force: true });
fs.mkdirSync(LEGACY, { recursive: true });
copy(V5, LEGACY);
console.log('[copy-tokens-legacy] mirrored dist-v5 → dist (legacy import paths).');
