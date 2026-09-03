#!/usr/bin/env node
/**
 * build-canvas-projection.mjs — emit the ONE TRACKED file that lets
 * `contract-diff.mjs` compute canvas disagreements on a machine that has
 * never opened Figma.
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────────────
 *
 * The canvas contracts under `<figmaSyncDir>/canvas-contracts/*.canvas.json`
 * are LIVE OBSERVATIONS: extracted through the Figma bridge by
 * `scripts/contracts/extract-canvas.mjs`, gitignored (`.gitignore`, the
 * `.altitude/figma-sync/*` block), and therefore ABSENT on a clone. That is
 * correct for the dumps — they carry node ids, a file key and a full anatomy
 * tree, and they go stale the moment a designer touches the file.
 *
 * It is NOT correct for their CONSEQUENCES. Measured 2026-09-03 on this
 * machine: 36 code/canvas pairs compared, 259 property-level disagreements.
 * In CI and on the deployed docs site the same code compares ZERO pairs and
 * the parity panel can only ever say "not compared", because the inputs are
 * not there. `check:figma-conventions` is out of CI for exactly the same
 * reason, and its own `//` comment key in package.json says so: "Gating it
 * would need a TRACKED projection of the conventions, not the gitignored
 * contracts."
 *
 * This script builds that projection: axes, properties, states, text-style
 * names and bound-variable NAMES — the facts a diff is computed from — and
 * nothing that identifies a node, a file, a path, or a pixel.
 *
 * ── WHAT IT IS NOT ───────────────────────────────────────────────────────
 *
 * A projection is a POINT-IN-TIME READ, not a live comparison. A consumer
 * must never render "compared against the projection" identically to
 * "compared against a live dump" — `diffContracts()` reports `source:
 * 'live-dump' | 'projection' | 'none'` so it cannot. The staleness stamp
 * below (`source.newestMtime`, `source.digest`, `source.figmaFileKeyHash`,
 * `generatedAt`, `generator.commit`) is what lets a reader judge how much a
 * projected answer is worth.
 *
 * `source.figmaFileKeyHash` is a HASH, never the key. A repoint (Southleft's
 * on 2026-09-02) is then detectable — the hash stops matching the project's
 * current key — without this tracked file publishing the key itself.
 *
 * ── USAGE ────────────────────────────────────────────────────────────────
 *
 *   node scripts/figma-parity/build-canvas-projection.mjs
 *   node scripts/figma-parity/build-canvas-projection.mjs --project southleft
 *   node scripts/figma-parity/build-canvas-projection.mjs --check
 *
 * `--check` is the regenerate-and-diff gate every generated artifact in this
 * repo answers to (see scripts/check-mcp-docs.mjs: "a generated artifact is
 * gated by re-running its generator, not by a second, independently-drifting
 * parser"). It compares the SUBSTANCE — the `components` map, the source
 * digest, the file-key hash — and deliberately ignores `generatedAt` and
 * `generator.commit`, which change with the clock and the branch rather than
 * with the facts.
 *
 * With NO dumps on disk (a clone, CI) `--check` still verifies the one thing
 * it can: that the projection was built against the Figma file the registry
 * currently names. It reports SKIPPED for the rest rather than passing
 * vacuously.
 *
 * Exit: 0 when the projection matches (or nothing was checkable and the
 * file-key hash agrees), 1 on any disagreement.
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

import { resolveProject } from '../../libs/altitude-mcp/src/lib/ds-project.mjs';
import { REPO_ROOT } from '../../libs/altitude-mcp/src/lib/paths.mjs';

const GENERATOR = 'scripts/figma-parity/build-canvas-projection.mjs';

// ── the projected surface ────────────────────────────────────────────────
//
// EXACTLY the fields `contract-diff.mjs` reads off a canvas contract, plus
// the two the offline convention lint reads (`variantAxes`, `figma.name`).
// Adding a field here is adding to the tracked public surface — justify it
// against a consumer that actually reads it, and re-run `--check`.
//
//   degradations       -> diffContracts()'s `degraded()` gates (set-not-found,
//                         no State axis). Dropping it silently converts a
//                         DEGRADED FACT into four false disagreements.
//   componentProperties-> the prop / variant-axis / variant-value pass.
//   states             -> the state pass.
//   anatomySource      -> the token pass runs only when this is 'observed'.
//   tokensOwn          -> collectCanvasFigmaTokens()'s preferred source.
//   tokensNested       -> delegatedNestedTags()'s preferred source AND the
//                         non-delegated union in collectCanvasFigmaTokens().
//   tokens             -> that function's last-resort fallback, carried so a
//                         dump extracted before tokensOwn existed still
//                         projects to SOMETHING named rather than to silence.
//   variantAxes        -> scripts/lib/figma-conventions.mjs (Title Case, the
//                         State vocabulary).
//   textStyles         -> the honest comparison for text weight, which is
//                         unbindable as a variable (see UNBINDABLE_TOKEN_
//                         PREFIXES in contract-diff.mjs).
//   figma.name         -> set-name-vs-manifest, same lint. NAME ONLY.
const PROJECTED_FIELDS = [
  'anatomySource',
  'variantAxes',
  'componentProperties',
  'states',
  'textStyles',
  'tokens',
  'tokensOwn',
  'tokensNested',
  'degradations',
];

// ── the scrub ────────────────────────────────────────────────────────────
//
// The dumps DO contain `figma.nodeId`, `figma.fileKey`, a `bindings.figma`
// block with a deep link, and an `anatomy` tree. Stripping those is the
// whole point of this file existing, so it is asserted rather than assumed:
// `assertScrubbed()` walks the emitted `components` subtree and throws on
// any survivor. apps/docs/scripts/check-status-panels.mjs is the leak gate
// for the docs SITE; this must not become the hole in it.
const FORBIDDEN_KEYS = new Set([
  'nodeId', 'node_id', 'nodeID',
  'fileKey', 'file_key', 'fileId', 'figmaFileKey',
  'id', 'key', 'url', 'href', 'link',
  'anatomy', 'bindings',
  'x', 'y', 'width', 'height', 'size',
  'absoluteBoundingBox', 'absoluteRenderBounds', 'boundingBox', 'rotation',
]);

/** `3538:36730` — the Figma node-id shape, anywhere in a string. */
const NODE_ID_RE = /(^|[^\d])\d{1,8}:\d{1,8}([^\d]|$)/;
/** A bare 20-24 char alphanumeric run carrying both letters and digits — the
 * Figma file-key shape. Generic on purpose: it catches a key this repo has
 * never seen (a client file, a fork's file) as well as the registered ones. */
