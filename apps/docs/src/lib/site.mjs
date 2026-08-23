/**
 * Site constants, and the per-project copy derived from them.
 *
 * Deliberately holds no component data — anything component-shaped comes from
 * `registry.mjs`, which generates it from the CEM. And, since this site now
 * serves one documentation site per design-system project, it holds no project
 * IDENTITY either: names, descriptions, links and install lines are computed
 * from a project record (`projects.mjs`, itself read from
 * `.altitude/ds-projects.json`) rather than typed per brand.
 */
import { VENDOR } from './projects.mjs';

/** True of every site this app builds, whatever design system it documents. */
export const SITE = {
  url: 'https://altitude.pages.dev',
  eyebrow: 'DESIGN SYSTEM — V2.0',
  runtime: 'V2.0 · LIT 3.3 · REACT 19',
  vendor: VENDOR,
  storybook: '/storybook/web-components',
};

/**
 * `/docs` in this app's config — normalized to a no-trailing-slash prefix.
 *
 * The optional chain is for the gate scripts: they import this module under
 * plain Node, where Vite's `import.meta.env` does not exist. The fallback is
 * `astro.config.mjs`'s `base`, read at build time by Astro itself and only ever
 * used outside it.
 */
export const base = (import.meta.env?.BASE_URL ?? '/docs').replace(/\/$/, '');

/**
 * One project's site copy. Every field is derived from the registry entry, so a
 * new design system gets a complete, correct site with no string written here.
 *
 * `counts` is the scoped registry's report (`buildRegistry(project.scope)`),
 * passed in rather than imported so this module stays free of component data.
 */
export function siteFor(project, counts) {
  const scopeLine = project.scoped
    ? `the ${counts.count} components ${project.shortName} ships`
    : `${counts.count} production web components`;

  return {
    /** Short name — what the tab title and the sidebar aria-label use. */
    name: project.shortName,
    /** The registry's full name — the topbar and page titles. */
    fullName: project.name,
    title: `${project.name}`,
    description:
      `${project.name}: ${scopeLine}, three tiers of design tokens, light and dark themes. ` +
      `Built on Lit with React wrappers by ${VENDOR.charAt(0)}${VENDOR.slice(1).toLowerCase()}.`,
    eyebrow: SITE.eyebrow,
    footprint: `${SITE.runtime} · ${VENDOR}`,
    npmPackage: project.npmPackage,
    /** Absolute URL of this project's site — used by llms.txt and status.json. */
    url: `${SITE.url}${base}${project.routePrefix}`,
  };
}

/**
 * Build an in-site href for one project: the configured base, then that
 * project's route prefix (empty for the default project), then the path.
 */
export function hrefFor(project) {
  return (path) => `${base}${project.routePrefix}${path.startsWith('/') ? path : `/${path}`}`;
}
