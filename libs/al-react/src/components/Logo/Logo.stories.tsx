import type { StoryObj } from '@storybook/react-vite';
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

export const Odyssey: StoryObj<typeof ALLogo> = { args: {
  variant: 'odyssey'
} };

export const Southleft: StoryObj<typeof ALLogo> = { args: {
  variant: 'southleft',
  children: ''
} };
