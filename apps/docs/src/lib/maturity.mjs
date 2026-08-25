/**
 * Maturity data — a JOIN of things that already exist, never a second opinion.
 *
 * "How far along is this component" is answered today by four artifacts that
 * nobody reads together, and the site surfaces each of them in a place where
 * the comparison cannot be made: the lifecycle phase appears as a chip on one
 * detail page at a time, the v2 migration state appears only in
 * `.altitude/migration.json`, and the axe position appears only inside a
 * component's own checks panel. A reader asking "what is still legacy" or
 * "which components have no measured accessibility result" had no page to open.
 *
 * So this module holds NO maturity facts of its own. Every column below is read
 * from the artifact that owns it:
 *
 *   tier, lifecycle, React wrapper
 *       → the scoped registry on the context (`registry.mjs`, itself derived
 *         from the CEM plus each component's own story parameters).
 *   migration state, and the capability flags
 *       → `.altitude/migration.json`, the manifest `gate:migration` enforces.
 *   the VOCABULARY of those columns — which states exist, which capabilities
 *   are tracked, and what each one means
 *       → `.altitude/migration.schema.json`. The schema declares the enum and
 *         documents every property, so a fourth capability added there becomes
 *         a fourth column here with no edit. Restating the enum in this file
 *         would have made the page the fifth artifact that can disagree.
 *   accessibility
 *       → `a11y.mjs`, the same reader the component checks panels use, so this
 *         page cannot say a component is clean while its own page says
 *         otherwise.
 *
 * THE JOIN KEY IS NOT THE SLUG ALONE. A brand layer may supersede a base
 * component under the same directory name (Southleft's header is `header`, so
 * is Altitude's), and `.altitude/migration.json` tracks the SHARED library. A
 * slug-only join would have reported the base component's migration state
 * against a brand component that was never part of that migration. Layer
 * components are therefore identified from the registry's own `layer.tags` and
 * reported as out of the manifest's scope, which is what they are.
 */
import fs from 'node:fs';
import path from 'node:path';
import { repoRoot } from './repo-root.mjs';
import { a11yFor } from './a11y.mjs';

const REPO_ROOT = repoRoot();

/** Repo-relative, forward slashes — the paths the page cites to the reader. */
export const MANIFEST_PATH = '.altitude/migration.json';
export const SCHEMA_PATH = '.altitude/migration.schema.json';

const readJson = (relative) => {
  try {
    return { data: JSON.parse(fs.readFileSync(path.join(REPO_ROOT, ...relative.split('/')), 'utf8')), reason: null };
  } catch (error) {
    return { data: null, reason: `Could not read ${relative} (${error.code ?? 'read failed'}).` };
  }
};

const manifest = readJson(MANIFEST_PATH);
const schema = readJson(SCHEMA_PATH);

/**
 * The v2 migration manifest, or a stated reason there is none.
 *
 * Absence is rendered rather than thrown, for the reason `a11y.mjs` gives: a
 * page that quietly drops a column is indistinguishable from a page reporting
 * that everything is fine.
 */
export const MIGRATION_MANIFEST = {
  available: Boolean(manifest.data),
  reason: manifest.reason,
  path: MANIFEST_PATH,
  /** `{ deprecateAliasesBy }` — the version legacy aliases may be removed in. */
  compatBudget: manifest.data?.compatBudget ?? null,
  components: manifest.data?.components ?? {},
};

const ENTRY_SCHEMA = schema.data?.definitions?.ComponentMigration ?? null;

/**
 * `` `dual` = supports old + new APIs, requires `expiry`. `` → one note per
 * state.
 *
 * The schema documents all three states in ONE `description` string, so the
 * split is by position: each state's note runs from its own back-ticked name to
 * the next one. Slicing at the next back-tick instead would have truncated
 * `dual` at the word "requires", because its note cites `expiry` in code font.
 */
function notesFrom(description, ids) {
  const notes = {};
  if (!description) return notes;
  const marks = ids
    .map((id) => ({ id, at: description.indexOf(`\`${id}\` =`), lead: `\`${id}\` =`.length }))
    .filter((mark) => mark.at !== -1)
    .sort((a, b) => a.at - b.at);
  marks.forEach((mark, i) => {
    const end = i + 1 < marks.length ? marks[i + 1].at : description.length;
    notes[mark.id] = description
      .slice(mark.at + mark.lead, end)
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\.$/, '');
  });
  return notes;
}

/**
 * The migration states, in the schema's own order — least migrated first,
 * which is the order the enum is written in and the order a reader scanning
 * for trouble wants.
 *
 * Falls back to the states the manifest actually uses when the schema cannot be
 * read, so a page still renders honest columns rather than none.
 */
