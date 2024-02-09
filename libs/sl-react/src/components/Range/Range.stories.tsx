import type { StoryObj } from '@storybook/react-webpack5';
import { SLRange } from '../..';

export default {
  title: 'Molecules/Range',
  component: SLRange,
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

export const Default: StoryObj<typeof SLRange> = { args: {} };

export const Error: StoryObj<typeof SLRange> = { args: {
  isError: true,
  errorNote: 'This is an error note.',
} };

export const Disabled: StoryObj<typeof SLRange> = { args: {
  isDisabled: true
} };

export const HiddenLabel: StoryObj<typeof SLRange> = { args: {
  hideLabel: true
} };

export const WithTooltip: StoryObj<typeof SLRange> = { args: {
  hasTooltip: true
} };

export const WithOutput: StoryObj<typeof SLRange> = { args: {
  hasOutput: true
} };

export const WithStep: StoryObj<typeof SLRange> = { args: {
  step: 10
} };

export const Range: StoryObj<typeof SLRange> = { args: {
  behavior: 'range'
} };

export const RangeWithOutput: StoryObj<typeof SLRange> = { args: {
  behavior: 'range',
  hasOutput: true
} };