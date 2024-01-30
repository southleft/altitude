import type { StoryObj } from '@storybook/react-webpack5';
import { SLLoadingIndicator } from '../..';

export default {
  title: 'Atoms/Loading Indicator',
  component: SLLoadingIndicator,
  parameters: { status: { type: 'beta' } }
};

export const Default: StoryObj<typeof SLLoadingIndicator> = { args: {} };

export const Small: StoryObj<typeof SLLoadingIndicator> = {
  args: {
    small: true
  }
};

export const Inverted: StoryObj<typeof SLLoadingIndicator> = {
  args: {
    inverted: true
  },
  parameters: {
    backgrounds: { default: 'dark' }
  }
};
