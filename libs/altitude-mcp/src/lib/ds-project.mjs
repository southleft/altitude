// Design-system PROJECT RESOLUTION.
//
// This repo drives more than one Figma-backed design system off ONE component
// library (`@southleft/al-web-components`). Altitude and Southleft share every component;
// what differs is the brand recipe, the Storybook identity, and — the part this
// module exists for — WHICH FIGMA FILE the parity engine is checking against.
//
// Before this module, the Figma file key, file name, manifest path, prompt
// pipeline and Storybook URLs were module-level string constants in
// `parity.mjs` / `paths.mjs` / `stories.mjs`. They are now fields on a project
// record loaded from `.altitude/ds-projects.json`.
//
// Resolution order (first hit wins):
//   1. an explicit id passed in code           — `resolveProject('southleft')`
//   2. `--project <id>` in process.argv        — CLI scripts
//   3. `DS_PROJECT` env var                    — Storybook/dev-server processes
//   4. the registry's `default` field          — 'altitude'
//
// Everything here is READ-ONLY and dependency-free (node builtins only), to
// match the rest of `libs/altitude-mcp/src/lib`.

import { existsSync, readFileSync } from 'node:fs';
import { join, isAbsolute } from 'node:path';

import { REPO_ROOT, PATHS } from './paths.mjs';

// NOT a top-level `const` computed from REPO_ROOT — that would snapshot the
// path at THIS module's first import and go stale the moment a caller
// invoked `configurePaths(repoRoot)` afterward (R3, spec
// 2026-08-25-mcp-library-first-refactor). `PATHS.dsProjects` already does
// this same join, live, off the current `PATHS` binding; read it at call
// time instead of caching it here.
function registryPath() {
  return PATHS.dsProjects;
}

/** Thrown when the registry is missing, malformed, or names an unknown project. */
export class UnknownProjectError extends Error {
  constructor(message, { code = 'ERR_UNKNOWN_DS_PROJECT', id = null, known = [] } = {}) {
    super(message);
    this.name = 'UnknownProjectError';
    this.code = code;
    this.id = id;
    this.known = known;
  }
}

let cachedRegistry = null;
let cachedRegistryPath = null;

/**
 * Read `.altitude/ds-projects.json`.
 *
 * Cached per registry PATH — the registry file itself is checked-in config
 * that doesn't change under a running dev server, but `configurePaths()`
 * (../lib/paths.mjs, the R3 `repoRoot` override) can repoint
 * `PATHS.dsProjects` at a different checkout mid-process. Keying the cache
 * by the resolved path makes a root switch invalidate it naturally; an
 * unkeyed cache served the FIRST root's registry forever. Pass
 * `{ reload: true }` from a test that rewrites the file in place.
 */
