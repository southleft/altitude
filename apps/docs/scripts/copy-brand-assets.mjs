#!/usr/bin/env node
/**
 * Make brand-layer story assets available to the docs site.
 *
 * THE PROBLEM. `al-logo-wall`'s story renders real logo files, which live in
 * `apps/southleft/public/logos/` because that is the app that ships them. The
 * docs site executes that story for its playground preview (see
 * `src/lib/examples.mjs`) but has no such directory, so the preview rendered a
 * column of broken-image icons with alt text — reported as "the logo wall shows
 * broken images", and true.
 *
 * WHY A COPY RATHER THAN A SECOND SET. Committing a duplicate under
 * `apps/docs/public/` would be a second source of truth for the same brand
 * assets, and the one that never gets updated. This copies from the owning app
 * at build time and the destination is gitignored, so there is exactly one
 * place a logo is added or replaced.
 *
 * The copy runs BEFORE `astro build`, because Astro reads `public/` as part of
 * the build rather than watching it afterwards.
 *
 * Absence is not an error. A checkout with no `apps/southleft` still builds the
 * docs; the logo-wall preview is simply missing its images, and this says so
 * rather than failing a build over an optional app's assets.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DOCS = resolve(HERE, '..');
const REPO = resolve(DOCS, '..', '..');

/**
 * [from, to, only?] — relative to the repo root and to `apps/docs/public`.
 * `only` (a RegExp on the file name) narrows a copy to the files the docs
 * actually need, so a shared source directory doesn't spray unrelated files
 * (licenses, READMEs, fonts the docs already ship) into the build.
 *
 * `brand-fonts`: Agrandir is the `southleft` brand's display face
 * (`font-family.secondary` token). The docs render southleft-branded previews
 * under `<al-theme brand="southleft">`, so without the file every such heading
 * falls back to `sans-serif`. Copied — not committed — for the same
 * one-source-of-truth reason as the logos; the license and provenance live
 * with the owning app (apps/southleft/public/fonts/README.md). `@font-face`
 * only downloads a face when rendered text resolves to it, so altitude-only
 * pages never fetch it.
 */
const ASSETS = [
  ['apps/southleft/public/logos', 'logos'],
  ['apps/southleft/public/fonts', 'brand-fonts', /^Agrandir-/],
];

let copied = 0;
for (const [from, to, only] of ASSETS) {
  const source = join(REPO, from);
  const dest = join(DOCS, 'public', to);

  if (!existsSync(source)) {
    console.log(`[brand-assets] skip — ${from} is not in this checkout.`);
    continue;
  }

  mkdirSync(dest, { recursive: true });
  cpSync(source, dest, {
    recursive: true,
    filter: (src) => !only || statSync(src).isDirectory() || only.test(basename(src)),
  });
  const n = readdirSync(dest).length;
  copied += n;
  console.log(`[brand-assets] ${from} -> public/${to} (${n} files)`);
}

console.log(`[brand-assets] ${copied} file(s) available to the docs build.`);
