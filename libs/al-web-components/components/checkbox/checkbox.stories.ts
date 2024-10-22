import { expect, userEvent, within } from '@storybook/test';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import '../field-note/field-note';
import '../icon/icons/help';
import '../icon/icons/warning-circle';
import './checkbox';
import { ALCheckbox } from './checkbox';

export default {
  title: 'Atoms/Checkbox',
  component: 'al-checkbox',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onCheckboxChange']
    },
  },
  decorators: [ withActions ],
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
    fieldNote: 'This is a field note.',
  },
};

const Template = (args) => html`
  <al-checkbox ${spread(args)} data-testid="checkbox">
    Checkbox
  </al-checkbox>`;

export const Default = Template.bind({});
Default.args = {};

export const Checked = Template.bind({});
Checked.args = {
  isChecked: true,
};

export const Indeterminate = Template.bind({});
Indeterminate.args = {
  isIndeterminate: true,
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

export const DisabledIndeterminate = Template.bind({});
DisabledIndeterminate.args = {
  isDisabled: true,
  isIndeterminate: true,
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
  <al-checkbox ${spread(args)}>
    Checkbox
    <al-field-note slot="field-note"><al-icon-help></al-icon-help>This is a field note.</al-field-note>
  </al-checkbox>`;

export const SlottedFieldNote = TemplateSlottedFieldNote.bind({});
SlottedFieldNote.args = {
};

const TemplateSlottedErrorNote = (args) => html`
  <al-checkbox ${spread(args)}>
    Checkbox
    <al-field-note slot="error"><al-icon-warning-circle></al-icon-warning-circle>This is an error note.</al-field-note>
  </al-checkbox>`;

export const SlottedErrorNote = TemplateSlottedErrorNote.bind({});
SlottedErrorNote.args = {
  isError: true,
  fieldNote: false,
};

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/

Checked.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const checkboxItem = canvas.queryByTestId('checkbox') as any;
  const checkboxItemInput = checkboxItem?.shadowRoot?.querySelector('input') as HTMLInputElement;

  // Make assertions
  expect(checkboxItem).toBeInTheDocument();

  // Simulate a click event
  await userEvent.click(checkboxItemInput);

  // Check that the checkbox is checked
  expect(checkboxItem.isChecked).toBe(false);

  // Simulate a keyboard event (pressing Enter key)
  await userEvent.keyboard('{Enter}');

  // Check that the checkbox is no longer checked
  expect(checkboxItem.isChecked).toBe(true);

  // Remove focus from the input element
  checkboxItemInput.blur();
};

Indeterminate.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const checkboxItem = canvas.queryByTestId<ALCheckbox>('checkbox')?.shadowRoot?.querySelector('.al-c-checkbox');
  const checkboxItemInput = checkboxItem?.querySelector('input') as HTMLInputElement ;

  // Check that it starts as indeterminate
  expect(checkboxItem).toHaveClass('al-is-indeterminate');

  // Simulate a click event
  await userEvent.click(checkboxItemInput);

  // Check that it's no longer indeterminate
  expect(checkboxItem).not.toHaveClass('al-is-indeterminate');

  // Change the state of the checkbox back to isIndeterminate
  canvas.queryByTestId<any>('checkbox').isIndeterminate = true;

  // Remove focus from the input element
  checkboxItemInput.blur();
};

