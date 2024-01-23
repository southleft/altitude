import type { StoryObj } from '@storybook/react-webpack5';
import { SLButton } from '../..';

export default {
  title: 'Components/Button',
  component: SLButton,
  parameters: { status: { type: 'beta' } },
  args: { children: 'Label' },
};

export const Default: StoryObj<typeof SLButton> = { args: {} };
