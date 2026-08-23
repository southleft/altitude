// Figma <-> code parity engine.
//
// MULTI-PROJECT. One component library (`@southleft/al-web-components`) backs more than
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

// ── the contract (what Figma actually mirrors) ──────────────────────────
//
// `hashComponentSource` above hashes BYTES. That makes it wrong in both
// directions, and the two failures are the reason this section exists:
//
//   * FALSE POSITIVE — editing a JSDoc comment, renaming a private field, or
//     reformatting the SCSS changes the sha1 and flips the badge to
//     `code-drift`, though nothing a Figma component set can represent moved.
//   * FALSE NEGATIVE — the hash says "something changed" and never says WHAT,
//     so a genuinely breaking change (a variant value removed from an enum) is
//     indistinguishable from a typo fix, and a variant removed IN FIGMA is
//     invisible to it entirely.
//
// The contract below is the component's PUBLIC SURFACE as the CEM records it —
// the same surface a Figma component set mirrors: attribute names and their
// value sets, slots, events, CSS parts and CSS custom properties. Descriptions
// are deliberately excluded; that is the whole point.
//
// `hashComponentSource` is KEPT, and still reported as `codeHash`: it is the
// only signal available for a manifest entry stamped before contracts existed,
// and `driftBasis` on every report entry says which one decided the status.

/** `'a' | 'b'` → ['a','b']; a non-union type → []. */
function unionValues(typeText) {
  const parts = String(typeText ?? '').split('|').map((s) => s.trim());
  if (parts.length < 2) return [];
  const literals = parts.filter((s) => /^'[^']*'$/.test(s)).map((s) => s.slice(1, -1));
  return literals.length === parts.length ? literals.sort() : [];
}

/**
 * The code-side contract for one CEM component record.
 *
 * @param {object} component a `loadComponents()` entry
 * @returns {{attributes: Array<{name:string,type:string,values:string[]}>,
 *            slots:string[], events:string[], cssParts:string[], cssProperties:string[]}}
 */
export function codeContract(component) {
  const names = (list, key = 'name') => (list ?? []).map((x) => x[key] ?? '').filter(Boolean).sort();
  return {
    attributes: (component.attributes ?? [])
      .map((a) => {
        const type = (a.type?.text ?? 'string').replace(/\s+/g, ' ').trim();
        return { name: a.name, type, values: unionValues(type) };
      })
      .sort((a, b) => a.name.localeCompare(b.name)),
    // The DEFAULT slot is declared with an empty name, so it has to be labelled
    // before anything filters on truthiness — dropping it would understate the
    // surface of every component that projects unnamed content.
    slots: (component.slots ?? []).map((s) => s.name || '(default)').sort(),
    events: names(component.events),
    cssParts: names(component.cssParts),
    cssProperties: names(component.cssProperties),
  };
}

/** Stable digest of `codeContract` — the drift signal that replaces the sha1. */
export function contractDigest(component) {
  return component ? digestOf(codeContract(component)) : null;
}

/**
 * Match a Figma variant-property name to a CEM attribute name.
 *
 * The two sides spell the same idea differently ON PURPOSE: Figma axes are
 * Title Case (`Variant`, `Width`) and the code's are kebab (`variant`,
 * `width`), so comparison is case- and separator-insensitive. Names that do not
 * survive that normalisation on both sides are reported as UNMATCHED rather
 * than as drift — the Figma sets carry a synthetic `State` axis with no code
 * attribute at all, and the plan (scripts/figma-atoms/plan.mjs:18) deliberately
 * withholds behavioural props from the axis list. Curation is not drift.
 */
const normKey = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Diff the code contract against an OBSERVED Figma component-set contract.
 *
 * `figmaContract` is what `scripts/figma-parity/refresh-figma-digests.mjs`
 * records per entry: `{ props: { <Name>: { type, options } }, variants: [...] }`.
 *
 * What counts as a mismatch is narrow on purpose. Option LABELS differ between
 * the two sides by design (the library's Button calls its implicit default
 * variant "Primary" in Figma — plan.mjs:87-89), so a label difference is
 * reported but is NOT drift. A difference in the NUMBER of options is: that is
 * exactly "a variant was added or removed on one side", the case the byte hash
 * could not see.
 *
 * @returns {null|{checked:number, mismatches:Array, matched:Array, unmatchedFigmaProps:string[]}}
 */
