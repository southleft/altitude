import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import '../checkbox/checkbox';
import '../field-note/field-note';
import '../icon/icons/help';
import '../icon/icons/warning-circle';
import './checkbox-group';

export default {
  title: 'Molecules/Checkbox Group',
  component: 'sl-checkbox-group',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onCheckboxChange']
    }
  },
  decorators: [ withActions ],
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
    label: 'Checkbox group legend label',
    fieldNote: 'This is a field note.'
  }
};

const Template = (args) =>
  html` <sl-checkbox-group ${spread(args)} data-testid="checkbox-group">
    <sl-checkbox name="checkbox-name" value="checkbox-value-1">Checkbox 1</sl-checkbox>
    <sl-checkbox name="checkbox-name" value="checkbox-value-2">Checkbox 2</sl-checkbox>
    <sl-checkbox name="checkbox-name" value="checkbox-value-3">Checkbox 3</sl-checkbox>
    <sl-checkbox name="checkbox-name" value="checkbox-value-4" ?isDisabled=${true}>Checkbox 4</sl-checkbox>
  </sl-checkbox-group>`;

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
  html` <sl-checkbox-group ${spread(args)}>
    <sl-checkbox name="checkbox-name" value="checkbox-value-1">Checkbox 1</sl-checkbox>
    <sl-checkbox name="checkbox-name" value="checkbox-value-2">Checkbox 2</sl-checkbox>
    <sl-checkbox name="checkbox-name" value="checkbox-value-3">Checkbox 3</sl-checkbox>
    <sl-checkbox name="checkbox-name" value="checkbox-value-4" ?isDisabled=${true}>Checkbox 4</sl-checkbox>
    <sl-field-note slot="field-note"><sl-icon-help></sl-icon-help>This is a field note.</sl-field-note>
  </sl-checkbox-group>`;

export const SlottedFieldNote = TemplateSlottedFieldNote.bind({});
SlottedFieldNote.args = {};

const TemplateSlottedErrorNote = (args) =>
  html` <sl-checkbox-group ${spread(args)}>
    <sl-checkbox name="checkbox-name" value="checkbox-value-1">Checkbox 1</sl-checkbox>
    <sl-checkbox name="checkbox-name" value="checkbox-value-2">Checkbox 2</sl-checkbox>
    <sl-checkbox name="checkbox-name" value="checkbox-value-3">Checkbox 3</sl-checkbox>
    <sl-checkbox name="checkbox-name" value="checkbox-value-4" ?isDisabled=${true}>Checkbox 4</sl-checkbox>
    <sl-field-note slot="error"><sl-icon-warning-circle></sl-icon-warning-circle>This is an error note.</sl-field-note>
  </sl-checkbox-group>`;

export const SlottedErrorNote = TemplateSlottedErrorNote.bind({});
SlottedErrorNote.args = {
  isError: true,
  isRequired: true,
  fieldNote: false
};
