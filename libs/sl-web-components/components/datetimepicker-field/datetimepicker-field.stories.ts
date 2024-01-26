import { html } from 'lit';
import { spread } from '../../directives/spread';
import '../field-note/field-note';
import '../icon/icons/help';
import '../icon/icons/warning-circle';
import './datetimepicker-field';

export default {
  title: 'Components/Datetimepicker Field',
  component: 'sl-datetimepicker-field',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['open', 'close', 'dateChanged', 'timeChanged']
    },
    layout: 'padded',
  },
  args: {
    label: 'Select a Date & Time',
    fieldNote: 'This is a field note.',
    placeholder: 'Placeholder'
  },
};

const Template = (args) => html`<sl-datetimepicker-field ${spread(args)} data-testid="datetimepicker-field"></sl-datetimepicker-field>`;

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
  <sl-datetimepicker-field ${spread(args)}>
    <sl-field-note slot="field-note"><sl-icon-help></sl-icon-help>This is a field note.</sl-field-note>
  </sl-datetimepicker-field>
`;

export const SlottedFieldNote = TemplateSlottedFieldNote.bind({});
SlottedFieldNote.args = {
};

const TemplateSlottedErrorNote = (args) => html`
  <sl-datetimepicker-field ${spread(args)}>
    <sl-field-note slot="error"><sl-icon-warning-circle></sl-icon-warning-circle>This is an error note.</sl-field-note>
  </sl-datetimepicker-field>
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
  <div style="height: 90vh; display: flex; justify-content: center; align-items: flex-end;">
    <sl-datetimepicker-field ${spread(args)}></sl-datetimepicker-field>
  </div>
`;

export const WithDynamicPlacement = TemplateWithDynamicPlacement.bind({});
WithDynamicPlacement.args = {};
