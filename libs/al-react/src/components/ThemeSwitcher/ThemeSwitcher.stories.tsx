import type { StoryObj } from '@storybook/react-webpack5';
import { ALThemeSwitcher } from '../..';

export default {
  title: 'Atoms/ThemeSwitcher',
  component: ALThemeSwitcher,
  parameters: { status: { type: 'beta' } },
};

export const Default: StoryObj<typeof ALThemeSwitcher> = { args: {} };
