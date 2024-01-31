import type { StoryObj } from '@storybook/react-webpack5';
import { SLCheckbox, SLCheckboxItem, SLFieldNote, SLIconWarningCircle, SLIconHelp } from '../..';

export default {
  title: 'Molecules/Checkbox',
  component: SLCheckbox,
  subcomponents: { SLCheckboxItem },
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onCheckboxItemChange']
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
    label: 'Checkbox legend label',
    children: (
      <>
        <SLCheckboxItem name="checkbox-name" value="checkbox-value-1">Checkbox item 1</SLCheckboxItem>
        <SLCheckboxItem name="checkbox-name" value="checkbox-value-2">Checkbox item 2</SLCheckboxItem>
        <SLCheckboxItem name="checkbox-name" value="checkbox-value-3">Checkbox item 3</SLCheckboxItem>
        <SLCheckboxItem name="checkbox-name" value="checkbox-value-4" isDisabled={true}>Checkbox item 4</SLCheckboxItem>
      </>
    ),
    fieldNote: 'This is a field note.',
  },
};

export const Default: StoryObj<typeof SLCheckbox> = { args: {} };

export const Error: StoryObj<typeof SLCheckbox> = {
  args: {
    isError: true,
    isRequired: true,
    fieldNote: '',
    errorNote: 'This is an error note.',
  },
};

export const Disabled: StoryObj<typeof SLCheckbox> = { args: {
  isDisabled: true,
} };

export const HiddenLegend: StoryObj<typeof SLCheckbox> = { args: {
  hideLegend: true,
} };

export const Horizontal: StoryObj<typeof SLCheckbox> = { args: {
  variant: 'horizontal',
} };

export const SlottedFieldNote: StoryObj<typeof SLCheckbox> = {
  args: {
    children: (
      <>
        <SLCheckboxItem name="checkbox-name" value="checkbox-value-1">Checkbox item 1</SLCheckboxItem>
        <SLCheckboxItem name="checkbox-name" value="checkbox-value-2">Checkbox item 2</SLCheckboxItem>
        <SLCheckboxItem name="checkbox-name" value="checkbox-value-3">Checkbox item 3</SLCheckboxItem>
        <SLCheckboxItem name="checkbox-name" value="checkbox-value-4" isDisabled={true}>Checkbox item 4</SLCheckboxItem>
        <SLFieldNote slot="field-note"><SLIconHelp></SLIconHelp>This is a field note.</SLFieldNote>
      </>
    ),
  },
};

export const SlottedErrorNote: StoryObj<typeof SLCheckbox> = {
  args: {
    isError: true,
    isRequired: true,
    fieldNote: '',
    children: (
      <>
        <SLCheckboxItem name="checkbox-name" value="checkbox-value-1">Checkbox item 1</SLCheckboxItem>
        <SLCheckboxItem name="checkbox-name" value="checkbox-value-2">Checkbox item 2</SLCheckboxItem>
        <SLCheckboxItem name="checkbox-name" value="checkbox-value-3">Checkbox item 3</SLCheckboxItem>
        <SLCheckboxItem name="checkbox-name" value="checkbox-value-4" isDisabled={true}>Checkbox item 4</SLCheckboxItem>
        <SLFieldNote slot="error"><SLIconWarningCircle></SLIconWarningCircle>This is an error note.</SLFieldNote>
      </>
    ),
  },
};