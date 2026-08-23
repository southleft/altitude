#!/usr/bin/env node
/**
 * list-projects.mjs — show every design system declared in
 * `.altitude/ds-projects.json`, with its Figma file, Storybook port, parity
 * manifest and live parity summary.
 *
 * This is the "what's what" view: one command that answers which design systems
 * exist, which Figma file each is checked against, and how far each one is from
 * being 1:1 with its file.
 *
 * Usage:
 *   node scripts/figma-parity/list-projects.mjs          # pnpm run parity:projects
 *   node scripts/figma-parity/list-projects.mjs --json   # machine-readable
 */
import { existsSync } from 'node:fs';

import { listProjectIds, resolveProject } from '../../libs/altitude-mcp/src/lib/ds-project.mjs';
import { computeParity } from '../../libs/altitude-mcp/src/lib/parity.mjs';

const asJson = process.argv.includes('--json');
const rows = [];

for (const id of listProjectIds()) {
  const p = resolveProject(id);
  const manifestExists = existsSync(p.resolved.parityManifest);
  let summary = null;
  let error = null;
  try {
    summary = computeParity(p).summary;
  } catch (err) {
    error = String(err?.message ?? err);
  }
  rows.push({
    id: p.id,
    name: p.name,
    brand: p.brand,
    isDefault: p.isDefault,
    figmaFileName: p.figma.fileName,
    figmaFileKey: p.figma.fileKey,
    figmaUrl: p.resolved.figmaUrlBase,
    // Optional: Southleft's Storybook was retired 2026-08-23 (docs site instead).
    storybookPort: p.storybook?.port ?? null,
    storybookConfigDir: p.storybook?.configDir ?? null,
    docs: p.docs?.productionBase ?? null,
    parityManifest: p.paths.parityManifest,
    manifestExists,
    summary,
    error,
  });
}

if (asJson) {
  console.log(JSON.stringify({ default: resolveProject().id, projects: rows }, null, 2));
  process.exit(0);
}

for (const r of rows) {
  console.log(`\n${r.id}${r.isDefault ? '  (default)' : ''}`);
  console.log(`  name       ${r.name}`);
  console.log(`  brand      ${r.brand}`);
  console.log(`  figma      "${r.figmaFileName}" (${r.figmaFileKey})`);
  console.log(`             ${r.figmaUrl}`);
  console.log(`  storybook  port ${r.storybookPort} — ${r.storybookConfigDir}`);
  console.log(`  manifest   ${r.parityManifest}${r.manifestExists ? '' : '  [MISSING — run parity:seed]'}`);
  if (r.error) {
    console.log(`  parity     ERROR: ${r.error}`);
    continue;
  }
  const parts = Object.entries(r.summary)
    .filter(([, n]) => n > 0)
    .map(([s, n]) => `${s}=${n}`)
    .join('  ');
  console.log(`  parity     ${parts || '(no components)'}`);
}
console.log('');
