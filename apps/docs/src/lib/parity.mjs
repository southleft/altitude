/**
 * Figma ↔ code parity, for the docs site. Build time only.
 *
 * Same governing rule as `registry.mjs`: nothing component-shaped is hand-
 * maintained. This module never names a component and never states a status —
 * it calls the parity engine (`libs/altitude-mcp/src/lib/parity.mjs`, the same
 * module behind the `altitude_check_parity` MCP tool and the Storybook sidebar
 * badges) and keys the result by tag.
 *
 * THREE THINGS IT DOES DIFFERENTLY FROM THE STORYBOOK PATH, each one a
 * requirement of spec 2026-08-22-docs-live-status-panels:
 *
 * 1. BUILD TIME, NOT RUNTIME. The Storybook block fetches `./parity.json` from
 *    the preview iframe and re-polls the manager sidebar every 10 seconds
 *    (`.storybook/parity-emitter.mjs`, `blocks/figma-parity.tsx:54-62`). Here
 *    the report is computed while Astro renders, so a docs page is a static
 *    artifact with no fetch to fail.
 *
 * 2. PUBLIC PROJECTION. `publicParityReport()` is an allowlist that drops the
 *    `aiPrompt` field — which embeds the Figma file key, the component's node
 *    id, every `scripts/figma-*` path and the `.claude/skills` path — before
 *    anything reaches a page. altitude.pages.dev is public; that payload is a
 *    map of this repo's internals. `apps/docs/scripts/check-status-panels.mjs`
 *    re-checks the BUILT html for those strings, so the rule is enforced on the
 *    output rather than trusted here.
 *
 * 3. FAILURE IS DATA. The Storybook emitter, manager and docs block each
 *    swallow their errors (`parity-emitter.mjs:92-95`, `figma-parity.tsx:57-59`),
 *    so a broken report and a clean one render identically — "no badges" and
 *    "everything in sync" are indistinguishable. Every failure here becomes an
 *    `unavailable` record carrying the reason, and the panel renders it.
 */
import { COMPONENTS } from './registry.mjs';

/* ------------------------------------------------------------- the engine */

/**
 * The engine lives outside this app and is loaded by relative path, the same
 * way `registry.mjs` reaches the CEM. A failure to load it is recorded, never
 * thrown: a parity outage must not take the documentation down with it.
 */
async function loadEngine() {
  const { repoRoot } = await import('./repo-root.mjs');
  const path = await import('node:path');
  const { pathToFileURL } = await import('node:url');
  const entry = path.join(repoRoot(), 'libs', 'altitude-mcp', 'src', 'lib', 'parity.mjs');
  return import(pathToFileURL(entry).href);
}

/**
 * Every design-system project in `.altitude/ds-projects.json`. One component
 * library backs several of them (Altitude, Southleft), each checked against its
 * own Figma file, so a component's parity is a LIST of per-project statuses —
 * not one status. The list comes from the registry file; no project id is typed
 * here.
 */
async function loadProjectIds(engineDir) {
  const path = await import('node:path');
  const { pathToFileURL } = await import('node:url');
  const mod = await import(pathToFileURL(path.join(engineDir, 'ds-project.mjs')).href);
  return mod.listProjectIds();
}

/* --------------------------------------------------------------- the load */

/** @type {{projects: object[], byTag: Map<string, object[]>, failures: object[]}} */
const PARITY = await (async () => {
  const projects = [];
  const failures = [];
  const byTag = new Map();

  let engine;
  try {
    engine = await loadEngine();
  } catch (error) {
    failures.push({ scope: 'engine', reason: `parity engine did not load: ${error.message}` });
    return { projects, byTag, failures };
  }

  let ids;
  try {
    const { repoRoot } = await import('./repo-root.mjs');
    const path = await import('node:path');
    ids = await loadProjectIds(path.join(repoRoot(), 'libs', 'altitude-mcp', 'src', 'lib'));
  } catch (error) {
    failures.push({ scope: 'registry', reason: `.altitude/ds-projects.json unreadable: ${error.message}` });
    return { projects, byTag, failures };
  }

  for (const id of ids) {
    let report;
    try {
      report = engine.publicParityReport(id);
    } catch (error) {
      failures.push({ scope: id, reason: `report failed: ${error.message}` });
      continue;
    }
    projects.push(report);
    for (const entry of report.components) {
      if (!byTag.has(entry.tag)) byTag.set(entry.tag, []);
      byTag.get(entry.tag).push({ ...entry, project: report.project, projectName: report.projectName, figmaFileUrl: report.figmaFileUrl ?? null });
    }
  }

  return { projects, byTag, failures };
})();

/* ------------------------------------------------------------- the exports */

/** Every project's public report, in registry order. */
export const PARITY_PROJECTS = PARITY.projects;

/** Whatever went wrong while producing them. Rendered, never swallowed. */
export const PARITY_FAILURES = PARITY.failures;

/** True when there is anything at all to show. */
export const PARITY_AVAILABLE = PARITY.projects.length > 0;

