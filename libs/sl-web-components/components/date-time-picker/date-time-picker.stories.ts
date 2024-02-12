import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import '../field-note/field-note';
import '../icon/icons/help';
import '../icon/icons/warning-circle';
import './date-time-picker';

export default {
  title: 'Molecules/Date & Time Picker',
  component: 'sl-date-time-picker',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onDateTimePickerOpen', 'onDateTimePickerClose', 'onDateTimePickerDateChange', 'onDateTimePickerTimeChange']
    },
  },
  decorators: [ withActions ],
  args: {
    label: 'Select a Date & Time',
    fieldNote: 'This is a field note.',
    placeholder: 'Placeholder'
  },
};

const Template = (args) => html`<sl-date-time-picker ${spread(args)} data-testid="date-time-picker"></sl-date-time-picker>`;

export const Default = Template.bind({});
Default.args = {};

export const Filled = Template.bind({});
Filled.args = {
  value: 'Nov 01, 2023'
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
  <sl-date-time-picker ${spread(args)}>
    <sl-field-note slot="field-note"><sl-icon-help></sl-icon-help>This is a field note.</sl-field-note>
  </sl-date-time-picker>
`;

export const SlottedFieldNote = TemplateSlottedFieldNote.bind({});
SlottedFieldNote.args = {
};

const TemplateSlottedErrorNote = (args) => html`
  <sl-date-time-picker ${spread(args)}>
    <sl-field-note slot="error"><sl-icon-warning-circle></sl-icon-warning-circle>This is an error note.</sl-field-note>
  </sl-date-time-picker>
`;

export const SlottedErrorNote = TemplateSlottedErrorNote.bind({});
SlottedErrorNote.args = {
  isError: true,
  fieldNote: false,
};

export const WithCustomDateFormat = Template.bind({});
WithCustomDateFormat.args = {
  dateFormat: 'MM/dd/yyyy',
  disabledMinDate: '2023/10/03',
  disabledMaxDate: '2023/12/30',
};

const TemplateWithDynamicPlacement = (args) => html`
  <div style="height: 90vh; max-height: 600px; display: flex; justify-content: center; align-items: flex-end;">
    <sl-date-time-picker ${spread(args)}></sl-date-time-picker>
  </div>
`;

export const WithDynamicPlacement = TemplateWithDynamicPlacement.bind({});
WithDynamicPlacement.args = {};