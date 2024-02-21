import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { ALDatePicker, ALFieldNote, ALIconWarningCircle, ALIconHelp } from '../..';

export default {
  title: 'Molecules/Date Picker',
  component: ALDatePicker,
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onDatePickerOpen', 'onDatePickerClose', 'onDatePickerChange']
    },
  },
  args: {
    label: 'Select a Date',
    fieldNote: 'This is a field note.',
    placeholder: 'Placeholder'
  },
};

export const Default: StoryObj<typeof ALDatePicker> = { args: {} };

export const Filled: StoryObj<typeof ALDatePicker> = { args: {
  value: 'Nov 01, 2023'
} };

export const Error: StoryObj<typeof ALDatePicker> = { args: {
  isError: true,
  errorNote: 'This is an error note.',
} };

export const Disabled: StoryObj<typeof ALDatePicker> = { args: {
  isDisabled: true,
} };

export const Required: StoryObj<typeof ALDatePicker> = { args: {
  isRequired: true,
} };

export const RequiredHiddenLabel: StoryObj<typeof ALDatePicker> = { args: {
  isRequired: true,
  hideLabel: true,
} };

export const Optional: StoryObj<typeof ALDatePicker> = { args: {
  isOptional: true,
} };

export const HiddenLabel: StoryObj<typeof ALDatePicker> = { args: {
  hideLabel: true,
} };

export const SlottedFieldNote: StoryObj<typeof ALDatePicker> = {
  args: {
    children: (
      <>
        <ALFieldNote slot="field-note"><ALIconHelp></ALIconHelp>This is a field note.</ALFieldNote>
      </>
    ),
  },
};

export const SlottedErrorNote: StoryObj<typeof ALDatePicker> = {
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

export const WithCustomDateFormat: StoryObj<typeof ALDatePicker> = {
  args: {
    dateFormat: 'MM/dd/yyyy',
    disabledMinDate: '2023/10/03',
    disabledMaxDate: '2023/12/30',
  }
};

export const WithDynamicPlacement: StoryObj<typeof ALDatePicker> = { args: {} };
WithDynamicPlacement.decorators = [(Story) => <div style={{ height: '90vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>{Story()}</div>];

