// T3.1 — @custom-elements-manifest/analyzer config.
// Replaces the legacy `wca` (web-component-analyzer) call. Reads TS + JSDoc
// across components/, emits `custom-elements.json` — the source of truth
// for T3.2 schemas, T3.3 AGENTS.md/llms.txt, and T3.4 contract validator.

export default {
  globs: ['components/**/*.ts'],
  exclude: [
    'components/**/*.stories.ts',
    'components/**/*.spec.ts',
    'components/**/test/**',
    'components/ALElement.ts',
    'components/bundle.ts',
  ],
  outdir: '.',
  litelement: true,
  // Plain dev console output only on demand (silent by default).
  dev: false,
  // Decorator semantics — same as the rest of the build (G7).
};
