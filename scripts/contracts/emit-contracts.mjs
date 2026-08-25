#!/usr/bin/env node
/**
 * emit-contracts.mjs — build a per-component, per-project CONTRACT: the
 * canvas-expressible API surface (props, events, slots, states, anatomy,
 * token bindings, a11y facts, code/Figma bindings) captured from what the
 * repo's own pipeline already produces.
 *
 * Sources (never a second source of truth — this is a READER, like
 * libs/altitude-mcp/src/lib/parity.mjs):
 *   - CEM (custom-elements.json, base or brand)      -> props/events/slots
 *   - the project's parity manifest                  -> Figma bindings, scope
 *   - scripts/figma-atoms/token-map.mjs               -> code token -> Figma variable
 *   - scripts/figma-atoms/measure-components.mjs output (spec-light.json)
 *                                                      -> anatomy (BEST-EFFORT —
 *     see .altitude/contracts/README.md "Anatomy availability is best-effort";
 *     never fabricated, `anatomy: null` + `anatomySource: "unavailable"` when
 *     no measured output exists on disk)
 *
 * Scope: every PARITY-TRACKED component for the active project — i.e. every
 * key in that project's parity manifest whose entry is not `excluded: true`.
 * An excluded/untracked tag is skipped with a logged line, never silently.
 *
 * Determinism: stable key order, 2-space indent, trailing newline, no
 * timestamps. Same inputs -> byte-identical output, every run.
 *
 * SOURCE OF TRUTH (T10, spec 2026-08-25-contract-backed-figma-parity-and-
 * generation): as of the adoption pass, contracts under .altitude/contracts/
 * are EDITABLE, hand-curated source, not a derived artifact this script keeps
 * overwriting — see .altitude/contracts/README.md "Contracts are editable
 * source". This script is now a one-time SEED (bootstrap a contract for a
 * component that has none yet) plus a DRIFT CHECK (does the on-disk contract
 * still match what the repo's own sources would derive). It never silently
 * regenerates an existing hand-edited file.
 *
 * Usage — pick exactly one mode:
 *   node scripts/contracts/emit-contracts.mjs --seed                  # bootstrap NEW components only; refuses to overwrite an existing contract file
 *   node scripts/contracts/emit-contracts.mjs --seed --component al-button  # bootstrap ONE tag only (must already be parity-tracked)
 *   node scripts/contracts/emit-contracts.mjs --seed --force          # ...unless --force (re-seed on purpose, discards hand edits)
 *   node scripts/contracts/emit-contracts.mjs --check-drift           # re-derive every tracked component in memory, diff vs. on-disk (status/version excluded); exit 1 on any drift
 *   node scripts/contracts/emit-contracts.mjs --check                 # ajv-validate the on-disk contracts against contract.schema.json, read-only — refuses an illegal contract file BY NAME (path + failing rule)
 *   node scripts/contracts/emit-contracts.mjs --check-determinism     # T15 CI gate: re-derive every tracked contract TWICE in memory, byte-compare the two serializations; exit 1 + names any component whose two derivations differ
 *   node scripts/contracts/emit-contracts.mjs --adopt                 # ONE-OFF: flip status derived -> source and bump version 0.1.0 -> 1.0.0 on every on-disk contract (the T10 adoption pass; safe to re-run, idempotent)
 *   node scripts/contracts/emit-contracts.mjs                         # no mode flag: prints this usage note, does nothing, exit 1
 *   ... any of the above + --project southleft / DS_PROJECT
 *   pnpm run contracts:seed / contracts:seed:sl / contracts:check / contracts:validate / contracts:check-determinism
 *   pnpm run gate:contracts   # T15 — all three legs, both projects (CI)
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import { resolveProject, figmaNodeUrlFor } from '../../libs/altitude-mcp/src/lib/ds-project.mjs';
import { readManifest, resolveComponentRoster } from '../../libs/altitude-mcp/src/lib/parity.mjs';
import { CSS_TO_TOKEN } from '../figma-atoms/token-map.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const CONTRACTS_DIR = join(REPO_ROOT, '.altitude', 'contracts');
const SCHEMA_PATH = join(CONTRACTS_DIR, 'contract.schema.json');

const SEED = process.argv.includes('--seed');
const CHECK_DRIFT = process.argv.includes('--check-drift');
const CHECK = process.argv.includes('--check');
const CHECK_DETERMINISM = process.argv.includes('--check-determinism');
const ADOPT = process.argv.includes('--adopt');
const FORCE = process.argv.includes('--force');
const STATES = ['hover', 'focus', 'active', 'disabled'];

/** `--flag value` or `--flag=value` -> `value`; absent -> null. Mirrors extract-canvas.mjs's argOf(). */
function argOf(flag) {
  const eq = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1) || null;
  const i = process.argv.indexOf(flag);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('-') ? process.argv[i + 1] : null;
}

