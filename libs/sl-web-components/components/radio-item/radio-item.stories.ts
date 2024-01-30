import { expect } from '@storybook/jest';
import { userEvent, within, waitFor } from '@storybook/testing-library';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import '../field-note/field-note';
import '../icon/icons/help';
import '../icon/icons/warning-circle';
import './radio-item';

export default {
  title: 'Components/Radio item',
  component: 'sl-radio-item',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onRadioItemChange']
    },
  },
  decorators: [withActions],
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
    fieldNote: 'This is a field note.',
  },
};

const Template = (args) => html`
  <sl-radio-item ${spread(args)} data-testid="radio-item">
    Radio item
  </sl-radio-item>`;

export const Default = Template.bind({});
Default.args = {};

export const Checked = Template.bind({});
Checked.args = {
  isChecked: true,
};

export const Error = Template.bind({});
Error.args = {
  isError: true,
  isRequired: true,
  fieldNote: false,
  errorNote: 'This is an error note.',
};

export const Disabled = Template.bind({});
Disabled.args = {
  isDisabled: true,
};

export const DisabledChecked = Template.bind({});
DisabledChecked.args = {
  isDisabled: true,
  isChecked: true,
};

export const DisabledError = Template.bind({});
DisabledError.args = {
  isError: true,
  isDisabled: true,
  isRequired: true,
  fieldNote: false,
  errorNote: 'This is an error note.',
};

export const HiddenLabel = Template.bind({});
HiddenLabel.args = {
  hideLabel: true,
  fieldNote: false,
};

const TemplateSlottedFieldNote = (args) => html`
  <sl-radio-item ${spread(args)}>
    Radio item
    <sl-field-note slot="field-note"><sl-icon-help></sl-icon-help>This is a field note.</sl-field-note>
  </sl-radio-item>`;

export const SlottedFieldNote = TemplateSlottedFieldNote.bind({});
SlottedFieldNote.args = {
};

const TemplateSlottedErrorNote = (args) => html`
  <sl-radio-item ${spread(args)}>
    Radio item
    <sl-field-note slot="error"><sl-icon-warning-circle></sl-icon-warning-circle>This is an error note.</sl-field-note>
  </sl-radio-item>`;

export const SlottedErrorNote = TemplateSlottedErrorNote.bind({});
SlottedErrorNote.args = {
  isError: true,
  isRequired: true,
  fieldNote: false,
};

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/

Default.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const radioItem = canvas.queryByTestId('radio-item');
  const radioItemInput = radioItem?.shadowRoot?.querySelector('input') as HTMLInputElement;

  // Make assertions
  expect(radioItem).toBeInTheDocument();

  // Simulate a click event
  await userEvent.click(radioItemInput);

  // Check that the radio is checked
  expect(radioItemInput.checked).toBe(true);

  // Simulate a keyboard event (pressing Enter key)
  await userEvent.keyboard('{Enter}');

  // Check that the radio is no longer checked
  expect(radioItemInput.checked).toBe(true);

  // Remove focus from the input element
  radioItem.isChecked = false;
  radioItemInput.blur();
};