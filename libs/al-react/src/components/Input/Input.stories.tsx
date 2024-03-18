import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { ALInput, ALFieldNote, ALIconEmoji, ALIconAttachment, ALIconWarningCircle, ALIconHelp } from '../..';

export default {
  title: 'Molecules/Input',
  component: ALInput,
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

export const Default: StoryObj<typeof ALInput> = { args: {} };

export const Filled: StoryObj<typeof ALInput> = { args: {
  value: 'Inputted text'
} };

export const Error: StoryObj<typeof ALInput> = { args: {
  isError: true,
  errorNote: 'This is an error note.',
} };

export const Disabled: StoryObj<typeof ALInput> = { args: {
  isDisabled: true,
} };

export const Required: StoryObj<typeof ALInput> = { args: {
  isRequired: true,
} };

export const RequiredHiddenLabel: StoryObj<typeof ALInput> = { args: {
  isRequired: true,
  hideLabel: true,
} };

export const Optional: StoryObj<typeof ALInput> = { args: {
  isOptional: true,
} };

export const HiddenLabel: StoryObj<typeof ALInput> = { args: {
  hideLabel: true,
} };

export const SlottedFieldNote: StoryObj<typeof ALInput> = {
  args: {
    children: (
      <>
        <ALFieldNote slot="field-note"><ALIconHelp></ALIconHelp>This is a field note.</ALFieldNote>
      </>
    ),
  },
};

export const SlottedErrorNote: StoryObj<typeof ALInput> = {
  args: {
    isError: true,
    fieldNote: '',
    children: (
      <>
        <ALFieldNote slot="error"><ALIconWarningCircle></ALIconWarningCircle>This is an error note.</ALFieldNote>
      </>
    ),
  },
};

export const WithIconBefore: StoryObj<typeof ALInput> = {
  args: {
    children: (
      <>
        <ALIconEmoji slot="before"></ALIconEmoji>
      </>
    ),
  },
};

export const WithIconAfter: StoryObj<typeof ALInput> = {
  args: {
    children: (
      <>
        <ALIconAttachment slot="after"></ALIconAttachment>
      </>
    ),
  },
};

export const WithIconBeforeAfter: StoryObj<typeof ALInput> = {
  args: {
    children: (
      <>
        <ALIconEmoji slot="before"></ALIconEmoji>
        <span slot="after">gb</span>
        <ALIconAttachment slot="after"></ALIconAttachment>
      </>
    ),
  },
};

export const WithIconBeforeAfterDisabled: StoryObj<typeof ALInput> = {
  args: {
    ...WithIconBeforeAfter.args,
    isDisabled: true,
  },
};

export const WithMaxLength: StoryObj<typeof ALInput> = { args: {
  value: 'Inputted value',
  minLength: 15,
  maxLength: 250,
} };

export const WithAutoFocus: StoryObj<typeof ALInput> = { args: {
  isFocused: true,
} };