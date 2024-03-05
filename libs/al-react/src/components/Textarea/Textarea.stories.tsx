import type { StoryObj } from '@storybook/react-webpack5';
import { ALTextarea, ALFieldNote, ALIconEmoji, ALIconAttachment, ALIconWarningCircle, ALIconHelp } from '../..';

export default {
  title: 'Molecules/Textarea',
  component: ALTextarea,
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['onTextareaChange']
    },
  },
  argTypes: {
    rows: {
      control: 'number',
    },
    cols: {
      control: 'number',
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
  },
  args: {
    label: 'Label',
    placeholder: 'Placeholder',
    name: 'Textarea',
    fieldnote: 'This is a field note.',
  },
};

export const Default: StoryObj<typeof ALTextarea> = { args: {} };

export const Filled: StoryObj<typeof ALTextarea> = { args: {
  value: 'Inputted text'
} };

export const Error: StoryObj<typeof ALTextarea> = { args: {
  isError: true,
  errorNote: 'This is an error note.',
} };

export const Disabled: StoryObj<typeof ALTextarea> = { args: {
  isDisabled: true,
} };

export const Required: StoryObj<typeof ALTextarea> = { args: {
  isRequired: true,
} };

export const RequiredHiddenLabel: StoryObj<typeof ALTextarea> = { args: {
  isRequired: true,
  hideLabel: true,
} };

export const Optional: StoryObj<typeof ALTextarea> = { args: {
  isOptional: true,
} };

export const HiddenLabel: StoryObj<typeof ALTextarea> = { args: {
  hideLabel: true,
} };

export const SlottedFieldNote: StoryObj<typeof ALTextarea> = {
  args: {
    children: (
      <>
        <ALFieldNote slot="field-note"><ALIconHelp></ALIconHelp>This is a field note.</ALFieldNote>
      </>
    ),
  },
};

export const SlottedErrorNote: StoryObj<typeof ALTextarea> = {
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

export const WithIconBefore: StoryObj<typeof ALTextarea> = {
  args: {
    children: (
      <>
        <ALIconEmoji slot="before"></ALIconEmoji>
      </>
    ),
  },
};

export const WithIconAfter: StoryObj<typeof ALTextarea> = {
  args: {
    children: (
      <>
        <ALIconAttachment slot="after"></ALIconAttachment>
      </>
    ),
  },
};

export const WithIconBeforeAfter: StoryObj<typeof ALTextarea> = {
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

export const WithMaxLength: StoryObj<typeof ALTextarea> = { args: {
  value: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent a tellus dictum, vehicula massa a, vulputate nisl.',
  minLength: 15,
  maxLength: 250,
  rows: 4,
  cols: 30,
} };

export const WithAutoFocus: StoryObj<typeof ALTextarea> = { args: {
  isFocused: true,
} };