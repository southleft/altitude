// Figma <-> code parity engine.
//
// MULTI-PROJECT. One component library (`al-web-components`) backs more than
// one design system — Altitude and Southleft today. They share every component;
// what differs is the brand recipe, the Storybook identity, and WHICH FIGMA FILE
// each is checked against. That per-design-system record lives in
// `.altitude/ds-projects.json` and is resolved by `./ds-project.mjs`; every
// entry point here takes an optional `project` (a resolved record, or an id
// string, or nothing → the registry default).
//
// The source of truth for a project's sync state is its parity manifest
// (`project.paths.parityManifest`, seeded by
// `scripts/figma-parity/seed-manifest.mjs`). Per component it holds:
//   * `figma`   — the Figma component-set mapping ({ name, nodeId|null }); atoms
//                 pin node ids, molecules resolve by name (ids re-mint on
//                 rebuild — see scripts/figma-atoms/instance-map.mjs).
//   * `lastSync` — the code hash + Figma digest captured the last time the two
//                 sides were CONFIRMED to match (stamped by
//                 scripts/figma-parity/mark-synced.mjs or a sync run).
//   * `figmaCurrentDigest` — the last OBSERVED Figma-side digest (updated by
//                 scripts/figma-parity/refresh-figma-digests.mjs). Snapshot
//                 model: Figma drift is "as of the last refresh", code drift is
//                 always live because hashing local source is free.
//
// Status per component:
//   in-sync          code hash and Figma digest both match lastSync
//   code-drift       component source changed since lastSync (code is ahead)
//   figma-drift      Figma changed since lastSync (Figma is ahead)
//   conflict         both drifted — needs a human/agent decision on direction
//   missing-in-figma component exists in code, no Figma component set at all
//   missing-in-code  Figma set exists (manifest `figmaOnly`), no code component
//   excluded         deliberately not represented in Figma
//
// This module is shared by three consumers: the `altitude_check_parity` MCP
// tool, the Storybook parity emitter (`.storybook/parity-emitter.mjs` writes
// dist/parity.json for the sidebar + docs block), and the scripts/figma-parity
// CLIs. Keep it dependency-free (node: builtins only).

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { WC_ROOT } from './paths.mjs';
import { resolveProject, figmaNodeUrlFor } from './ds-project.mjs';
import { loadComponents } from './cem.mjs';
import { getStoryInfo } from './stories.mjs';

/**
 * Normalise whatever a caller passed into a resolved project record.
 * Accepts a record (returned as-is), an id string, or null/undefined (default).
 */
function asProject(project) {
  if (project && typeof project === 'object' && project.resolved) return project;
  return resolveProject(typeof project === 'string' ? project : null);
}

// NOTE: the module-level `FIGMA_FILE_ID` / `FIGMA_FILE_NAME` constants that used
// to live here are GONE. They named exactly one Figma file, which is the whole
// thing this module stopped assuming. Nothing imports them any more (verified
// repo-wide); use `resolveProject(id).figma.{fileKey,fileName}` instead. Keeping
// them as default-project aliases would also have made merely IMPORTING this
// module throw when the registry is missing — resolution is deliberately lazy.

export const STATUS = Object.freeze({
  IN_SYNC: 'in-sync',
  CODE_DRIFT: 'code-drift',
  FIGMA_DRIFT: 'figma-drift',
  CONFLICT: 'conflict',
  MISSING_IN_FIGMA: 'missing-in-figma',
  MISSING_IN_CODE: 'missing-in-code',
  EXCLUDED: 'excluded', // deliberately not represented in Figma (e.g. al-theme-switcher: zero owned pixels)
});

// ── manifest io ─────────────────────────────────────────────────────────

export function readManifest(project) {
  const p = asProject(project);
  if (!existsSync(p.resolved.parityManifest)) return null;
  return JSON.parse(readFileSync(p.resolved.parityManifest, 'utf8'));
}

