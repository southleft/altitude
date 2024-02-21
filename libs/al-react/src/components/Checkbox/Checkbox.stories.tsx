import type { StoryObj } from '@storybook/react-webpack5';
import { ALCheckbox, ALFieldNote, ALIconWarningCircle, ALIconHelp } from '../..';

export default {
  title: 'Atoms/Checkbox',
  component: ALCheckbox,
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

export const Default: StoryObj<typeof ALCheckbox> = { args: {} };

export const Checked: StoryObj<typeof ALCheckbox> = { args: {
  isChecked: true,
} };

export const Indeterminate: StoryObj<typeof ALCheckbox> = { args: {
  isIndeterminate: true,
} };

export const Error: StoryObj<typeof ALCheckbox> = {
  args: {
    isError: true,
    isRequired: true,
    fieldNote: '',
    errorNote: 'This is an error note.',
  },
};

export const Disabled: StoryObj<typeof ALCheckbox> = { args: {
  isDisabled: true,
} };

export const DisabledChecked: StoryObj<typeof ALCheckbox> = { args: {
  isDisabled: true,
  isChecked: true,
} };

export const DisabledIndeterminate: StoryObj<typeof ALCheckbox> = { args: {
  isDisabled: true,
  isIndeterminate: true,
} };

export const DisabledError: StoryObj<typeof ALCheckbox> = {
  args: {
    isError: true,
    isDisabled: true,
    isRequired: true,
    fieldNote: '',
    errorNote: 'This is an error note.',
  },
};

export const HiddenLabel: StoryObj<typeof ALCheckbox> = { args: {
  hideLabel: true,
  fieldNote: '',
} };

export const SlottedFieldNote: StoryObj<typeof ALCheckbox> = {
  args: {
    children: (
      <>
        Checkbox
        <ALFieldNote slot="field-note"><ALIconHelp></ALIconHelp>This is a field note.</ALFieldNote>
      </>
    ),
  },
};

export const SlottedErrorNote: StoryObj<typeof ALCheckbox> = {
  args: {
    isError: true,
    isRequired: true,
    fieldNote: '',
    children: (
      <>
        Checkbox
        <ALFieldNote slot="error"><ALIconWarningCircle></ALIconWarningCircle>This is an error note.</ALFieldNote>
      </>
    ),
  },
};
