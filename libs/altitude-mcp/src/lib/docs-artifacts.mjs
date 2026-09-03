// Readers for the two DOCS-BUILD artifacts this server surfaces on
// `altitude_get_component` / `altitude_list_components`:
//
//   dist/docs[/<project>]/examples.json  — working web-component markup per
//     component, produced by executing each component's own `.stories.ts`
//     (apps/docs/src/pages/_examples-artifact.mjs → apps/docs/src/lib/examples.mjs).
//   dist/docs[/<project>]/guidance.json  — the schema-enforced authored
//     guidance (purpose / whenToUse / whenNotToUse + resolved `instead` tags),
//     from apps/docs/src/content/guidance/**.yaml via apps/docs/src/lib/guidance.mjs.
//
// WHY READ, NOT COMPUTE. Both facts already exist and are already built. The
// markup in particular cannot be re-derived here without forking a ~700-line
// story serializer whose whole value is being 1:1 with the docs playground —
// two extractors would mean the docs page and this server eventually showing
// different code for the same component. This package reads generated
// artifacts and is never a second source of truth (README, "What this is
// (and isn't)"), so the docs build emits and this reads.
//
// DEGRADATION IS NAMED, NEVER SILENT. A fresh clone has no `dist/`, so both
// readers return `{ ok: false, reason, path, hint }` rather than throwing or
// returning nothing. The caller turns that into an explicit `examples: []` +
// `examplesNote` / `guidance: null` + `guidanceNote`, because an agent must be
// able to tell "not authored" from "not built" from "does not exist" — and an
// absent key says none of the three.
//
// Paths come from the LIVE `REPO_ROOT` binding, read inside the function body,
// for the reason paths.mjs's header gives: `configurePaths(repoRoot)` may point
// this server at a different checkout after this module has loaded.

import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { REPO_ROOT } from './paths.mjs';
import { resolveProject } from './ds-project.mjs';

/** The exact command that produces both artifacts. Mirrors paths.mjs's HINTS. */
export const DOCS_ARTIFACT_HINT = 'pnpm --filter al-app-docs build';

/**
 * Where a project's docs artifacts land under `dist/docs`.
 *
 * The DEFAULT project's site is served at the docs root; every other project
 * gets a `/<id>/` prefix (apps/docs/src/lib/projects.mjs). Resolving the id
 * through the same registry the docs site uses is what keeps a third design
 * system working with no edit here.
 */
function docsDirFor(projectId) {
  let resolved;
  try {
    resolved = resolveProject(projectId);
  } catch {
    // NULL, not a fallback to the default project's directory. A brand layer
    // supersedes base components under the same tag — Southleft's `al-card` is
    // not Altitude's — so answering an unresolvable project with the default
    // system's markup and advice would hand a caller confidently wrong code
    // for a component it did not ask about. "I could not resolve that project"
    // is the only honest answer.
    return null;
  }
  const base = join(REPO_ROOT, 'dist', 'docs');
  return resolved.isDefault ? base : join(base, resolved.id);
}

// Cached per resolved file path AND mtime: this server is long-lived, a docs
// rebuild during a session must be picked up, and a stat is cheap next to
// parsing a multi-megabyte JSON. Same convention as stories.mjs's cache.
const cache = new Map();

function readArtifact(file) {
  if (file === null) {
    return {
      ok: false,
      reason:
        'the requested design-system project could not be resolved, so there is no artifact to read for ' +
        'it (call altitude_list_ds_projects for the valid ids)',
      path: null,
      // No `hint`: the fix is passing a different argument, not running
      // anything, and the sentence above already names the tool that lists the
      // valid ids. A composed "Run: altitude_list_ds_projects" would read as an
      // instruction to type a tool name at a shell prompt.
      hint: null,
    };
  }
  if (!existsSync(file)) {
    return {
      ok: false,
      reason: `the docs build has not been run in this checkout, so ${file} does not exist`,
      path: file,
      hint: DOCS_ARTIFACT_HINT,
    };
  }
  let stamp = '';
  try {
    stamp = String(statSync(file).mtimeMs);
  } catch {
    /* unreadable stat — fall back to the path-only key */
  }
  const key = `${file}::${stamp}`;
  if (cache.has(key)) return cache.get(key);

  let result;
  try {
    result = { ok: true, data: JSON.parse(readFileSync(file, 'utf8')) };
  } catch (err) {
    result = {
      ok: false,
      reason: `${file} exists but could not be parsed: ${err.message}`,
      path: file,
      hint: DOCS_ARTIFACT_HINT,
    };
  }
  cache.set(key, result);
  return result;
}

