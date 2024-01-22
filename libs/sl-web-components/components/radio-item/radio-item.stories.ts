import { expect } from '@storybook/jest';
import { userEvent, within } from '@storybook/testing-library';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import '../field-note/field-note';
import '../icon/icons/help';
import '../icon/icons/warning-circle';
import './radio-item';

export default {
  title: 'Components/Radio item',
  component: 'sl-radio-item',
  tags: [  'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['change']
    },
  },
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

const TemplateMultiple = () => html`
<sl-radio data-testid="radio">
  <sl-radio-item data-testid="radio-item-1">Radio item 1</sl-radio-item>
  <sl-radio-item data-testid="radio-item-2">Radio item 2</sl-radio-item>
  <sl-radio-item data-testid="radio-item-3" isDisabled="true">Radio item 3</sl-radio-item>
  <sl-radio-item data-testid="radio-item-4">Radio item 4</sl-radio-item>
</sl-radio>`;

export const Multiple = TemplateMultiple.bind({});
Multiple.args = {
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
  await userEvent.type(radioItemInput, '{enter}');

  // Check that the radio is no longer checked
  expect(radioItemInput.checked).toBe(false);

  // Remove focus from the input element
  radioItemInput.blur();
};

Multiple.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const radio = canvas.queryByTestId('radio');
  const radioItems = canvas.queryAllByTestId(/^radio-item-/);
  const radioItemInput1 = radioItems[0]?.shadowRoot?.querySelector('input') as HTMLInputElement;
  const radioItemInput2 = radioItems[1]?.shadowRoot?.querySelector('input') as HTMLInputElement;
  const radioItemInput3 = radioItems[2]?.shadowRoot?.querySelector('input') as HTMLInputElement;
  const radioItemInput4 = radioItems[3]?.shadowRoot?.querySelector('input') as HTMLInputElement;

  // Make assertions
  expect(radio).toBeInTheDocument();
  expect(radioItems).toHaveLength(4);
  expect(radioItemInput1).toBeInTheDocument();
  expect(radioItemInput2).toBeInTheDocument();
  expect(radioItemInput3).toBeInTheDocument();
  expect(radioItemInput4).toBeInTheDocument();

  // Check the first radio item on click
  await userEvent.click(radioItemInput1);
  expect(radioItemInput1.checked).toBe(true);
  expect(radioItemInput2.checked).toBe(false);
  expect(radioItemInput3.checked).toBe(false);
  expect(radioItemInput4.checked).toBe(false);

  // Check the second radio item on click
  await userEvent.click(radioItemInput2);
  expect(radioItemInput1.checked).toBe(false);
  expect(radioItemInput2.checked).toBe(true);
  expect(radioItemInput3.checked).toBe(false);
  expect(radioItemInput4.checked).toBe(false);

  // Check the first radio item on arrow up
  await userEvent.type(radioItemInput2, '[ArrowUp]');
  expect(radioItemInput1.checked).toBe(true);
  expect(radioItemInput2.checked).toBe(false);
  expect(radioItemInput3.checked).toBe(false);
  expect(radioItemInput4.checked).toBe(false);

  // Check the second radio item on arrow down
  await userEvent.type(radioItemInput1, '[ArrowDown]');
  expect(radioItemInput1.checked).toBe(false);
  expect(radioItemInput2.checked).toBe(true);
  expect(radioItemInput3.checked).toBe(false);
  expect(radioItemInput4.checked).toBe(false);

  // Check the forth radio item on arrow down
  await userEvent.type(radioItemInput2, '[ArrowDown]');
  expect(radioItemInput1.checked).toBe(false);
  expect(radioItemInput2.checked).toBe(false);
  expect(radioItemInput3.checked).toBe(false);
  expect(radioItemInput4.checked).toBe(true);
};