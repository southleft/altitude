import type { StoryObj } from '@storybook/react-webpack5';
import { SLCheckbox, SLFieldNote, SLIconWarningCircle, SLIconHelp } from '../..';

export default {
  title: 'Atoms/Checkbox',
  component: SLCheckbox,
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onCheckboxChange']
    },
  },
  argTypes: {
    isChecked: {
      control: 'boolean'
    },
    isIndeterminate: {
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
    name: 'checkbox-name',
    value: 'checkbox-value',
    children: (
      <>
        Checkbox
      </>
    ),
    fieldNote: 'This is a field note.',
  },
};

export const Default: StoryObj<typeof SLCheckbox> = { args: {} };

export const Checked: StoryObj<typeof SLCheckbox> = { args: {
  isChecked: true,
} };

export const Indeterminate: StoryObj<typeof SLCheckbox> = { args: {
  isIndeterminate: true,
} };

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

export const DisabledChecked: StoryObj<typeof SLCheckbox> = { args: {
  isDisabled: true,
  isChecked: true,
} };

export const DisabledIndeterminate: StoryObj<typeof SLCheckbox> = { args: {
  isDisabled: true,
  isIndeterminate: true,
} };

export const DisabledError: StoryObj<typeof SLCheckbox> = {
  args: {
    isError: true,
    isDisabled: true,
    isRequired: true,
    fieldNote: '',
    errorNote: 'This is an error note.',
  },
};

export const HiddenLabel: StoryObj<typeof SLCheckbox> = { args: {
  hideLabel: true,
  fieldNote: '',
} };

export const SlottedFieldNote: StoryObj<typeof SLCheckbox> = {
  args: {
    children: (
      <>
        Checkbox
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
        Checkbox
        <SLFieldNote slot="error"><SLIconWarningCircle></SLIconWarningCircle>This is an error note.</SLFieldNote>
      </>
    ),
  },
};
