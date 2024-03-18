import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { ALSpinner } from '../..';

export default {
  title: 'Atoms/Spinner',
  component: ALSpinner,
  parameters: { status: { type: 'beta' } }
};

export const Default: StoryObj<typeof ALSpinner> = { args: {} };

export const Small: StoryObj<typeof ALSpinner> = {
  args: {
    small: true
  }
};

export const Inverted: StoryObj<typeof ALSpinner> = {
  args: {
    inverted: true
  },
  parameters: {
    backgrounds: { default: 'dark' }
  }
};
