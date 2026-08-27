#!/usr/bin/env node
/**
 * sync-instance-map.mjs — re-pin a project's instance map to the CURRENT node ids.
 *
 * Figma node ids are minted per component set. Rebuilding a set (rather than
 * repairing it in place) mints a NEW id, which silently invalidates every pinned id
 * in the instance map: build-page then resolves `null` and the molecule that should
 * have contained an instance quietly flattens instead. This reads the live ids and
 * rewrites them in place so that class of failure cannot survive a rebuild.
 *
 *   node scripts/figma-atoms/sync-instance-map.mjs --project southleft [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { scope, projectArg } from './project-scope.mjs';
import { shimPortFromArgv } from '../lib/figma-shim.mjs';

const SC = scope(projectArg());
const DRY = process.argv.includes('--dry');
const SHIM = shimPortFromArgv(); // --port canonical, --shim legacy alias (scripts/lib/figma-shim.mjs)

if (!SC.instanceMapPath) {
  console.error(`project "${SC.id}" has no instanceMap registered — nothing to sync.`);
  process.exit(1);
}

const CODE = `
await figma.loadAllPagesAsync();
const out = {};
for (const p of figma.root.children) {
  for (const s of p.children.filter((n) => n.type === 'COMPONENT_SET')) out[s.name] = s.id;
}
return out;
`;

const res = await fetch(`http://localhost:${SHIM}/call`, {
  method: 'POST',
  body: JSON.stringify({ name: 'figma_execute', arguments: { code: CODE, fileKey: SC.fileKey, timeout: 30000 } }),
});
const payload = JSON.parse((await res.json()).text);
if (payload.success === false || payload.error) {
  console.error('FAILED:', payload.error || payload);
  process.exit(1);
}
const live = typeof payload.result === 'string' ? JSON.parse(payload.result) : payload.result;

const src = readFileSync(SC.instanceMapPath, 'utf8');
// Matches:  set('Figma Name', '10:1234',
const ENTRY = /set\(\s*'([^']+)'\s*,\s*'([^']*)'/g;
let updated = 0;
const stale = [];
const missing = [];

const out = src.replace(ENTRY, (whole, name, oldId) => {
  const id = live[name];
  if (!id) { missing.push(name); return whole; }
  if (id === oldId) return whole;
  updated++;
  stale.push(`${name}: ${oldId || '(none)'} -> ${id}`);
  return whole.replace(`'${oldId}'`, `'${id}'`);
});

if (!DRY && updated) writeFileSync(SC.instanceMapPath, out);
console.log(JSON.stringify({
  file: SC.instanceMapPath.split(/[\\/]/).pop(),
  liveSets: Object.keys(live).length,
  repinned: updated,
  changes: stale,
  notInFigma: missing,
  dryRun: DRY,
}, null, 1));
