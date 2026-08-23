// Shared filesystem layout for the Altitude MCP server.
//
// This server READS generated artifacts produced by al-web-components' own
// build scripts — it is never a second source of truth. Every path below
// points at a file that already exists somewhere else in the repo; if one is
// missing (fresh clone, no build yet) `requireFile` throws a structured
// error naming the pnpm command that produces it, so a calling agent can
// self-heal instead of guessing.

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url)); // libs/altitude-mcp/src/lib
export const PACKAGE_ROOT = join(HERE, '..', '..'); // libs/altitude-mcp
export const LIBS_DIR = join(PACKAGE_ROOT, '..'); // libs
export const REPO_ROOT = join(LIBS_DIR, '..'); // repo root
export const WC_ROOT = join(LIBS_DIR, 'al-web-components'); // libs/al-web-components

export const PATHS = Object.freeze({
  cem: join(WC_ROOT, 'custom-elements.json'),
  schemasDir: join(WC_ROOT, 'schemas'),
  tokensJson: join(WC_ROOT, 'dist', 'css', 'tokens.json'),
  aliasesJson: join(WC_ROOT, 'dist', 'css', 'aliases.json'),
  tokensDtcgDir: join(WC_ROOT, 'styles', 'tokens-dtcg'),
  migrationJson: join(REPO_ROOT, '.altitude', 'migration.json'),
  componentsDir: join(WC_ROOT, 'components'),
  iconCatalog: join(WC_ROOT, 'components', 'icon', 'catalog.ts'),
  aiThemeDir: join(WC_ROOT, '.storybook', 'ai-theme'),
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
});

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
  cem: 'pnpm --filter al-web-components build:custom-elements.json',
  tokens: 'pnpm --filter al-web-components build:tokens',
  storybook: "pnpm --filter al-web-components build:storybook --output-dir ../../dist/storybook/web-components",
});
