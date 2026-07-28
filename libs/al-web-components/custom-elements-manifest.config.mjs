// T3.1 — @custom-elements-manifest/analyzer config.
// Replaces the legacy `wca` (web-component-analyzer) call. Reads TS + JSDoc
// across components/, emits `custom-elements.json` — the source of truth
// for T3.2 schemas, T3.3 AGENTS.md/llms.txt, and T3.4 contract validator.

import altitudeConventions from './cem-plugins/al-conventions.mjs';
import altitudeDeterministic from './cem-plugins/al-deterministic.mjs';

export default {
  globs: ['components/**/*.ts'],
  exclude: [
    'components/**/*.stories.ts',
    'components/**/*.spec.ts',
    'components/**/test/**',
    'components/**/*.vite.ts',
    'components/ALElement.ts',
    'components/bundle.ts',
  ],
  outdir: '.',
  litelement: true,
  dev: false,
  // Altitude conventions: surfaces `static el` as tagName and parses the
  // legacy prose JSDoc for slots/events/csspart/cssproperty.
  //
  // `altitudeDeterministic` MUST stay last: its `packageLinkPhase` is the
  // final pass over the assembled manifest (strips CR out of every string,
  // stable-sorts modules by path) so the emitted JSON is byte-identical on
  // Windows and Linux. Removing it reintroduces the ~97-file CRLF churn and
  // the random module permutation.
  plugins: [altitudeConventions(), altitudeDeterministic()],
};
