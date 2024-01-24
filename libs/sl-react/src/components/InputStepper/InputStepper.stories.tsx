import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { SLInputStepper, SLFieldNote, SLIconWarningCircle, SLIconHelp } from '../..';

export default {
  title: 'Boilerplate/Input Stepper',
  component: SLInputStepper,
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['change']
    }
  },
  args: {
    count: 1,
    min: 0,
    max: 5,
    label: 'Label',
    fieldNote: 'This is a field note.',
    name: 'Input Stepper',
  }
};

export const Default: StoryObj<typeof SLInputStepper> = { args: {} };

export const Error: StoryObj<typeof SLInputStepper> = { args: {
  isError: true,
  errorNote: 'This is an error note.',
} };

export const Disabled: StoryObj<typeof SLInputStepper> = { args: {
  isDisabled: true,
} };

export const HiddenLabel: StoryObj<typeof SLInputStepper> = { args: {
  hideLabel: true,
} };

export const SlottedFieldNote: StoryObj<typeof SLInputStepper> = {
  args: {
    children: (
      <>
        <SLFieldNote slot="field-note"><SLIconHelp></SLIconHelp>This is a field note.</SLFieldNote>
      </>
    ),
  },
};

export const SlottedErrorNote: StoryObj<typeof SLInputStepper> = {
  args: {
    isError: true,
    fieldNote: '',
    children: (
      <>
        <SLFieldNote slot="error"><SLIconWarningCircle></SLIconWarningCircle>This is an error note.</SLFieldNote>
      </>
    ),
  },
};