export function diffFigmaContract(contract, figmaContract) {
  if (!contract || !figmaContract?.props) return null;
  const byKey = new Map(contract.attributes.map((a) => [normKey(a.name), a]));
  const matched = [];
  const mismatches = [];
  const unmatchedFigmaProps = [];

  for (const [figmaName, def] of Object.entries(figmaContract.props)) {
    const attr = byKey.get(normKey(figmaName));
    if (!attr) {
      unmatchedFigmaProps.push(figmaName);
      continue;
    }
    const figmaOptions = (def?.options ?? []).slice().sort();
    const row = {
      property: attr.name,
      figmaProperty: figmaName,
      figmaType: def?.type ?? null,
      code: attr.values,
      figma: figmaOptions,
    };
    // Only VARIANT properties carry an option set to compare against an enum.
    if (def?.type === 'VARIANT' && attr.values.length && figmaOptions.length) {
      if (attr.values.length !== figmaOptions.length) {
        mismatches.push({ ...row, kind: 'option-count' });
        continue;
      }
      const relabelled = attr.values.some((v, i) => normKey(v) !== normKey(figmaOptions[i]));
      matched.push({ ...row, relabelled });
      continue;
    }
    matched.push({ ...row, relabelled: false });
  }

  return { checked: matched.length + mismatches.length, mismatches, matched, unmatchedFigmaProps };
}

// ── status computation ──────────────────────────────────────────────────

/** Figma deep-link for a node id in the given project's file. */
export function figmaNodeUrl(nodeId, project) {
  return figmaNodeUrlFor(asProject(project), nodeId);
}

/**
 * Decide one component's status, and SAY WHAT DECIDED IT.
 *
 * The second half matters as much as the first. `figmaCurrentDigest` is null
 * until someone runs `refresh-figma-digests.mjs`, and while it is null
 * `figma-drift` and `conflict` are not "absent", they are UNREACHABLE — no
 * amount of design change can produce them. The old function returned
 * `in-sync` in that state, which is how "nobody has ever looked at Figma"
 * came to render identically to "Figma matches". Every entry now carries
 * `driftBasis` and `figmaObserved` so a consumer can render the difference.
 *
 * @returns {{status:string, driftBasis:'contract'|'source-hash'|'never-synced',
 *            figmaObserved:boolean, codeDrift:boolean, figmaDrift:boolean,
 *            contractMismatches:number}}
 */
