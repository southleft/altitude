import type { StoryObj } from '@storybook/react-webpack5';
import { SLFieldNote } from '../..';

export default {
  title: 'Atoms/Field Note',
  component: SLFieldNote,
  parameters: { status: { type: 'beta' } },
  argTypes: {
    isError: {
      control: 'boolean',
    },
    isDisabled: {
      control: 'boolean',
    },
  },
  args: {
    children: 'This is a field note.',
  },
};

export const Default: StoryObj<typeof SLFieldNote> = { args: {} };

export const Error: StoryObj<typeof SLFieldNote> = { args: {
  isError: true,
} };

export const Disabled: StoryObj<typeof SLFieldNote> = { args: {
  isDisabled: true,
} };
