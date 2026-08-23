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

export * from './{{pascalCase name}}';`
        },
        {
          type: 'add',
          path: './../src/components/{{pascalCase name}}/{{pascalCase name}}.tsx',
          templateFile: 'templates/component/Component.tsx.hbs'
        },
        {
          type: 'add',
          path: './../src/components/{{pascalCase name}}/{{pascalCase name}}.stories.tsx',
          templateFile: 'templates/component/Component.stories.tsx.hbs'
        },
        {
          type: 'append',
          path: './../src/index.ts',
          template: "export * from './components/{{pascalCase name}}';"
        }
      ];
    }
  });

  plop.setGenerator('recipe', {
    description: 'Create a recipe',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'What is the recipe name? Note: Name must be in pascal case. (e.g. RecipeName)'
      }
    ],
    actions: [
      {
        type: 'add',
        path: './../.storybook/recipe/{{pascalCase name}}/{{pascalCase name}}.tsx',
        templateFile: 'templates/recipe/Recipe.tsx.hbs'
      },
      {
        type: 'add',
        path: './../.storybook/recipe/{{pascalCase name}}/{{pascalCase name}}.stories.tsx',
        templateFile: 'templates/recipe/Recipe.stories.tsx.hbs'
      },
      {
        type: 'add',
        path: './../.storybook/recipe/{{pascalCase name}}/{{pascalCase name}}.scss',
        templateFile: 'templates/recipe/Recipe.scss.hbs'
      }
    ]
  });

  plop.setGenerator('page', {
    description: 'Create a page (compose sections with <ALLayout>, not bespoke flex/grid wrappers)',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'What is the page name? Note: Name must be in pascal case. (e.g. PageName)'
      }
    ],
    actions: [
      {
        type: 'add',
        path: './../.storybook/page/{{pascalCase name}}/{{pascalCase name}}.tsx',
        templateFile: 'templates/page/Page.tsx.hbs'
      },
      {
        type: 'add',
        path: './../.storybook/page/{{pascalCase name}}/{{pascalCase name}}.stories.tsx',
        templateFile: 'templates/page/Page.stories.tsx.hbs'
      }
    ]
  });
};
