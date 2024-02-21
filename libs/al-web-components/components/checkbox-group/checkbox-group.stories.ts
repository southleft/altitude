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
  component: 'al-checkbox-group',
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
  html` <al-checkbox-group ${spread(args)} data-testid="checkbox-group">
    <al-checkbox name="checkbox-name" value="checkbox-value-1">Checkbox 1</al-checkbox>
    <al-checkbox name="checkbox-name" value="checkbox-value-2">Checkbox 2</al-checkbox>
    <al-checkbox name="checkbox-name" value="checkbox-value-3">Checkbox 3</al-checkbox>
    <al-checkbox name="checkbox-name" value="checkbox-value-4" ?isDisabled=${true}>Checkbox 4</al-checkbox>
  </al-checkbox-group>`;

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
  html` <al-checkbox-group ${spread(args)}>
    <al-checkbox name="checkbox-name" value="checkbox-value-1">Checkbox 1</al-checkbox>
    <al-checkbox name="checkbox-name" value="checkbox-value-2">Checkbox 2</al-checkbox>
    <al-checkbox name="checkbox-name" value="checkbox-value-3">Checkbox 3</al-checkbox>
    <al-checkbox name="checkbox-name" value="checkbox-value-4" ?isDisabled=${true}>Checkbox 4</al-checkbox>
    <al-field-note slot="field-note"><al-icon-help></al-icon-help>This is a field note.</al-field-note>
  </al-checkbox-group>`;

export const SlottedFieldNote = TemplateSlottedFieldNote.bind({});
SlottedFieldNote.args = {};

const TemplateSlottedErrorNote = (args) =>
  html` <al-checkbox-group ${spread(args)}>
    <al-checkbox name="checkbox-name" value="checkbox-value-1">Checkbox 1</al-checkbox>
    <al-checkbox name="checkbox-name" value="checkbox-value-2">Checkbox 2</al-checkbox>
    <al-checkbox name="checkbox-name" value="checkbox-value-3">Checkbox 3</al-checkbox>
    <al-checkbox name="checkbox-name" value="checkbox-value-4" ?isDisabled=${true}>Checkbox 4</al-checkbox>
    <al-field-note slot="error"><al-icon-warning-circle></al-icon-warning-circle>This is an error note.</al-field-note>
  </al-checkbox-group>`;

export const SlottedErrorNote = TemplateSlottedErrorNote.bind({});
SlottedErrorNote.args = {
  isError: true,
  isRequired: true,
  fieldNote: false
};
