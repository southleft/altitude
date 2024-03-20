import type { StoryObj } from '@storybook/react-webpack5';
import { ALLogo } from '../..';

export default {
  title: 'Atoms/Logo',
  component: ALLogo,
  parameters: { status: { type: 'beta' } },
  args: { children: 'By Southleft' },
};

export const Default: StoryObj<typeof ALLogo> = { args: {} };

export const Northright: StoryObj<typeof ALLogo> = { args: {
  variant: 'northright'
} };

export const Southleft: StoryObj<typeof ALLogo> = { args: {
  variant: 'southleft',
  children: ''
} };