const FILE_KEY_SHAPE_RE = /(?:^|[^A-Za-z0-9])([A-Za-z0-9]{20,24})(?:[^A-Za-z0-9]|$)/;
/** `D:\repo\...`, `/Users/...`, `file:///...` */
const ABS_PATH_RE = /(^[A-Za-z]:[\\/])|(^\/[A-Za-z_.])|(^file:\/\/)/;

/** Every Figma file key this repo knows about, live entries AND decoys. */
function knownFileKeys(registryPath = join(REPO_ROOT, '.altitude', 'ds-projects.json')) {
  const keys = new Set();
  if (!existsSync(registryPath)) return keys;
  let reg;
  try {
    reg = JSON.parse(readFileSync(registryPath, 'utf8'));
  } catch {
    return keys;
  }
  for (const p of Object.values(reg.projects ?? {})) {
    if (p?.figma?.fileKey) keys.add(p.figma.fileKey);
    for (const d of p?.figma?.decoys ?? []) if (d?.fileKey) keys.add(d.fileKey);
  }
  return keys;
}

/**
 * Throw if anything forbidden survived into `node`.
 *
 * Four independent assertions, because each catches a different mistake:
 *   1. a forbidden KEY name (someone widened PROJECTED_FIELDS);
 *   2. a node-id-shaped or file-key-shaped or path-shaped STRING (a value
 *      leaked through a field whose name looks innocent);
 *   3. a literally-known file key (belt and braces over 2);
 *   4. ANY NUMBER AT ALL. Every projected fact is a name or a list of names,
 *      so a number in this subtree can only be geometry, a node index, or a
 *      count that does not belong in a tracked projection. This is the
 *      cheapest possible "no pixel geometry" assertion and it needs no
 *      per-field allow-list to stay true.
 *
 * @throws {Error} naming the JSON path of the first survivor.
 */
