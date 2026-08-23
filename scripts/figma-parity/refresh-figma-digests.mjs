#!/usr/bin/env node
/**
 * refresh-figma-digests.mjs — observe the LIVE Figma side and update
 * `figmaCurrentDigest` per component (+ the `figmaOnly` list) in the parity
 * manifest. This is the snapshot half of the parity model: code drift is
 * computed live from local source, Figma drift is "as of the last run of this
 * script".
 *
 * MULTI-PROJECT: the design system to refresh comes from `--project <id>` /
 * `DS_PROJECT` / the registry default in `.altitude/ds-projects.json`. The
 * expected file key/name, the decoy blacklist and the component-page prefix are
 * all read from that record — none of them are hardcoded here any more.
 *
 * Requires a live write channel to Figma Desktop:
 *   node scripts/figma-atoms/mcp-shim.mjs        # spawns figma-console-mcp, http on :9401
 *   (Figma Desktop open on the project's file with the Desktop Bridge plugin running)
 *
 * Usage:
 *   node scripts/figma-parity/refresh-figma-digests.mjs [--port 9401]
 *   node scripts/figma-parity/refresh-figma-digests.mjs --project southleft
 *
 * The digest deliberately EXCLUDES node ids (molecule sets re-mint ids on every
 * rebuild — altitude-figma-sync trap 32) and captures what a designer can
 * change: set name, property definitions (axes + options + non-variant props),
 * variant names, and variant boxes (rounded px).
 */
import { readManifest, writeManifest, digestOf } from '../../libs/altitude-mcp/src/lib/parity.mjs';
import { resolveProject } from '../../libs/altitude-mcp/src/lib/ds-project.mjs';

const project = resolveProject();
const projectFlag = project.isDefault ? '' : ` --project ${project.id}`;
const EXPECTED_KEY = project.figma.fileKey;
const EXPECTED_NAME = project.figma.fileName;
const PAGE_PREFIX = project.figma.componentPagePrefix ?? '';

const portArg = process.argv.indexOf('--port');
const PORT = portArg > -1 ? Number(process.argv[portArg + 1]) : 9401;
const SHIM = `http://127.0.0.1:${PORT}/call`;

async function call(name, args) {
  let res;
  try {
    res = await fetch(SHIM, { method: 'POST', body: JSON.stringify({ name, arguments: args }) });
  } catch {
    console.error(
      `Cannot reach the figma-console shim on :${PORT}.\n` +
        'Start it first:  node scripts/figma-atoms/mcp-shim.mjs\n' +
        `(Figma Desktop must be open on "${EXPECTED_NAME}" with the Desktop Bridge plugin running.)`,
    );
    process.exit(1);
  }
  const body = await res.json();
  if (body.error || body.isError) throw new Error(`${name} failed: ${JSON.stringify(body.error ?? body.text).slice(0, 500)}`);
  return body.text;
}

/** figma_execute wraps output unpredictably — dig the JSON payload out. */
function parsePayload(text) {
  try {
    const outer = JSON.parse(text);
    // Common shapes: the value itself, or { result: <json-string> }.
    if (typeof outer === 'string') return JSON.parse(outer);
    if (outer && typeof outer.result === 'string') return JSON.parse(outer.result);
    return outer?.result ?? outer;
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end <= start) throw new Error(`unparseable figma_execute payload: ${text.slice(0, 300)}`);
    return JSON.parse(text.slice(start, end + 1));
  }
}

// Runs inside the plugin sandbox (documentAccess: dynamic-page — async APIs only).
const SNAPSHOT_CODE = `
  await figma.loadAllPagesAsync();
  const sets = [];
  for (const page of figma.root.children) {
    if (!page.name.startsWith('\\u{1F6E0}')) continue; // 🛠 component pages only
    for (const node of page.findAllWithCriteria({ types: ['COMPONENT_SET'] })) {
      let defs = {};
      try {
        defs = Object.fromEntries(
          Object.entries(node.componentPropertyDefinitions).map(([k, d]) => [
            k.split('#')[0],
            { type: d.type, options: d.variantOptions ?? null },
          ]),
        );
      } catch (e) { defs = { __error: String(e) }; }
      sets.push({
        name: node.name,
        page: page.name,
        defs,
        variants: node.children
          .map((c) => ({ name: c.name, w: Math.round(c.width), h: Math.round(c.height) }))
          .sort((a, b) => (a.name < b.name ? -1 : 1)),
      });
    }
  }
  return JSON.stringify({ fileKey: figma.fileKey ?? null, sets });
`;

