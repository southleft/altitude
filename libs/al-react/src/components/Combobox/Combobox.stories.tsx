import type { StoryObj } from '@storybook/react-vite';
import { ALCombobox } from '../..';

const fruits = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' },
  { label: 'Date', value: 'date', disabled: true },
  { label: 'Grape', value: 'grape' }
];

export default {
  title: 'Molecules/Combobox',
  component: ALCombobox,
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: { handles: ['onComboboxOpen', 'onComboboxClose', 'onComboboxChange', 'onComboboxFilter'] }
  },
  args: {
    label: 'Fruit',
    placeholder: 'Search fruits…',
    items: fruits
  }
};

export const Default: StoryObj<typeof ALCombobox> = { args: {} };

export const Disabled: StoryObj<typeof ALCombobox> = { args: { isDisabled: true } };

export const Error: StoryObj<typeof ALCombobox> = {
  args: { isError: true, errorNote: 'Please choose a valid fruit.' }
};
