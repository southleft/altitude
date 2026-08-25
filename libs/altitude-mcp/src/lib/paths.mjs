// Shared filesystem layout for the Altitude MCP server.
//
// This server READS generated artifacts produced by @southleft/al-web-components' own
// build scripts — it is never a second source of truth. Every path below
// points at a file that already exists somewhere else in the repo; if one is
// missing (fresh clone, no build yet) `requireFile` throws a structured
// error naming the pnpm command that produces it, so a calling agent can
// self-heal instead of guessing.
//
// CONFIGURABLE REPO ROOT (R3, spec 2026-08-25-mcp-library-first-refactor).
// REPO_ROOT/LIBS_DIR/WC_ROOT/PACKAGE_ROOT/PATHS were plain `const`s computed
// once, at this module's own load time, from `import.meta.url`. That is
// still the DEFAULT (unchanged byte-for-byte below), but an npm-installed
// copy of this package — or a brand layer pointed at its own checkout —
// needs to override it. They are now `let` bindings recomputed by
// `configurePaths(repoRoot)`, called once at module load (with
// `ALTITUDE_REPO_ROOT` if set, else the `import.meta.url`-derived default)
// and again by `registerAltitudeTools()`/`buildServer()` in `../index.mjs`
// when a caller passes `{ repoRoot }`.
//
// This only works because ES module `import { PATHS } from './paths.mjs'`
// bindings are LIVE — every reader in this package (`cem.mjs`, `tokens.mjs`,
// `resources.mjs`, `ds-project.mjs`, etc.) reads `PATHS.*` / `REPO_ROOT` /
// `WC_ROOT` from inside a function body, at call time, never destructured
// into another module's own top-level `const` at import time — verified as
// part of the R3 task. A module that DID snapshot a path at its own
// top level (ds-project.mjs's old `REGISTRY_PATH`) would go stale the moment
// `configurePaths()` ran again after that module's first load; that snapshot
// was removed for exactly this reason — see ds-project.mjs.

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url)); // libs/altitude-mcp/src/lib
const DEFAULT_PACKAGE_ROOT = join(HERE, '..', '..'); // libs/altitude-mcp
const DEFAULT_LIBS_DIR = join(DEFAULT_PACKAGE_ROOT, '..'); // libs
const DEFAULT_REPO_ROOT = join(DEFAULT_LIBS_DIR, '..'); // repo root

export let PACKAGE_ROOT;
export let LIBS_DIR;
export let REPO_ROOT;
export let WC_ROOT;
export let PATHS;

/**
 * (Re)compute every REPO_ROOT-derived export above from `repoRoot`.
 *
 * Default (no argument, or `ALTITUDE_REPO_ROOT` unset): the same
 * `import.meta.url`-derived root this module always used — byte-identical
 * to the pre-R3 behavior in this monorepo. Passing an explicit `repoRoot`
 * (from `buildServer({ repoRoot })` / `registerAltitudeTools(server, {
 * repoRoot })`) points every artifact path at a different checkout instead.
 */
