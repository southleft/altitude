import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { ALCheckboxGroup, ALCheckbox, ALFieldNote, ALIconWarningCircle, ALIconHelp } from '../..';

export default {
  title: 'Molecules/Checkbox Group',
  component: ALCheckboxGroup,
  subcomponents: { ALCheckbox },
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onCheckboxGroupChange']
    },
  },
  argTypes: {
    isError: {
      control: 'boolean'
    },
    isDisabled: {
      control: 'boolean'
    },
    isRequired: {
      control: 'boolean'
    },
    hideLegend: {
      control: 'boolean'
    },
    label: {
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
    variant: {
      control: 'radio',
      options: ['default', 'horizontal']
    }
  },
  args: {
    label: 'Checkbox group legend label',
    children: (
      <>
        <ALCheckbox name="checkbox-name" value="checkbox-value-1">Checkbox 1</ALCheckbox>
        <ALCheckbox name="checkbox-name" value="checkbox-value-2">Checkbox 2</ALCheckbox>
        <ALCheckbox name="checkbox-name" value="checkbox-value-3">Checkbox 3</ALCheckbox>
        <ALCheckbox name="checkbox-name" value="checkbox-value-4" isDisabled={true}>Checkbox 4</ALCheckbox>
      </>
    ),
    fieldNote: 'This is a field note.',
  },
};

export const Default: StoryObj<typeof ALCheckboxGroup> = { args: {} };

export const Error: StoryObj<typeof ALCheckboxGroup> = {
  args: {
    isError: true,
    isRequired: true,
    fieldNote: '',
    errorNote: 'This is an error note.',
  },
};

export const Disabled: StoryObj<typeof ALCheckboxGroup> = { args: {
  isDisabled: true,
} };

export const HiddenLegend: StoryObj<typeof ALCheckboxGroup> = { args: {
  hideLegend: true,
} };

export const Horizontal: StoryObj<typeof ALCheckboxGroup> = { args: {
  variant: 'horizontal',
} };

export const SlottedFieldNote: StoryObj<typeof ALCheckboxGroup> = {
  args: {
    children: (
      <>
        <ALCheckbox name="checkbox-name" value="checkbox-value-1">Checkbox 1</ALCheckbox>
        <ALCheckbox name="checkbox-name" value="checkbox-value-2">Checkbox 2</ALCheckbox>
        <ALCheckbox name="checkbox-name" value="checkbox-value-3">Checkbox 3</ALCheckbox>
        <ALCheckbox name="checkbox-name" value="checkbox-value-4" isDisabled={true}>Checkbox 4</ALCheckbox>
        <ALFieldNote slot="field-note"><ALIconHelp></ALIconHelp>This is a field note.</ALFieldNote>
      </>
    ),
  },
};

export const SlottedErrorNote: StoryObj<typeof ALCheckboxGroup> = {
  args: {
    isError: true,
    isRequired: true,
    fieldNote: '',
    children: (
      <>
        <ALCheckbox name="checkbox-name" value="checkbox-value-1">Checkbox 1</ALCheckbox>
        <ALCheckbox name="checkbox-name" value="checkbox-value-2">Checkbox 2</ALCheckbox>
        <ALCheckbox name="checkbox-name" value="checkbox-value-3">Checkbox 3</ALCheckbox>
        <ALCheckbox name="checkbox-name" value="checkbox-value-4" isDisabled={true}>Checkbox 4</ALCheckbox>
        <ALFieldNote slot="error"><ALIconWarningCircle></ALIconWarningCircle>This is an error note.</ALFieldNote>
      </>
    ),
  },
};