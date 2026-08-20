// Reads libs/al-web-components/custom-elements.json (the CEM) — the same
// manifest cli/validate.mjs trusts. This module is a reader only; it never
// mutates or regenerates the manifest.

import { readFileSync } from 'node:fs';
import { PATHS, HINTS, requireFile } from './paths.mjs';

let cache = null;

/**
 * @returns {Array<{tag:string, className:string, description:string, modulePath:string,
 *   slots:any[], events:any[], cssParts:any[], cssProperties:any[], attributes:any[]}>}
 */
export function loadComponents() {
  if (cache) return cache;
  requireFile(PATHS.cem, HINTS.cem);
  const cem = JSON.parse(readFileSync(PATHS.cem, 'utf8'));
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
  cache = out;
  return out;
}

export function getComponent(tag) {
  return loadComponents().find((c) => c.tag === tag);
}

/** `al-button` -> `button` (matches .altitude/migration.json + schema file naming). */
export function tagToSlug(tag) {
  return tag.startsWith('al-') ? tag.slice(3) : tag;
}
