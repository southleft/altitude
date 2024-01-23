import type { StoryObj } from '@storybook/react-webpack5';
import { SLIcon } from '../..';

export default {
  title: 'Components/Icon',
  component: SLIcon,
  parameters: { status: { type: 'beta' } },
  args: { children: 'Hello world' },
};

export const Default: StoryObj<typeof SLIcon> = { args: {} };
