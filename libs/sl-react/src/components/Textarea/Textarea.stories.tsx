import type { StoryObj } from '@storybook/react-webpack5';
import { SLTextarea, SLFieldNote, SLIconEmoji, SLIconAttachment, SLIconWarningCircle, SLIconHelp } from '../..';

export default {
  title: 'Components/Textarea',
  component: SLTextarea,
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['onTextareaFieldChange']
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

export const Default: StoryObj<typeof SLTextarea> = { args: {} };

export const Filled: StoryObj<typeof SLTextarea> = { args: {
  value: 'Inputted text'
} };

export const Error: StoryObj<typeof SLTextarea> = { args: {
  isError: true,
  errorNote: 'This is an error note.',
} };

export const Disabled: StoryObj<typeof SLTextarea> = { args: {
  isDisabled: true,
} };

export const Required: StoryObj<typeof SLTextarea> = { args: {
  isRequired: true,
} };

export const RequiredHiddenLabel: StoryObj<typeof SLTextarea> = { args: {
  isRequired: true,
  hideLabel: true,
} };

export const Optional: StoryObj<typeof SLTextarea> = { args: {
  isOptional: true,
} };

export const HiddenLabel: StoryObj<typeof SLTextarea> = { args: {
  hideLabel: true,
} };

export const SlottedFieldNote: StoryObj<typeof SLTextarea> = {
  args: {
    children: (
      <>
        <SLFieldNote slot="field-note"><SLIconHelp></SLIconHelp>This is a field note.</SLFieldNote>
      </>
    ),
  },
};

export const SlottedErrorNote: StoryObj<typeof SLTextarea> = {
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

export const WithIconBefore: StoryObj<typeof SLTextarea> = {
  args: {
    children: (
      <>
        <SLIconEmoji slot="before"></SLIconEmoji>
      </>
    ),
  },
};

export const WithIconAfter: StoryObj<typeof SLTextarea> = {
  args: {
    children: (
      <>
        <SLIconAttachment slot="after"></SLIconAttachment>
      </>
    ),
  },
};

export const WithIconBeforeAfter: StoryObj<typeof SLTextarea> = {
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

export const WithMaxLength: StoryObj<typeof SLTextarea> = { args: {
  value: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent a tellus dictum, vehicula massa a, vulputate nisl.',
  minLength: 15,
  maxLength: 250,
  rows: 4,
  cols: 30,
} };

export const WithAutoFocus: StoryObj<typeof SLTextarea> = { args: {
  isFocused: true,
} };