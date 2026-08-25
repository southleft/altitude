import { html } from 'lit';
import { spread } from '../../directives/spread';
import './theme-switcher';

export default {
  title: 'Molecules/Theme Switcher',
  component: 'al-theme-switcher',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onThemeSwitcherChange']
    },
    layout: 'centered',
    // Opt out of the toolbar preset decorator (`.storybook/with-preset.ts`).
    // This component IS a theme switcher: with the decorator active it would
    // find the decorator's `<al-theme>` ancestor and take its scoped path
    // (`theme-switcher.ts:108-113`), and its own `style#al-tokens-sheet` would
    // land before the decorator's always-last `style#al-preset-tokens` — so
    // clicking its menu would look broken in its own story. Opting out drops
    // both halves and leaves the component behaving exactly as it does with no
    // toolbar at all. Use the toolbar preset on any other story.
    alPreset: { disable: true }
  },
};

const Template = (args) => html`<al-theme-switcher ${spread(args)} data-testid="theme-switcher">Hello world</al-theme-switcher>`;

export const Default = Template.bind({});
Default.args = {};