export function loadRegistry({ reload = false } = {}) {
  const path = registryPath();
  if (cachedRegistry && !reload && path === cachedRegistryPath) return cachedRegistry;
  if (!existsSync(path)) {
    throw new UnknownProjectError(
      `Design-system registry not found at ${path}. It is a tracked file — restore it from git.`,
      { code: 'ERR_MISSING_DS_REGISTRY' },
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new UnknownProjectError(`Design-system registry at ${path} is not valid JSON: ${err.message}`, {
      code: 'ERR_INVALID_DS_REGISTRY',
    });
  }

  if (!parsed?.projects || typeof parsed.projects !== 'object') {
    throw new UnknownProjectError(`Design-system registry at ${path} has no \`projects\` object.`, {
      code: 'ERR_INVALID_DS_REGISTRY',
    });
  }
  if (!parsed.default || !parsed.projects[parsed.default]) {
    throw new UnknownProjectError(
      `Design-system registry \`default\` is "${parsed.default}", which is not a key of \`projects\` (${Object.keys(parsed.projects).join(', ')}).`,
      { code: 'ERR_INVALID_DS_REGISTRY', known: Object.keys(parsed.projects) },
    );
  }

  cachedRegistry = parsed;
  cachedRegistryPath = path;
  return cachedRegistry;
}

/** Every project id in the registry. */
export function listProjectIds() {
  return Object.keys(loadRegistry().projects);
}

/**
 * Read `--project <id>` (or `--project=<id>`) out of an argv array.
 * Returns `null` when absent, so the caller can fall through to the env var.
 */
export function projectFromArgv(argv = process.argv) {
  const eq = argv.find((a) => typeof a === 'string' && a.startsWith('--project='));
  if (eq) return eq.slice('--project='.length) || null;
  const i = argv.indexOf('--project');
  if (i > -1 && typeof argv[i + 1] === 'string' && !argv[i + 1].startsWith('-')) return argv[i + 1];
  return null;
}

/** Resolve the ACTIVE project id without loading the whole record. */
export function activeProjectId(explicitId = null) {
  if (explicitId) return explicitId;
  return projectFromArgv() ?? process.env.DS_PROJECT ?? loadRegistry().default;
}

/**
 * Resolve a full project record.
 *
 * The returned object is the raw registry entry PLUS `resolved`, which holds
 * every repo-root-relative path turned absolute and the Figma URL base with
 * `{fileKey}` already substituted — so callers never re-implement either.
 */
// Resolved-record cache, keyed by registry path + final project id — same
// convention as loadRegistry()'s cache (keyed so a configurePaths() switch
// invalidates naturally). computeParity() alone used to rebuild this record
// once per component via getStoryInfo → docsBaseFor (spec 2026-08-27-parity-
// system-audit-remediation, R5). The cached record is SHARED — treat it as
// read-only; derive views by spreading ({...p, resolved: {...p.resolved}}),
// which is what resolveComponentRoster() already does.
const resolvedCache = new Map();

export function resolveProject(explicitId = null) {
  const registry = loadRegistry();
  const id = activeProjectId(explicitId);

  const cacheKey = `${registryPath()}::${id}`;
  const cached = resolvedCache.get(cacheKey);
  if (cached) return cached;

  const project = registry.projects[id];

  if (!project) {
    const known = Object.keys(registry.projects);
    throw new UnknownProjectError(`Unknown design-system project "${id}". Known projects: ${known.join(', ')}.`, {
      id,
      known,
    });
  }

  const abs = (p) => (isAbsolute(p) ? p : join(REPO_ROOT, p));
  const urlBase = (project.figma.urlBase ?? 'https://www.figma.com/design/{fileKey}/').replace(
    '{fileKey}',
    project.figma.fileKey,
  );

  const record = {
    ...project,
    id,
    isDefault: id === registry.default,
    resolved: {
      figmaUrlBase: urlBase,
      figmaSyncDir: abs(project.paths.figmaSyncDir),
      parityManifest: abs(project.paths.parityManifest),
      opsDir: abs(project.paths.opsDir),
      // null when the project has no pinned Figma node ids yet. Node ids are
      // file-scoped, so this must never fall back to another project's map.
      instanceMap: project.paths.instanceMap ? abs(project.paths.instanceMap) : null,
      libraryRoot: abs(project.library.root),
      // The BRAND layer (T7, spec 2026-08-22-southleft-brand-design-system-as-a-
      // linked-layer-on-altitude): a project may ship page-section components
      // on top of the shared library, in their own workspace/CEM. `null` for a
      // project with no brand layer (Altitude). `supersedes` maps a tag the
      // brand REPLACES (same tag, brand implementation wins — e.g. Southleft's
      // al-header/al-footer) to itself; everything else in the brand CEM is
      // brand-only and adds NEW tags to the roster. See `parity.mjs computeParity()`.
      brandLibrary: project.brandLibrary
        ? {
            workspace: project.brandLibrary.workspace,
            root: abs(project.brandLibrary.root),
            cem: join(abs(project.brandLibrary.root), 'custom-elements.json'),
            tagPrefix: project.brandLibrary.tagPrefix ?? project.library.tagPrefix,
            supersedes: project.brandLibrary.supersedes ?? {},
          }
        : null,
      // null for a project with no Storybook. Southleft's was retired on
      // 2026-08-23 in favour of the multi-brand docs site, and `storybook` is
      // optional in the schema, so reading it unguarded threw for that project
      // and took resolveProject() — and therefore every parity CLI — with it.
      storybookConfigDir: project.storybook ? abs(project.storybook.configDir) : null,
      // Where this project's documentation is published. Replaces Storybook as
      // the canonical docs surface; see `docs` in .altitude/ds-projects.json.
      docsProductionBase: project.docs?.productionBase ?? null,
      docsRoute: project.docs?.route ?? null,
    },
  };
  resolvedCache.set(cacheKey, record);
  return record;
}

/**
 * Build the Figma deep-link for a node id in this project's file.
 * `null` nodeId (molecules are mapped by name only) yields the file root.
 */
export function figmaNodeUrlFor(project, nodeId) {
  const base = project.resolved.figmaUrlBase;
  if (!nodeId) return base;
  return `${base}?node-id=${String(nodeId).replace(/:/g, '-')}`;
}