const manifest = readManifest(project);
if (!manifest) {
  console.error(`No parity manifest for "${project.id}". Run: node scripts/figma-parity/seed-manifest.mjs${projectFlag}`);
  process.exit(1);
}
if (manifest.project && manifest.project !== project.id) {
  console.error(`Refusing to refresh: manifest belongs to project "${manifest.project}", not "${project.id}".`);
  process.exit(1);
}

// Guard against this project's decoy files before trusting anything we read.
const status = parsePayload(await call('figma_get_status', {}));
const statusStr = JSON.stringify(status);
for (const decoy of project.figma.decoys ?? []) {
  if (statusStr.includes(decoy.fileKey)) {
    console.error(
      `Refusing to refresh: Figma is on the "${decoy.fileName}" DECOY file. Open "${EXPECTED_NAME}" (${EXPECTED_KEY}).` +
        (decoy.why ? `
  ${decoy.why}` : ''),
    );
    process.exit(1);
  }
}

const payload = parsePayload(await call('figma_execute', { code: SNAPSHOT_CODE }));
if (payload.fileKey && payload.fileKey !== EXPECTED_KEY) {
  console.error(
    `Refusing to refresh: connected file is ${payload.fileKey}, expected ${EXPECTED_KEY} ("${EXPECTED_NAME}").`,
  );
  process.exit(1);
}
const sets = payload.sets ?? [];
console.log(`[${project.id}] Observed ${sets.length} component sets on ${PAGE_PREFIX ? PAGE_PREFIX.trim() + ' ' : ''}pages in "${EXPECTED_NAME}".`);

const byName = new Map(sets.map((s) => [s.name, s]));
const mappedNames = new Set();
let updated = 0;
let nowMissing = 0;

for (const [tag, entry] of Object.entries(manifest.components)) {
  if (!entry.figma?.name) continue;
  mappedNames.add(entry.figma.name);
  const live = byName.get(entry.figma.name);
  if (!live) {
    // Mapped but not found live — the set was deleted or renamed in Figma.
    entry.figmaCurrentDigest = 'absent';
    nowMissing += 1;
    console.warn(`  ! ${tag}: mapped to "${entry.figma.name}" but no such set found live`);
    continue;
  }
  const digest = digestOf({ name: live.name, defs: live.defs, variants: live.variants });
  if (entry.figmaCurrentDigest !== digest) updated += 1;
  entry.figmaCurrentDigest = digest;
  // The digest alone can only answer "did anything change". Persist the
  // OBSERVED CONTRACT too, so `diffFigmaContract` (parity.mjs) can answer
  // "which property, and how" — a variant removed from the Figma set becomes a
  // named mismatch instead of an opaque hash difference.
  entry.figmaContract = {
    props: live.defs ?? {},
    variants: (live.variants ?? []).map((v) => v.name),
  };
  // First observation after a seed: the seed stored an ops-derived stand-in
  // digest that can never equal a live digest. Rebase lastSync.figmaDigest to
  // the first observed value so "no change since sync" reads as in-sync.
  if (entry.lastSync && entry.lastSync.figmaDigest && !entry.lastSync.figmaObserved) {
    entry.lastSync.figmaDigest = digest;
    entry.lastSync.figmaObserved = true;
  }
}

manifest.figmaOnly = sets
  .filter((s) => !mappedNames.has(s.name))
  .map((s) => ({ name: s.name, nodeId: null, note: `Observed on page "${s.page}" with no mapped code component.` }));

manifest.figmaLastRefreshed = new Date().toISOString();
writeManifest(manifest, project);
console.log(
  `[${project.id}] Refreshed: ${updated} digest change(s), ${nowMissing} mapped set(s) missing live, ${manifest.figmaOnly.length} Figma-only set(s). Manifest updated.`,
);
