import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { ALRange } from '../..';

export default {
  title: 'Molecules/Range',
  component: ALRange,
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onRangeDrag', 'onRangeOutputValueChange']
    },
  },
  args: {
    label: 'Label',
    fieldNote: 'This is a field note.'
  }
};

export const Default: StoryObj<typeof ALRange> = { args: {} };

export const Error: StoryObj<typeof ALRange> = { args: {
  isError: true,
  errorNote: 'This is an error note.',
} };

export const Disabled: StoryObj<typeof ALRange> = { args: {
  isDisabled: true
} };

export const HiddenLabel: StoryObj<typeof ALRange> = { args: {
  hideLabel: true
} };

export const WithTooltip: StoryObj<typeof ALRange> = { args: {
  hasTooltip: true
} };

export const WithOutput: StoryObj<typeof ALRange> = { args: {
  hasOutput: true
} };

export const WithStep: StoryObj<typeof ALRange> = { args: {
  step: 10
} };

export const Range: StoryObj<typeof ALRange> = { args: {
  behavior: 'range'
} };

export const RangeWithOutput: StoryObj<typeof ALRange> = { args: {
  behavior: 'range',
  hasOutput: true
} };