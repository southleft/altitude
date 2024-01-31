import type { StoryObj } from '@storybook/react-webpack5';
import { SLTextField, SLFieldNote, SLIconEmoji, SLIconAttachment, SLIconWarningCircle, SLIconHelp } from '../..';

export default {
  title: 'Molecules/Text Field',
  component: SLTextField,
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['onTextFieldChange']
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
    name: 'Text Field',
    fieldnote: 'This is a field note.',
  },
};

export const Default: StoryObj<typeof SLTextField> = { args: {} };

export const Filled: StoryObj<typeof SLTextField> = { args: {
  value: 'Inputted text'
} };

export const Error: StoryObj<typeof SLTextField> = { args: {
  isError: true,
  errorNote: 'This is an error note.',
} };

export const Disabled: StoryObj<typeof SLTextField> = { args: {
  isDisabled: true,
} };

export const Required: StoryObj<typeof SLTextField> = { args: {
  isRequired: true,
} };

export const RequiredHiddenLabel: StoryObj<typeof SLTextField> = { args: {
  isRequired: true,
  hideLabel: true,
} };

export const Optional: StoryObj<typeof SLTextField> = { args: {
  isOptional: true,
} };

export const HiddenLabel: StoryObj<typeof SLTextField> = { args: {
  hideLabel: true,
} };

export const SlottedFieldNote: StoryObj<typeof SLTextField> = {
  args: {
    children: (
      <>
        <SLFieldNote slot="field-note"><SLIconHelp></SLIconHelp>This is a field note.</SLFieldNote>
      </>
    ),
  },
};

export const SlottedErrorNote: StoryObj<typeof SLTextField> = {
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

export const WithIconBefore: StoryObj<typeof SLTextField> = {
  args: {
    children: (
      <>
        <SLIconEmoji slot="before"></SLIconEmoji>
      </>
    ),
  },
};

export const WithIconAfter: StoryObj<typeof SLTextField> = {
  args: {
    children: (
      <>
        <SLIconAttachment slot="after"></SLIconAttachment>
      </>
    ),
  },
};

export const WithIconBeforeAfter: StoryObj<typeof SLTextField> = {
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

export const WithIconBeforeAfterDisabled: StoryObj<typeof SLTextField> = {
  args: {
    ...WithIconBeforeAfter.args,
    isDisabled: true,
  },
};

export const WithMaxLength: StoryObj<typeof SLTextField> = { args: {
  value: 'Inputted value',
  minLength: 15,
  maxLength: 250,
} };

export const WithAutoFocus: StoryObj<typeof SLTextField> = { args: {
  isFocused: true,
} };