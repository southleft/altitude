#!/usr/bin/env node
// T2.2 finalization — copy non-JS assets that webpack's CopyPlugin used to
// handle into the Vite-built dist/. Specifically:
//   - libs/al-web-components/icons/ → dist/icons/ (SVG fonts, raw svg)
//   - libs/al-web-components/styles/dist-v5 mirrored to styles/dist (token
//     CSS for consumers that import the pre-built theme bundle)
//   - any .storybook/static/images that referenced by stories

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..');
const SRC = path.join(REPO, 'libs/al-web-components');
const DIST = path.join(SRC, 'dist');

function cp(src, dst) {
  if (!fs.existsSync(src)) return 0;
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    let count = 0;
    for (const name of fs.readdirSync(src)) {
      if (name.startsWith('.')) continue;
      count += cp(path.join(src, name), path.join(dst, name));
    }
    return count;
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  return 1;
}

let n = 0;
n += cp(path.join(SRC, 'icons'), path.join(DIST, 'icons'));
n += cp(path.join(SRC, 'styles/dist'), path.join(DIST, 'css'));
console.log('[copy-assets] mirrored ' + n + ' file(s) into dist/.');
