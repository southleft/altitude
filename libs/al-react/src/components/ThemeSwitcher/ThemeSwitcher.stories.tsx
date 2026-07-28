import type { StoryObj } from '@storybook/react-vite';
import { ALThemeSwitcher } from '../..';

export default {
  title: 'Molecules/Theme Switcher',
  component: ALThemeSwitcher,
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onThemeSwitcherChange']
    },
    layout: 'centered',
    // Opt out of the global preset wrapper, matching the web-components side.
    // `<al-theme-switcher>` walks up for an `<al-theme>` ancestor and takes the
    // scoped path when it finds one, so inside the decorator's wrapper its own
    // fallback is unreachable and the component demonstrates half of what it
    // documents. (Here it would not find one anyway — the walk is hardcoded to
    // the plain `al-theme` tag and al-react registers `al-theme-1-0-0`.)
    alPreset: { disable: true }
  },
};

export const Default: StoryObj<typeof ALThemeSwitcher> = { args: {} };
