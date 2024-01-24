import type { StoryObj } from '@storybook/react-webpack5';
import { SLRadio, SLRadioItem, SLFieldNote, SLIconWarningCircle, SLIconHelp } from '../..';

export default {
  title: 'Components/Radio',
  component: SLRadio,
  subcomponents: { SLRadioItem },
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['change']
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
    label: 'Radio legend label',
    children: (
      <>
        <SLRadioItem name="radio-name" value="radio-value-1">Radio item 1</SLRadioItem>
        <SLRadioItem name="radio-name" value="radio-value-2">Radio item 2</SLRadioItem>
        <SLRadioItem name="radio-name" value="radio-value-3">Radio item 3</SLRadioItem>
        <SLRadioItem name="radio-name" value="radio-value-4" isDisabled={true}>Radio item 4</SLRadioItem>
      </>
    ),
    fieldNote: 'This is a field note.',
  },
};

export const Default: StoryObj<typeof SLRadio> = { args: {} };

export const Error: StoryObj<typeof SLRadio> = {
  args: {
    isError: true,
    isRequired: true,
    fieldNote: '',
    errorNote: 'This is an error note.',
  },
};

export const Disabled: StoryObj<typeof SLRadio> = { args: {
  isDisabled: true,
} };

export const HiddenLegend: StoryObj<typeof SLRadio> = { args: {
  hideLegend: true,
} };

export const Horizontal: StoryObj<typeof SLRadio> = { args: {
  variant: 'horizontal',
} };

export const SlottedFieldNote: StoryObj<typeof SLRadio> = {
  args: {
    children: (
      <>
        <SLRadioItem name="radio-name" value="radio-value-1">Radio item 1</SLRadioItem>
        <SLRadioItem name="radio-name" value="radio-value-2">Radio item 2</SLRadioItem>
        <SLRadioItem name="radio-name" value="radio-value-3">Radio item 3</SLRadioItem>
        <SLRadioItem name="radio-name" value="radio-value-4" isDisabled={true}>Radio item 4</SLRadioItem>
        <SLFieldNote slot="field-note"><SLIconHelp></SLIconHelp>This is a field note.</SLFieldNote>
      </>
    ),
  },
};

export const SlottedErrorNote: StoryObj<typeof SLRadio> = {
  args: {
    isError: true,
    isRequired: true,
    fieldNote: '',
    children: (
      <>
        <SLRadioItem name="radio-name" value="radio-value-1">Radio item 1</SLRadioItem>
        <SLRadioItem name="radio-name" value="radio-value-2">Radio item 2</SLRadioItem>
        <SLRadioItem name="radio-name" value="radio-value-3">Radio item 3</SLRadioItem>
        <SLRadioItem name="radio-name" value="radio-value-4" isDisabled={true}>Radio item 4</SLRadioItem>
        <SLFieldNote slot="error"><SLIconWarningCircle></SLIconWarningCircle>This is an error note.</SLFieldNote>
      </>
    ),
  },
};