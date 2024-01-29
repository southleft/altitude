import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import '../checkbox-item/checkbox-item';
import '../field-note/field-note';
import '../icon/icons/help';
import '../icon/icons/warning-circle';
import './checkbox';

export default {
  title: 'Components/Checkbox',
  component: 'sl-checkbox',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onCheckboxItemChange']
    }
  },
  decorators: [withActions],
  argTypes: {
    isError: {
      control: 'boolean'
    },
    isDisabled: {
      control: 'boolean'
    },
    isRequired: {
      control: 'boolean'
    },
    hideLegend: {
      control: 'boolean'
    },
    label: {
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
    variant: {
      control: 'radio',
      options: ['default', 'horizontal']
    }
  },
  args: {
    label: 'Checkbox legend label',
    fieldNote: 'This is a field note.'
  }
};

const Template = (args) =>
  html` <sl-checkbox ${spread(args)} data-testid="checkbox">
    <sl-checkbox-item name="checkbox-name" value="checkbox-value-1">Checkbox item 1</sl-checkbox-item>
    <sl-checkbox-item name="checkbox-name" value="checkbox-value-2">Checkbox item 2</sl-checkbox-item>
    <sl-checkbox-item name="checkbox-name" value="checkbox-value-3">Checkbox item 3</sl-checkbox-item>
    <sl-checkbox-item name="checkbox-name" value="checkbox-value-4" ?isDisabled=${true}>Checkbox item 4</sl-checkbox-item>
  </sl-checkbox>`;

export const Default = Template.bind({});
Default.args = {};

export const Error = Template.bind({});
Error.args = {
  isError: true,
  isRequired: true,
  fieldNote: false,
  errorNote: 'This is an error note.'
};

export const Disabled = Template.bind({});
Disabled.args = {
  isDisabled: true
};

export const HiddenLegend = Template.bind({});
HiddenLegend.args = {
  hideLegend: true
};

export const Horizontal = Template.bind({});
Horizontal.args = {
  variant: 'horizontal'
};

const TemplateSlottedFieldNote = (args) =>
  html` <sl-checkbox ${spread(args)}>
    <sl-checkbox-item name="checkbox-name" value="checkbox-value-1">Checkbox item 1</sl-checkbox-item>
    <sl-checkbox-item name="checkbox-name" value="checkbox-value-2">Checkbox item 2</sl-checkbox-item>
    <sl-checkbox-item name="checkbox-name" value="checkbox-value-3">Checkbox item 3</sl-checkbox-item>
    <sl-checkbox-item name="checkbox-name" value="checkbox-value-4" ?isDisabled=${true}>Checkbox item 4</sl-checkbox-item>
    <sl-field-note slot="field-note"><sl-icon-help></sl-icon-help>This is a field note.</sl-field-note>
  </sl-checkbox>`;

export const SlottedFieldNote = TemplateSlottedFieldNote.bind({});
SlottedFieldNote.args = {};

const TemplateSlottedErrorNote = (args) =>
  html` <sl-checkbox ${spread(args)}>
    <sl-checkbox-item name="checkbox-name" value="checkbox-value-1">Checkbox item 1</sl-checkbox-item>
    <sl-checkbox-item name="checkbox-name" value="checkbox-value-2">Checkbox item 2</sl-checkbox-item>
    <sl-checkbox-item name="checkbox-name" value="checkbox-value-3">Checkbox item 3</sl-checkbox-item>
    <sl-checkbox-item name="checkbox-name" value="checkbox-value-4" ?isDisabled=${true}>Checkbox item 4</sl-checkbox-item>
    <sl-field-note slot="error"><sl-icon-warning-circle></sl-icon-warning-circle>This is an error note.</sl-field-note>
  </sl-checkbox>`;

export const SlottedErrorNote = TemplateSlottedErrorNote.bind({});
SlottedErrorNote.args = {
  isError: true,
  isRequired: true,
  fieldNote: false
};