export function assertScrubbed(node, fileKeys = knownFileKeys(), path = '$') {
  if (node === null || node === undefined) return;
  if (typeof node === 'number') {
    throw new Error(
      `canvas projection leak at ${path}: a NUMBER (${node}) reached the projection. ` +
        'Every projected fact is a name or a list of names; a number here is geometry, an index or a count.',
    );
  }
  if (typeof node === 'boolean') return;
  if (typeof node === 'string') {
    if (NODE_ID_RE.test(node)) throw new Error(`canvas projection leak at ${path}: node-id-shaped string ${JSON.stringify(node)}.`);
    if (ABS_PATH_RE.test(node)) throw new Error(`canvas projection leak at ${path}: absolute path ${JSON.stringify(node)}.`);
    if (node.includes('figma.com')) throw new Error(`canvas projection leak at ${path}: Figma URL ${JSON.stringify(node)}.`);
    for (const k of fileKeys) {
      if (node.includes(k)) throw new Error(`canvas projection leak at ${path}: contains the Figma file key for a registered project.`);
    }
    const shaped = FILE_KEY_SHAPE_RE.exec(node);
    if (shaped && /[A-Za-z]/.test(shaped[1]) && /[0-9]/.test(shaped[1])) {
      throw new Error(`canvas projection leak at ${path}: file-key-shaped token ${JSON.stringify(shaped[1])} in ${JSON.stringify(node)}.`);
    }
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((v, i) => assertScrubbed(v, fileKeys, `${path}[${i}]`));
    return;
  }
  if (typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (FORBIDDEN_KEYS.has(k)) throw new Error(`canvas projection leak at ${path}.${k}: forbidden key "${k}".`);
      assertScrubbed(v, fileKeys, `${path}.${k}`);
    }
    return;
  }
  throw new Error(`canvas projection: unprojectable value of type ${typeof node} at ${path}.`);
}

/** sha256 of a string, CRLF-normalised — same convention as parity.mjs's `contractFileHash`. */
function sha256(text) {
  return createHash('sha256').update(String(text).replace(/\r\n/g, '\n')).digest('hex');
}

/**
 * Project ONE parsed canvas contract down to the tracked surface.
 *
 * `figma` is rebuilt from scratch (name only) rather than copied — copying
 * and deleting is how `fileKey` gets re-added by the next person who adds a
 * field to the extractor.
 */
export function projectCanvasContract(canvas) {
  const out = {};
  if (canvas?.figma?.name) out.figma = { name: canvas.figma.name };
  for (const field of PROJECTED_FIELDS) {
    if (canvas?.[field] !== undefined) out[field] = canvas[field];
  }

  // NAMED, never silent. `collectCanvasFigmaTokens()` prefers `tokensOwn`,
  // falls back to walking `anatomy`, and only then to the flat `tokens`
  // list. The projection has no anatomy by design, so a dump that predates
  // `tokensOwn` projects to the `tokens` fallback instead of the anatomy
  // walk — a DIFFERENT (default-variant-only vs. cross-variant) set. That
  // is a real difference in provenance and it is recorded here rather than
  // quietly absorbed. Zero components are in this class for `altitude` as
  // of 2026-09-03 (only the throwaway `.pilot` dump, which is skipped).
  const notes = [];
  if (out.anatomySource === 'observed' && out.tokensOwn === undefined) {
    notes.push(
      'tokens — this dump predates `tokensOwn`; the projection carries the flat `tokens` list, ' +
        'so a live diff (which would walk `anatomy`) may see a different set.',
    );
  }
  if (notes.length) out.projectionDegradations = notes;
  return out;
}

