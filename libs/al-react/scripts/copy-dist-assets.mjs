/**
 * Copies @southleft/al-react's non-TypeScript build assets into `dist/`.
 *
 * WHY THIS FILE EXISTS. The `build` script used to do this with:
 *
 *   cp -r ./.storybook/static/images ./dist/images 2>/dev/null || true
 *   cp -r ../al-web-components/dist/css ./dist     2>/dev/null || true
 *
 * `cp` is not available in the shell npm uses on Windows, so BOTH copies
 * failed on every Windows build — and `2>/dev/null || true` swallowed the
 * error and the non-zero exit, so the build reported success with an
 * incomplete `dist/`. That is the measured mechanism behind the bundle
 * baseline reading ~6.5 % low on Windows (`.altitude/baselines/README.md`):
 * `scripts/capture-bundle-baseline.js` walked a `dist/` that was missing the
 * entire CSS tree.
 *
 * The rules here, deliberately:
 *   - `fs.cpSync` — cross-platform, no new dependency.
 *   - A missing source is a HARD FAILURE with a message naming the fix.
 *     Neither of these directories is optional: `dist/images/logo.svg` is the
 *     manager `brandImage` and `dist/css` is the whole global stylesheet.
 *   - Non-zero exit on any failure, so `pnpm build` stops.
 *
 * There is intentionally no "optional source" escape hatch. If a future asset
 * really is optional, give it an explicit `optional: true` below and say why —
 * do not reintroduce a blanket catch.
 */

import { cpSync, existsSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const DIST = join(PKG, 'dist');

/**
 * @type {{ from: string, to: string, why: string, fix: string }[]}
 */
const COPIES = [
  {
    from: join(PKG, '.storybook/static/images'),
    to: join(DIST, 'images'),
    why: 'the Storybook manager brandImage (dist/images/logo.svg)',
    fix: 'This directory is checked into the repo — if it is missing, the working tree is incomplete.',
  },
  {
    from: join(PKG, '../al-web-components/dist/css'),
    to: join(DIST, 'css'),
    why: 'the global Altitude stylesheet consumed by @southleft/al-react apps',
    fix: 'Run `pnpm --filter @southleft/al-web-components build` first (the root `build` script encodes this ordering).',
  },
];

let failed = false;

for (const { from, to, why, fix } of COPIES) {
  const shown = relative(PKG, from).replace(/\\/g, '/');

  if (!existsSync(from) || !statSync(from).isDirectory()) {
    console.error(`\ncopy-dist-assets: MISSING SOURCE  ${shown}`);
    console.error(`  needed for: ${why}`);
    console.error(`  fix:        ${fix}`);
    failed = true;
    continue;
  }

  try {
    cpSync(from, to, { recursive: true, force: true, errorOnExist: false });
  } catch (err) {
    console.error(`\ncopy-dist-assets: COPY FAILED  ${shown} -> ${relative(PKG, to).replace(/\\/g, '/')}`);
    console.error(`  ${err instanceof Error ? err.message : String(err)}`);
    failed = true;
    continue;
  }

  console.log(`copy-dist-assets: ok  ${shown} -> ${relative(PKG, to).replace(/\\/g, '/')}`);
}

if (failed) {
  console.error('\ncopy-dist-assets: build assets are incomplete — failing the build.\n');
  process.exit(1);
}
