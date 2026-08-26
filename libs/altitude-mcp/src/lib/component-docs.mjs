// Readers for the two T20 artifacts (spec 2026-08-25-contract-backed-figma-
// parity-and-generation): a component's CONTRACT
// (`.altitude/contracts/<project>/<tag>.contract.json`) and its GENERATED
// Markdown reference doc (`.altitude/contracts/docs/<project>/<tag>.md`,
// built by scripts/contracts/build-component-docs.mjs from the contract +
// that project's parity manifest).
//
// Both are OPTIONAL per (tag, project) — a component with no parity-manifest
// entry, one that is `excluded: true` (al-icon, al-theme-switcher, …), or one
// that simply hasn't been seeded/regenerated yet has neither file on disk.
// Every reader here returns `null` on a missing file rather than throwing, so
// a caller (altitude_get_component's handler) can omit the field entirely —
// same graceful-degradation discipline as ./schemas.mjs's loadSchema() and
// ./stories.mjs's getStoryInfo().
//
// Paths are computed from the LIVE `REPO_ROOT` binding (./paths.mjs), never
// cached at module-eval time, for the same reason every other reader in this
// package does that — see paths.mjs's header on `configurePaths(repoRoot)`.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { REPO_ROOT } from './paths.mjs';

function contractPath(projectId, tag) {
  return join(REPO_ROOT, '.altitude', 'contracts', projectId, `${tag}.contract.json`);
}

function docPath(projectId, tag) {
  return join(REPO_ROOT, '.altitude', 'contracts', 'docs', projectId, `${tag}.md`);
}

/** The tag's contract JSON for `projectId`, or `null` if none exists on disk yet. */
export function loadComponentContract(tag, projectId) {
  const file = contractPath(projectId, tag);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, 'utf8'));
}

/**
 * The tag's GENERATED reference doc for `projectId`, or `null` if none exists
 * yet (see scripts/contracts/build-component-docs.mjs). Returns the repo-
 * relative path alongside the Markdown content so a caller can link back to
 * the tracked file instead of re-embedding it.
 */
export function loadComponentDoc(tag, projectId) {
  const file = docPath(projectId, tag);
  if (!existsSync(file)) return null;
  return {
    path: `.altitude/contracts/docs/${projectId}/${tag}.md`,
    content: readFileSync(file, 'utf8'),
  };
}