/** Canvas dumps for a project, as `{ tag, file, path, mtimeMs, raw }`, tag-sorted. */
function readDumps(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.canvas.json'))
    // `al-button.pilot.canvas.json` and friends are throwaway extraction
    // experiments, not the tracked view of a component — same rule
    // scripts/check-figma-conventions.mjs applies, so the two surfaces agree
    // on what "the library" is.
    .filter((f) => f.split('.').length === 3)
    .sort()
    .map((f) => {
      const path = join(dir, f);
      return { tag: f.replace(/\.canvas\.json$/, ''), file: f, path, mtimeMs: statSync(path).mtimeMs, raw: readFileSync(path, 'utf8') };
    });
}

function gitCommit() {
  const r = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: REPO_ROOT, encoding: 'utf8' });
  if (r.status !== 0) return null;
  return r.stdout.trim() || null;
}

/** Where a project's tracked projection lives. */
export function projectionPathFor(project) {
  return join(project.resolved.figmaSyncDir, 'canvas-projection.json');
}

/**
 * Build the whole projection document for a project.
 * Pure apart from reading the dumps and asking git for a commit.
 */
export function buildProjection(project, { commit = gitCommit() } = {}) {
  const dir = join(project.resolved.figmaSyncDir, 'canvas-contracts');
  const dumps = readDumps(dir);

  const components = {};
  const hashes = {};
  let newestMtime = null;
  for (const d of dumps) {
    let parsed;
    try {
      parsed = JSON.parse(d.raw);
    } catch (e) {
      throw new Error(`${d.path} is not valid JSON: ${e.message}`);
    }
    components[d.tag] = projectCanvasContract(parsed);
    hashes[d.tag] = `sha256:${sha256(d.raw)}`;
    if (newestMtime === null || d.mtimeMs > newestMtime) newestMtime = d.mtimeMs;
  }

  // THE SCRUB, asserted. Runs over `components` only — that is the subtree
  // COPIED from the dumps and therefore the only place a leak can come
  // from. `source` below is authored here, field by field, and is checked
  // by its own assertion rather than by the generic walk (its ISO timestamp
  // is node-id-shaped to a regex, and its digests are file-key-shaped).
  assertScrubbed(components);

  const fileKey = project.figma?.fileKey ?? '';
  const source = {
    dir: relative(REPO_ROOT, dir).replace(/\\/g, '/'),
    count: dumps.length,
    /** Newest source-dump mtime — how fresh the OBSERVATIONS behind this were. */
    newestMtime: newestMtime === null ? null : new Date(newestMtime).toISOString(),
    /** One digest over every dump's bytes: what `--check` compares. */
    digest: `sha256:${sha256(dumps.map((d) => `${d.tag}\u0000${sha256(d.raw)}`).join('\n'))}`,
    /** HASH of the project's Figma file key, never the key. A repoint stops
     * this matching, which is the one staleness check that works with no
     * dumps on disk at all — i.e. in CI. */
    figmaFileKeyHash: `sha256:${sha256(fileKey)}`,
    perComponent: hashes,
  };
  assertMetaClean(source);

  return {
    $comment:
      'TRACKED PROJECTION of the gitignored canvas contracts — axes, properties, states, text-style ' +
      'names and bound-variable names, with no node ids, no Figma file key, no paths and no geometry. ' +
      `Generated by ${GENERATOR}; regenerate-and-diff gated with its --check. ` +
      'A projected diff is a point-in-time read, NOT a live comparison: contract-diff.mjs reports ' +
      "source: 'projection' when it uses this, and consumers must render that differently.",
    project: project.id,
    generatedAt: new Date().toISOString().slice(0, 10),
    generator: { script: GENERATOR, commit },
    source,
    components,
  };
}

