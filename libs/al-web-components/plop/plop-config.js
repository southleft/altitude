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
const EXISTING_SEMANTIC_GROUPS = ['checkbox-group', 'radio-group'];

/**
 * WHERE A COMPONENT CAN BE SCAFFOLDED.
 *
 * The base library, or any BRAND LAYER a design system declares
 * (`brandLibrary` in `.altitude/ds-projects.json`) — read from the registry so
 * a new layer becomes a choice here without editing this file.
 *
 * EVERY TARGET SCAFFOLDS `al-` TAGS, and that is the point. A brand layer is a
 * different PACKAGE, not a different namespace: an app authored against
 * Altitude plus a brand layer writes `<al-layout><al-hero>`, never two
 * prefixes in one document. The templates hardcode `al-{{dashCase name}}`,
 * so this cannot drift by accident — the only way to reintroduce a second
 * namespace is to edit a template on purpose.
 */
function scaffoldTargets() {
  const fs = require('fs');
  const path = require('path');
  const repoRoot = path.resolve(__dirname, '..', '..', '..');
  const targets = [
    { name: 'Altitude base library (@southleft/al-web-components)', value: 'libs/al-web-components' },
  ];
  try {
    const registry = JSON.parse(
      fs.readFileSync(path.join(repoRoot, '.altitude', 'ds-projects.json'), 'utf8'),
    );
    for (const project of Object.values(registry.projects ?? {})) {
      const layer = project.brandLibrary;
      if (!layer?.root) continue;
      if (targets.some((t) => t.value === layer.root)) continue;
      targets.push({ name: `${project.name} brand layer (${layer.workspace})`, value: layer.root });
    }
  } catch {
    /* registry unreadable — the base library is always a valid target. */
  }
  return targets;
}

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
        name: 'target',
        message: 'Which package does this component belong to?',
        choices: scaffoldTargets(),
        default: 'libs/al-web-components',
        // Asked only when there is a real choice to make.
        when: () => scaffoldTargets().length > 1
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
      // Repo-root-relative and resolved from this config's own location, so a
      // brand layer scaffolds into its own package instead of into Altitude.
      const nodePath = require('path');
      const target = data.target || 'libs/al-web-components';
      const isBrandLayer = target !== 'libs/al-web-components';
      const into = (file) =>
        nodePath.resolve(__dirname, '..', '..', '..', target, 'components', '{{dashCase name}}', file);

      return [
        {
          type: 'add',
          path: into('{{dashCase name}}.ts'),
          templateFile: 'templates/component/component.ts.hbs'
        },
        {
          type: 'add',
          path: into('{{dashCase name}}.stories.ts'),
          templateFile: 'templates/component/component.stories.ts.hbs'
        },
        {
          type: 'add',
          path: into('{{dashCase name}}.scss'),
          templateFile: 'templates/component/component.scss.hbs'
        },
        () => {
          const dash = String(data.name).trim().toLowerCase();
          const pascal = dash.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase());
          if (isBrandLayer) {
            return [
              `Scaffolded al-${dash} into ${target} — a BRAND LAYER.`,
              '',
              'It is `al-`, not a brand prefix, and that is deliberate: a layer is a separate',
              'PACKAGE, not a separate namespace. A page composes <al-layout> and this',
              'component without ever mixing two prefixes.',
              '',
              'The rest of the checklist ships in the SAME PR:',
              `  1. bundle.ts — add the export for AL${pascal} ALPHABETICALLY`,
              '  2. CEM — pnpm --filter <this package> build:custom-elements.json (JSDoc final first)',
              '  3. If it OVERRIDES a base component (takes a tag Altitude already ships):',
              '       - declare it in brandLibrary.supersedes in .altitude/ds-projects.json',
              '       - do NOT import the base module, and do NOT render the base element inside',
              '         this one. Same tag means infinite recursion, and whichever module is',
              '         imported first wins customElements.define permanently.',
              '       - omit the HTMLElementTagNameMap block: the base library already declares',
              '         that key, and two types for one tag is a TS2717 build error.',
              '  4. Contract (T15/T16, spec 2026-08-25-contract-backed-figma-parity-and-generation) —',
              '       once the CEM above is regenerated AND this tag has a parity-manifest entry',
              '       (`pnpm run parity:seed:sl` or the registry\'s project id for this layer), seed it:',
              `         node scripts/contracts/emit-contracts.mjs --seed --component al-${dash} --project <ds-project-id>`,
              '       Cannot run automatically here — the CEM does not exist yet at scaffold time.',
              '       `pnpm run gate:contracts` (CI) fails a parity-tracked component with no contract,',
              '       or one that drifts from the CEM.',
              '  REMINDER: arrangement of slotted content = <al-layout>; never add direction/gap/align props here.'
            ].join('\n');
          }
          return [
            'Scaffolded. The rest of the "New component" checklist (AGENTS.md) ships in the SAME PR:',
            `  1. bundle.ts — add \`export { AL${pascal} } from './${dash}/${dash}';\` ALPHABETICALLY in components/bundle.ts`,
            '  2. .altitude/migration.json — new entry, state "scoped-complete", inserted alphabetically',
            '  3. CEM — pnpm --filter @southleft/al-web-components build:custom-elements.json (after JSDoc is final)',
            '  4. React wrapper — pnpm --filter @southleft/al-react plop',
            '  5. Contract (T15/T16, spec 2026-08-25-contract-backed-figma-parity-and-generation) —',
            '       once the CEM above is regenerated AND this tag has a parity-manifest entry',
            '       (`pnpm run parity:seed`), seed its contract:',
            `         node scripts/contracts/emit-contracts.mjs --seed --component al-${dash}`,
            '       Cannot run automatically here — the CEM does not exist yet at scaffold time.',
            '       `pnpm run gate:contracts` (CI) fails a parity-tracked component with no contract,',
            '       or one that drifts from the CEM.',
            '  REMINDER: arrangement of slotted content = <al-layout>; never add direction/gap/align props here.'
          ].join('\n');
        }
      ];
    }
  });
};
