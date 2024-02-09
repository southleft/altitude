import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { SLDatePicker, SLFieldNote, SLIconWarningCircle, SLIconHelp } from '../..';

export default {
  title: 'Molecules/Date Picker',
  component: SLDatePicker,
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

export const Default: StoryObj<typeof SLDatePicker> = { args: {} };

export const Filled: StoryObj<typeof SLDatePicker> = { args: {
  value: 'Nov 01, 2023'
} };

export const Error: StoryObj<typeof SLDatePicker> = { args: {
  isError: true,
  errorNote: 'This is an error note.',
} };

export const Disabled: StoryObj<typeof SLDatePicker> = { args: {
  isDisabled: true,
} };

export const Required: StoryObj<typeof SLDatePicker> = { args: {
  isRequired: true,
} };

export const RequiredHiddenLabel: StoryObj<typeof SLDatePicker> = { args: {
  isRequired: true,
  hideLabel: true,
} };

export const Optional: StoryObj<typeof SLDatePicker> = { args: {
  isOptional: true,
} };

export const HiddenLabel: StoryObj<typeof SLDatePicker> = { args: {
  hideLabel: true,
} };

export const SlottedFieldNote: StoryObj<typeof SLDatePicker> = {
  args: {
    children: (
      <>
        <SLFieldNote slot="field-note"><SLIconHelp></SLIconHelp>This is a field note.</SLFieldNote>
      </>
    ),
  },
};

export const SlottedErrorNote: StoryObj<typeof SLDatePicker> = {
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

export const WithCustomDateFormat: StoryObj<typeof SLDatePicker> = {
  args: {
    dateFormat: 'MM/dd/yyyy',
    disabledMinDate: '2023/10/03',
    disabledMaxDate: '2023/12/30',
  }
};

export const WithDynamicPlacement: StoryObj<typeof SLDatePicker> = { args: {} };
WithDynamicPlacement.decorators = [(Story) => <div style={{ height: '90vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>{Story()}</div>];

