/**
 * DESIGN-SYSTEM PROJECTS — the docs engine's view of `.altitude/ds-projects.json`.
 *
 * One component library (`libs/al-web-components`) backs several design
 * systems. Each has its own Figma file, its own brand recipe, and — the part
 * that matters here — its own SCOPE: Altitude documents the whole library,
 * Southleft documents only the subset southleft.com actually ships.
 *
 * The registry that says all of this ALREADY EXISTS and is already read by the
 * parity CLIs, the MCP tools and the second Storybook. This module does not
 * invent a parallel notion of "brand" for the docs site; it reads the same file
 * through the same resolver (`libs/altitude-mcp/src/lib/ds-project.mjs`,
 * `listProjectIds()` / `resolveProject()`), and turns each entry into the four
 * facts a documentation site needs:
 *
 *   identity   — `name`, `shortName`, the copy the shell renders
 *   route      — where the site lives (`''` for the default, `/<id>` otherwise)
 *   scope      — which components it documents (`library.components`, or all)
 *   brand      — the `<al-theme brand>` value its previews render under
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE: adding a third design system is a
 * registry entry and nothing else. No project id is typed anywhere in
 * `apps/docs/src` — `scripts/check-third-project.mjs` runs a synthetic third
 * project through this module and greps the source to prove it.
 *
 * Loaded the same way `parity.mjs` loads the parity engine: by absolute path at
 * runtime, not by a relative ESM import. Astro bundles server modules into
 * `.astro/.prerender/` before running `getStaticPaths`, so a `../../../../libs`
 * specifier is correct in source and wrong at build time (see repo-root.mjs).
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { repoRoot } from './repo-root.mjs';

const REPO_ROOT = repoRoot();

/**
 * Top-level route segments this site already owns. A project id that collided
 * with one would silently shadow a real page (Astro prefers the static route,
 * so the project's site would simply never be emitted). Better to fail loudly
 * at build time than to ship a design system with no pages.
 */
const RESERVED_SEGMENTS = new Set([
  'components',
  'foundations',
  'motion',
  'icons',
  'utilities',
  'maturity',
  'migration',
  'llms.txt',
  'llms-full.txt',
  'llms-tokens.txt',
  'llms-components.txt',
  'llms-a11y.txt',
  'status.json',
  'index.md',
  '_astro',
  'fonts',
  'favicon.svg',
  'sitemap-index.xml',
]);

/* ------------------------------------------------------------- the vendor */

/**
 * The publishing organisation, derived from the workspace root's npm scope
 * (`@southleft/altitude` → `SOUTHLEFT`) rather than typed. It is the same
 * string for every project — a design system's OWNER is not its brand — and
 * deriving it keeps the "no project id typed in this app" rule checkable, since
 * the vendor and one of the project ids happen to be the same word.
 */
const rootPackage = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
const scopeMatch = /^@([^/]+)\//.exec(rootPackage.name ?? '');
export const VENDOR = (scopeMatch?.[1] ?? rootPackage.name ?? 'unknown').toUpperCase();

/* --------------------------------------------------------- the pure mapper */

/**
 * One registry entry → one docs project record. PURE: everything it reads is on
 * the entry it is handed, which is what lets `check-third-project.mjs` feed it
 * a project that does not exist and get a real site description back.
 *
 * @param {object} entry   a `.altitude/ds-projects.json` project (or a resolved one)
 * @param {{ isDefault: boolean }} options
 */
