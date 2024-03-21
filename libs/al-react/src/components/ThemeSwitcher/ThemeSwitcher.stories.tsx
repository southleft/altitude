import type { StoryObj } from '@storybook/react-webpack5';
import { ALThemeSwitcher } from '../..';

export default {
  title: 'Molecules/Theme Switcher',
  component: ALThemeSwitcher,
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onThemeSwitcherChange']
    },
    layout: 'centered'
  },
};

export const Default: StoryObj<typeof ALThemeSwitcher> = { args: {} };