export function writeManifest(manifest, project) {
  const p = asProject(project);
  mkdirSync(dirname(p.resolved.parityManifest), { recursive: true });
  manifest.updated = new Date().toISOString();
  writeFileSync(p.resolved.parityManifest, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  return manifest;
}

// ── code hashing ────────────────────────────────────────────────────────

/**
 * Hash a component's authored source: every .ts/.scss in its directory,
 * EXCLUDING stories and tests (they document the component; they are not the
 * contract Figma mirrors). CRLF-normalised — this repo has mixed line endings
 * (altitude-figma-sync trap 18) and git may re-end files on checkout, and a
 * line-ending flip is not a design change.
 *
 * @param {string} modulePath CEM module path, e.g. "components/button/button.ts"
 * @param {object|string} [project] resolved project, id, or omit for default
 * @returns {string|null} sha1 hex, or null if the directory is missing
 */
export function hashComponentSource(modulePath, project) {
  const root = project ? asProject(project).resolved.libraryRoot : WC_ROOT;
  const dir = join(root, dirname(modulePath));
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir)
    .filter((f) => /\.(ts|scss)$/.test(f) && !/\.stories\.|\.test\.|\.spec\./.test(f))
    .sort();
  const h = createHash('sha1');
  for (const f of files) {
    h.update(f);
    h.update('\0');
    h.update(readFileSync(join(dir, f), 'utf8').replace(/\r\n/g, '\n'));
    h.update('\0');
  }
  return h.digest('hex');
}

/** Stable sha1 of any JSON-able snapshot (used for Figma-side digests). */
export function digestOf(value) {
  return createHash('sha1').update(JSON.stringify(value)).digest('hex');
}

// ── status computation ──────────────────────────────────────────────────

/** Figma deep-link for a node id in the given project's file. */
export function figmaNodeUrl(nodeId, project) {
  return figmaNodeUrlFor(asProject(project), nodeId);
}

function statusFor(entry, currentCodeHash) {
  if (entry?.excluded) return STATUS.EXCLUDED;
  if (!entry?.figma?.name) return STATUS.MISSING_IN_FIGMA;
  const last = entry.lastSync ?? {};
  const codeDrift = Boolean(last.codeHash && currentCodeHash && last.codeHash !== currentCodeHash) || (!last.codeHash && Boolean(currentCodeHash));
  // Figma drift is only assessable when a refresh has observed a digest.
  const observed = entry.figmaCurrentDigest ?? null;
  const figmaDrift = Boolean(observed && last.figmaDigest && observed !== last.figmaDigest);
  if (codeDrift && figmaDrift) return STATUS.CONFLICT;
  if (codeDrift) return STATUS.CODE_DRIFT;
  if (figmaDrift) return STATUS.FIGMA_DRIFT;
  return STATUS.IN_SYNC;
}

/**
 * Compute the full parity report for ONE design-system project: one entry per
 * CEM component (joined to its Storybook kind id so the manager sidebar can key
 * by nav item), plus `figmaOnly` sets that have no code component.
 *
 * @param {object|string} [project] resolved project, id, or omit for default
 */
