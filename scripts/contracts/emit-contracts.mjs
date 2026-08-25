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
 * Usage:
 *   node scripts/contracts/emit-contracts.mjs                     # DS_PROJECT / registry default
 *   node scripts/contracts/emit-contracts.mjs --project southleft
 *   node scripts/contracts/emit-contracts.mjs --check             # also ajv-validate every emitted file
 *   pnpm run contracts:emit / contracts:emit:sl
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
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

const CHECK = process.argv.includes('--check');
const STATES = ['hover', 'focus', 'active', 'disabled'];

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

// ── main ─────────────────────────────────────────────────────────────────

function main() {
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
  mkdirSync(outDir, { recursive: true });

  const trackedTags = Object.keys(manifest.components ?? {}).sort();
  const emitted = [];
  const skippedExcluded = [];
  const skippedNoCem = [];

  for (const tag of trackedTags) {
    const entry = manifest.components[tag];
    if (entry?.excluded) {
      skippedExcluded.push(tag);
      console.log(`[contracts] skip ${tag} — excluded (${entry.note ?? 'no note'})`);
      continue;
    }
    const rosterEntry = byTag.get(tag);
    if (!rosterEntry) {
      skippedNoCem.push(tag);
      console.warn(`[contracts] skip ${tag} — parity-tracked but no CEM record found for project "${project.id}"`);
      continue;
    }

    const contract = buildContract({
      tag,
      component: rosterEntry.component,
      origin: rosterEntry.origin,
      project,
      manifestEntry: entry,
      measuredSpec,
    });

    const outPath = join(outDir, `${tag}.contract.json`);
    writeFileSync(outPath, JSON.stringify(contract, null, 2) + '\n', 'utf8');
    emitted.push({ tag, path: outPath, contract });
  }

  console.log(
    `[contracts] ${project.id}: emitted ${emitted.length}, excluded ${skippedExcluded.length}, no-CEM ${skippedNoCem.length} (manifest tracked ${trackedTags.length})`,
  );

  if (CHECK && !validateWithAjv(emitted)) process.exit(1);
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
