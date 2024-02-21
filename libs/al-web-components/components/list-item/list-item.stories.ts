import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import '../checkbox/checkbox';
import '../list/list';
import './list-item';

export default {
  title: 'Atoms/List Item',
  component: 'al-list-item',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['select']
    }
  },
  decorators: [ withActions ],
};

const Template = (args) => html`<al-list-item ${spread(args)}>List Item</al-list-item>`;

export const Default = Template.bind({});
Default.args = {};

export const Error = Template.bind({});
Error.args = {
  isError: true,
};

export const Disabled = Template.bind({});
Disabled.args = {
  isDisabled: true
};

export const WithStatic = Template.bind({});
WithStatic.args = {
  variant: 'static'
};

export const WithCheckbox = () => html`
  <al-list-item>
    <al-checkbox>List Item</al-checkbox>
  </al-list-item>
`;

export const WithFlyout = () => html`
  <div style="width: 150px;">
    <al-list-item behavior="flyout">
      List Item
      <al-list slot="items">
        <al-list-item>List Item</al-list-item>
        <al-list-item>List Item</al-list-item>
        <al-list-item>List Item</al-list-item>
        <al-list-item>List Item</al-list-item>
      </al-list>
    </al-list-item>
  </div>
`;