export function computeParity(project) {
  const p = asProject(project);
  const manifest = readManifest(p);
  const allComponents = loadComponents();
  const excludedByConfig = p.excluded ?? {};
  const excludePrefixes = p.storybook.excludeTitlePrefixes ?? [];

  // SCOPE. A project may declare `library.components` — the subset of the shared
  // library that actually IS that design system. Southleft ships 21 of the 105
  // al-* components; without this it would report the other 84 as
  // "missing-in-figma" against its own file, which is noise, not a build list.
  // No allowlist (Altitude) means the project IS the whole library.
  const allowlist = p.library.components?.length ? new Set(p.library.components) : null;
  const components = allowlist ? allComponents.filter((c) => allowlist.has(c.tag)) : allComponents;
  const omittedByScope = allComponents.length - components.length;

  // A tag in the allowlist that the library does not have is a config error the
  // report should surface rather than silently drop.
  const unknownInScope = allowlist
    ? [...allowlist].filter((tag) => !allComponents.some((c) => c.tag === tag))
    : [];

  const entries = [];

  for (const c of components) {
    const entry = manifest?.components?.[c.tag] ?? null;
    const codeHash = hashComponentSource(c.modulePath, p);
    const story = getStoryInfo(c.modulePath, p);

    // A config-level exclusion stands in for a manifest one, so a project whose
    // manifest has not been seeded yet still reports its known exclusions.
    const configExclusion = Object.prototype.hasOwnProperty.call(excludedByConfig, c.tag) ? excludedByConfig[c.tag] : null;

    let status = manifest ? statusFor(entry, codeHash) : STATUS.MISSING_IN_FIGMA;
    if (!entry?.figma?.name && configExclusion) status = STATUS.EXCLUDED;

    // Foundations are code primitives (layout, icon runtime, motion, utilities)
    // — never Figma component sets. Don't flag them as "missing"; an explicit
    // figma mapping in the manifest still overrides this. The prefix list is
    // per-project config, not a hardcoded taxonomy.
    if (status === STATUS.MISSING_IN_FIGMA && excludePrefixes.some((pre) => story?.title?.startsWith(pre))) {
      status = STATUS.EXCLUDED;
    }

    const item = {
      tag: c.tag,
      title: story?.title ?? null,
      kindId: story ? story.storyId.replace(/--docs$/, '') : null,
      storyId: story?.storyId ?? null,
      status,
      figma: entry?.figma?.name
        ? { name: entry.figma.name, nodeId: entry.figma.nodeId ?? null, url: figmaNodeUrl(entry.figma.nodeId, p) }
        : null,
      codeHash,
      lastSync: entry?.lastSync ?? null,
      figmaCurrentDigest: entry?.figmaCurrentDigest ?? null,
      note: entry?.note ?? configExclusion ?? null,
    };
    item.aiPrompt = buildAiPrompt(item, p);
    entries.push(item);
  }

  const figmaOnly = (manifest?.figmaOnly ?? []).map((f) => ({
    tag: null,
    title: null,
    kindId: null,
    storyId: null,
    status: STATUS.MISSING_IN_CODE,
    figma: { name: f.name, nodeId: f.nodeId ?? null, url: figmaNodeUrl(f.nodeId, p) },
    note: f.note ?? null,
    aiPrompt: buildAiPrompt({ tag: null, status: STATUS.MISSING_IN_CODE, figma: f }, p),
  }));

  const summary = {};
  for (const s of Object.values(STATUS)) summary[s] = 0;
  for (const e of [...entries, ...figmaOnly]) summary[e.status] += 1;

  return {
    generated: new Date().toISOString(),
    project: p.id,
    projectName: p.name,
    brand: p.brand,
    figmaFileId: p.figma.fileKey,
    figmaFileName: p.figma.fileName,
    figmaFileUrl: p.resolved.figmaUrlBase,
    manifestPresent: Boolean(manifest),
    figmaLastRefreshed: manifest?.figmaLastRefreshed ?? null,
    scope: {
      // `false` = this project is the whole library (no allowlist declared).
      allowlisted: Boolean(allowlist),
      inScope: components.length,
      libraryTotal: allComponents.length,
      omittedByScope,
      // Allowlisted tags the library does not actually export — a config typo.
      unknownInScope,
    },
    summary,
    components: entries,
    figmaOnly,
  };
}

// ── AI prompt generation ────────────────────────────────────────────────

/**
 * The two steps every reconciliation opens with: load the method skill, then
 * prove you are pointed at the right Figma file. Both are project-derived —
 * the file name/key and the decoy warning come from `.altitude/ds-projects.json`.
 */
function pipelineFor(p) {
  const { skillName, skillPath, skillTrapCount } = p.prompts;
  const traps = skillTrapCount ? `, and ${skillTrapCount} traps that each cost an hour` : '';
  const decoyWarning = (p.figma.decoys ?? []).length
    ? ` Never the ${(p.figma.decoys ?? []).map((d) => `"${d.fileName}"`).join(' / ')} decoy.`
    : '';
  return [
    `1. Load the \`${skillName}\` skill (${skillPath}) and read it FULLY before touching Figma — it names the canonical file, the conventions${traps}.`,
    `2. Confirm the target file with figma_get_status: "${p.figma.fileName}" (${p.figma.fileKey}).${decoyWarning}`,
  ];
}

function promptFooter(tag, p) {
  const projectFlag = p.isDefault ? '' : ` --project ${p.id}`;
  return [
    `Verify with: node ${p.prompts.atomsScriptsDir}/check-parity.mjs${projectFlag}`,
    `When both sides match, stamp the sync so Storybook shows green: node ${p.prompts.parityScriptsDir}/mark-synced.mjs${projectFlag} ${tag ?? '<tag>'}`,
  ];
}

/**
 * A copy-paste prompt for an AI agent to reconcile ONE component, targeted at
 * one design-system project. Every path, file key, skill and command below is
 * read from the project record — nothing about it is Altitude-specific.
 *
 * @param {object} item a parity report entry
 * @param {object|string} [project] resolved project, id, or omit for default
 */
