// T3.1 — @custom-elements-manifest/analyzer config.
// Replaces the legacy `wca` (web-component-analyzer) call. Reads TS + JSDoc
// across components/, emits `custom-elements.json` — the source of truth
// for T3.2 schemas, T3.3 AGENTS.md/llms.txt, and T3.4 contract validator.

import altitudeConventions from './cem-plugins/al-conventions.mjs';

export default {
  globs: ['components/**/*.ts'],
  exclude: [
    'components/**/*.stories.ts',
    'components/**/*.spec.ts',
    'components/**/test/**',
    'components/**/*.vite.ts',
    'components/ALElement.ts',
    'components/bundle.ts',
    // Icon data + plumbing. These declare no custom elements, and the 1,512
    // generated glyph modules would add ~2.6 MB to custom-elements.json and
    // 1,512 near-identical files to schemas/. `icon-base.ts` is deliberately
    // NOT excluded so the generated elements still inherit documented
    // `iconTitle`/`size` members.
    'components/icon/phosphor/**',
    'components/icon/glyphs.ts',
    'components/icon/lazy.ts',
    'components/icon/all.ts',
    'components/icon/catalog.ts',
    'components/icon/icon-aliases.ts',
    'components/icon/registry.ts',
    'components/icon/types.ts',
    'components/icon/preload-node.ts',
  ],
  outdir: '.',
  litelement: true,
  dev: false,
  // Altitude conventions: surfaces `static el` as tagName and parses the
  // legacy prose JSDoc for slots/events/csspart/cssproperty.
  plugins: [altitudeConventions()],
};