function assessEntry(entry, current) {
  const observed = entry?.figmaCurrentDigest ?? null;
  const figmaObserved = observed !== null;
  const last = entry?.lastSync ?? {};

  if (entry?.excluded) {
    return { status: STATUS.EXCLUDED, driftBasis: 'never-synced', figmaObserved, codeDrift: false, figmaDrift: false, contractMismatches: 0 };
  }
  if (!entry?.figma?.name) {
    return { status: STATUS.MISSING_IN_FIGMA, driftBasis: 'never-synced', figmaObserved, codeDrift: false, figmaDrift: false, contractMismatches: 0 };
  }

  // Prefer the CONTRACT digest; fall back to the byte hash only for manifest
  // entries stamped before contracts existed. Which one ran is reported.
  let codeDrift;
  let driftBasis;
  if (last.contractDigest && current.contractDigest) {
    codeDrift = last.contractDigest !== current.contractDigest;
    driftBasis = 'contract';
  } else if (last.codeHash && current.codeHash) {
    codeDrift = last.codeHash !== current.codeHash;
    driftBasis = 'source-hash';
  } else {
    // Never stamped: the two sides have never been confirmed equal, so the
    // honest reading is "code is ahead", not "in sync".
    codeDrift = Boolean(current.codeHash);
    driftBasis = 'never-synced';
  }

  // A contract mismatch against an OBSERVED Figma set is a design-level
  // difference the digest comparison cannot express, and counts as Figma drift
  // on its own — the set no longer offers the variants the code declares.
  const contractMismatches = current.contractDiff?.mismatches?.length ?? 0;
  const digestDrift = Boolean(observed && last.figmaDigest && observed !== last.figmaDigest);
  const figmaDrift = digestDrift || contractMismatches > 0;

  let status = STATUS.IN_SYNC;
  if (codeDrift && figmaDrift) status = STATUS.CONFLICT;
  else if (codeDrift) status = STATUS.CODE_DRIFT;
  else if (figmaDrift) status = STATUS.FIGMA_DRIFT;

  return { status, driftBasis, figmaObserved, codeDrift, figmaDrift, contractMismatches };
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
  // library-scope, with a legacy fallback for any registry still carrying it
  // under `storybook` (that block is optional now — Southleft has none).
  const excludePrefixes = p.library?.excludeTitlePrefixes ?? p.storybook?.excludeTitlePrefixes ?? [];

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
    const contract = codeContract(c);
    const story = getStoryInfo(c.modulePath, p);
    const contractDiff = diffFigmaContract(contract, entry?.figmaContract ?? null);

    // A config-level exclusion stands in for a manifest one, so a project whose
    // manifest has not been seeded yet still reports its known exclusions.
    const configExclusion = Object.prototype.hasOwnProperty.call(excludedByConfig, c.tag) ? excludedByConfig[c.tag] : null;

    const assessed = manifest
      ? assessEntry(entry, { codeHash, contractDigest: digestOf(contract), contractDiff })
      : { status: STATUS.MISSING_IN_FIGMA, driftBasis: 'never-synced', figmaObserved: false, codeDrift: false, figmaDrift: false, contractMismatches: 0 };
    let status = assessed.status;
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
      /** Digest of the PUBLIC SURFACE (see `codeContract`) — the drift signal. */
      contractDigest: digestOf(contract),
      /** Sizes, so a consumer can show what was compared without the payload. */
      contractShape: {
        attributes: contract.attributes.length,
        slots: contract.slots.length,
        events: contract.events.length,
        cssParts: contract.cssParts.length,
        cssProperties: contract.cssProperties.length,
      },
      /** Property-level diff against the observed Figma set, or null if unobserved. */
      contractDiff,
      /** Which comparison decided `status`, and whether Figma was ever read. */
      driftBasis: assessed.driftBasis,
      figmaObserved: assessed.figmaObserved,
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

  /**
   * THE HONESTY BLOCK. Without it, a report where nobody has ever read Figma is
   * byte-identical in shape to one where Figma matches — which is how
   * `figma-drift: 0` came to mean two opposite things. `mapped` vs `observed`
   * is the distinction: a status is only trustworthy for the observed ones.
   */
  const mapped = entries.filter((e) => e.figma);
  const observation = {
    figmaLastRefreshed: manifest?.figmaLastRefreshed ?? null,
    everObserved: Boolean(manifest?.figmaLastRefreshed),
    mappedComponents: mapped.length,
    observedComponents: mapped.filter((e) => e.figmaObserved).length,
    /** Statuses that cannot occur at all while nothing has been observed. */
    unreachableStatuses: mapped.some((e) => e.figmaObserved) ? [] : [STATUS.FIGMA_DRIFT, STATUS.CONFLICT],
    driftBasis: entries.reduce((acc, e) => {
      acc[e.driftBasis] = (acc[e.driftBasis] ?? 0) + 1;
      return acc;
    }, {}),
    contractsCompared: entries.filter((e) => e.contractDiff).length,
    refreshCommand: `node scripts/figma-parity/refresh-figma-digests.mjs${p.isDefault ? '' : ` --project ${p.id}`}`,
  };

  return {
    generated: new Date().toISOString(),
    observation,
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

// ── the public projection ───────────────────────────────────────────────

/**
 * `computeParity()` for a PUBLIC consumer — the docs site, which is deployed to
 * the open internet.
 *
 * The full report is an internal tool's output and reads like one. Every entry
 * carries an `aiPrompt` that names the Figma FILE KEY, the component's NODE ID,
 * the path of every script in `scripts/figma-atoms/` and `scripts/figma-parity/`,
 * the skill file under `.claude/`, and the decoy-file warning. None of that is
 * documentation; it is a map of this repo's internals and a set of handles on a
 * private Figma file, and shipping it to altitude.pages.dev publishes both.
 *
 * This projection is an ALLOWLIST, not a redaction pass: it builds new objects
 * from named fields, so a field added to the engine later is absent here until
 * somebody adds it deliberately. `apps/docs/scripts/check-status-panels.mjs`
 * greps the BUILT html for the leaks this is meant to prevent, so the rule is
 * enforced against the output rather than trusted here.
 *
 * @param {object|string} [project] resolved project, id, or omit for default
 */
export function publicParityReport(project) {
  const full = computeParity(project);
  return {
    generated: full.generated,
    project: full.project,
    projectName: full.projectName,
    brand: full.brand,
    /** Name only — never `figmaFileId`, and never a node-scoped deep link. */
    figmaFileName: full.figmaFileName,
    manifestPresent: full.manifestPresent,
    observation: {
      figmaLastRefreshed: full.observation.figmaLastRefreshed,
      everObserved: full.observation.everObserved,
      mappedComponents: full.observation.mappedComponents,
      observedComponents: full.observation.observedComponents,
      unreachableStatuses: full.observation.unreachableStatuses,
      driftBasis: full.observation.driftBasis,
      contractsCompared: full.observation.contractsCompared,
    },
    scope: full.scope,
    summary: full.summary,
    components: full.components.map((c) => ({
      tag: c.tag,
      status: c.status,
      driftBasis: c.driftBasis,
      figmaObserved: c.figmaObserved,
      /** The Figma SET NAME is a design-system fact; the node id is not. */
      figmaSetName: c.figma?.name ?? null,
      lastSyncDate: c.lastSync?.date ?? null,
      contractShape: c.contractShape,
      contractDiff: c.contractDiff
        ? {
            checked: c.contractDiff.checked,
            mismatches: c.contractDiff.mismatches.map((m) => ({
              property: m.property,
              kind: m.kind,
              codeOptions: m.code.length,
              figmaOptions: m.figma.length,
            })),
            relabelled: c.contractDiff.matched.filter((m) => m.relabelled).map((m) => m.property),
          }
        : null,
      note: c.note,
    })),
  };
}
