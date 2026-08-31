/**
 * Altitude is LAYOUT-FIRST: <al-layout> is the single arrangement primitive.
 * React wrappers exist 1:1 for shipped web components — never scaffold a
 * wrapper for a layout/group component that no longer exists in
 * @southleft/al-web-components (ALButtonGroup, ALLayoutContainer, ALLayoutSection,
 * ALBentoGrid, ALSplitContent, ALChipGroup, ALToastGroup were all removed).
 * See "Arrangement vs. semantics" in AGENTS.md.
 */
const LAYOUT_SUSPECT = /(Group|Container|Wrapper|Section|Grid|Stack|Row|Column|Cluster|Split|Bento)$/;

// These groups survive in @southleft/al-web-components (they own semantics) and may
// legitimately get a React wrapper.
const EXISTING_SEMANTIC_GROUPS = ['CheckboxGroup', 'RadioGroup', 'ToggleButtonGroup'];

module.exports = (plop) => {
  plop.setHelper('upperCase', (txt) => txt.toUpperCase());

  plop.setGenerator('component', {
    description: 'Create a React wrapper for an EXISTING @southleft/al-web-components element (layout-first: no new arrangement wrappers)',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'What is the component name? Note: Name must be in pascal case. (e.g. ComponentName)'
      },
      {
        type: 'list',
        name: 'tier',
        message: 'Storybook taxonomy tier (Atoms = standalone primitive, Molecules = composes 2+ atoms, Organisms = page-level region):',
        choices: ['Atoms', 'Molecules', 'Organisms', 'Templates'],
        default: 'Atoms'
      },
      {
        type: 'confirm',
        name: 'layoutOverride',
        default: false,
        when: (answers) =>
          LAYOUT_SUSPECT.test(String(answers.name).trim()) &&
          !EXISTING_SEMANTIC_GROUPS.includes(String(answers.name).trim()),
        message:
          'STOP — this name looks like a layout/wrapper component. Arrangement belongs to <al-layout> ' +
          '(ALLayout on the React side); wrappers owning no behavior/ARIA/state were removed from Altitude. ' +
          'Does the underlying @southleft/al-web-components element actually exist AND own real semantics?'
      }
    ],
    actions: (data) => {
      const name = String(data.name).trim();
      if (
        LAYOUT_SUSPECT.test(name) &&
        !EXISTING_SEMANTIC_GROUPS.includes(name) &&
        data.layoutOverride !== true
      ) {
        throw new Error(
          `Refusing to scaffold "AL${name}": compose <ALLayout> (direction/gap/align/justify/wrap, or ` +
            'variant="constrained" | "grid" | "bento") instead of a new wrapper component. ' +
            'See "Arrangement vs. semantics" in AGENTS.md.'
        );
      }
      return [
        {
          type: 'add',
          path: './../src/components/{{pascalCase name}}/index.tsx',
          // `'use client'` on every emitted module: @southleft/al-react wrappers all call
          // customElements.define at module scope, so they can only run on the
          // client. Without the directive Next.js App Router / RSC cannot import
          // any of them. Keep this in sync with templates/component/Component.tsx.hbs.
          template: `'use client';

export * from './{{pascalCase name}}.js';`
        },
        {
          type: 'add',
          path: './../src/components/{{pascalCase name}}/{{pascalCase name}}.tsx',
          templateFile: 'templates/component/Component.tsx.hbs'
        },
        {
          type: 'append',
          path: './../src/index.ts',
          template: "export * from './components/{{pascalCase name}}/index.js';"
        },
        () => {
          const pascal = String(data.name).trim();
          // PascalCase -> al-dash-case, same algorithm the WC side's contract note uses in
          // reverse (dash -> Pascal) — see libs/al-web-components/plop/plop-config.js.
          const dash = pascal.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
          const tag = `al-${dash}`;
          return [
            `Scaffolded AL${pascal} wrapping <${tag}>.`,
            '',
            'Contract (T15/T16, spec 2026-08-25-contract-backed-figma-parity-and-generation) — this',
            'wrapper does NOT mint a second contract. Contracts are keyed by the underlying WEB',
            `COMPONENT tag, one per project: .altitude/contracts/<project-id>/${tag}.contract.json.`,
            `Confirm it already exists — it should have been seeded on the @southleft/al-web-components`,
            'side (that plop generator prints its own contract step; scripts/component-check.mjs',
            `warns if it is missing). If it genuinely does not exist yet:`,
            `  node scripts/contracts/emit-contracts.mjs --seed --component ${tag} [--project <ds-project-id>]`,
            '`pnpm run gate:contracts` (CI) fails a parity-tracked tag with no contract, or one that',
            'drifts from the CEM — never from this wrapper.'
          ].join('\n');
        }
      ];
    }
  });

  /*
   * The `recipe` and `page` generators were removed with Storybook (2026-08-25).
   * Every action they had wrote into `./../.storybook/{recipe,page}/…`, so with
   * that directory gone they could only scaffold files into nothing. The
   * `component` generator's `.stories.tsx` action went for the same reason: the
   * React stories were deleted because nothing outside the React Storybook ever
   * read them.
   *
   * Their templates are still on disk under `plop/templates/{recipe,page}/` and
   * in git history — restoring a generator is a paste, not a rewrite, if a React
   * documentation surface ever comes back.
   */
};
