// Foundations/Utilities — the React Storybook's copy of the page.
//
// WHY THIS FILE EXISTS AT ALL
// The documentation ELEMENTS are shared: `<utilities-grid>`, `<utilities-spacing>`
// and `<utilities-typography>` are the very same Lit custom elements the
// web-components Storybook renders, imported below from al-web-components
// source. Only the CSF wrapper is re-authored, and it has to be:
//
//   * a Storybook has exactly ONE renderer, and this one is
//     `@storybook/react-vite`;
//   * the web-components CSF returns a lit-html `TemplateResult`, which is a
//     plain `{_$litType$, strings, values}` object — React throws
//     "Objects are not valid as a React child" on it.
//
// So the element definitions are shared (no drift in what is documented) and
// only the ~3-line-per-story render shim is duplicated. Custom elements are
// first-class in React 19: an unknown lowercase-hyphenated tag is passed
// straight through to `document.createElement`, and string attributes are set
// as attributes.
//
// Keep the `title` byte-identical to
// `al-web-components/.storybook/components/utilities/utilities.stories.ts` so
// the page sits at the same place in both sidebars.

import type { Meta, StoryObj } from '@storybook/react-vite';

// Side-effect imports: each module calls `customElements.define`.
import '../../../al-web-components/.storybook/components/utilities/utilities-grid';
import '../../../al-web-components/.storybook/components/utilities/utilities-spacing';
import '../../../al-web-components/.storybook/components/utilities/utilities-typography';

const meta: Meta = {
  title: 'Foundations/Utilities',
  parameters: {
    // These pages are long, full-bleed reference tables — the same treatment
    // the web-components Storybook gives them.
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj;

export const Grid: Story = { render: () => <utilities-grid /> };
export const Spacing: Story = { render: () => <utilities-spacing /> };
export const Typography: Story = { render: () => <utilities-typography /> };
