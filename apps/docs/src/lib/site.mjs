/**
 * Site constants. Deliberately holds no component data — anything
 * component-shaped comes from `registry.mjs`, which generates it from the CEM.
 */
export const SITE = {
  name: 'Altitude',
  title: 'Altitude — Design System',
  description:
    'The Altitude design system: production web components, three tiers of design tokens, light and dark themes. Built on Lit with React wrappers by Southleft.',
  url: 'https://altitude.pages.dev',
  zeroheight: 'https://zeroheight.com/809ab055e',
  eyebrow: 'DESIGN SYSTEM — V2.0',
  footprint: 'V2.0 · LIT 3.3 · REACT 19 · SOUTHLEFT',
  npmPackage: '@southleft/al-web-components',
};

/** `/docs` in this app's config — normalized to a no-trailing-slash prefix. */
export const base = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Build an in-site href under the configured base. */
export const href = (path) => `${base}${path.startsWith('/') ? path : `/${path}`}`;