/** `--seed --component al-button` — bootstrap ONE tag only (T16: what the WC plop generator's
 * documented follow-up command runs once a freshly-scaffolded component has a CEM entry). */
const COMPONENT = argOf('--component');

// Curation metadata, not a derived fact — a hand-adopted contract's status
// and version are never expected to match what re-derivation would produce.
const DRIFT_IGNORED_FIELDS = new Set(['status', 'version']);

/** Fields whose derivation depends entirely on scripts/figma-atoms/measure-components.mjs
 * output (spec-light.json / spec-dark.json under each project's GITIGNORED figma-sync dir —
 * see README.md "Anatomy availability is best-effort"). That file is a local measurement
 * artifact that is never committed, and a fresh clone / CI runner has no path to produce it
 * without a full headless-browser measurement pass first. When it's absent, buildAnatomy()
 * honestly derives `anatomy: null` / `anatomySource: "unavailable"` — comparing that against
 * an on-disk contract that WAS seeded on a machine with measured data is an environment
 * capability gap, not a contract<->code disagreement, so runCheckDrift() excludes these
 * fields from a run where measuredSpec is unavailable (never globally — a local run that DOES
 * have spec-light.json still checks them in full). */
const ANATOMY_DEPENDENT_FIELDS = ['anatomy', 'anatomySource', 'anatomyCase', 'tokens', 'states', 'semantics'];

const USAGE = `[contracts] no mode flag given — emit-contracts.mjs no longer overwrites .altitude/contracts/**/*.contract.json by default (T10: contracts are edited source of truth, see .altitude/contracts/README.md).

Pick one:
  --seed [--component al-button] [--force]   bootstrap contracts for NEW components only (or one tag); refuses an existing file unless --force
  --check-drift       re-derive every tracked component and diff it against the on-disk contract (status/version excluded; anatomy/tokens/states/semantics also excluded when spec-light.json is unavailable in this environment); exit 1 on drift
  --check             ajv-validate the on-disk contracts against contract.schema.json, read-only — refuses an illegal contract file BY NAME
  --check-determinism re-derive every tracked contract TWICE in memory and byte-compare the two serializations; exit 1 + names any component whose two derivations differ
  --adopt             one-off: flip status derived -> source, bump version 0.1.0 -> 1.0.0 (idempotent)

  pnpm run contracts:seed / contracts:seed:sl
  pnpm run contracts:check / contracts:validate / contracts:check-determinism
  pnpm run gate:contracts   # T15 CI gate — all three legs, both projects
  node scripts/contracts/emit-contracts.mjs --check --project <id>
`;

// ── small, dependency-free CEM-text helpers (mirrors parity.mjs's private
//    unionValues()/normKey() — not exported from there, so re-derived here
//    rather than reaching into another module's internals) ─────────────────

/** `'a' | 'b'` -> ['a','b']; a non-union type -> []. */
function unionValues(typeText) {
  const parts = String(typeText ?? '').split('|').map((s) => s.trim());
  if (parts.length < 2) return [];
  const literals = parts.filter((s) => /^'[^']*'$/.test(s)).map((s) => s.slice(1, -1));
  return literals.length === parts.length ? literals.sort() : [];
}

const normKey = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

function titleCase(tag) {
  return tag
    .replace(/^al-/, '')
    .split('-')
    .map((s) => (s ? s[0].toUpperCase() + s.slice(1) : s))
    .join(' ');
}

// ── prop / event / slot extraction from a CEM component record ────────────

function normalizeType(typeText) {
  const values = unionValues(typeText);
  if (values.length) return { type: 'enum', values };
  const t = String(typeText ?? '').trim();
  if (t === 'boolean') return { type: 'boolean' };
  if (t === 'number') return { type: 'number' };
  return { type: 'string' };
}

