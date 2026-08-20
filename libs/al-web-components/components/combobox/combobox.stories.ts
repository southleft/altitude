import { html } from 'lit';
import { withActions } from 'storybook/actions/decorator';
import { spread } from '../../directives/spread';
import './combobox';

const fruits = [
  { label: 'Apple', value: 'apple' },
  { label: 'Apricot', value: 'apricot' },
  { label: 'Banana', value: 'banana' },
  { label: 'Blackberry', value: 'blackberry' },
  { label: 'Blueberry', value: 'blueberry' },
  { label: 'Cherry', value: 'cherry' },
  { label: 'Date', value: 'date', disabled: true },
  { label: 'Grape', value: 'grape' },
  { label: 'Mango', value: 'mango' },
  { label: 'Orange', value: 'orange' }
];

const meta = {
  title: 'Molecules/Combobox',
  component: 'al-combobox',
  tags: ['autodocs'],
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: { handles: ['onComboboxOpen', 'onComboboxClose', 'onComboboxChange', 'onComboboxFilter'] }
  },
  decorators: [withActions],
  args: {
    label: 'Fruit',
    placeholder: 'Search fruits…',
    fieldNote: 'Type to filter, use arrow keys to navigate.',
    items: fruits
  }
};

export default meta;

const Template = (args: any) => html` <al-combobox ${spread(args)}></al-combobox> `;

export const Default = { render: Template };

export const Filled = {
  render: Template,
  args: { value: 'Banana', selectedValue: 'banana' }
};

export const Error = {
  render: Template,
  args: { isError: true, errorNote: 'Please choose a valid fruit.' }
};

export const Disabled = {
  render: Template,
  args: { isDisabled: true }
};

export const Required = {
  render: Template,
  args: { isRequired: true }
};

export const HiddenLabel = {
  render: Template,
  args: { hideLabel: true }
};

export const ManualFiltering = {
  render: (args: any) => {
    const handleFilter = (e: CustomEvent) => {
      const target = e.currentTarget as any;
      const query = (e.detail.query ?? '').toLowerCase();
      target.items = query ? fruits.filter((item) => item.label.toLowerCase().includes(query)) : fruits;
    };
    return html`<al-combobox ${spread(args)} filterMode="manual" .items=${fruits} @onComboboxFilter=${handleFilter}></al-combobox>`;
  },
  args: { label: 'Fruit (manually filtered)' }
};

export const NoResults = {
  render: Template,
  args: { items: [], noResultsText: 'Nothing matches that search.' }
};