/**
 * A failed read as one sentence: the reason, plus the command that fixes it
 * where a command IS the fix. Not every failure has one — an unresolvable
 * project is fixed by passing a different argument, not by running anything.
 */
function explain(result) {
  return result.hint ? `${result.reason}. Run: ${result.hint}` : `${result.reason}.`;
}

/** Index an artifact's `components[]` by tag, once per read. */
function byTag(result) {
  if (!result.ok) return result;
  const index = new Map((result.data.components ?? []).map((row) => [row.tag, row]));
  return { ...result, index };
}

/** The examples artifact for `projectId`, indexed by tag. */
export function loadExamples(projectId) {
  const dir = docsDirFor(projectId);
  return byTag(readArtifact(dir && join(dir, 'examples.json')));
}

/** The guidance artifact for `projectId`, indexed by tag. */
export function loadGuidance(projectId) {
  const dir = docsDirFor(projectId);
  return byTag(readArtifact(dir && join(dir, 'guidance.json')));
}

/**
 * One tag's examples, as the `{ examples, examplesNote }` pair
 * `altitude_get_component` returns.
 *
 * THREE DISTINCT ZERO-EXAMPLE CASES, all reported as themselves:
 *   - the artifact is not built      → note names `pnpm --filter al-app-docs build`
 *   - the tag is not in the artifact → note says this project does not document it
 *   - the story could not serialize  → note carries the extractor's own reason
 * The field is ALWAYS present, so `examples: []` is a statement and not an
 * omission.
 */
export function examplesFor(tag, projectId, decorate) {
  const artifact = loadExamples(projectId);
  if (!artifact.ok) return { examples: [], examplesNote: explain(artifact) };

  const row = artifact.index.get(tag);
  if (!row) {
    return {
      examples: [],
      examplesNote:
        `no example is recorded for "${tag}" in ${artifact.data.source ?? 'the docs examples artifact'} — ` +
        'this project does not document that component.',
    };
  }
  const examples = (row.examples ?? []).map((example) =>
    typeof decorate === 'function' ? decorate(example) : example,
  );
  return {
    examples,
    examplesNote: examples.length
      ? null
      : (row.examplesNote ?? 'no example could be produced for this component'),
  };
}

/**
 * One tag's guidance, as the `{ guidance, guidanceNote }` pair
 * `altitude_get_component` returns. Same three-case honesty as `examplesFor`.
 */
export function guidanceFor(tag, projectId) {
  const artifact = loadGuidance(projectId);
  if (!artifact.ok) return { guidance: null, guidanceNote: explain(artifact) };

  const row = artifact.index.get(tag);
  if (!row) {
    return {
      guidance: null,
      guidanceNote:
        `"${tag}" is not in this project's guidance artifact — the project does not document that component.`,
    };
  }
  return { guidance: row.guidance ?? null, guidanceNote: row.guidance ? null : row.guidanceNote };
}

/**
 * The whole-library guidance summary `altitude_list_components` carries per
 * row: enough to choose between components without a second round-trip, and
 * nothing more. `whenNotToUse` is included in full because it is short, it is
 * the field that prevents a wrong choice, and truncating advice about when NOT
 * to use something is how the advice stops working.
 */
export function guidanceSummaryIndex(projectId) {
  const artifact = loadGuidance(projectId);
  if (!artifact.ok) return { ok: false, note: explain(artifact) };
  const summaries = new Map();
  for (const [tag, row] of artifact.index) {
    summaries.set(
      tag,
      row.guidance
        ? {
            purpose: row.guidance.purpose,
            whenToUse: row.guidance.whenToUse,
            whenNotToUse: row.guidance.whenNotToUse,
          }
        : null,
    );
  }
  return { ok: true, summaries, coverage: artifact.data.coverage ?? null };
}
