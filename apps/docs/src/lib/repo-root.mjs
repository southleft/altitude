import fs from 'node:fs';
import path from 'node:path';

/**
 * Absolute path to the monorepo root.
 *
 * Resolved by walking up from `process.cwd()` until `pnpm-workspace.yaml` is
 * found, NOT from `import.meta.url`: Astro bundles server modules into
 * `.astro/.prerender/` before running `getStaticPaths`, so a URL-relative
 * `../../../../` is correct in source and wrong at build time (it landed on
 * `apps/libs/al-web-components/...` and the build failed with ENOENT).
 * `process.cwd()` is the app directory in both `astro dev` and `astro build`.
 */
export function repoRoot() {
  let dir = process.cwd();
  for (let i = 0; i < 10; i += 1) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    `Could not locate the monorepo root (no pnpm-workspace.yaml above ${process.cwd()})`
  );
}
