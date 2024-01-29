import { expect } from '@storybook/jest';
import { fireEvent, within } from '@storybook/testing-library';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import '../field-note/field-note';
import '../icon/icons/attachment';
import '../icon/icons/emoji';
import '../icon/icons/help';
import '../icon/icons/warning-circle';
import './text-field';

export default {
  title: 'Components/Text Field',
  component: 'sl-text-field',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['change']
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

const Template = (args) => html`<sl-text-field ${spread(args)} data-testid="text-field"></sl-text-field>`;

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
  <sl-text-field ${spread(args)}>
    <sl-field-note slot="field-note"><sl-icon-help></sl-icon-help>This is a field note.</sl-field-note>
  </sl-text-field>`;

export const SlottedFieldNote = TemplateSlottedFieldNote.bind({});
SlottedFieldNote.args = {
};

const TemplateSlottedErrorNote = (args) => html`
  <sl-text-field ${spread(args)}>
    <sl-field-note slot="error"><sl-icon-warning-circle></sl-icon-warning-circle>This is an error note.</sl-field-note>
  </sl-text-field>`;

export const SlottedErrorNote = TemplateSlottedErrorNote.bind({});
SlottedErrorNote.args = {
  isError: true,
  fieldNote: false,
};

const TemplateIconBefore = (args) => html`
  <sl-text-field ${spread(args)}>
    <sl-icon-emoji slot="before"></sl-icon-emoji>
  </sl-text-field>
`;
export const WithIconBefore = TemplateIconBefore.bind({});
WithIconBefore.args = {};

const TemplateIconAfter= (args) => html`
  <sl-text-field ${spread(args)}>
    <sl-icon-attachment slot="after"></sl-icon-attachment>
  </sl-text-field>
`;

export const WithIconAfter = TemplateIconAfter.bind({});
WithIconAfter.args = {};

const TemplateIconBeforeAfter= (args) => html`
  <sl-text-field ${spread(args)}>
    <sl-icon-emoji slot="before"></sl-icon-emoji>
    <span slot="after">gb</span>
    <sl-icon-attachment slot="after"></sl-icon-attachment>
  </sl-text-field>
`;
export const WithIconBeforeAfter = TemplateIconBeforeAfter.bind({});
WithIconBeforeAfter.args = {};

export const WithIconBeforeAfterDisabled = TemplateIconBeforeAfter.bind({});
WithIconBeforeAfterDisabled.args = {
  isDisabled: true,
};

export const WithMaxLength = Template.bind({});
WithMaxLength.args = {
  value: 'Inputted value',
  minLength: '15',
  maxLength: '250',
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
  const textField = canvas.queryByTestId('text-field') as any;
  const textFieldEl = textField?.shadowRoot?.querySelector('.sl-c-text-field__input') as HTMLInputElement;

  // Make assertions
  expect(textField).toBeInTheDocument();
  expect(textFieldEl).toBeInTheDocument();

  // Simulate a change event with a value
  let inputValue = '';
  inputValue = 'Inputted text';
  fireEvent.input(textFieldEl, { target: { value: inputValue } });
  expect(textFieldEl.value).toBe(inputValue);
  expect(textField.isActive).toBe(true);

  // Simulate a change event with the value removed
  inputValue = '';
  fireEvent.input(textFieldEl, { target: { value: inputValue } });
  expect(textFieldEl.value).toBe(inputValue);
  expect(textField.isActive).toBe(false);
};
