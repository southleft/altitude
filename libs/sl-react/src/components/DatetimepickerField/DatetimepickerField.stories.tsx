import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { SLDatetimepickerField, SLFieldNote, SLIconWarningCircle, SLIconHelp } from '../..';

export default {
  title: 'Boilerplate/Datetimepicker Field',
  component: SLDatetimepickerField,
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onDatetimepickerFieldOpen', 'onDatetimepickerFieldClose', 'onDatetimepickerFieldDateChange', 'onDatetimepickerFieldTimeChange']
    },
  },
  args: {
    label: 'Select a Date & Time',
    fieldNote: 'This is a field note.',
    placeholder: 'Placeholder'
  },
};

export const Default: StoryObj<typeof SLDatetimepickerField> = { args: {} };

export const Filled: StoryObj<typeof SLDatetimepickerField> = { args: {
  value: 'Nov 01, 2023'
} };

export const Error: StoryObj<typeof SLDatetimepickerField> = { args: {
  isError: true,
  errorNote: 'This is an error note.',
} };

export const Disabled: StoryObj<typeof SLDatetimepickerField> = { args: {
  isDisabled: true,
} };

export const Required: StoryObj<typeof SLDatetimepickerField> = { args: {
  isRequired: true,
} };

export const RequiredHiddenLabel: StoryObj<typeof SLDatetimepickerField> = { args: {
  isRequired: true,
  hideLabel: true,
} };

export const Optional: StoryObj<typeof SLDatetimepickerField> = { args: {
  isOptional: true,
} };

export const HiddenLabel: StoryObj<typeof SLDatetimepickerField> = { args: {
  hideLabel: true,
} };

export const SlottedFieldNote: StoryObj<typeof SLDatetimepickerField> = {
  args: {
    children: (
      <>
        <SLFieldNote slot="field-note"><SLIconHelp></SLIconHelp>This is a field note.</SLFieldNote>
      </>
    ),
  },
};

export const SlottedErrorNote: StoryObj<typeof SLDatetimepickerField> = {
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

export const WithCustomDateFormat: StoryObj<typeof SLDatetimepickerField> = {
  args: {
    dateFormat: 'MM/dd/yyyy',
    disabledMinDate: '2023/10/03',
    disabledMaxDate: '2023/12/30',
  }
};

export const WithDynamicPlacement: StoryObj<typeof SLDatetimepickerField> = { args: {} };
WithDynamicPlacement.decorators = [(Story) => <div style={{ height: '90vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>{Story()}</div>];

