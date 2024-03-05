import { expect, fireEvent, within } from '@storybook/test';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import '../field-note/field-note';
import '../icon/icons/attachment';
import '../icon/icons/emoji';
import '../icon/icons/help';
import '../icon/icons/warning-circle';
import './textarea';

export default {
  title: 'Molecules/Textarea',
  component: 'al-textarea',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['onTextareaChange']
    },
  },
  decorators: [ withActions ],
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

const Template = (args) => html`<al-textarea ${spread(args)} data-testid="textarea"></al-textarea>`;

export const Default = Template.bind({});
Default.args = {};

export const Filled = Template.bind({});
Filled.args = {
  value: 'Inputted text'
};

export const Error = Template.bind({});
Error.args = {
  isError: true,
  errorNote: 'This is an error note.',
};

export const Disabled = Template.bind({});
Disabled.args = {
  isDisabled: true
};

export const Required = Template.bind({});
Required.args = {
  isRequired: true
};

export const RequiredHiddenLabel = Template.bind({});
RequiredHiddenLabel.args = {
  hideLabel: true,
  isRequired: true
};

export const Optional = Template.bind({});
Optional.args = {
  isOptional: true
};

export const HiddenLabel = Template.bind({});
HiddenLabel.args = {
  hideLabel: true
};

const TemplateSlottedFieldNote = (args) => html`
  <al-textarea ${spread(args)}>
    <al-field-note slot="field-note"><al-icon-help></al-icon-help>This is a field note.</al-field-note>
  </al-textarea>`;

export const SlottedFieldNote = TemplateSlottedFieldNote.bind({});
SlottedFieldNote.args = {
};

const TemplateSlottedErrorNote = (args) => html`
  <al-textarea ${spread(args)}>
    <al-field-note slot="error"><al-icon-warning-circle></al-icon-warning-circle>This is an error note.</al-field-note>
  </al-textarea>`;

export const SlottedErrorNote = TemplateSlottedErrorNote.bind({});
SlottedErrorNote.args = {
  isError: true,
  fieldNote: false,
};

const TemplateIconBefore = (args) => html`
  <al-textarea ${spread(args)}>
    <al-icon-emoji slot="before"></al-icon-emoji>
  </al-textarea>
`;
export const WithIconBefore = TemplateIconBefore.bind({});
WithIconBefore.args = {};

const TemplateIconAfter= (args) => html`
  <al-textarea ${spread(args)}>
    <al-icon-attachment slot="after"></al-icon-attachment>
  </al-textarea>
`;
export const WithIconAfter = TemplateIconAfter.bind({});
WithIconAfter.args = {};

const TemplateIconBeforeAfter= (args) => html`
  <al-textarea ${spread(args)}>
    <al-icon-emoji slot="before"></al-icon-emoji>
    <span slot="after">gb</span>
    <al-icon-attachment slot="after"></al-icon-attachment>
  </al-textarea>
`;
export const WithIconBeforeAfter = TemplateIconBeforeAfter.bind({});
WithIconBeforeAfter.args = {};

export const WithMaxLength = Template.bind({});
WithMaxLength.args = {
  value: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent a tellus dictum, vehicula massa a, vulputate nisl.',
  minLength: '15',
  maxLength: '250',
  rows: '4',
  cols: '30',
};

export const WithAutoFocus = Template.bind({});
WithAutoFocus.args = {
  isFocused: true,
};

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/

Default.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const textarea = canvas.queryByTestId('textarea') as any;
  const textareaEl = textarea?.shadowRoot?.querySelector('.al-c-textarea__input') as HTMLTextAreaElement;

  // Make assertions
  expect(textarea).toBeInTheDocument();
  expect(textareaEl).toBeInTheDocument();

  // Simulate a change event with a value
  let inputValue = '';
  inputValue = 'Inputted text';
  fireEvent.input(textareaEl, { target: { value: inputValue } });
  expect(textareaEl.value).toBe(inputValue);
  expect(textarea.isActive).toBe(true);

  // Simulate a change event with the value removed
  inputValue = '';
  fireEvent.input(textareaEl, { target: { value: inputValue } });
  expect(textareaEl.value).toBe(inputValue);
  expect(textarea.isActive).toBe(false);
};
