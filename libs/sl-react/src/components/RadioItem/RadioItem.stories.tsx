import type { StoryObj } from '@storybook/react-webpack5';
import { SLRadioItem, SLFieldNote, SLIconWarningCircle, SLIconHelp } from '../..';

export default {
  title: 'Components/Radio Item',
  component: SLRadioItem,
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onRadioItemChange']
    },
  },
  argTypes: {
    isChecked: {
      control: 'boolean'
    },
    isError: {
      control: 'boolean'
    },
    isDisabled: {
      control: 'boolean'
    },
    isRequired: {
      control: 'boolean'
    },
    hideLabel: {
      control: 'boolean'
    },
    name: {
      control: 'text'
    },
    value: {
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
  },
  args: {
    name: 'radio-name',
    value: 'radio-value',
    children: (
      <>
        Radio item
      </>
    ),
    fieldNote: 'This is a field note.',
  },
};

export const Default: StoryObj<typeof SLRadioItem> = { args: {} };

export const Checked: StoryObj<typeof SLRadioItem> = { args: {
  isChecked: true,
} };

export const Error: StoryObj<typeof SLRadioItem> = {
  args: {
    isError: true,
    isRequired: true,
    fieldNote: '',
    errorNote: 'This is an error note.',
  },
};

export const Disabled: StoryObj<typeof SLRadioItem> = { args: {
  isDisabled: true,
} };

export const DisabledChecked: StoryObj<typeof SLRadioItem> = { args: {
  isDisabled: true,
  isChecked: true,
} };

export const DisabledError: StoryObj<typeof SLRadioItem> = {
  args: {
    isError: true,
    isDisabled: true,
    isRequired: true,
    fieldNote: '',
    errorNote: 'This is an error note.',
  },
};

export const HiddenLabel: StoryObj<typeof SLRadioItem> = { args: {
  hideLabel: true,
  fieldNote: '',
} };

export const SlottedFieldNote: StoryObj<typeof SLRadio> = {
  args: {
    children: (
      <>
        Radio item
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
        Radio item
        <SLFieldNote slot="error"><SLIconWarningCircle></SLIconWarningCircle>This is an error note.</SLFieldNote>
      </>
    ),
  },
};
