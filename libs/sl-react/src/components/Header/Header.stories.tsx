import type { StoryObj } from '@storybook/react-webpack5';
import { SLHeader } from '../..';

export default {
  title: 'Organisms/Header',
  component: SLHeader,
  parameters: { status: { type: 'beta' } },
  args: { children: 'Hello world' },
};

export const Default: StoryObj<typeof SLHeader> = { args: {} };
