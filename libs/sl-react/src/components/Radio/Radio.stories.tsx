import type { StoryObj } from '@storybook/react-webpack5';
import { SLRadio, SLFieldNote, SLIconWarningCircle, SLIconHelp } from '../..';

export default {
  title: 'Atoms/Radio',
  component: SLRadio,
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onRadioChange']
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
        Radio
      </>
    ),
    fieldNote: 'This is a field note.',
  },
};

export const Default: StoryObj<typeof SLRadio> = { args: {} };

export const Checked: StoryObj<typeof SLRadio> = { args: {
  isChecked: true,
} };

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

export const DisabledChecked: StoryObj<typeof SLRadio> = { args: {
  isDisabled: true,
  isChecked: true,
} };

export const DisabledError: StoryObj<typeof SLRadio> = {
  args: {
    isError: true,
    isDisabled: true,
    isRequired: true,
    fieldNote: '',
    errorNote: 'This is an error note.',
  },
};

export const HiddenLabel: StoryObj<typeof SLRadio> = { args: {
  hideLabel: true,
  fieldNote: '',
} };

export const SlottedFieldNote: StoryObj<typeof SLRadio> = {
  args: {
    children: (
      <>
        Radio
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
        Radio
        <SLFieldNote slot="error"><SLIconWarningCircle></SLIconWarningCircle>This is an error note.</SLFieldNote>
      </>
    ),
  },
};
