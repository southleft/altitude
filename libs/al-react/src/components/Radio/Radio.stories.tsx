import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { ALRadio, ALFieldNote, ALIconWarningCircle, ALIconHelp } from '../..';

export default {
  title: 'Atoms/Radio',
  component: ALRadio,
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onRadioChange']
    },
  },
  argTypes: {
    isChecked: {
      control: 'boolean'
    },
    isError: {
      control: 'boolean'
    },
    isDisabled: {
      control: 'boolean'
    },
    isRequired: {
      control: 'boolean'
    },
    hideLabel: {
      control: 'boolean'
    },
    name: {
      control: 'text'
    },
    value: {
      control: 'text'
    },
    errorNote: {
      control: 'text'
    },
    fieldNote: {
      control: 'text'
    },
    fieldId: {
      control: 'text'
    },
    ariaDescribedBy: {
      control: 'text'
    },
  },
  args: {
    name: 'radio-name',
    value: 'radio-value',
    children: (
      <>
        Radio
      </>
    ),
    fieldNote: 'This is a field note.',
  },
};

export const Default: StoryObj<typeof ALRadio> = { args: {} };

export const Checked: StoryObj<typeof ALRadio> = { args: {
  isChecked: true,
} };

export const Error: StoryObj<typeof ALRadio> = {
  args: {
    isError: true,
    isRequired: true,
    fieldNote: '',
    errorNote: 'This is an error note.',
  },
};

export const Disabled: StoryObj<typeof ALRadio> = { args: {
  isDisabled: true,
} };

export const DisabledChecked: StoryObj<typeof ALRadio> = { args: {
  isDisabled: true,
  isChecked: true,
} };

export const DisabledError: StoryObj<typeof ALRadio> = {
  args: {
    isError: true,
    isDisabled: true,
    isRequired: true,
    fieldNote: '',
    errorNote: 'This is an error note.',
  },
};

export const HiddenLabel: StoryObj<typeof ALRadio> = { args: {
  hideLabel: true,
  fieldNote: '',
} };

export const SlottedFieldNote: StoryObj<typeof ALRadio> = {
  args: {
    children: (
      <>
        Radio
        <ALFieldNote slot="field-note"><ALIconHelp></ALIconHelp>This is a field note.</ALFieldNote>
      </>
    ),
  },
};

export const SlottedErrorNote: StoryObj<typeof ALRadio> = {
  args: {
    isError: true,
    isRequired: true,
    fieldNote: '',
    children: (
      <>
        Radio
        <ALFieldNote slot="error"><ALIconWarningCircle></ALIconWarningCircle>This is an error note.</ALFieldNote>
      </>
    ),
  },
};
