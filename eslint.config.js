// T2.3.c — ESLint 9 flat config. Replaces all per-workspace .eslintrc shapes.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import litA11y from 'eslint-plugin-lit-a11y';

export default [
  {
    ignores: [
      '**/dist/**',
      '**/dist-vite/**',
      '**/dist-v5/**',
      '**/dist-vite-spike/**',
      '**/node_modules/**',
      '**/storybook-static/**',
      '**/test-results/**',
      '**/playwright-report/**',
      '**/.storybook/preview-bundle*',
      '**/coverage/**',
      'libs/al-web-components/styles/tokens-dtcg/**',
      'libs/al-web-components/styles/dist/**',
      'libs/al-web-components/custom-elements.json',
      'libs/al-web-components/schemas/**',
      'apps/angular/.angular/**',
      // `astro sync` / `astro build` generate `.astro/*.d.ts` (gitignored at
      // .gitignore:59). Two of its emitted rules trip typescript-eslint, so
      // `pnpm lint` failed on any machine that had built the Astro app while
      // passing on a fresh CI clone. Same class as `.angular/` above.
      '**/.astro/**',
      'apps/**/build/**',
      'apps/**/dist/**',
      'apps/**/.svelte-kit/**',
      'storybook/**',
      'storybook-static/**',
      '**/*.min.js',
      '**/*.LICENSE.txt',
      'docs/**',
      // Figma sync exports. Machine-generated payloads pulled out of the Figma
      // plugin API (atoms-bundle.js alone is ~22k lines) plus the scratch
      // `tmp/patch*.mjs` one-shot scripts the sync loop writes. Only
      // `parity-manifest.json` from this tree is durable state; none of it is
      // hand-authored source, and linting it produced 8 errors + 293 warnings.
      '.altitude/figma-sync/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, ...globals.es2022 },
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    rules: {
      // Lit decorators rely on accessor + experimentalDecorators — many of
      // these would be noisy until a future refactor decides on stage-3
      // decorators (plan T7.1).
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'off', // TypeScript handles this; flat-config emits false positives on globals
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-empty': 'off',
      // Legacy v1 codebase has accumulated style debt. Downgrade these to
      // warnings so the flat-config lint job passes; v2.x cleanup can flip
      // them to errors per slice.
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      'no-self-assign': 'warn',
      'no-useless-escape': 'warn',
      'prefer-const': 'warn',
      'no-prototype-builtins': 'warn',
      'no-cond-assign': 'warn',
      'no-empty-pattern': 'warn',
      'no-irregular-whitespace': 'warn',
      'no-fallthrough': 'warn',
      'no-async-promise-executor': 'warn',
      'no-control-regex': 'warn',
      'no-unsafe-finally': 'warn',
      'prefer-spread': 'warn',
    },
  },
  /**
   * ACCESSIBILITY LINTING FOR THE LIT TEMPLATES.
   *
   * `eslint-plugin-lit-a11y` reads the `html` tagged templates the components
   * render, so it catches the class of defect the axe suite cannot: axe runs on
   * a rendered STORY, and a branch no story exercises is never measured. This
   * runs on the source.
   *
   * Every rule is `error` by default so a clean rule can never quietly regress.
   * The exceptions below are each a measured decision, not a convenience — the
   * counts come from a full run over both component libraries.
   *
   * Stories and tests are excluded: they are demo fixtures, and their emoji and
   * placeholder alt text are illustrative rather than shipped.
   */
  {
    files: ['libs/al-web-components/components/**/*.ts', 'libs/sl-web-components/components/**/*.ts'],
    ignores: ['**/*.stories.ts', '**/*.test.ts', '**/*.spec.ts'],
    plugins: { 'lit-a11y': litA11y },
    rules: {
      ...Object.fromEntries(Object.keys(litA11y.rules).map((rule) => [`lit-a11y/${rule}`, 'error'])),

      /*
       * OFF — a shadow-DOM blind spot, not a defect. The rule requires a `<ul>`
       * to contain only `<li>`; these contain a `<slot>`, and the CONSUMER
       * slots the list items in. The linter cannot see through a slot, so it
       * reports every slotted list in the library. 6 hits, all false.
       */
      'lit-a11y/list': 'off',

      /*
       * OFF — deliberate, and load-bearing. `role="list"` on a `<ul>`/`<ol>` is
       * redundant per spec, but WebKit strips list semantics from any list
       * styled `list-style: none`, which every one of these is (verified in
       * list, breadcrumbs, menu, pagination and stepper .scss). Restating the
       * role is the standard workaround; removing it would cost VoiceOver users
       * the list announcement. 7 hits, all intentional.
       */
      'lit-a11y/no-redundant-role': 'off',

      /*
       * OFF — public API, not a page stealing focus. Both hits are
       * `.autofocus=${this.isFocused}`, a property binding driven by the
       * component's own documented prop, so the consumer opts in per instance.
       * The rule targets a hardcoded `autofocus` attribute, which neither is.
       */
      'lit-a11y/no-autofocus': 'off',

      /*
       * WARN, NOT OFF — these are real and unfixed, held at warn only so the
       * gate can land today. `scripts/check-lit-a11y-ratchet.mjs` pins the
       * count so they cannot grow, and each is a task in the
       * accessibility-remediation spec. Promote to `error` as each reaches zero.
       *
       *   click-events-have-key-events (8) — several are backdrop click-to-close
       *     on dialog/drawer/popover, which need confirming against their Escape
       *     handling before being called defects; list-item and menu-item look real.
       *   accessible-name (4) — a dialog and a combobox with no accessible name.
       *     These are straightforwardly real.
       *   mouse-events-have-key-events (1) — toast's `@mouseover` pause with no
       *     `@focus`, so a keyboard user cannot pause the timer.
       */
      'lit-a11y/click-events-have-key-events': 'warn',
      'lit-a11y/accessible-name': 'warn',
      'lit-a11y/mouse-events-have-key-events': 'warn',
    },
  },
  {
    files: ['**/*.cjs', 'scripts/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
