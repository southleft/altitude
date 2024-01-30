import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { SLDatepickerField, SLFieldNote, SLIconWarningCircle, SLIconHelp } from '../..';

export default {
  title: 'Boilerplate/Datepicker Field',
  component: SLDatepickerField,
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onDatepickerFieldOpen', 'onDatepickerFieldClose', 'onDatepickerFieldChange']
    },
    layout: 'padded',
  },
  args: {
    label: 'Select a Date',
    fieldNote: 'This is a field note.',
    placeholder: 'Placeholder'
  },
};

export const Default: StoryObj<typeof SLDatepickerField> = { args: {} };

export const Filled: StoryObj<typeof SLDatepickerField> = { args: {
  value: 'Nov 01, 2023'
} };

export const Error: StoryObj<typeof SLDatepickerField> = { args: {
  isError: true,
  errorNote: 'This is an error note.',
} };

export const Disabled: StoryObj<typeof SLDatepickerField> = { args: {
  isDisabled: true,
} };

export const Required: StoryObj<typeof SLDatepickerField> = { args: {
  isRequired: true,
} };

export const RequiredHiddenLabel: StoryObj<typeof SLDatepickerField> = { args: {
  isRequired: true,
  hideLabel: true,
} };

export const Optional: StoryObj<typeof SLDatepickerField> = { args: {
  isOptional: true,
} };

export const HiddenLabel: StoryObj<typeof SLDatepickerField> = { args: {
  hideLabel: true,
} };

export const SlottedFieldNote: StoryObj<typeof SLDatepickerField> = {
  args: {
    children: (
      <>
        <SLFieldNote slot="field-note"><SLIconHelp></SLIconHelp>This is a field note.</SLFieldNote>
      </>
    ),
  },
};

export const SlottedErrorNote: StoryObj<typeof SLDatepickerField> = {
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

export const WithCustomDateFormat: StoryObj<typeof SLDatepickerField> = {
  args: {
    dateFormat: 'MM/dd/yyyy',
    disabledMinDate: '2023/10/03',
    disabledMaxDate: '2023/12/30',
  }
};

export const WithDynamicPlacement: StoryObj<typeof SLDatepickerField> = { args: {} };
WithDynamicPlacement.decorators = [(Story) => <div style={{ height: '90vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>{Story()}</div>];

