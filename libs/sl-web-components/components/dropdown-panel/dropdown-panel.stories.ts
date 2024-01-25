import { html } from 'lit';
import { spread } from '../../directives/spread';
import '../icon/icons/done';
import '../list-item/list-item';
import '../list/list';
import '../search-form/search-form';
import './dropdown-panel';

export default {
  title: 'Components/Dropdown Panel',
  component: 'sl-dropdown-panel',
  tags: [ 'autodocs' ],
  parameters: { status: { type: 'stable' } }
};

export const Default = (args) => html`
  <sl-dropdown-panel ${spread(args)}>
    <sl-list>
      <sl-list-item>List item</sl-list-item>
      <sl-list-item>List item</sl-list-item>
      <sl-list-item>List item</sl-list-item>
      <sl-list-item>List item</sl-list-item>
      <sl-list-item>List item</sl-list-item>
      <sl-list-item>List item</sl-list-item>
      <sl-list-item>List item</sl-list-item>
      <sl-list-item>List item</sl-list-item>
      <sl-list-item>List item</sl-list-item>
      <sl-list-item>List item</sl-list-item>
    </sl-list>
  </sl-dropdown-panel>
`;

export const WithScroll = () => html`
  <sl-dropdown-panel hasScroll=${true}>
    <sl-list>
      <sl-list-item>List item</sl-list-item>
      <sl-list-item>List item</sl-list-item>
      <sl-list-item>List item</sl-list-item>
      <sl-list-item>List item</sl-list-item>
      <sl-list-item>List item</sl-list-item>
      <sl-list-item>List item</sl-list-item>
      <sl-list-item>List item</sl-list-item>
      <sl-list-item>List item</sl-list-item>
      <sl-list-item>List item</sl-list-item>
      <sl-list-item>List item</sl-list-item>
    </sl-list>
  </sl-dropdown-panel>
`;

export const WithIconList = () => html`
  <sl-dropdown-panel>
    <sl-list>
      <sl-list-item><sl-icon-done slot="before"></sl-icon-done>List Item</sl-list-item>
      <sl-list-item><sl-icon-done slot="before"></sl-icon-done>List Item</sl-list-item>
      <sl-list-item><sl-icon-done slot="before"></sl-icon-done>List Item</sl-list-item>
      <sl-list-item><sl-icon-done slot="before"></sl-icon-done>List Item</sl-list-item>
      <sl-list-item><sl-icon-done slot="before"></sl-icon-done>List Item</sl-list-item>
      <sl-list-item><sl-icon-done slot="before"></sl-icon-done>List Item</sl-list-item>
      <sl-list-item><sl-icon-done slot="before"></sl-icon-done>List Item</sl-list-item>
      <sl-list-item><sl-icon-done slot="before"></sl-icon-done>List Item</sl-list-item>
    </sl-list>
  </sl-dropdown-panel>
`;

export const WithSearch = () => html`
  <sl-dropdown-panel ?hasHeader=${true} hasScroll=${true}>
    <sl-search-form slot="header" .value=${''} ?isEmpty=${true}> </sl-search-form>
    <sl-list>
      <sl-list-item>List Item</sl-list-item>
      <sl-list-item>List Item</sl-list-item>
      <sl-list-item>List Item</sl-list-item>
      <sl-list-item>List Item</sl-list-item>
      <sl-list-item>List Item</sl-list-item>
      <sl-list-item>List Item</sl-list-item>
      <sl-list-item>List Item</sl-list-item>
      <sl-list-item>List Item</sl-list-item>
    </sl-list>
  </sl-dropdown-panel>
`;