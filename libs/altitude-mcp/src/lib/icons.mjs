// Reads libs/al-web-components/components/icon/catalog.ts — the AUTO-GENERATED
// 1,512-entry Phosphor glyph catalog (icons/icons-config.mjs). The file is a
// TypeScript module, but its payload is a single JSON-compatible array
// literal (`export const catalog: readonly AltitudeIconCatalogEntry[] = [...]`),
// so we lift it out with a regex + JSON.parse rather than pulling in a TS
// runtime for one array.

import { readFileSync } from 'node:fs';
import { PATHS, requireFile } from './paths.mjs';

// Three Phosphor names collide with JS reserved words; glyphs.ts exports
// them with an `Icon` suffix. Mirrors components/icon/icon.ts::toExportName.
const RESERVED_EXPORTS = new Set(['export', 'function', 'package']);

let cache = null;

export function loadIconCatalog() {
  if (cache) return cache;
  requireFile(PATHS.iconCatalog, 'pnpm --filter @southleft/al-web-components build:icons');
  const src = readFileSync(PATHS.iconCatalog, 'utf8');
  const m = /export const catalog: readonly AltitudeIconCatalogEntry\[\] = (\[[\s\S]*\]);/.exec(src);
  if (!m) {
    throw new Error(
      `Could not locate the \`catalog\` array literal in ${PATHS.iconCatalog}. ` +
        'Its shape may have changed upstream — this reader needs updating to match.'
    );
  }
  cache = JSON.parse(m[1]);
  return cache;
}

/** kebab name -> the camelCase export in glyphs.ts (icon.ts::toExportName). */
export function toExportName(kebab) {
  const camel = kebab.replace(/-([a-z0-9])/g, (_m, c) => c.toUpperCase());
  return RESERVED_EXPORTS.has(camel) ? `${camel}Icon` : camel;
}

export function importGuidanceFor(kebab) {
  const exportName = toExportName(kebab);
  return {
    exportName,
    snippet:
      `import { ${exportName} } from '@southleft/al-web-components/dist/components/icon/glyphs.js';\n` +
      `import { registerIcons } from '@southleft/al-web-components/dist/components/icon/registry.js';\n` +
      `registerIcons({ '${kebab}': ${exportName} });`,
  };
}

/**
 * @param {{query?: string, category?: string, limit?: number}} opts
 */
export function searchIcons({ query, category, limit = 50 } = {}) {
  const catalog = loadIconCatalog();
  const q = query?.toLowerCase().trim();
  const cat = category?.toLowerCase().trim();
  const matches = catalog.filter((entry) => {
    if (cat && !entry.categories.some((c) => c.toLowerCase() === cat)) return false;
    if (!q) return true;
    if (entry.name.includes(q)) return true;
    if (entry.tags.some((t) => t.toLowerCase().includes(q))) return true;
    if (entry.categories.some((c) => c.toLowerCase().includes(q))) return true;
    return false;
  });
  return matches.slice(0, limit).map((entry) => ({ ...entry, ...importGuidanceFor(entry.name) }));
}
