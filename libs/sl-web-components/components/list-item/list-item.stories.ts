import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import '../checkbox-item/checkbox-item';
import '../list/list';
import './list-item';

export default {
  title: 'Atoms/List Item',
  component: 'sl-list-item',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['select']
    }
  },
  decorators: [ withActions ],
};

const Template = (args) => html`<sl-list-item ${spread(args)}>List Item</sl-list-item>`;

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
  <sl-list-item>
    <sl-checkbox-item>List Item</sl-checkbox-item>
  </sl-list-item>
`;

export const WithFlyout = () => html`
  <div style="width: 150px;">
    <sl-list-item behavior="flyout">
      List Item
      <sl-list slot="items">
        <sl-list-item>List Item</sl-list-item>
        <sl-list-item>List Item</sl-list-item>
        <sl-list-item>List Item</sl-list-item>
        <sl-list-item>List Item</sl-list-item>
      </sl-list>
    </sl-list-item>
  </div>
`;