export const MIGRATION_STATES = (() => {
  const declared = ENTRY_SCHEMA?.properties?.state;
  const ids = declared?.enum ?? [
    ...new Set(Object.values(MIGRATION_MANIFEST.components).map((entry) => entry.state)),
  ];
  const notes = notesFrom(declared?.description, ids);
  return ids.map((id) => ({ id, label: id.toUpperCase(), note: notes[id] ?? null }));
})();

/**
 * The capability flags — every BOOLEAN property the entry schema declares.
 *
 * Read as a shape rather than listed, so the day P5 adds a fourth flag it
 * becomes a fourth column with its schema description as the explanation. The
 * three today are `react19`, `headless` and `ssr`.
 */
export const MIGRATION_CAPABILITIES = Object.entries(ENTRY_SCHEMA?.properties ?? {})
  .filter(([, property]) => property.type === 'boolean')
  .map(([id, property]) => ({
    id,
    label: id.toUpperCase(),
    note: (property.description ?? '').replace(/\s+/g, ' ').trim() || null,
  }));

/* ------------------------------------------------------------- the join */

/** True when this component belongs to a design system's own brand layer. */
const layerTagsOf = (context) => new Set(context.registry.layer?.tags ?? []);

/**
 * One row per component this design system documents, in the registry's order.
 *
 * `tracked: false` is a real answer with two different causes, and they are
 * kept apart: a brand-layer component is outside the shared library's migration
 * entirely, while a base component missing from the manifest is a gap in the
 * manifest. Collapsing them into "unknown" would hide the second behind the
 * first.
 */
export function maturityRows(context) {
  const layerTags = layerTagsOf(context);

  return context.registry.components.map((component) => {
    const layered = layerTags.has(component.tag);
    const entry = layered ? null : (MIGRATION_MANIFEST.components[component.slug] ?? null);
    const checks = a11yFor(component);
    const open = checks.measured ? checks.violations.length + checks.contrastViolations.length : 0;

    return {
      slug: component.slug,
      name: component.name,
      tag: component.tag,
      tier: component.tier,
      library: component.libraryWorkspace,
      /** The lifecycle phase, or null when the component declares none. */
      status: component.status ?? null,
      react: component.react,
      layered,
      tracked: Boolean(entry),
      state: entry?.state ?? null,
      /** Set only on `dual` entries — the version the legacy path may go. */
      expiry: entry?.expiry ?? null,
      /** id → true / false / null (null = this component is not tracked). */
      capabilities: Object.fromEntries(
        MIGRATION_CAPABILITIES.map(({ id }) => [id, entry ? Boolean(entry[id]) : null]),
      ),
      untrackedReason: entry
        ? null
        : layered
          ? `Ships in ${component.libraryWorkspace}, a brand layer built on the v2 library — the v1→v2 migration does not apply to it.`
          : `No entry for "${component.slug}" in ${MANIFEST_PATH}.`,
      a11y: {
        measured: checks.measured,
        reason: checks.measured ? null : checks.reason,
        open,
        /** Manual rows nobody has recorded — never counted as a pass. */
        unrecorded: checks.rows.filter((row) => row.state === 'not-recorded').length,
      },
    };
  });
}

/**
 * The totals the page leads with — every one re-derived from the rows above,
 * so a scoped design system quotes its own numbers and not the library's.
 */
export function maturitySummary(context) {
  const rows = maturityRows(context);
  const tracked = rows.filter((row) => row.tracked);
  const count = (predicate) => rows.filter(predicate).length;

  /**
   * Manifest entries this design system does not document. For a SCOPED system
   * that is the normal case and not a defect — it ships a subset — so it is
   * reported as a number with that framing rather than as a failure.
   */
  const documented = new Set(rows.filter((row) => !row.layered).map((row) => row.slug));
  const manifestOnly = Object.keys(MIGRATION_MANIFEST.components).filter(
    (slug) => !documented.has(slug),
  );

  return {
    total: rows.length,
    tracked: tracked.length,
    layered: count((row) => row.layered),
    untracked: count((row) => !row.tracked && !row.layered),
    manifestOnly,
    states: MIGRATION_STATES.map((state) => ({
      ...state,
      count: count((row) => row.state === state.id),
    })),
    capabilities: MIGRATION_CAPABILITIES.map((capability) => ({
      ...capability,
      count: count((row) => row.capabilities[capability.id] === true),
      of: tracked.length,
    })),
    lifecycle: context.registry.lifecycle.map((phase) => ({
      id: phase.id,
      label: phase.label,
      count: phase.count,
    })),
    a11y: {
      measured: count((row) => row.a11y.measured),
      clean: count((row) => row.a11y.measured && row.a11y.open === 0),
      open: rows.reduce((n, row) => n + row.a11y.open, 0),
    },
    /** The version the compat budget allows legacy aliases to be removed in. */
    deprecateAliasesBy: MIGRATION_MANIFEST.compatBudget?.deprecateAliasesBy ?? null,
  };
}
