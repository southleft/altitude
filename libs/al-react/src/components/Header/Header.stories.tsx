import type { StoryObj } from '@storybook/react-vite';
import { ALHeader } from '../..';

export default {
  title: 'Organisms/Header',
  component: ALHeader,
  parameters: { status: { type: 'beta' } },
  args: { children: 'Hello world' },
};

export const Default: StoryObj<typeof ALHeader> = { args: {} };
