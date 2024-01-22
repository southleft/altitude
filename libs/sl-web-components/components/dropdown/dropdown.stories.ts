import { html } from 'lit';
import { spread } from '../../directives/spread';
import '../icon/icons/calendar';
import '../icon/icons/warning-circle';
import '../list-item/list-item';
import '../list/list';
import './dropdown';

const dataSource = [
  { label: 'List item 1', value: 'List item 1' },
  { label: 'List item 2', value: 'List item 2' },
  { label: 'List item 3', value: 'List item 3' },
  { label: 'List item 4', value: 'List item 4' },
  { label: 'List item 5', value: 'List item 5' },
  { label: 'List item 6', value: 'List item 6' },
  { label: 'List item 7', value: 'List item 7' },
  { label: 'List item 8', value: 'List item 8' },
  { label: 'List item 9', value: 'List item 9' },
  { label: 'List item 10', value: 'List item 10' }
];

export default {
  title: 'Components/Dropdown',
  component: 'sl-dropdown',
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['open', 'close']
    }
  },
  args: {
    label: 'Select Option',
    fieldNote: 'This is a field note.',
    placeholder: 'Placeholder',
    dataSource: dataSource
  }
};

const Template = (args) => html`
  <sl-dropdown ${spread(args)}>
    <sl-list>${dataSource.map((item: any) => html`<sl-list-item value=${item.value}>${item.label}</sl-list-item>`)}</sl-list>
  </sl-dropdown>
`;

export const Default = Template.bind({});
Default.args = {};

export const Filled = Template.bind({});
Filled.args = {
  value: 'List item 1'
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
  <sl-dropdown ${spread(args)}>
    <sl-list>${dataSource.map((item: any) => html`<sl-list-item value=${item.value}>${item.label}</sl-list-item>`)}</sl-list>
    <sl-field-note slot="field-note"><sl-icon-help></sl-icon-help>This is a field note.</sl-field-note>
  </sl-dropdown>`;

export const SlottedFieldNote = TemplateSlottedFieldNote.bind({});
SlottedFieldNote.args = {};

const TemplateSlottedErrorNote = (args) => html`
  <sl-dropdown ${spread(args)}>
    <sl-list>${dataSource.map((item: any) => html`<sl-list-item value=${item.value}>${item.label}</sl-list-item>`)}</sl-list>
    <sl-field-note slot="error"><sl-icon-warning-circle></sl-icon-warning-circle>This is an error note.</sl-field-note>
  </sl-dropdown>`;

export const SlottedErrorNote = TemplateSlottedErrorNote.bind({});
SlottedErrorNote.args = {
  isError: true,
  fieldNote: false,
};

const TemplateAlignment = (args) => html`
  <div style="display: flex; height: 90vh; align-items: flex-end;">
    <sl-dropdown ${spread(args)}>
      <sl-list>${dataSource.map((item: any) => html`<sl-list-item value=${item.value}>${item.label}</sl-list-item>`)}</sl-list>
    </sl-dropdown>
  </div>
`;

export const WithAlignTop = TemplateAlignment.bind({});
WithAlignTop.args = {
  align: 'top'
};

export const WithAlignAuto = TemplateAlignment.bind({});
WithAlignAuto.args = {};

export const WithSearch = TemplateAlignment.bind({});
WithSearch.args = {
  hasSearch: true,
};