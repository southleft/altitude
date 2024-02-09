import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { SLDateTimePicker, SLFieldNote, SLIconWarningCircle, SLIconHelp } from '../..';

export default {
  title: 'Molecules/Date & Time Picker',
  component: SLDateTimePicker,
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

export const Default: StoryObj<typeof SLDateTimePicker> = { args: {} };

export const Filled: StoryObj<typeof SLDateTimePicker> = { args: {
  value: 'Nov 01, 2023'
} };

export const Error: StoryObj<typeof SLDateTimePicker> = { args: {
  isError: true,
  errorNote: 'This is an error note.',
} };

export const Disabled: StoryObj<typeof SLDateTimePicker> = { args: {
  isDisabled: true,
} };

export const Required: StoryObj<typeof SLDateTimePicker> = { args: {
  isRequired: true,
} };

export const RequiredHiddenLabel: StoryObj<typeof SLDateTimePicker> = { args: {
  isRequired: true,
  hideLabel: true,
} };

export const Optional: StoryObj<typeof SLDateTimePicker> = { args: {
  isOptional: true,
} };

export const HiddenLabel: StoryObj<typeof SLDateTimePicker> = { args: {
  hideLabel: true,
} };

export const SlottedFieldNote: StoryObj<typeof SLDateTimePicker> = {
  args: {
    children: (
      <>
        <SLFieldNote slot="field-note"><SLIconHelp></SLIconHelp>This is a field note.</SLFieldNote>
      </>
    ),
  },
};

export const SlottedErrorNote: StoryObj<typeof SLDateTimePicker> = {
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

export const WithCustomDateFormat: StoryObj<typeof SLDateTimePicker> = {
  args: {
    dateFormat: 'MM/dd/yyyy',
    disabledMinDate: '2023/10/03',
    disabledMaxDate: '2023/12/30',
  }
};

export const WithDynamicPlacement: StoryObj<typeof SLDateTimePicker> = { args: {} };
WithDynamicPlacement.decorators = [(Story) => <div style={{ height: '90vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>{Story()}</div>];

