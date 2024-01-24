import type { StoryObj } from '@storybook/react-webpack5';
import { SLSlider } from '../..';

export default {
  title: 'Boilerplate/Slider',
  component: SLSlider,
  parameters: {
    status: { type: 'beta' },
    layout: 'padded',
    actions: {
      handles: ['slide', 'outputValueChange']
    },
    themes: { default: 'dark-subtle' }
  },
  args: {
    label: 'Label',
    fieldNote: 'This is a field note.'
  }
};

export const Default: StoryObj<typeof SLSlider> = { args: {} };

export const Error: StoryObj<typeof SLSlider> = { args: {
  isError: true,
  errorNote: 'This is an error note.',
} };

export const Disabled: StoryObj<typeof SLSlider> = { args: {
  isDisabled: true
} };

export const HiddenLabel: StoryObj<typeof SLSlider> = { args: {
  hideLabel: true
} };

export const WithTooltip: StoryObj<typeof SLSlider> = { args: {
  hasTooltip: true
} };

export const WithOutput: StoryObj<typeof SLSlider> = { args: {
  hasOutput: true
} };

export const WithStep: StoryObj<typeof SLSlider> = { args: {
  step: 10
} };

export const Range: StoryObj<typeof SLSlider> = { args: {
  behavior: 'range'
} };

export const RangeWithOutput: StoryObj<typeof SLSlider> = { args: {
  behavior: 'range',
  hasOutput: true
} };