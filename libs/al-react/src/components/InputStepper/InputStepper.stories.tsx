import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { ALInputStepper, ALFieldNote, ALIconWarningCircle, ALIconHelp } from '../..';

export default {
  title: 'Molecules/Input Stepper',
  component: ALInputStepper,
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['onInputStepperChange']
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

export const Default: StoryObj<typeof ALInputStepper> = { args: {} };

export const Error: StoryObj<typeof ALInputStepper> = { args: {
  isError: true,
  errorNote: 'This is an error note.',
} };

export const Disabled: StoryObj<typeof ALInputStepper> = { args: {
  isDisabled: true,
} };

export const HiddenLabel: StoryObj<typeof ALInputStepper> = { args: {
  hideLabel: true,
} };

export const SlottedFieldNote: StoryObj<typeof ALInputStepper> = {
  args: {
    children: (
      <>
        <ALFieldNote slot="field-note"><ALIconHelp></ALIconHelp>This is a field note.</ALFieldNote>
      </>
    ),
  },
};

export const SlottedErrorNote: StoryObj<typeof ALInputStepper> = {
  args: {
    isError: true,
    fieldNote: '',
    children: (
      <>
        <ALFieldNote slot="error"><ALIconWarningCircle></ALIconWarningCircle>This is an error note.</ALFieldNote>
      </>
    ),
  },
};