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
 * `figmaPlaceholder` NAMES A PHOSPHOR CATALOG ENTRY (T25, spec 2026-08-25-
 * contract-backed-figma-parity-and-generation) — `libs/al-web-components/
 * components/icon/catalog.ts` + `phosphor/*.ts` — the design-system's own
 * icon library, not a Figma-side name. Figma's real component sets predate
 * the Phosphor library and used a now-retired "🛠 Icons" page (old names like
 * `done-circle`/`send`); those were resolved by hand to their nearest
 * Phosphor equivalent (`check-circle`/`paper-plane`) and the CONTRACT was
 * updated to store the Phosphor name directly, so this module needs no
 * translation table of its own — a contract's `figmaPlaceholder` is always
 * already a valid catalog name. (`scripts/contracts/generate-figma.mjs`
 * resolving a Phosphor name against the Figma-side Phosphor library is
 * separate, follow-up work — not this module's concern.)
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
  const resolve = (side) => slotByName.get(side)?.figmaPlaceholder || FALLBACK_ICON[side];
  return { before: resolve('before'), after: resolve('after') };
}
