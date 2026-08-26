/**
 * Contract-sourced defaults for the docs playground's icon-slot demo (T24).
 *
 * `.altitude/contracts/<project>/<tag>.contract.json` is the source of truth
 * the Figma generator already reads for `slots[].figmaPlaceholder` — the
 * icon a `before`/`after` slot renders by default in the Figma component
 * (see `scripts/contracts/generate-figma.mjs`). This module reads the same
 * file, for the same reason: a starting glyph before the reader has typed
 * anything into the playground's icon search.
 *
 * PER PROJECT, NOT PER LIBRARY. `.altitude/contracts/` has one directory per
 * design-system project (`altitude/`, `southleft/`) because the same tag can
 * carry different contracts in each — so this is looked up by
 * `(project.id, component.tag)`, not cached across projects.
 *
 * A `figmaPlaceholder` NAMES A FIGMA INSTANCE-SWAP DEFAULT, not necessarily a
 * name in this library's Phosphor icon catalog — Figma's "Icon Placeholder"
 * set and Phosphor do not share a naming scheme. `al-button`'s contract says
 * `done-circle` / `send`; neither exists in
 * `libs/al-web-components/components/icon/catalog.ts`. Each is mapped once,
 * by hand, to its nearest Phosphor equivalent below. If a future contract
 * introduces a new placeholder name with no entry here, the generic fallback
 * is used instead of throwing — a docs playground default is a convenience,
 * not a contract obligation, so a missing mapping degrades quietly rather
 * than failing the build.
 */
import fs from 'node:fs';
import path from 'node:path';
import { repoRoot } from './repo-root.mjs';

const CONTRACTS_ROOT = path.join(repoRoot(), '.altitude', 'contracts');

const CONTRACT_CACHE = new Map();

function loadContract(projectId, tag) {
  const key = `${projectId}/${tag}`;
  if (CONTRACT_CACHE.has(key)) return CONTRACT_CACHE.get(key);
  const file = path.join(CONTRACTS_ROOT, projectId, `${tag}.contract.json`);
  const contract = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  CONTRACT_CACHE.set(key, contract);
  return contract;
}

/** Figma placeholder name -> nearest Phosphor catalog entry, verified by hand. */
const PLACEHOLDER_TO_ICON = {
  'done-circle': 'check-circle',
  send: 'paper-plane',
};

/** Used when a slot has no contract, or a contract slot has no placeholder. */
const FALLBACK_ICON = { before: 'check-circle', after: 'arrow-right' };

/**
 * Default icon names for a component's `before`/`after` slots, for the
 * project the docs page is currently rendering.
 *
 * @param {string} projectId  `.altitude/ds-projects.json` project id (e.g. `altitude`)
 * @param {string} tag        the component's custom-element tag (e.g. `al-button`)
 * @returns {{ before: string, after: string }}
 */
export function iconSlotDefaults(projectId, tag) {
  const contract = loadContract(projectId, tag);
  const slotByName = new Map((contract?.slots ?? []).map((s) => [s.name, s]));
  const resolve = (side) => {
    const placeholder = slotByName.get(side)?.figmaPlaceholder;
    return (placeholder && PLACEHOLDER_TO_ICON[placeholder]) || FALLBACK_ICON[side];
  };
  return { before: resolve('before'), after: resolve('after') };
}
