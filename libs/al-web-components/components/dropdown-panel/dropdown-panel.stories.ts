import { html } from 'lit';
import { spread } from '../../directives/spread';
import '../icon/icons/success';
import '../list-item/list-item';
import '../list/list';
import '../search/search';
import './dropdown-panel';

export default {
  title: 'Atoms/Dropdown Panel',
  component: 'al-dropdown-panel',
  tags: [ 'autodocs' ],
  parameters: { status: { type: 'beta' } }
};

export const Default = (args) => html`
  <al-dropdown-panel ${spread(args)}>
    <al-list>
      <al-list-item>List item</al-list-item>
      <al-list-item>List item</al-list-item>
      <al-list-item>List item</al-list-item>
      <al-list-item>List item</al-list-item>
      <al-list-item>List item</al-list-item>
      <al-list-item>List item</al-list-item>
      <al-list-item>List item</al-list-item>
      <al-list-item>List item</al-list-item>
      <al-list-item>List item</al-list-item>
      <al-list-item>List item</al-list-item>
    </al-list>
  </al-dropdown-panel>
`;

export const WithScroll = () => html`
  <al-dropdown-panel hasScroll=${true}>
    <al-list>
      <al-list-item>List item</al-list-item>
      <al-list-item>List item</al-list-item>
      <al-list-item>List item</al-list-item>
      <al-list-item>List item</al-list-item>
      <al-list-item>List item</al-list-item>
      <al-list-item>List item</al-list-item>
      <al-list-item>List item</al-list-item>
      <al-list-item>List item</al-list-item>
      <al-list-item>List item</al-list-item>
      <al-list-item>List item</al-list-item>
    </al-list>
  </al-dropdown-panel>
`;

export const WithIconList = () => html`
  <al-dropdown-panel>
    <al-list>
      <al-list-item><al-icon-success slot="before"></al-icon-success>List Item</al-list-item>
      <al-list-item><al-icon-success slot="before"></al-icon-success>List Item</al-list-item>
      <al-list-item><al-icon-success slot="before"></al-icon-success>List Item</al-list-item>
      <al-list-item><al-icon-success slot="before"></al-icon-success>List Item</al-list-item>
      <al-list-item><al-icon-success slot="before"></al-icon-success>List Item</al-list-item>
      <al-list-item><al-icon-success slot="before"></al-icon-success>List Item</al-list-item>
      <al-list-item><al-icon-success slot="before"></al-icon-success>List Item</al-list-item>
      <al-list-item><al-icon-success slot="before"></al-icon-success>List Item</al-list-item>
    </al-list>
  </al-dropdown-panel>
`;

export const WithSearch = () => html`
  <al-dropdown-panel ?hasHeader=${true} hasScroll=${true}>
    <al-search slot="header" .value=${''} ?isEmpty=${true}> </al-search>
    <al-list>
      <al-list-item>List Item</al-list-item>
      <al-list-item>List Item</al-list-item>
      <al-list-item>List Item</al-list-item>
      <al-list-item>List Item</al-list-item>
      <al-list-item>List Item</al-list-item>
      <al-list-item>List Item</al-list-item>
      <al-list-item>List Item</al-list-item>
      <al-list-item>List Item</al-list-item>
    </al-list>
  </al-dropdown-panel>
`;