/**
 * Status vocabulary. The ids are the engine's (`STATUS` in parity.mjs); the
 * copy is this site's. `tone` drives the badge colour and nothing else.
 *
 * `figma-drift` and `conflict` are listed even when they are currently
 * unreachable — see `unreachableStatuses` on each project's `observation`.
 * Hiding a status a reader cannot currently see is how "never measured" starts
 * looking like "measured and fine".
 */
export const PARITY_STATUS = {
  'in-sync': { label: 'IN SYNC', tone: 'ok', blurb: 'Code and the Figma component set matched at the last confirmed sync, and neither has changed since.' },
  'code-drift': { label: 'CODE AHEAD', tone: 'warn', blurb: 'The component changed since the last confirmed sync — the Figma set is behind.' },
  'figma-drift': { label: 'FIGMA AHEAD', tone: 'warn', blurb: 'The Figma set changed since the last confirmed sync — the code is behind.' },
  conflict: { label: 'BOTH CHANGED', tone: 'warn', blurb: 'Code and Figma each changed since the last confirmed sync. Neither side should be overwritten blindly.' },
  'missing-in-figma': { label: 'NOT IN FIGMA', tone: 'gap', blurb: 'This component exists in code and has no Figma component set.' },
  'missing-in-code': { label: 'NOT IN CODE', tone: 'gap', blurb: 'This Figma set has no code component.' },
  excluded: { label: 'NOT TRACKED', tone: 'mute', blurb: 'Deliberately not represented in Figma.' },
};

/**
 * How a status was decided — the field that keeps this panel honest.
 *
 * `never-synced` and an unobserved Figma side are the two ways a status can be
 * a guess rather than a measurement, and both say so on the page.
 */
export const DRIFT_BASIS = {
  contract: {
    label: 'CONTRACT DIFF',
    blurb: 'The component’s public surface — attributes and their value sets, slots, events, CSS parts and custom properties, from the manifest — compared against the Figma set’s property definitions.',
  },
  'source-hash': {
    label: 'SOURCE HASH',
    blurb: 'A sha1 of every .ts/.scss byte in the component directory, compared against the hash stored at the last sync. It cannot say what changed, and a comment edit moves it. Re-stamping this component records a contract digest instead.',
  },
  'never-synced': {
    label: 'NEVER SYNCED',
    blurb: 'The two sides have never been confirmed equal, so there is no baseline to compare against.',
  },
};

/**
 * Parity for one component tag: one record per design-system project, or an
 * empty array when the engine could not produce a report at all.
 */
export function parityFor(tag) {
  return PARITY.byTag.get(tag) ?? [];
}

/**
 * Site-wide roll-up for the overview screen. Derived from the same reports the
 * per-component panels render, so the total can never disagree with the parts.
 */
export const PARITY_TOTALS = (() => {
  const tracked = new Set(COMPONENTS.map((c) => c.tag));
  return PARITY.projects.map((report) => {
    const inScope = report.components.filter((c) => tracked.has(c.tag));
    const counts = {};
    for (const entry of inScope) counts[entry.status] = (counts[entry.status] ?? 0) + 1;
    return {
      project: report.project,
      projectName: report.projectName,
      figmaFileName: report.figmaFileName,
      observation: report.observation,
      documented: inScope.length,
      counts,
    };
  });
})();

/**
 * Parity rows for one component ON ONE PROJECT'S SITE.
 *
 * The whole-library site (the registry's `default`) is the umbrella: it shows
 * every design system's row, because a component's Figma story there genuinely
 * is "in sync for Altitude, missing for Southleft". A SCOPED project's site
 * shows only its own row — the other systems' Figma files are not that
 * system's business, and listing them would read as drift in a design file its
 * readers cannot open.
 */
export function parityForProject(tag, project) {
  const rows = parityFor(tag);
  return project.isDefault ? rows : rows.filter((row) => row.project === project.id);
}

/**
 * Deep link to a component's Figma set, or null when there is nothing to point at.
 *
 * Built from the two fields `publicParityReport` publishes for exactly this
 * purpose (owner decision 2026-08-31, reversing the older "name only" rule):
 * the project's file URL and the component's node id. Returns null rather than
 * a file-root link when the component has no mapped set — a link that lands the
 * reader nowhere is worse than no link.
 *
 * Node ids are `1:23` in the API and `1-23` in a URL.
 */
export function figmaLinkFor(tag, project) {
  const row = parityForProject(tag, project).find((r) => r.figmaFileUrl && r.figmaNodeId);
  if (!row) return null;
  const base = String(row.figmaFileUrl).replace(/\/+$/, '');
  return {
    href: `${base}?node-id=${String(row.figmaNodeId).replace(':', '-')}`,
    setName: row.figmaSetName,
    projectName: row.projectName,
  };
}

/** The overview roll-up for one project's site, filtered the same way. */
export function totalsForProject(project) {
  return project.isDefault
    ? PARITY_TOTALS
    : PARITY_TOTALS.filter((total) => total.project === project.id);
}
