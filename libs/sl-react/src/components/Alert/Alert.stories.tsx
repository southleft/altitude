import type { StoryObj } from '@storybook/react-webpack5';
import { SLAlert } from '../..';

export default {
  title: 'Components/Alert',
  component: SLAlert,
  parameters: { status: { type: 'beta' } },
  args: { children: 'Hello world' },
};

export const Default: StoryObj<typeof SLAlert> = { args: {} };
