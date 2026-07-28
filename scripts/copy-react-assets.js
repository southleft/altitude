#!/usr/bin/env node
/**
 * Copies al-react's static assets into its dist/ after `tsc`.
 *
 * Replaces the inline `cp -r … 2>/dev/null || true` pair that used to live in
 * al-react's build script. `cp` does not exist in Windows `cmd` (which is what
 * pnpm uses to run scripts there), so both copies silently no-opped through the
 * `|| true` — producing an 18-file-smaller dist on Windows than on CI and
 * making `.altitude/baselines/bundle/snapshot.json` non-reproducible across
 * platforms.
 */

const fs = require('fs');
const path = require('path');

const PKG = path.resolve(__dirname, '../libs/al-react');

const COPIES = [
  { from: path.join(PKG, '.storybook/static/images'), to: path.join(PKG, 'dist/images') },
  { from: path.resolve(PKG, '../al-web-components/dist/css'), to: path.join(PKG, 'dist/css') },
];

let copied = 0;
for (const { from, to } of COPIES) {
  if (!fs.existsSync(from)) {
    console.warn(`[copy-react-assets] skipped (missing): ${path.relative(PKG, from)}`);
    continue;
  }
  fs.cpSync(from, to, { recursive: true });
  copied += fs.readdirSync(to).length;
}

console.log(`[copy-react-assets] copied ${copied} top-level entr(ies) into libs/al-react/dist/.`);
