import { html } from 'lit';
import { spread } from '../../directives/spread';
import '../icon/icons/check';
import '../list-item/list-item';
import '../list/list';
import '../search/search';
import './dropdown-panel';

export default {
  title: 'Atoms/Dropdown Panel',
  component: 'sl-dropdown-panel',
  tags: [ 'autodocs' ],
  parameters: { status: { type: 'beta' } }
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
      <sl-list-item><sl-icon-check slot="before"></sl-icon-check>List Item</sl-list-item>
      <sl-list-item><sl-icon-check slot="before"></sl-icon-check>List Item</sl-list-item>
      <sl-list-item><sl-icon-check slot="before"></sl-icon-check>List Item</sl-list-item>
      <sl-list-item><sl-icon-check slot="before"></sl-icon-check>List Item</sl-list-item>
      <sl-list-item><sl-icon-check slot="before"></sl-icon-check>List Item</sl-list-item>
      <sl-list-item><sl-icon-check slot="before"></sl-icon-check>List Item</sl-list-item>
      <sl-list-item><sl-icon-check slot="before"></sl-icon-check>List Item</sl-list-item>
      <sl-list-item><sl-icon-check slot="before"></sl-icon-check>List Item</sl-list-item>
    </sl-list>
  </sl-dropdown-panel>
`;

export const WithSearch = () => html`
  <sl-dropdown-panel ?hasHeader=${true} hasScroll=${true}>
    <sl-search slot="header" .value=${''} ?isEmpty=${true}> </sl-search>
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