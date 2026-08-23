/**
 * Altitude is LAYOUT-FIRST: <al-layout> is the single arrangement primitive.
 * A wrapper that owns no behavior, ARIA relationship, or state is <al-layout>
 * with props — not a new component. See "Arrangement vs. semantics" in AGENTS.md.
 * al-button-group, al-layout-container, al-layout-section, al-bento-grid,
 * al-split-content, al-chip-group and al-toast-group were all REMOVED for this
 * reason; do not scaffold their successors.
 */
const LAYOUT_SUSPECT = /(?:^|-)((?:button|chip|toast|tag|card|avatar|badge|icon|link|item|action)-group|group|container|wrapper|section|grid|stack|row|column|cluster|split|bento)$/;

// Groups that survive do so for semantics (fieldset/legend, roving selection,
// single-select state) — they already exist; never re-scaffold them.
const EXISTING_SEMANTIC_GROUPS = ['checkbox-group', 'radio-group', 'toggle-button-group'];

module.exports = (plop) => {
  // Add uppercase functionality for component boilerplate
  plop.setHelper('upperCase', (txt) => txt.toUpperCase());

  plop.setGenerator('component', {
    description: 'Create a component (layout-first: arrangement belongs to <al-layout>, not new wrappers)',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'What is the component name? Note: Name must be in dash case. (e.g. "component-name")',
        validate: (input) => {
          const name = String(input).trim();
          if (EXISTING_SEMANTIC_GROUPS.includes(name)) {
            return `al-${name} already exists — do not re-scaffold it.`;
          }
          return true;
        }
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
        when: (answers) => LAYOUT_SUSPECT.test(String(answers.name).trim()),
        message:
          'STOP — this name looks like a layout/wrapper component. Altitude is layout-first: ' +
          'arrangement (direction, gap, alignment, wrapping, containers, grids) belongs to <al-layout>, ' +
          'and a wrapper owning no behavior, ARIA relationship, or state must NOT be a component. ' +
          'See "Arrangement vs. semantics" in AGENTS.md. ' +
          'Does this component own real SEMANTICS (fieldset/legend, roving keyboard selection, single-select state, ...)?'
      }
    ],
    actions: (data) => {
      if (LAYOUT_SUSPECT.test(String(data.name).trim()) && data.layoutOverride !== true) {
        throw new Error(
          `Refusing to scaffold "al-${data.name}": use <al-layout> (direction/gap/align/justify/wrap, ` +
            'or variant="constrained" | "grid" | "bento") instead of a new wrapper component. ' +
            'See "Arrangement vs. semantics" in AGENTS.md.'
        );
      }
      return [
        {
          type: 'add',
          path: './../components/{{dashCase name}}/{{dashCase name}}.ts',
          templateFile: 'templates/component/component.ts.hbs'
        },
        {
          type: 'add',
          path: './../components/{{dashCase name}}/{{dashCase name}}.stories.ts',
          templateFile: 'templates/component/component.stories.ts.hbs'
        },
        {
          type: 'add',
          path: './../components/{{dashCase name}}/{{dashCase name}}.scss',
          templateFile: 'templates/component/component.scss.hbs'
        },
        () => {
          const dash = String(data.name).trim().toLowerCase();
          const pascal = dash.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase());
          return [
            'Scaffolded. The rest of the "New component" checklist (AGENTS.md) ships in the SAME PR:',
            `  1. bundle.ts — add \`export { AL${pascal} } from './${dash}/${dash}';\` ALPHABETICALLY in components/bundle.ts`,
            '  2. .altitude/migration.json — new entry, state "scoped-complete", inserted alphabetically',
            '  3. CEM — pnpm --filter al-web-components build:custom-elements.json (after JSDoc is final)',
            '  4. React wrapper — pnpm --filter al-react plop',
            '  REMINDER: arrangement of slotted content = <al-layout>; never add direction/gap/align props here.'
          ].join('\n');
        }
      ];
    }
  });
};
