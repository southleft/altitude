import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import '../field-note/field-note';
import '../icon/icons/help';
import '../icon/icons/warning-circle';
import '../list-item/list-item';
import '../list/list';
import './search-form';

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
  title: 'Molecules/Search Form',
  component: 'sl-search-form',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['onSearchFormChange']
    }
  },
  decorators: [withActions],
  args: {
    label: 'Search',
    fieldNote: 'This is a field note.',
    placeholder: 'Placeholder',
    dataSource: dataSource,
  }
};

const Template = (args) => html`
  <sl-search-form ${spread(args)}>
    <sl-list>${dataSource.map((item: any) => html`<sl-list-item value=${item.value}>${item.label}</sl-list-item>`)}</sl-list>
  </sl-search-form>
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

export const HiddenLabel = Template.bind({});
HiddenLabel.args = {
  hideLabel: true
};

const TemplateSlottedFieldNote = (args) => html`
  <sl-search-form ${spread(args)}>
    <sl-list>${dataSource.map((item: any) => html`<sl-list-item value=${item.value}>${item.label}</sl-list-item>`)}</sl-list>
    <sl-field-note slot="field-note"><sl-icon-help></sl-icon-help>This is a field note.</sl-field-note>
  </sl-search-form>`;

export const SlottedFieldNote = TemplateSlottedFieldNote.bind({});
SlottedFieldNote.args = {};

const TemplateSlottedErrorNote = (args) => html`
  <sl-search-form ${spread(args)}>
    <sl-list>${dataSource.map((item: any) => html`<sl-list-item value=${item.value}>${item.label}</sl-list-item>`)}</sl-list>
    <sl-field-note slot="error"><sl-icon-warning-circle></sl-icon-warning-circle>This is an error note.</sl-field-note>
  </sl-search-form>`;

export const SlottedErrorNote = TemplateSlottedErrorNote.bind({});
SlottedErrorNote.args = {
  isError: true,
  fieldNote: false,
};
