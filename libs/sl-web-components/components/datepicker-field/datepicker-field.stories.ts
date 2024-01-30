import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import '../field-note/field-note';
import '../icon/icons/help';
import '../icon/icons/warning-circle';
import './datepicker-field';

export default {
  title: 'Molecules/Datepicker Field',
  component: 'sl-datepicker-field',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onDatepickerFieldOpen', 'onDatepickerFieldClose', 'onDatepickerFieldChange']
    },
  },
  decorators: [withActions],
  args: {
    label: 'Select a Date',
    fieldNote: 'This is a field note.',
    placeholder: 'Placeholder'
  },
};

const Template = (args) => html`<sl-datepicker-field ${spread(args)} data-testid="datepicker-field"></sl-datepicker-field>`;

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
  <sl-datepicker-field ${spread(args)}>
    <sl-field-note slot="field-note"><sl-icon-help></sl-icon-help>This is a field note.</sl-field-note>
  </sl-datepicker-field>
`;

export const SlottedFieldNote = TemplateSlottedFieldNote.bind({});
SlottedFieldNote.args = {
};

const TemplateSlottedErrorNote = (args) => html`
  <sl-datepicker-field ${spread(args)}>
    <sl-field-note slot="error"><sl-icon-warning-circle></sl-icon-warning-circle>This is an error note.</sl-field-note>
  </sl-datepicker-field>
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
    <sl-datepicker-field ${spread(args)}></sl-datepicker-field>
  </div>
`;

export const WithDynamicPlacement = TemplateWithDynamicPlacement.bind({});
WithDynamicPlacement.args = {};
