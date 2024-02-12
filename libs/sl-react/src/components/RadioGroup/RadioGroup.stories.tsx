import type { StoryObj } from '@storybook/react-webpack5';
import { SLRadioGroup, SLRadio, SLFieldNote, SLIconWarningCircle, SLIconHelp } from '../..';

export default {
  title: 'Molecules/Radio Group',
  component: SLRadioGroup,
  subcomponents: { SLRadioGroup },
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
        <SLRadio name="radio-name" value="radio-value-1">Radio 1</SLRadio>
        <SLRadio name="radio-name" value="radio-value-2">Radio 2</SLRadio>
        <SLRadio name="radio-name" value="radio-value-3">Radio 3</SLRadio>
        <SLRadio name="radio-name" value="radio-value-4" isDisabled={true}>Radio 4</SLRadio>
      </>
    ),
    fieldNote: 'This is a field note.',
  },
};

export const Default: StoryObj<typeof SLRadioGroup> = { args: {} };

export const Error: StoryObj<typeof SLRadioGroup> = {
  args: {
    isError: true,
    isRequired: true,
    fieldNote: '',
    errorNote: 'This is an error note.',
  },
};

export const Disabled: StoryObj<typeof SLRadioGroup> = { args: {
  isDisabled: true,
} };

export const HiddenLegend: StoryObj<typeof SLRadioGroup> = { args: {
  hideLegend: true,
} };

export const Horizontal: StoryObj<typeof SLRadioGroup> = { args: {
  variant: 'horizontal',
} };

export const SlottedFieldNote: StoryObj<typeof SLRadioGroup> = {
  args: {
    children: (
      <>
        <SLRadio name="radio-name" value="radio-value-1">Radio 1</SLRadio>
        <SLRadio name="radio-name" value="radio-value-2">Radio 2</SLRadio>
        <SLRadio name="radio-name" value="radio-value-3">Radio 3</SLRadio>
        <SLRadio name="radio-name" value="radio-value-4" isDisabled={true}>Radio 4</SLRadio>
        <SLFieldNote slot="field-note"><SLIconHelp></SLIconHelp>This is a field note.</SLFieldNote>
      </>
    ),
  },
};

export const SlottedErrorNote: StoryObj<typeof SLRadioGroup> = {
  args: {
    isError: true,
    isRequired: true,
    fieldNote: '',
    children: (
      <>
        <SLRadio name="radio-name" value="radio-value-1">Radio 1</SLRadio>
        <SLRadio name="radio-name" value="radio-value-2">Radio 2</SLRadio>
        <SLRadio name="radio-name" value="radio-value-3">Radio 3</SLRadio>
        <SLRadio name="radio-name" value="radio-value-4" isDisabled={true}>Radio 4</SLRadio>
        <SLFieldNote slot="error"><SLIconWarningCircle></SLIconWarningCircle>This is an error note.</SLFieldNote>
      </>
    ),
  },
};