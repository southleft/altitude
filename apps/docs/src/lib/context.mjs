/**
 * ONE design system's whole context, assembled once.
 *
 * Every page, endpoint and gate in this app needs the same four things
 * together: which project it is rendering, that project's scoped view of the
 * component registry, its site copy, and its href builder. Assembling them in
 * one place is what keeps the four consistent — a page cannot render Southleft's
 * component list under Altitude's title, because it never holds one without the
 * other.
 *
 * `contextFor(project)` is memoised per project id: the scoped registry is a
 * filter over records the CEM already produced, but every route file asks for
 * it and there is no reason to redo the work 21 times.
 */
import { buildRegistry } from './registry.mjs';
import { siteFor, hrefFor } from './site.mjs';
import { PROJECTS, DEFAULT_PROJECT } from './projects.mjs';

const cache = new Map();

export function contextFor(project) {
  const cached = cache.get(project.id);
  if (cached) return cached;

  const registry = buildRegistry(project.scope, project.brandLayer);
  const context = {
    project,
    registry,
    site: siteFor(project, registry),
    href: hrefFor(project),
  };
  cache.set(project.id, context);
  return context;
}

/** Every project's context, default first — what the gates iterate. */
export const CONTEXTS = PROJECTS.map(contextFor);

/** The context of the site at the root. */
export const DEFAULT_CONTEXT = contextFor(DEFAULT_PROJECT);
