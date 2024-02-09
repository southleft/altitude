import type { StoryObj } from '@storybook/react-webpack5';
import { SLSpinner } from '../..';

export default {
  title: 'Atoms/Spinner',
  component: SLSpinner,
  parameters: { status: { type: 'beta' } }
};

export const Default: StoryObj<typeof SLSpinner> = { args: {} };

export const Small: StoryObj<typeof SLSpinner> = {
  args: {
    small: true
  }
};

export const Inverted: StoryObj<typeof SLSpinner> = {
  args: {
    inverted: true
  },
  parameters: {
    backgrounds: { default: 'dark' }
  }
};
