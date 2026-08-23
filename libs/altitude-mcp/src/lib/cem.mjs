// Reads libs/al-web-components/custom-elements.json (the CEM) — the same
// manifest cli/validate.mjs trusts. This module is a reader only; it never
// mutates or regenerates the manifest.
//
// A second CEM enters the picture for brand layers (see `ds-project.mjs`
// `resolved.brandLibrary.cem` — e.g. libs/sl-web-components/custom-elements.json):
// `loadComponentsFrom()` is the general reader, keyed and cached by path;
// `loadComponents()` is the base-CEM convenience wrapper every existing caller
// still gets unchanged.

import { readFileSync } from 'node:fs';
import { PATHS, HINTS, requireFile } from './paths.mjs';

const cacheByPath = new Map();

/** Parse one CEM's `modules[].declarations[]` into the flat shape this module returns. */
function parseCem(cem) {
  const out = [];
  for (const mod of cem.modules ?? []) {
    for (const d of mod.declarations ?? []) {
      if (!d.customElement || !d.tagName) continue;
      out.push({
        tag: d.tagName,
        className: d.name,
        description: d.description ?? '',
        summary: d.summary ?? '',
        modulePath: mod.path,
        slots: d.slots ?? [],
        events: d.events ?? [],
        cssParts: d.cssParts ?? [],
        cssProperties: d.cssProperties ?? [],
        attributes: d.attributes ?? [],
        members: d.members ?? [],
      });
    }
  }
  return out;
}

/**
 * Load and flatten an arbitrary CEM file, cached per path.
 *
 * @param {string} cemPath absolute path to a `custom-elements.json`
 * @param {string} [hint] pnpm command to print if the file is missing
 * @returns {Array<{tag:string, className:string, description:string, modulePath:string,
 *   slots:any[], events:any[], cssParts:any[], cssProperties:any[], attributes:any[]}>}
 */
export function loadComponentsFrom(cemPath, hint = HINTS.cem) {
  if (cacheByPath.has(cemPath)) return cacheByPath.get(cemPath);
  requireFile(cemPath, hint);
  const cem = JSON.parse(readFileSync(cemPath, 'utf8'));
  const out = parseCem(cem);
  cacheByPath.set(cemPath, out);
  return out;
}

/**
 * @returns {Array<{tag:string, className:string, description:string, modulePath:string,
 *   slots:any[], events:any[], cssParts:any[], cssProperties:any[], attributes:any[]}>}
 */
export function loadComponents() {
  return loadComponentsFrom(PATHS.cem, HINTS.cem);
}

export function getComponent(tag) {
  return loadComponents().find((c) => c.tag === tag);
}

/** `al-button` -> `button` (matches .altitude/migration.json + schema file naming). */
export function tagToSlug(tag) {
  return tag.startsWith('al-') ? tag.slice(3) : tag;
}
