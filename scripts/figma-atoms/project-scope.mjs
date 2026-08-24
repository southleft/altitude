/**
 * project-scope.mjs — make the figma-atoms pipeline multi-project.
 *
 * Everything under scripts/figma-atoms/ was written when Altitude was the only
 * Figma-backed design system in this repo. The multi-project refactor reached
 * scripts/figma-parity/ and libs/altitude-mcp/ but stopped at the door of this
 * folder, so every path, roster and node id here was an Altitude literal.
 *
 * This module is the single seam. It resolves the active project from
 * `--project <id>` / `DS_PROJECT` (via ds-project.mjs, which already owns that
 * precedence) and hands back the four things the pipeline actually varies on:
 *
 *   dirs      — where measurement output and ops files belong
 *   roster    — which PLAN entries this project builds
 *   libRoots  — which package dist/ trees the harness may serve
 *   brandCss  — which token bundle the harness must load, or the pixels are
 *               another brand's
 *
 * WHY a filter and not a per-project plan.mjs: the roster is already declared
 * once, in `.altitude/ds-projects.json` `library.components`, and is
 * independently re-derivable from the site source by scripts/check-sl-scope.mjs.
 * A second copy here would be a second thing to keep in step.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveProject } from '../../libs/altitude-mcp/src/lib/ds-project.mjs';

/** Resolve the project honouring `--project <id>`, then `DS_PROJECT`, then the registry default. */
export function scope(explicitId = null) {
  const project = resolveProject(explicitId);

  const libRoots = [project.resolved.libraryRoot];
  // The brand layer ships its own package (@southleft/sl-web-components) whose
  // components publish al-* tags on top of the shared library. The harness has
  // to be able to serve its dist/ too or those nine components cannot render.
  if (project.resolved.brandLibrary) libRoots.push(project.resolved.brandLibrary.root);

  return {
    id: project.id,
    project,
    fileKey: project.figma.fileKey,
    fileName: project.figma.fileName,
    brand: project.brand,
    dirs: {
      sync: project.resolved.figmaSyncDir,
      ops: project.resolved.opsDir,
      parityManifest: project.resolved.parityManifest,
    },
    libRoots,
    brandLibrary: project.resolved.brandLibrary,
    // null when the project has no pinned Figma node ids yet. Node ids are
    // FILE-scoped: handing Altitude's map to another file makes build-page.mjs
    // resolve ids that either miss or, worse, hit an unrelated node.
    instanceMapPath: project.resolved.instanceMap,
    /** Tags this project documents in Figma, or null for "everything in PLAN". */
    roster: rosterFor(project),
    excluded: new Set(Object.keys(project.excluded || {})),
  };
}

function rosterFor(project) {
  const base = project.library?.components;
  // Altitude declares no `components` list — it documents the whole library, so
  // an absent list means "no filter", not "nothing".
  if (!Array.isArray(base)) return null;
  const tags = new Set(base);
  // Brand-layer tags are part of the roster too, and `supersedes` is NOT the list of
  // them — it names only the three tags the brand REPLACES (card/header/footer). The
  // six brand-ONLY sections (hero, cta-band, marquee, logo-wall, page-hero,
  // section-header) appear in neither list, so reading supersedes alone silently drops
  // exactly the components that make the site look like Southleft. The CEM is the
  // roster; parity.mjs computeParity() reads the same file.
  const brand = project.resolved?.brandLibrary ?? project.brandLibrary;
  if (brand) {
    for (const [from, to] of Object.entries(brand.supersedes || {})) { tags.add(from); tags.add(to); }
    const cem = brand.cem ?? (brand.root ? join(brand.root, 'custom-elements.json') : null);
    if (cem && existsSync(cem)) {
      const j = JSON.parse(readFileSync(cem, 'utf8'));
      for (const m of j.modules || []) for (const d of m.declarations || []) if (d.tagName) tags.add(d.tagName);
    }
  }
  return tags;
}

/**
 * Filter a PLAN down to the project's roster.
 *
 * Without this a southleft run measures all 49 Altitude entries and writes them
 * into southleft's ops dir — silently, because every downstream step is happy to
 * process whatever it is given.
 */
export function scopePlan(PLAN, sc) {
  // A brand-layer entry is only buildable by the project that ships that brand.
  // Altitude has no roster filter (it documents everything), so without this check
  // it would happily pick up Southleft's nine page sections.
  const brandOk = (e) => !e.brandOnly || (sc.brandLibrary && sc.roster && sc.roster.has(e.tag));
  if (!sc.roster) return PLAN.filter((e) => !e.skip && brandOk(e));
  return PLAN.filter((e) => !e.skip && brandOk(e) && sc.roster.has(e.tag) && !sc.excluded.has(e.tag));
}

/**
 * Resolve the token bundle the harness must load for a mode.
 *
 * main.css bakes DARK into :root. Altitude's light is the theme override bundle;
 * a branded project needs its own brand bundle instead, which Style Dictionary
 * emits as a COMPLETE :root set (not a delta) per brand x mode.
 */
export function brandCssHref(sc, mode, libraryRoot) {
  const rel = `css/css/brand/tokens-${sc.brand}-${mode}.css`;
  if (sc.brand && existsSync(join(libraryRoot, 'dist', rel))) return '/' + rel;
  return mode === 'light' ? '/css/css/theme/tokens-light.css' : null;
}

/** Read `--project <id>` without pulling an arg parser in. */
export function projectArg(argv = process.argv) {
  const i = argv.indexOf('--project');
  return i > -1 ? argv[i + 1] : null;
}
