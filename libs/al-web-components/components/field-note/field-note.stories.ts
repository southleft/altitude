import { html } from 'lit';
import { spread } from '../../directives/spread';
import './field-note';

export default {
  title: 'Atoms/Field Note',
  component: 'al-field-note',
  tags: [ 'autodocs' ],
  parameters: { status: { type: 'beta' } },
  argTypes: {
    isError: {
      control: 'boolean',
    },
    isDisabled: {
      control: 'boolean',
    },
  },
};

const Template = (args) => html`<al-field-note ${spread(args)}>This is a field note.</al-field-note>`;

export const Default = Template.bind({});
Default.args = {};

export const Error = Template.bind({});
Error.args = {
  isError: true,
};

export const Disabled = Template.bind({});
Disabled.args = {
  isDisabled: true,
};