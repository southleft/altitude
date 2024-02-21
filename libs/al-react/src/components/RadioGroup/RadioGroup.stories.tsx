import type { StoryObj } from '@storybook/react-webpack5';
import { ALRadioGroup, ALRadio, ALFieldNote, ALIconWarningCircle, ALIconHelp } from '../..';

export default {
  title: 'Molecules/Radio Group',
  component: ALRadioGroup,
  subcomponents: { ALRadioGroup },
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onRadioGroupChange']
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
    label: 'Radio group legend label',
    children: (
      <>
        <ALRadio name="radio-name" value="radio-value-1">Radio 1</ALRadio>
        <ALRadio name="radio-name" value="radio-value-2">Radio 2</ALRadio>
        <ALRadio name="radio-name" value="radio-value-3">Radio 3</ALRadio>
        <ALRadio name="radio-name" value="radio-value-4" isDisabled={true}>Radio 4</ALRadio>
      </>
    ),
    fieldNote: 'This is a field note.',
  },
};

export const Default: StoryObj<typeof ALRadioGroup> = { args: {} };

export const Error: StoryObj<typeof ALRadioGroup> = {
  args: {
    isError: true,
    isRequired: true,
    fieldNote: '',
    errorNote: 'This is an error note.',
  },
};

export const Disabled: StoryObj<typeof ALRadioGroup> = { args: {
  isDisabled: true,
} };

export const HiddenLegend: StoryObj<typeof ALRadioGroup> = { args: {
  hideLegend: true,
} };

export const Horizontal: StoryObj<typeof ALRadioGroup> = { args: {
  variant: 'horizontal',
} };

export const SlottedFieldNote: StoryObj<typeof ALRadioGroup> = {
  args: {
    children: (
      <>
        <ALRadio name="radio-name" value="radio-value-1">Radio 1</ALRadio>
        <ALRadio name="radio-name" value="radio-value-2">Radio 2</ALRadio>
        <ALRadio name="radio-name" value="radio-value-3">Radio 3</ALRadio>
        <ALRadio name="radio-name" value="radio-value-4" isDisabled={true}>Radio 4</ALRadio>
        <ALFieldNote slot="field-note"><ALIconHelp></ALIconHelp>This is a field note.</ALFieldNote>
      </>
    ),
  },
};

export const SlottedErrorNote: StoryObj<typeof ALRadioGroup> = {
  args: {
    isError: true,
    isRequired: true,
    fieldNote: '',
    children: (
      <>
        <ALRadio name="radio-name" value="radio-value-1">Radio 1</ALRadio>
        <ALRadio name="radio-name" value="radio-value-2">Radio 2</ALRadio>
        <ALRadio name="radio-name" value="radio-value-3">Radio 3</ALRadio>
        <ALRadio name="radio-name" value="radio-value-4" isDisabled={true}>Radio 4</ALRadio>
        <ALFieldNote slot="error"><ALIconWarningCircle></ALIconWarningCircle>This is an error note.</ALFieldNote>
      </>
    ),
  },
};