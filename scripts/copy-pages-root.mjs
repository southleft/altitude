#!/usr/bin/env node
/**
 * copy-pages-root.mjs
 *
 * Copies `pages-root/` into `dist/` — the published root of the Cloudflare
 * Pages deployment. Cloudflare reads `_headers` and `_redirects` ONLY from that
 * root; a nested copy is silently ignored.
 *
 * WHY THIS IS A SCRIPT AND NOT `cp -r ./pages-root/. ./dist/`. That is what it
 * was first, and it published `pages-root/README.md` to the live site at
 * `/README.md` — the directory's own internal documentation, served to the
 * world. Anything in a directory that maps onto a public root is public, so the
 * copy needs an exclusion, and `cp` has none.
 *
 * The exclusion is deliberately narrow (`README.md` only) rather than an
 * allow-list of known files: a new file added to pages-root/ SHIPS by default.
 * An allow-list would mean someone adds `_routes.json`, forgets to update this
 * script, and it silently never reaches the deployment — the same class of
 * quiet failure that moving these files out of apps/home/public/ existed to
 * prevent. Defaulting to "ship it" fails loudly and visibly instead.
 *
 * It prints what it copied for the same reason: a copy step that says nothing
 * cannot be distinguished from one that copied nothing.
 *
 * Requires dist/ to exist — build:all runs this after the docs build.
 */

import { readdirSync, copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'pages-root');
const DEST = join(ROOT, 'dist');

/** Documentation about the directory, not content served from it. */
const EXCLUDE = new Set(['README.md']);

if (!existsSync(SRC)) {
  console.error(`[pages-root] FAIL — ${relative(ROOT, SRC)} does not exist.`);
  process.exit(1);
}
if (!existsSync(DEST)) {
  console.error(
    `[pages-root] FAIL — ${relative(ROOT, DEST)} does not exist. This step needs the ` +
      `site build to have run first; in build:all it follows build:app-docs.`
  );
  process.exit(1);
}

function copyDir(src, dest, prefix = '') {
  const copied = [];
  for (const name of readdirSync(src)) {
    if (!prefix && EXCLUDE.has(name)) continue;
    const from = join(src, name);
    const to = join(dest, name);
    if (statSync(from).isDirectory()) {
      mkdirSync(to, { recursive: true });
      copied.push(...copyDir(from, to, `${prefix}${name}/`));
    } else {
      copyFileSync(from, to);
      copied.push(`${prefix}${name}`);
    }
  }
  return copied;
}

const copied = copyDir(SRC, DEST);

if (copied.length === 0) {
  console.error('[pages-root] FAIL — copied nothing. pages-root/ holds the site-wide _headers and _redirects; an empty copy is never correct.');
  process.exit(1);
}

console.log(`[pages-root] copied ${copied.length} file(s) into dist/: ${copied.join(', ')}`);
