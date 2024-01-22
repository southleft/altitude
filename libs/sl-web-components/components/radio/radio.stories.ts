import { html } from 'lit';
import { spread } from '../../directives/spread';
import '../field-note/field-note';
import '../icon/icons/help';
import '../icon/icons/warning-circle';
import '../radio-item/radio-item';
import './radio';

export default {
  title: 'Components/Radio',
  component: 'sl-radio',
  tags: [  'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['change']
    }
  },
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
    label: 'Radio legend label',
    fieldNote: 'This is a field note.'
  }
};

const Template = (args) =>
  html` <sl-radio ${spread(args)}>
    <sl-radio-item name="radio-name" value="radio-value-1">Radio item 1</sl-radio-item>
    <sl-radio-item name="radio-name" value="radio-value-2">Radio item 2</sl-radio-item>
    <sl-radio-item name="radio-name" value="radio-value-3">Radio item 3</sl-radio-item>
    <sl-radio-item name="radio-name" value="radio-value-4" ?isDisabled=${true}>Radio item 4</sl-radio-item>
  </sl-radio>`;

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
  html` <sl-radio ${spread(args)}>
    <sl-radio-item name="radio-name" value="radio-value-1">Radio item 1</sl-radio-item>
    <sl-radio-item name="radio-name" value="radio-value-2">Radio item 2</sl-radio-item>
    <sl-radio-item name="radio-name" value="radio-value-3">Radio item 3</sl-radio-item>
    <sl-radio-item name="radio-name" value="radio-value-4" ?isDisabled=${true}>Radio item 4</sl-radio-item>
    <sl-field-note slot="field-note"><sl-icon-help></sl-icon-help>This is a field note.</sl-field-note>
  </sl-radio>`;

export const SlottedFieldNote = TemplateSlottedFieldNote.bind({});
SlottedFieldNote.args = {};

const TemplateSlottedErrorNote = (args) =>
  html` <sl-radio ${spread(args)}>
    <sl-radio-item name="radio-name" value="radio-value-1">Radio item 1</sl-radio-item>
    <sl-radio-item name="radio-name" value="radio-value-2">Radio item 2</sl-radio-item>
    <sl-radio-item name="radio-name" value="radio-value-3">Radio item 3</sl-radio-item>
    <sl-radio-item name="radio-name" value="radio-value-4" ?isDisabled=${true}>Radio item 4</sl-radio-item>
    <sl-field-note slot="error"><sl-icon-warning-circle></sl-icon-warning-circle>This is an error note.</sl-field-note>
  </sl-radio>`;

export const SlottedErrorNote = TemplateSlottedErrorNote.bind({});
SlottedErrorNote.args = {
  isError: true,
  isRequired: true,
  fieldNote: false
};
