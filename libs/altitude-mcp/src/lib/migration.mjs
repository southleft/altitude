// Reads .altitude/migration.json — per-component migration state
// (legacy / dual / scoped-complete). Read-only.

import { readFileSync, existsSync } from 'node:fs';
import { PATHS } from './paths.mjs';

let cache = null;

export function loadMigration() {
  if (cache) return cache;
  if (!existsSync(PATHS.migrationJson)) {
    cache = { components: {} };
    return cache;
  }
  cache = JSON.parse(readFileSync(PATHS.migrationJson, 'utf8'));
  return cache;
}

/** Accepts either a tag (`al-button`) or a slug (`button`). */
export function getMigrationState(tagOrSlug) {
  const slug = tagOrSlug.startsWith('al-') ? tagOrSlug.slice(3) : tagOrSlug;
  const data = loadMigration();
  return data.components?.[slug] ?? null;
}
