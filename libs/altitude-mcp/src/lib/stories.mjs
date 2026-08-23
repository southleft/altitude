// Derives a component's Storybook doc URL from its `.stories.ts` `title:`
// field, using Storybook's own id-sanitization algorithm (lowercase, sanitize
// each `/`-separated segment, join with `-`, append `--docs` for the
// autodocs page). Every @southleft/al-web-components story carries the `autodocs` tag
// (verified against storybook-static/index.json), so `--docs` always exists.
//
// We parse the `.stories.ts` source directly rather than depending on a
// built storybook-static/index.json, because the story files are tracked in
// git and always present; the built index is a local build artifact that
// may not exist in a fresh clone.

import { readFileSync, existsSync } from 'node:fs';
import { WC_ROOT } from './paths.mjs';
import { resolveProject } from './ds-project.mjs';

// The deployed Storybook base is PER DESIGN-SYSTEM PROJECT (Altitude and
// Southleft publish to different paths), so it is read from
// `.altitude/ds-projects.json` rather than hardcoded here. Callers that pass no
// project get the registry default.
const resolveFor = (project) =>
  project && typeof project === 'object' && (project.storybook || project.docs)
    ? project
    : resolveProject(typeof project === 'string' ? project : null);

/**
 * Where a component's documentation lives for this project.
 *
 * DOCS FIRST, Storybook second. Southleft's Storybook was retired on
 * 2026-08-23 — the multi-brand docs site serves it at /docs/southleft/ from the
 * same CEM — so `storybook` is now genuinely absent for that project and
 * reading `.storybook.productionBase` unguarded threw. Altitude still has both,
 * and prefers docs because that is the surface being kept.
 *
 * Returns null when a project has neither, so callers omit the URL rather than
 * emitting a broken one.
 */
const docsBaseFor = (project) => {
  const p = resolveFor(project);
  if (p.docs?.productionBase) return { base: p.docs.productionBase, kind: 'docs' };
  if (p.storybook?.productionBase) return { base: p.storybook.productionBase, kind: 'storybook' };
  return null;
};

/** Storybook's `sanitize()` — mirrors @storybook/csf's toId() algorithm. */
function sanitize(part) {
  return part
    .toLowerCase()
    .replace(/[ ’–—]/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/** "Atoms/Accordion Panel" -> "atoms-accordion-panel" */
function titleToKindId(title) {
  return title
    .split('/')
    .map(sanitize)
    .filter(Boolean)
    .join('-');
}

/** `components/button/button.ts` -> `components/button/button.stories.ts` (absolute). */
function storiesPathFor(modulePath, libraryRoot = WC_ROOT) {
  const storiesRelative = modulePath.replace(/\.ts$/, '.stories.ts');
  return `${libraryRoot}/${storiesRelative}`.replace(/\\/g, '/');
}

/**
 * @param {string} modulePath CEM module path, e.g. "components/button/button.ts"
 * @param {object|string} [project] resolved DS project, id, or omit for default —
 *        selects which deployed Storybook `docsUrl` points at.
 * @returns {{title:string, storyId:string, docsUrl:string, storiesFile:string}|null}
 */
export function getStoryInfo(modulePath, project) {
  const resolved = project && typeof project === 'object' && project.resolved ? project : null;
  const storiesFile = storiesPathFor(modulePath, resolved?.resolved?.libraryRoot ?? WC_ROOT);
  if (!existsSync(storiesFile)) return null;
  const src = readFileSync(storiesFile, 'utf8');
  const m = /title:\s*['"]([^'"]+)['"]/.exec(src);
  if (!m) return null;
  const title = m[1];
  const kindId = titleToKindId(title);
  const storyId = `${kindId}--docs`;
  return {
    title,
    storyId,
    // A docs-site URL is a plain path; a Storybook URL needs its ?path= query.
    // The docs slug is the component DIRECTORY from the CEM module path
    // ("components/button/button.ts" -> "button"), which is exactly the route
    // apps/docs generates (src/lib/registry.mjs keeps only elements declared by
    // components/<dir>/<dir>.ts, so the directory IS the slug).
    docsUrl: (() => {
      const d = docsBaseFor(project);
      if (!d) return null;
      if (d.kind === 'storybook') return `${d.base}/?path=/docs/${storyId}`;
      const slug = modulePath.split('/').filter(Boolean).at(-2);
      return slug ? `${d.base}/components/${slug}` : null;
    })(),
    storiesFile,
  };
}
