import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { ALDateTimePicker, ALFieldNote, ALIconWarningCircle, ALIconHelp } from '../..';

export default {
  title: 'Molecules/Date & Time Picker',
  component: ALDateTimePicker,
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onDateTimePickerOpen', 'onDateTimePickerClose', 'onDateTimePickerDateChange', 'onDateTimePickerTimeChange']
    },
  },
  args: {
    label: 'Select a Date & Time',
    fieldNote: 'This is a field note.',
    placeholder: 'Placeholder'
  },
};

export const Default: StoryObj<typeof ALDateTimePicker> = { args: {} };

export const Filled: StoryObj<typeof ALDateTimePicker> = { args: {
  value: 'Nov 01, 2023'
} };

export const Error: StoryObj<typeof ALDateTimePicker> = { args: {
  isError: true,
  errorNote: 'This is an error note.',
} };

export const Disabled: StoryObj<typeof ALDateTimePicker> = { args: {
  isDisabled: true,
} };

export const Required: StoryObj<typeof ALDateTimePicker> = { args: {
  isRequired: true,
} };

export const RequiredHiddenLabel: StoryObj<typeof ALDateTimePicker> = { args: {
  isRequired: true,
  hideLabel: true,
} };

export const Optional: StoryObj<typeof ALDateTimePicker> = { args: {
  isOptional: true,
} };

export const HiddenLabel: StoryObj<typeof ALDateTimePicker> = { args: {
  hideLabel: true,
} };

export const SlottedFieldNote: StoryObj<typeof ALDateTimePicker> = {
  args: {
    children: (
      <>
        <ALFieldNote slot="field-note"><ALIconHelp></ALIconHelp>This is a field note.</ALFieldNote>
      </>
    ),
  },
};

export const SlottedErrorNote: StoryObj<typeof ALDateTimePicker> = {
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

export const WithCustomDateFormat: StoryObj<typeof ALDateTimePicker> = {
  args: {
    dateFormat: 'MM/dd/yyyy',
    disabledMinDate: '2023/10/03',
    disabledMaxDate: '2023/12/30',
  }
};

export const WithDynamicPlacement: StoryObj<typeof ALDateTimePicker> = { args: {} };
WithDynamicPlacement.decorators = [(Story) => <div style={{ height: '90vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>{Story()}</div>];

