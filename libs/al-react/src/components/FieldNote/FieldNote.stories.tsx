import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { ALFieldNote } from '../..';

export default {
  title: 'Atoms/Field Note',
  component: ALFieldNote,
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

export const Default: StoryObj<typeof ALFieldNote> = { args: {} };

export const Error: StoryObj<typeof ALFieldNote> = { args: {
  isError: true,
} };

export const Disabled: StoryObj<typeof ALFieldNote> = { args: {
  isDisabled: true,
} };