/** The meta block is authored, not copied — assert the one thing that matters. */
function assertMetaClean(source, fileKeys = knownFileKeys()) {
  const text = JSON.stringify(source);
  for (const k of fileKeys) {
    if (text.includes(k)) throw new Error('canvas projection leak: a raw Figma file key reached `source`. It must be hashed.');
  }
  if (text.includes('figma.com')) throw new Error('canvas projection leak: a Figma URL reached `source`.');
  if (/[A-Za-z]:\\\\/.test(text)) throw new Error('canvas projection leak: an absolute Windows path reached `source`.');
}

/** The fields `--check` compares. `generatedAt` and `generator.commit` move
 * with the clock and the branch, not with the facts, and are excluded. */
function substance(doc) {
  return JSON.stringify({
    project: doc?.project ?? null,
    source: {
      count: doc?.source?.count ?? null,
      digest: doc?.source?.digest ?? null,
      figmaFileKeyHash: doc?.source?.figmaFileKeyHash ?? null,
      perComponent: doc?.source?.perComponent ?? null,
    },
    components: doc?.components ?? null,
  });
}

// ── CLI ──────────────────────────────────────────────────────────────────

function main() {
  const check = process.argv.includes('--check');
  const project = resolveProject();
  const projFlag = project.isDefault ? '' : ` --project ${project.id}`;
  const outPath = projectionPathFor(project);
  const outRel = relative(REPO_ROOT, outPath).replace(/\\/g, '/');
  const dir = join(project.resolved.figmaSyncDir, 'canvas-contracts');
  const dumps = readDumps(dir);

  if (!check) {
    if (dumps.length === 0) {
      console.error(`[canvas-projection] No canvas dumps for "${project.id}" at ${relative(REPO_ROOT, dir)}.`);
      console.error(`Extract them first: pnpm run contracts:canvas${projFlag}`);
      console.error('Refusing to write an EMPTY projection — an empty one reads as "the library has no facts",');
      console.error('which is exactly the silent failure this file exists to prevent.');
      process.exit(1);
    }
    const doc = buildProjection(project);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
    const bytes = statSync(outPath).size;
    console.log(`[canvas-projection] ${project.id}: wrote ${outRel}`);
    console.log(`  components : ${Object.keys(doc.components).length}`);
    console.log(`  size       : ${(bytes / 1024).toFixed(1)} KB`);
    console.log(`  dumps read : ${doc.source.count}, newest ${doc.source.newestMtime}`);
    console.log(`  digest     : ${doc.source.digest.slice(0, 23)}…`);
    console.log(`  fileKeyHash: ${doc.source.figmaFileKeyHash.slice(0, 23)}…  (hash, not the key)`);
    const degraded = Object.entries(doc.components).filter(([, c]) => c.projectionDegradations);
    if (degraded.length) {
      console.log(`  NAMED projection degradations on ${degraded.length} component(s):`);
      for (const [tag, c] of degraded) for (const n of c.projectionDegradations) console.log(`    - ${tag}: ${n}`);
    }
    console.log('\nThis is a POINT-IN-TIME read. Re-run it after any Figma change, and re-run');
    console.log(`  node ${GENERATOR} --check${projFlag}`);
    console.log('to prove the tracked file still agrees with the dumps on disk.');
    return;
  }

  // ── --check ────────────────────────────────────────────────────────────
  if (!existsSync(outPath)) {
    if (dumps.length === 0) {
      console.error(`[canvas-projection] --check: no projection at ${outRel} and no dumps to build one from.`);
      console.error(`This project has never been projected. Run it on a machine with canvas dumps:`);
      console.error(`  node ${GENERATOR}${projFlag}`);
      process.exit(1);
    }
    console.error(`[canvas-projection] --check: ${outRel} is missing but ${dumps.length} dump(s) exist.`);
    console.error(`Generate it: node ${GENERATOR}${projFlag}`);
    process.exit(1);
  }

  let tracked;
  try {
    tracked = JSON.parse(readFileSync(outPath, 'utf8'));
  } catch (e) {
    console.error(`[canvas-projection] --check: ${outRel} is not valid JSON: ${e.message}`);
    process.exit(1);
  }

  // The half that works with NO dumps (CI, a clone): was this projection
  // built against the Figma file the registry names TODAY? Southleft was
  // repointed on 2026-09-02 by editing one line; every observation behind it
  // silently became an observation of a retired file. This catches that.
  const currentHash = `sha256:${sha256(project.figma?.fileKey ?? '')}`;
  if (tracked?.source?.figmaFileKeyHash !== currentHash) {
    console.error(`[canvas-projection] --check FAILED for "${project.id}": Figma file REPOINT.`);
    console.error(`  the projection was built against a different Figma file than ${'.altitude/ds-projects.json'} names today.`);
    console.error(`  tracked : ${tracked?.source?.figmaFileKeyHash ?? '(none)'}`);
    console.error(`  current : ${currentHash}`);
    console.error(`  Every fact in it is an observation of the retired file. Re-extract and re-project.`);
    process.exit(1);
  }

  if (dumps.length === 0) {
    console.log(`[canvas-projection] --check SKIPPED the content comparison for "${project.id}":`);
    console.log(`  no canvas dumps at ${relative(REPO_ROOT, dir).replace(/\\/g, '/')} (they are gitignored live observations).`);
    console.log(`  VERIFIED anyway: the projection's Figma file-key hash matches the registry — no repoint.`);
    console.log(`  Projected ${Object.keys(tracked.components ?? {}).length} component(s) on ${tracked.generatedAt}`);
    console.log(`  from dumps newest at ${tracked?.source?.newestMtime ?? '(unknown)'}.`);
    return;
  }

  const fresh = buildProjection(project, { commit: tracked?.generator?.commit ?? null });
  if (substance(fresh) === substance(tracked)) {
    console.log(`[canvas-projection] --check OK for "${project.id}": ${outRel} matches the ${dumps.length} dump(s) on disk.`);
    console.log(`  projected ${tracked.generatedAt}; dumps newest ${fresh.source.newestMtime}`);
    return;
  }

  console.error(`[canvas-projection] --check FAILED for "${project.id}": ${outRel} disagrees with the dumps on disk.`);
  const a = tracked.components ?? {};
  const b = fresh.components ?? {};
  const tags = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  for (const tag of tags) {
    if (!(tag in a)) console.error(`  + ${tag} — in the dumps, absent from the projection`);
    else if (!(tag in b)) console.error(`  - ${tag} — in the projection, no dump on disk`);
    else if (JSON.stringify(a[tag]) !== JSON.stringify(b[tag])) console.error(`  ~ ${tag} — projected facts differ`);
  }
  if (tracked?.source?.digest !== fresh.source.digest) {
    console.error(`  source digest moved: ${String(tracked?.source?.digest).slice(0, 23)}… -> ${fresh.source.digest.slice(0, 23)}…`);
  }
  console.error(`\nRegenerate and commit: node ${GENERATOR}${projFlag}`);
  process.exit(1);
}

// Only run the CLI when invoked directly — the exports above are imported by
// scripts/__tests__/canvas-projection.test.mjs, which must not trigger a
// write. `pathToFileURL` rather than a hand-built `file://` string: on
// Windows the drive letter and backslashes make the naive form disagree with
// `import.meta.url` and the guard silently inverts.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main();
}