/** Match a CEM attribute name to an OBSERVED Figma component-property, same normalisation parity.mjs uses. */
function figmaPropBindingFor(attrName, figmaContract) {
  if (!figmaContract?.props) return null;
  const key = normKey(attrName);
  for (const [figmaName, def] of Object.entries(figmaContract.props)) {
    if (normKey(figmaName) === key) {
      return {
        kind: def?.type ?? 'NONE',
        property: figmaName,
        ...(def?.options?.length ? { options: def.options.slice().sort() } : {}),
      };
    }
  }
  return null;
}

function buildProps(component, manifestEntry) {
  const figmaContract = manifestEntry?.figmaContract ?? null;
  return (component.attributes ?? [])
    .map((a) => {
      const rawType = (a.type?.text ?? 'string').replace(/\s+/g, ' ').trim();
      const { type, values } = normalizeType(rawType);
      const prop = {
        name: a.name,
        ...(a.description ? { description: a.description } : {}),
        type,
        rawType,
        ...(values ? { values } : {}),
        ...(a.default !== undefined ? { default: a.default } : {}),
        bindings: {
          code: {
            attribute: a.name,
            ...(a.fieldName && a.fieldName !== a.name ? { member: a.fieldName } : {}),
          },
          figma: figmaPropBindingFor(a.name, figmaContract),
        },
      };
      return prop;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildEvents(component) {
  return (component.events ?? [])
    .map((e) => ({ name: e.name, ...(e.description ? { description: e.description } : {}) }))
    .filter((e) => e.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildSlots(component) {
  return (component.slots ?? [])
    .map((s) => ({ name: s.name ?? '', ...(s.description ? { description: s.description } : {}) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildA11y(component) {
  const ariaAttributes = (component.attributes ?? [])
    .map((a) => a.name)
    .filter((n) => /aria/i.test(n))
    .sort();
  const cssParts = (component.cssParts ?? []).map((p) => p.name).filter(Boolean).sort();
  return { ariaAttributes, cssParts };
}

// ── token binding (T3): css suffix (as measure-components emits it, e.g.
//    "theme-color-background-primary-default") -> { code, figma } ─────────

function tokenBindingFor(cssSuffix) {
  const hit = CSS_TO_TOKEN[cssSuffix];
  return { code: `--al-${cssSuffix}`, figma: hit?.figma ?? null };
}

// ── anatomy (T3): read measure-components.mjs output, BEST-EFFORT ─────────

function loadMeasuredSpec(syncDir) {
  const p = join(syncDir, 'spec-light.json');
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

/** Raw measured `root` node -> the contract's anatomyNode shape (tag/cls/layout/tokens/children). */
function buildAnatomyNode(raw) {
  const computed = raw.computed ?? {};
  const layoutEntries = Object.entries({
    display: computed.display,
    direction: computed.dir,
    align: computed.align,
    justify: computed.justify,
  }).filter(([, v]) => v);
  const layout = layoutEntries.length ? Object.fromEntries(layoutEntries) : null;

  const tokenEntries = Object.entries(raw.tokens ?? {}).sort(([a], [b]) => a.localeCompare(b));
  const tokens = Object.fromEntries(tokenEntries.map(([cssProp, suffix]) => [cssProp, tokenBindingFor(suffix)]));

  return {
    tag: raw.tag,
    cls: raw.cls ?? null,
    layout,
    tokens,
    children: (raw.kids ?? []).map(buildAnatomyNode),
  };
}

/** Flatten a raw measured node tree into path -> raw tokens map ("0" = root, "0.1" = 2nd child, ...). */
function flattenRawTokens(raw, path, out) {
  out.set(path, raw.tokens ?? {});
  (raw.kids ?? []).forEach((kid, i) => flattenRawTokens(kid, `${path}.${i}`, out));
}


/**
 * Best-effort anatomy for one tag: sample the alphabetically-first `case` in
 * the default-state array, then diff the SAME case's root-token maps across
 * the other 4 measured states to build `stateOverrides` (root path only —
 * see README § Deviations).
 */
function buildAnatomy(measuredSpec, tag) {
  if (!measuredSpec) return { anatomy: null, anatomySource: 'unavailable', anatomyCase: null, states: [] };

  const defaultEntries = (measuredSpec.default ?? []).filter((e) => e.tag === tag && e.root);
  if (!defaultEntries.length) return { anatomy: null, anatomySource: 'unavailable', anatomyCase: null, states: [] };

  const sampled = defaultEntries.slice().sort((a, b) => a.case.localeCompare(b.case))[0];
  const root = buildAnatomyNode(sampled.root);

  const defaultFlat = new Map();
  flattenRawTokens(sampled.root, '0', defaultFlat);

  const stateOverrides = {};
  for (const state of STATES) {
    const stateEntry = (measuredSpec[state] ?? []).find((e) => e.tag === tag && e.case === sampled.case && e.root);
    if (!stateEntry) continue;
    const stateFlat = new Map();
    flattenRawTokens(stateEntry.root, '0', stateFlat);

    const diffForState = {};
    for (const [path, stateTokens] of stateFlat) {
      const defaultTokens = defaultFlat.get(path) ?? {};
      const diff = {};
      for (const [cssProp, suffix] of Object.entries(stateTokens).sort(([a], [b]) => a.localeCompare(b))) {
        if (defaultTokens[cssProp] !== suffix) diff[cssProp] = tokenBindingFor(suffix);
      }
      if (Object.keys(diff).length) diffForState[path] = diff;
    }
    if (Object.keys(diffForState).length) stateOverrides[state] = diffForState;
  }

  return {
    anatomy: { root, ...(Object.keys(stateOverrides).length ? { stateOverrides } : {}) },
    anatomySource: 'measured',
    anatomyCase: sampled.case,
    states: STATES.filter((s) => (measuredSpec[s] ?? []).some((e) => e.tag === tag)),
  };
}

/** Every `--al-*` token referenced anywhere in the anatomy tree + state overrides, deduped + sorted. */
function collectTokens(anatomy) {
  if (!anatomy) return [];
  const out = new Set();
  const walkNode = (node) => {
    for (const binding of Object.values(node.tokens ?? {})) out.add(binding.code);
    for (const child of node.children ?? []) walkNode(child);
  };
  walkNode(anatomy.root);
  for (const perNode of Object.values(anatomy.stateOverrides ?? {})) {
    for (const diff of Object.values(perNode)) {
      for (const binding of Object.values(diff)) out.add(binding.code);
    }
  }
  return [...out].sort();
}

// ── bindings (component-level) ─────────────────────────────────────────────

function buildCodeBindings({ component, origin, project }) {
  const workspace = origin === 'brand' ? project.resolved.brandLibrary?.workspace : project.library.workspace;
  return {
    importPath: `${workspace}/${component.modulePath}`.replace(/\\/g, '/'),
    tagName: component.tag,
    workspace,
  };
}

function buildFigmaBindings(project, manifestEntry) {
  const name = manifestEntry?.figma?.name ?? null;
  const nodeId = manifestEntry?.figma?.nodeId ?? null;
  return {
    fileKey: project.figma.fileKey,
    componentSetName: name,
    nodeId,
    url: name ? figmaNodeUrlFor(project, nodeId) : null,
  };
}

// ── semantics: rendered element (from anatomy, when measured) ─────────────

function buildSemantics(anatomy) {
  return { element: anatomy?.root?.tag ?? null, role: null };
}

// ── contract assembly for one component ────────────────────────────────────

function buildContract({ tag, component, origin, project, manifestEntry, measuredSpec }) {
  const { anatomy, anatomySource, anatomyCase, states } = buildAnatomy(measuredSpec, tag);
  const props = buildProps(component, manifestEntry);

  return {
    $schema: '../contract.schema.json',
    id: tag,
    name: manifestEntry?.figma?.name ?? titleCase(tag),
    version: '0.1.0',
    status: 'derived',
    description: component.description ?? '',
    semantics: buildSemantics(anatomy),
    props,
    events: buildEvents(component),
    slots: buildSlots(component),
    states,
    anatomySource,
    anatomyCase,
    anatomy,
    tokens: collectTokens(anatomy),
    a11y: buildA11y(component),
    bindings: {
      code: buildCodeBindings({ component, origin, project }),
      figma: buildFigmaBindings(project, manifestEntry),
    },
  };
}

// ── shared: resolve project + manifest + roster, walk tracked tags ────────

/** Everything every mode needs before it can iterate tracked tags. */
function loadContext() {
  const project = resolveProject();
  const manifest = readManifest(project);
  if (!manifest) {
    console.error(`[contracts] no parity manifest at ${project.resolved.parityManifest} — run parity:seed first.`);
    process.exit(2);
  }
  const { roster } = resolveComponentRoster(project);
  const byTag = new Map(roster.map((r) => [r.component.tag, r]));
  const measuredSpec = loadMeasuredSpec(project.resolved.figmaSyncDir);
  const outDir = join(CONTRACTS_DIR, project.id);
  const trackedTags = Object.keys(manifest.components ?? {}).sort();
  return { project, manifest, byTag, measuredSpec, outDir, trackedTags };
}

/** Derive one tag's in-memory contract, or `null` (+ a reason) when it's excluded / has no CEM record. */
function deriveOne({ tag, manifest, byTag, project, measuredSpec }) {
  const entry = manifest.components[tag];
  if (entry?.excluded) return { entry, reason: 'excluded' };
  const rosterEntry = byTag.get(tag);
  if (!rosterEntry) return { entry, reason: 'no-cem' };
  const contract = buildContract({
    tag,
    component: rosterEntry.component,
    origin: rosterEntry.origin,
    project,
    manifestEntry: entry,
    measuredSpec,
  });
  return { entry, reason: null, contract };
}

// ── --seed: bootstrap NEW components only ──────────────────────────────────

function runSeed() {
  const { project, manifest, byTag, measuredSpec, outDir, trackedTags: allTrackedTags } = loadContext();
  mkdirSync(outDir, { recursive: true });

  let trackedTags = allTrackedTags;
  if (COMPONENT) {
    if (!allTrackedTags.includes(COMPONENT)) {
      console.error(
        `[contracts] "${COMPONENT}" is not a parity-tracked component for project "${project.id}" — ` +
          `run \`pnpm run parity:seed${project.isDefault ? '' : ` --project ${project.id}`}\` first so it has a manifest entry.`,
      );
      process.exit(2);
    }
    trackedTags = [COMPONENT];
  }

  const emitted = [];
  const skippedExcluded = [];
  const skippedNoCem = [];
  const skippedExisting = [];

  for (const tag of trackedTags) {
    const { entry, reason, contract } = deriveOne({ tag, manifest, byTag, project, measuredSpec });
    if (reason === 'excluded') {
      skippedExcluded.push(tag);
      console.log(`[contracts] skip ${tag} — excluded (${entry.note ?? 'no note'})`);
      continue;
    }
    if (reason === 'no-cem') {
      skippedNoCem.push(tag);
      console.warn(`[contracts] skip ${tag} — parity-tracked but no CEM record found for project "${project.id}"`);
      continue;
    }

    const outPath = join(outDir, `${tag}.contract.json`);
    if (existsSync(outPath) && !FORCE) {
      skippedExisting.push(tag);
      console.log(`[contracts] skip ${tag} — already has a contract (editable source). Use --force to re-seed and discard hand edits.`);
      continue;
    }

    writeFileSync(outPath, JSON.stringify(contract, null, 2) + '\n', 'utf8');
    emitted.push({ tag, path: outPath, contract });
  }

  console.log(
    `[contracts] --seed ${project.id}: seeded ${emitted.length}, already-sourced ${skippedExisting.length}, excluded ${skippedExcluded.length}, no-CEM ${skippedNoCem.length} (manifest tracked ${allTrackedTags.length}${COMPONENT ? `, scoped to "${COMPONENT}"` : ''})`,
  );

  if (CHECK && !validateWithAjv(emitted)) process.exit(1);
}

// ── --check-drift: on-disk contract vs. what the repo's own sources derive ─

/** Field names present on either side, minus the given ignore-set, whose JSON differs. */
function driftedFields(disk, derived, ignoredFields) {
  const fields = new Set([...Object.keys(disk ?? {}), ...Object.keys(derived ?? {})]);
  const drifted = [];
  for (const field of fields) {
    if (ignoredFields.has(field)) continue;
    if (JSON.stringify(disk?.[field]) !== JSON.stringify(derived?.[field])) drifted.push(field);
  }
  return drifted;
}

function runCheckDrift() {
  const { project, manifest, byTag, measuredSpec, outDir, trackedTags } = loadContext();

  // See ANATOMY_DEPENDENT_FIELDS above — only excluded from THIS run's comparison when
  // this environment has no measured spec to derive anatomy from at all.
  const ignoredThisRun = measuredSpec
    ? DRIFT_IGNORED_FIELDS
    : new Set([...DRIFT_IGNORED_FIELDS, ...ANATOMY_DEPENDENT_FIELDS]);
  if (!measuredSpec) {
    console.log(
      `[contracts] --check-drift ${project.id}: no measured spec (spec-light.json) in this environment — ` +
        `${ANATOMY_DEPENDENT_FIELDS.join(', ')} excluded from this run's comparison ` +
        `(see .altitude/contracts/README.md "Anatomy availability is best-effort").`,
    );
  }

  let ok = 0;
  let drifted = 0;
  let missing = 0;
  let skipped = 0;

  for (const tag of trackedTags) {
    const { reason, contract: derived } = deriveOne({ tag, manifest, byTag, project, measuredSpec });
    if (reason) {
      skipped++;
      continue;
    }

    const outPath = join(outDir, `${tag}.contract.json`);
    if (!existsSync(outPath)) {
      missing++;
      console.error(`[contracts] MISSING — ${tag} has no contract on disk. Run: pnpm run contracts:seed${project.isDefault ? '' : ` --project ${project.id}`}`);
      continue;
    }

    let disk;
    try {
      disk = JSON.parse(readFileSync(outPath, 'utf8'));
    } catch (err) {
      missing++;
      console.error(`[contracts] UNREADABLE — ${tag}: ${err.message}`);
      continue;
    }

    const fields = driftedFields(disk, derived, ignoredThisRun);
    if (fields.length) {
      drifted++;
      console.error(`[contracts] DRIFT — ${tag}: ${fields.join(', ')}`);
    } else {
      ok++;
    }
  }

  console.log(
    `[contracts] --check-drift ${project.id}: ${ok} match, ${drifted} drifted, ${missing} missing, ${skipped} skipped (excluded/no-CEM) — ${trackedTags.length} tracked.`,
  );
  if (drifted || missing) process.exit(1);
}

// ── --check-determinism: same contract inputs -> byte-identical output ────
//
// T15 (spec 2026-08-25-contract-backed-figma-parity-and-generation) — the
// "same input -> same output" leg of R7's "deterministic regeneration (same
// contract -> byte-identical ops/spec output)". Scoped to CONTRACT DERIVATION
// today: re-derives every tracked component's contract TWICE, in the same
// process, from the exact same in-memory sources (CEM, manifest, token-map,
// measured spec — nothing re-read from disk between the two derivations), and
// byte-compares the two `JSON.stringify(contract, null, 2)` serializations.
// This needs no git diff and no on-disk contract at all — it proves the
// EMITTER itself is deterministic, independent of whether the on-disk file
// has drifted (that's --check-drift's job). TODO(T12): once Figma ops
// generation lands, its output joins this gate as the "ops" half of R7's
// byte-identical claim — today this only covers contract derivation.

function runCheckDeterminism() {
  const { project, manifest, byTag, measuredSpec, trackedTags } = loadContext();

  let checked = 0;
  let mismatched = 0;
  const failedTags = [];

  for (const tag of trackedTags) {
    const first = deriveOne({ tag, manifest, byTag, project, measuredSpec });
    if (first.reason) continue; // excluded / no-cem — nothing to derive twice
    const second = deriveOne({ tag, manifest, byTag, project, measuredSpec });

    const a = JSON.stringify(first.contract, null, 2);
    const b = JSON.stringify(second.contract, null, 2);
    checked++;
    if (a !== b) {
      mismatched++;
      failedTags.push(tag);
      console.error(`[contracts] NONDETERMINISTIC — ${tag}: two in-memory derivations of the same contract produced different serialized output.`);
    }
  }

  console.log(
    `[contracts] --check-determinism ${project.id}: ${checked} checked, ${mismatched} nondeterministic` +
      `${failedTags.length ? ` (${failedTags.join(', ')})` : ''} — ${trackedTags.length} tracked.`,
  );
  if (mismatched) process.exit(1);
}

// ── --check: ajv-validate the on-disk contracts, read-only ────────────────

function runCheckOnly() {
  const project = resolveProject();
  const dir = join(CONTRACTS_DIR, project.id);
  if (!existsSync(dir)) {
    console.error(`[contracts] no contracts directory for "${project.id}" at ${relative(REPO_ROOT, dir)} — run contracts:seed first.`);
    process.exit(2);
  }
  const files = readdirSync(dir).filter((f) => f.endsWith('.contract.json')).sort();
  const loaded = files.map((f) => ({ path: join(dir, f), contract: JSON.parse(readFileSync(join(dir, f), 'utf8')) }));
  if (!validateWithAjv(loaded)) process.exit(1);
}

// ── --adopt: one-off status/version flip (T10 adoption pass) ──────────────
//
// Mechanical and deterministic on purpose: parses each on-disk contract,
// mutates ONLY `status`/`version`, and re-serializes with the emitter's own
// stable formatting (2-space indent, trailing newline). Every other key's
// value and the object's own key ORDER is exactly what was already on disk —
// JSON.parse->mutate->JSON.stringify never reorders untouched keys — so this
// is a curation-metadata rewrite, not a re-derivation; doing the same edit by
// hand across 128 files would have been unreviewable.

function runAdopt() {
  const project = resolveProject();
  const dir = join(CONTRACTS_DIR, project.id);
  if (!existsSync(dir)) {
    console.error(`[contracts] no contracts directory for "${project.id}" at ${relative(REPO_ROOT, dir)} — nothing to adopt.`);
    process.exit(2);
  }
  const files = readdirSync(dir).filter((f) => f.endsWith('.contract.json')).sort();

  let adopted = 0;
  let alreadySource = 0;
  let unexpectedVersion = 0;
  let unexpectedStatus = 0;

  for (const f of files) {
    const p = join(dir, f);
    const contract = JSON.parse(readFileSync(p, 'utf8'));
    if (contract.status === 'source') {
      alreadySource++;
      continue;
    }
    if (contract.status !== 'derived') {
      unexpectedStatus++;
      console.warn(`[contracts] skip ${f}: status is "${contract.status}", not "derived" — not touching.`);
      continue;
    }
    if (contract.version !== '0.1.0') {
      unexpectedVersion++;
      console.warn(`[contracts] ${f}: version is "${contract.version}", not the expected "0.1.0" — flipping status only, version left as-is.`);
    } else {
      contract.version = '1.0.0';
    }
    contract.status = 'source';
    writeFileSync(p, JSON.stringify(contract, null, 2) + '\n', 'utf8');
    adopted++;
  }

  console.log(
    `[contracts] --adopt ${project.id}: adopted ${adopted}, already-source ${alreadySource}, unexpected status ${unexpectedStatus}, unexpected version ${unexpectedVersion} (of ${files.length}).`,
  );
}

// ── main ─────────────────────────────────────────────────────────────────

function main() {
  if (ADOPT) return runAdopt();
  if (CHECK_DRIFT) return runCheckDrift();
  if (CHECK_DETERMINISM) return runCheckDeterminism();
  if (SEED) return runSeed();
  if (CHECK) return runCheckOnly();
  console.log(USAGE);
  process.exit(1);
}

/** ajv is CommonJS; createRequire is the standard bridge from an ESM script — no new dependency, ajv is already a root devDependency (see scripts/validate-contracts.js). */
function validateWithAjv(emitted) {
  const require = createRequire(import.meta.url);
  let Ajv;
  try {
    Ajv = require('ajv');
  } catch (err) {
    console.error(`[contracts] --check requested but ajv is not resolvable: ${err.message}`);
    return false;
  }
  const ajv = new Ajv({ strict: false, allErrors: true });
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
  const validate = ajv.compile(schema);

  let failures = 0;
  for (const { path, contract } of emitted) {
    const valid = validate(contract);
    if (!valid) {
      failures++;
      console.error(`[contracts] INVALID — ${relative(REPO_ROOT, path)}`);
      for (const e of validate.errors ?? []) console.error(`    ${e.instancePath || '/'}: ${e.message}`);
    }
  }
  if (failures) {
    console.error(`[contracts] --check FAILED — ${failures}/${emitted.length} contracts do not satisfy the schema.`);
    return false;
  }
  console.log(`[contracts] --check PASSED — ${emitted.length}/${emitted.length} contracts satisfy the schema.`);
  return true;
}

main();