export function configurePaths(repoRoot = DEFAULT_REPO_ROOT) {
  REPO_ROOT = repoRoot;
  LIBS_DIR = join(REPO_ROOT, 'libs');
  WC_ROOT = join(LIBS_DIR, 'al-web-components');
  PACKAGE_ROOT = join(LIBS_DIR, 'altitude-mcp');

  PATHS = Object.freeze({
    cem: join(WC_ROOT, 'custom-elements.json'),
    schemasDir: join(WC_ROOT, 'schemas'),
    tokensJson: join(WC_ROOT, 'dist', 'css', 'tokens.json'),
    aliasesJson: join(WC_ROOT, 'dist', 'css', 'aliases.json'),
    // `build:tokens` — the exact command HINTS.tokens prescribes — writes these
    // under styles/dist/; the dist/css/ copies above only appear after a FULL
    // package build (copy-assets-to-dist.js). Same two-path pattern as the
    // theme engine below: prefer the packaged copy, fall back to the
    // build:tokens output so a fresh clone + build:tokens (what CI's mcp-smoke
    // job runs) satisfies the reader — otherwise the error hint names a
    // command that does not produce the file the reader requires.
    tokensJsonFallback: join(WC_ROOT, 'styles', 'dist', 'tokens.json'),
    aliasesJsonFallback: join(WC_ROOT, 'styles', 'dist', 'aliases.json'),
    tokensDtcgDir: join(WC_ROOT, 'styles', 'tokens-dtcg'),
    migrationJson: join(REPO_ROOT, '.altitude', 'migration.json'),
    componentsDir: join(WC_ROOT, 'components'),
    iconCatalog: join(WC_ROOT, 'components', 'icon', 'catalog.ts'),
    // The deterministic OKLCH theme engine. TWO paths on purpose (see
    // ./theme.mjs): the BUILT barrel is preferred — plain JS, no loader hook,
    // and the same artifact a published consumer would get — but `dist/` is
    // gitignored, so a fresh clone that has not run `pnpm run build` still has
    // to fall back to the TypeScript SOURCE, which does ship in git.
    themeEngineDist: join(WC_ROOT, 'dist', 'theme-engine', 'index.js'),
    themeEngineSrc: join(WC_ROOT, 'theme-engine', 'index.ts'),
    validateCli: join(WC_ROOT, 'cli', 'validate.mjs'),

    // The design-system PROJECT REGISTRY. Everything below it used to be a
    // single hardcoded Altitude path; parity is now multi-project (Altitude,
    // Southleft) and each project names its own figma-sync dir, manifest and
    // ops dir. See `./ds-project.mjs`.
    dsProjects: join(REPO_ROOT, '.altitude', 'ds-projects.json'),

    // DEPRECATED — the DEFAULT project's parity paths, kept so older callers keep
    // working. New code must use `resolveProject(id).resolved.{figmaSyncDir,
    // parityManifest, opsDir}` instead, or it will silently read Altitude's
    // manifest while claiming to check another design system.
    figmaSyncDir: join(REPO_ROOT, '.altitude', 'figma-sync'),
    parityManifest: join(REPO_ROOT, '.altitude', 'figma-sync', 'parity-manifest.json'),
    figmaOpsDir: join(REPO_ROOT, '.altitude', 'figma-sync', 'ops'),

    // AI-readiness digests (scripts/ai-readiness/build-{cem,tokens}-digest.mjs) —
    // committed, tmpdir-mirrored copies of the CEM and token set shaped for the
    // fleet probe. Exposed as MCP resources: ./resources.mjs.
    aiReadinessCemDigest: join(REPO_ROOT, '.altitude', 'ai-readiness', 'cem-digest.json'),
    aiReadinessTokensDigest: join(REPO_ROOT, '.altitude', 'ai-readiness', 'tokens-digest.json'),

    // The axe accessibility sweep, written by build-a11y-report.mjs. Exposed as
    // a resource: ./resources.mjs.
    a11yReport: join(REPO_ROOT, '.altitude', 'a11y', 'report.json'),
  });

  return PATHS;
}

// Default init: ALTITUDE_REPO_ROOT if set, else the import.meta.url-derived
// root above. Runs once at module load — same timing the old top-level
// `const`s ran at, so every existing caller sees identical default paths.
configurePaths(process.env.ALTITUDE_REPO_ROOT || undefined);

/** Thrown when a generated artifact this server reads is missing. */
export class MissingArtifactError extends Error {
  constructor(path, hint) {
    super(`Missing generated artifact: ${path}. Run: ${hint}`);
    this.name = 'MissingArtifactError';
    this.code = 'ERR_MISSING_ARTIFACT';
    this.path = path;
    this.hint = hint;
  }
}

/** Assert a generated artifact exists, else throw a MissingArtifactError naming the fix. */
export function requireFile(path, hint) {
  if (!existsSync(path)) throw new MissingArtifactError(path, hint);
  return path;
}

export const HINTS = Object.freeze({
  cem: 'pnpm --filter @southleft/al-web-components build:custom-elements.json',
  tokens: 'pnpm --filter @southleft/al-web-components build:tokens',
  storybook: "pnpm --filter @southleft/al-web-components build:storybook --output-dir ../../dist/storybook/web-components",
  aiReadinessCemDigest: 'node scripts/ai-readiness/build-cem-digest.mjs',
  aiReadinessTokensDigest: 'node scripts/ai-readiness/build-tokens-digest.mjs',
  a11yReport: 'pnpm run a11y:report',
  dsProjects: 'git checkout -- .altitude/ds-projects.json (it is a tracked file)',
});