export function buildAiPrompt(item, project) {
  const p = asProject(project);
  const PIPELINE = pipelineFor(p);
  const opsDir = p.paths.opsDir;
  const libRoot = p.library.root;
  const atoms = p.prompts.atomsScriptsDir;
  const pagePrefix = p.figma.componentPagePrefix ?? '';

  const head = item.tag
    ? `Reconcile Figma <-> code parity for the ${p.name} component \`${item.tag}\`` +
      (item.figma?.name ? ` (Figma set "${item.figma.name}"${item.figma.nodeId ? `, node ${item.figma.nodeId}` : ', resolved by name'})` : '') +
      '.'
    : `Reconcile Figma <-> code parity for the ${p.name} Figma set "${item.figma?.name}" (no code component exists).`;

  const context = `Target Figma file: "${p.figma.fileName}" (${p.figma.fileKey}) — ${p.resolved.figmaUrlBase}`;

  const byStatus = {
    [STATUS.IN_SYNC]: ['Status: in-sync. Nothing to do unless you have reason to re-verify; if so run the parity check below.'],
    [STATUS.CODE_DRIFT]: [
      `Status: CODE DRIFT — the component source in ${libRoot} changed since the last confirmed sync, so Figma is behind.`,
      'Push the code truth into Figma:',
      ...PIPELINE,
      `3. Regenerate ops: node ${atoms}/measure-components.mjs && node ${atoms}/build-component-ops.mjs`,
      `4. Repair the existing Figma set IN PLACE from ${opsDir}/${item.tag}.json (never delete+rebuild a pinned atom set — that discards the property surface and mints new node ids).`,
    ],
    [STATUS.FIGMA_DRIFT]: [
      'Status: FIGMA DRIFT — the Figma set changed since the last confirmed sync, so code is behind.',
      'First decide direction with a human if possible: adopt the Figma change into code, or revert Figma to the code truth.',
      ...PIPELINE,
      `3. Diff what changed: figma_analyze_component_set on the set, compare against ${opsDir}/${item.tag}.json (the code-derived truth).`,
      `4. If adopting into code: change the component source/tokens in ${libRoot} accordingly (tokens flow through the DTCG pipeline — see ${p.prompts.docPath ?? '.altitude/FIGMA-SYNC.md'}). If reverting Figma: repair the set in place from the ops file.`,
    ],
    [STATUS.CONFLICT]: [
      'Status: CONFLICT — BOTH sides changed since the last confirmed sync. Do not overwrite either side blindly.',
      ...PIPELINE,
      `3. Enumerate both deltas: regenerate ops (measure-components.mjs + build-component-ops.mjs) for the code side; figma_analyze_component_set for the Figma side; diff against the manifest's lastSync digests.`,
      '4. Merge deliberately: apply the intended changes to whichever side should win, per property — record the decision as a Monday Morning note.',
    ],
    [STATUS.MISSING_IN_FIGMA]: [
      `Status: MISSING IN FIGMA — this component exists in code but has no Figma component set in "${p.figma.fileName}".`,
      ...PIPELINE,
      `3. Regenerate ops: node ${atoms}/measure-components.mjs && node ${atoms}/build-component-ops.mjs`,
      `4. Build the page + set from ops: node ${atoms}/build-page.mjs (atoms) or build-molecules.mjs (molecules — placement comes from ${atoms}/tiers.mjs). Follow the library conventions: page "${pagePrefix}<Component>", Labels/Instances/COMPONENT SET, State axis, Title Case variant values.`,
      `5. Pin the new set: add the tag -> node id mapping to ${atoms}/instance-map.mjs and the manifest (seed-manifest.mjs --force merges it).`,
    ],
    [STATUS.EXCLUDED]: ['Status: excluded — this component is deliberately not represented in Figma (see the manifest note). Nothing to do.'],
    [STATUS.MISSING_IN_CODE]: [
      `Status: MISSING IN CODE — this Figma set has no corresponding ${p.library.workspace} component.`,
      `Decide with a human whether it should exist in code. If yes: scaffold with \`pnpm --filter ${p.library.workspace} plop\`, follow ${p.prompts.guardrailsDoc ?? 'AGENTS.md'} guardrails (arrangement belongs to <${p.library.tagPrefix}layout>; no new *-group wrappers), and bind styles to the same tokens the Figma set uses.`,
    ],
  };

  return [head, context, '', ...(byStatus[item.status] ?? []), '', ...promptFooter(item.tag, p)].join('\n');
}