export function docsProject(entry, { isDefault }) {
  const id = entry.id;
  if (!isDefault && RESERVED_SEGMENTS.has(id)) {
    throw new Error(
      `Design-system project "${id}" cannot have a docs site: "${id}" is already a top-level route ` +
        `on this site, so its pages would be shadowed. Rename the project in .altitude/ds-projects.json.`,
    );
  }

  /** `Altitude Design System` → `Altitude`. The long name is the registry's. */
  const shortName = entry.name.replace(/\s+design\s+system$/i, '').trim() || entry.name;
  /**
   * DOCS SCOPE. `null` = document the whole library; an array = document only
   * these tags.
   *
   * It defaults to `library.components` — the subset this system ships — which
   * is what it always was. But the two are NOT the same question, and a project
   * may now say so: `docs.components: "all"` documents the whole shared library
   * while leaving `library.components` to mean what it means everywhere else.
   *
   * That separation is load-bearing rather than cosmetic. `library.components`
   * is read by `libs/altitude-mcp/src/lib/parity.mjs` to build the Figma parity
   * list, by `scripts/check-sl-scope.mjs` to re-derive the allowlist from the
   * consuming site's own source, and by `scripts/check-brand-conformance.mjs`.
   * Widening the docs catalog by emptying that array would have silently
   * widened all three — a parity manifest full of components the brand's Figma
   * file has never contained, and a scope gate that switches itself off. So the
   * docs site reads its own field and those three keep reading theirs.
   */
  const documentsWholeLibrary = entry.docs?.components === 'all';
  const scope = !documentsWholeLibrary && Array.isArray(entry.library?.components) && entry.library.components.length
    ? [...entry.library.components]
    : null;

  /**
   * The BRAND LAYER, if this system declares one — a second component package
   * that belongs to it alone, built on the shared library (`brandLibrary` in
   * the registry). It carries no allowlist: a layer is not shared, so
   * everything in it is in scope. `supersedes` names the base components it is
   * this brand's answer to, so the docs lead with the brand version.
   */
  const brandLayer = entry.brandLibrary
    ? {
        workspace: entry.brandLibrary.workspace,
        root: entry.brandLibrary.root,
        tagPrefix: entry.brandLibrary.tagPrefix ?? '',
        supersedes: entry.brandLibrary.supersedes ?? {},
      }
    : null;

  return {
    id,
    name: entry.name,
    shortName,
    brand: entry.brand,
    isDefault,
    /** '' for the default project, '/<id>' for every other one. */
    routePrefix: isDefault ? '' : `/${id}`,
    scope,
    scoped: scope !== null,
    brandLayer,
    tagPrefix: entry.library?.tagPrefix ?? '',
    libraryWorkspace: entry.library?.workspace ?? '',
    figmaFileName: entry.figma?.fileName ?? null,
    /** tag → why this system deliberately has no Figma set for it. */
    excluded: entry.excluded ?? {},
    storybookProductionBase: entry.storybook?.productionBase ?? null,
    /** `@<vendor>/<library workspace>` — what a consumer installs. */
    npmPackage: `@${VENDOR.toLowerCase()}/${entry.library?.workspace ?? ''}`,
  };
}

/* ------------------------------------------------------------- the loading */

async function loadResolver() {
  const entry = path.join(REPO_ROOT, 'libs', 'altitude-mcp', 'src', 'lib', 'ds-project.mjs');
  return import(pathToFileURL(entry).href);
}

/**
 * Every project in the registry, in registry order, default first.
 *
 * Unlike `parity.mjs`, a failure here is NOT recoverable and is not swallowed:
 * the registry decides which sites exist at all, so a site built without it
 * would be a different site, silently.
 */
const resolver = await loadResolver();
const defaultId = resolver.loadRegistry().default;

export const PROJECTS = resolver
  .listProjectIds()
  .map((id) => docsProject(resolver.resolveProject(id), { isDefault: id === defaultId }))
  .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.id.localeCompare(b.id));

/** The project whose site lives at the site root. */
export const DEFAULT_PROJECT = PROJECTS.find((p) => p.isDefault);

/** Every project except the default — the ones with a `/<id>` prefix. */
export const SCOPED_PROJECTS = PROJECTS.filter((p) => !p.isDefault);

export function findProject(id) {
  return PROJECTS.find((p) => p.id === id);
}

/**
 * `getStaticPaths` for every `src/pages/[project]/…` route. Emits one entry per
 * non-default project, so a registry addition creates a whole site and a
 * registry removal deletes one — with no route file touched either way.
 */
export function projectPaths() {
  return SCOPED_PROJECTS.map((project) => ({ params: { project: project.id }, props: { project } }));
}
