import type { StoryObj } from '@storybook/react-webpack5';
import { SLCheckboxGroup, SLCheckbox, SLFieldNote, SLIconWarningCircle, SLIconHelp } from '../..';

export default {
  title: 'Molecules/Checkbox Group',
  component: SLCheckbox,
  subcomponents: { SLCheckbox },
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
        <SLCheckbox name="checkbox-name" value="checkbox-value-1">Checkbox 1</SLCheckbox>
        <SLCheckbox name="checkbox-name" value="checkbox-value-2">Checkbox 2</SLCheckbox>
        <SLCheckbox name="checkbox-name" value="checkbox-value-3">Checkbox 3</SLCheckbox>
        <SLCheckbox name="checkbox-name" value="checkbox-value-4" isDisabled={true}>Checkbox 4</SLCheckbox>
      </>
    ),
    fieldNote: 'This is a field note.',
  },
};

export const Default: StoryObj<typeof SLCheckboxGroup> = { args: {} };

export const Error: StoryObj<typeof SLCheckboxGroup> = {
  args: {
    isError: true,
    isRequired: true,
    fieldNote: '',
    errorNote: 'This is an error note.',
  },
};

export const Disabled: StoryObj<typeof SLCheckboxGroup> = { args: {
  isDisabled: true,
} };

export const HiddenLegend: StoryObj<typeof SLCheckboxGroup> = { args: {
  hideLegend: true,
} };

export const Horizontal: StoryObj<typeof SLCheckboxGroup> = { args: {
  variant: 'horizontal',
} };

export const SlottedFieldNote: StoryObj<typeof SLCheckboxGroup> = {
  args: {
    children: (
      <>
        <SLCheckbox name="checkbox-name" value="checkbox-value-1">Checkbox 1</SLCheckbox>
        <SLCheckbox name="checkbox-name" value="checkbox-value-2">Checkbox 2</SLCheckbox>
        <SLCheckbox name="checkbox-name" value="checkbox-value-3">Checkbox 3</SLCheckbox>
        <SLCheckbox name="checkbox-name" value="checkbox-value-4" isDisabled={true}>Checkbox 4</SLCheckbox>
        <SLFieldNote slot="field-note"><SLIconHelp></SLIconHelp>This is a field note.</SLFieldNote>
      </>
    ),
  },
};

export const SlottedErrorNote: StoryObj<typeof SLCheckboxGroup> = {
  args: {
    isError: true,
    isRequired: true,
    fieldNote: '',
    children: (
      <>
        <SLCheckbox name="checkbox-name" value="checkbox-value-1">Checkbox 1</SLCheckbox>
        <SLCheckbox name="checkbox-name" value="checkbox-value-2">Checkbox 2</SLCheckbox>
        <SLCheckbox name="checkbox-name" value="checkbox-value-3">Checkbox 3</SLCheckbox>
        <SLCheckbox name="checkbox-name" value="checkbox-value-4" isDisabled={true}>Checkbox 4</SLCheckbox>
        <SLFieldNote slot="error"><SLIconWarningCircle></SLIconWarningCircle>This is an error note.</SLFieldNote>
      </>
    ),
  },
};