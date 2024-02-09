import type { StoryObj } from '@storybook/react-webpack5';
import { SLInput, SLFieldNote, SLIconEmoji, SLIconAttachment, SLIconWarningCircle, SLIconHelp } from '../..';

export default {
  title: 'Molecules/Input',
  component: SLInput,
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['onInputChange']
    },
  },
  argTypes: {
    type: {
      control: { type: 'radio' },
      options: ['text', 'email', 'number', 'password', 'url', 'hidden', 'tel'],
    },
    isActive: {
      control: 'boolean',
    },
    isReadonly: {
      control: 'boolean',
    },
    isError: {
      control: 'boolean',
    },
    isDisabled: {
      control: 'boolean',
    },
    isRequired: {
      control: 'boolean',
    },
    isOptional: {
      control: 'boolean',
    },
    isFocused: {
      control: 'boolean'
    },
    hideLabel: {
      control: 'boolean',
    },
    label: {
      control: 'text',
    },
    placeholder: {
      control: 'text',
    },
    name: {
      control: 'text',
    },
    value: {
      control: 'text',
    },
    errorNote: {
      control: 'text',
    },
    fieldNote: {
      control: 'text',
    },
    feildId: {
      control: 'text',
    },
    ariaDescribedBy: {
      control: 'text',
    },
    minLength: {
      control: 'number',
    },
    maxLength: {
      control: 'number',
    },
    maxLengthValue: {
      control: 'number',
    },
    min: {
      control: 'number',
    },
    max: {
      control: 'number',
    },
    autoComplete: {
      control: { type: 'radio' },
      options: ['on', 'off'],
    },
  },
  args: {
    label: 'Label',
    placeholder: 'Placeholder',
    name: 'Input',
    fieldnote: 'This is a field note.',
  },
};

export const Default: StoryObj<typeof SLInput> = { args: {} };

export const Filled: StoryObj<typeof SLInput> = { args: {
  value: 'Inputted text'
} };

export const Error: StoryObj<typeof SLInput> = { args: {
  isError: true,
  errorNote: 'This is an error note.',
} };

export const Disabled: StoryObj<typeof SLInput> = { args: {
  isDisabled: true,
} };

export const Required: StoryObj<typeof SLInput> = { args: {
  isRequired: true,
} };

export const RequiredHiddenLabel: StoryObj<typeof SLInput> = { args: {
  isRequired: true,
  hideLabel: true,
} };

export const Optional: StoryObj<typeof SLInput> = { args: {
  isOptional: true,
} };

export const HiddenLabel: StoryObj<typeof SLInput> = { args: {
  hideLabel: true,
} };

export const SlottedFieldNote: StoryObj<typeof SLInput> = {
  args: {
    children: (
      <>
        <SLFieldNote slot="field-note"><SLIconHelp></SLIconHelp>This is a field note.</SLFieldNote>
      </>
    ),
  },
};

export const SlottedErrorNote: StoryObj<typeof SLInput> = {
  args: {
    isError: true,
    fieldNote: '',
    children: (
      <>
        <SLFieldNote slot="error"><SLIconWarningCircle></SLIconWarningCircle>This is an error note.</SLFieldNote>
      </>
    ),
  },
};

export const WithIconBefore: StoryObj<typeof SLInput> = {
  args: {
    children: (
      <>
        <SLIconEmoji slot="before"></SLIconEmoji>
      </>
    ),
  },
};

export const WithIconAfter: StoryObj<typeof SLInput> = {
  args: {
    children: (
      <>
        <SLIconAttachment slot="after"></SLIconAttachment>
      </>
    ),
  },
};

export const WithIconBeforeAfter: StoryObj<typeof SLInput> = {
  args: {
    children: (
      <>
        <SLIconEmoji slot="before"></SLIconEmoji>
        <span slot="after">gb</span>
        <SLIconAttachment slot="after"></SLIconAttachment>
      </>
    ),
  },
};

export const WithIconBeforeAfterDisabled: StoryObj<typeof SLInput> = {
  args: {
    ...WithIconBeforeAfter.args,
    isDisabled: true,
  },
};

export const WithMaxLength: StoryObj<typeof SLInput> = { args: {
  value: 'Inputted value',
  minLength: 15,
  maxLength: 250,
} };

export const WithAutoFocus: StoryObj<typeof SLInput> = { args: {
  isFocused: true,
} };