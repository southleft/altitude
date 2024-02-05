import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import '../heading/heading';
import '../list-item/list-item';
import './list';

export default {
  title: 'Molecules/List',
  component: 'sl-list',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['select']
    }
  },
  decorators: [ withActions ],
};

const Template = (args) => html`
  <sl-list ${spread(args)}>
    <sl-list-item>List Item</sl-list-item>
    <sl-list-item>List Item</sl-list-item>
    <sl-list-item>List Item</sl-list-item>
    <sl-list-item>List Item</sl-list-item>
    <sl-list-item>List Item</sl-list-item>
    <sl-list-item>List Item</sl-list-item>
    <sl-list-item>List Item</sl-list-item>
    <sl-list-item>List Item</sl-list-item>
    <sl-list-item ?isError=${true}>List Item</sl-list-item>
    <sl-list-item ?isDisabled=${true}>List Item</sl-list-item>
  </sl-list>
`;

export const Default = Template.bind({});
Default.args = {};

export const WithLinks = () => html`
  <sl-list>
    <sl-list-item href="#">List Item</sl-list-item>
    <sl-list-item href="#">List Item</sl-list-item>
    <sl-list-item href="#">List Item</sl-list-item>
    <sl-list-item href="#">List Item</sl-list-item>
    <sl-list-item href="#">List Item</sl-list-item>
    <sl-list-item href="#">List Item</sl-list-item>
    <sl-list-item href="#">List Item</sl-list-item>
    <sl-list-item href="#">List Item</sl-list-item>
    <sl-list-item href="#" ?isError=${true}>List Item</sl-list-item>
    <sl-list-item href="#" ?isDisabled=${true}>List Item</sl-list-item>
  </sl-list>
`;

export const WithStatic = () => html`
  <sl-list>
    <sl-list-item variant="static">List Item</sl-list-item>
    <sl-list-item variant="static">List Item</sl-list-item>
    <sl-list-item variant="static">List Item</sl-list-item>
    <sl-list-item variant="static">List Item</sl-list-item>
    <sl-list-item variant="static">List Item</sl-list-item>
    <sl-list-item variant="static">List Item</sl-list-item>
    <sl-list-item variant="static">List Item</sl-list-item>
    <sl-list-item variant="static">List Item</sl-list-item>
    <sl-list-item variant="static" ?isError=${true}>List Item</sl-list-item>
    <sl-list-item variant="static" ?isDisabled=${true}>List Item</sl-list-item>
  </sl-list>
`;

export const WithFlyoutMenu = () => html`
  <sl-dropdown-panel style="display: block; max-width: 10rem">
    <sl-list>
      <sl-list-item behavior="flyout">
        List Item
        <sl-list slot="items">
          <sl-list-item behavior="flyout">
            List Item
            <sl-list slot="items">
              <sl-list-item behavior="flyout">
                List Item
                <sl-list slot="items">
                  <sl-list-item behavior="flyout">
                    List Item
                    <sl-list slot="items">
                      <sl-list-item>List Item</sl-list-item>
                      <sl-list-item>List Item</sl-list-item>
                      <sl-list-item>List Item</sl-list-item>
                      <sl-list-item>List Item</sl-list-item>
                    </sl-list>
                  </sl-list-item>
                  <sl-list-item>List Item</sl-list-item>
                  <sl-list-item>List Item</sl-list-item>
                  <sl-list-item>List Item</sl-list-item>
                </sl-list>
              </sl-list-item>
              <sl-list-item>List Item</sl-list-item>
              <sl-list-item>List Item</sl-list-item>
              <sl-list-item>List Item</sl-list-item>
            </sl-list>
          </sl-list-item>
          <sl-list-item>List Item</sl-list-item>
          <sl-list-item>List Item</sl-list-item>
          <sl-list-item>List Item</sl-list-item>
        </sl-list>
      </sl-list-item>
      <sl-list-item>List Item</sl-list-item>
      <sl-list-item ?isError=${true}>List Item</sl-list-item>
      <sl-list-item ?isDisabled=${true}>List Item</sl-list-item>
    </sl-list>
  </sl-dropdown-panel>
`;

export const WithExpandableList = () => html`
  <sl-list>
    <sl-list-item>
      List Item
      <sl-list slot="items">
        <sl-list-item>
          List Item
          <sl-list slot="items">
            <sl-list-item>
              List Item
              <sl-list slot="items">
                <sl-list-item>
                  List Item
                  <sl-list slot="items">
                    <sl-list-item>
                      List Item
                      <sl-list slot="items">
                        <sl-list-item>
                          List Item
                          <sl-list slot="items">
                            <sl-list-item>
                              List Item
                              <sl-list slot="items">
                                <sl-list-item>List Item</sl-list-item>
                                <sl-list-item>List Item</sl-list-item>
                                <sl-list-item>List Item</sl-list-item>
                                <sl-list-item>List Item</sl-list-item>
                              </sl-list>
                            </sl-list-item>
                            <sl-list-item>List Item</sl-list-item>
                            <sl-list-item>List Item</sl-list-item>
                            <sl-list-item>List Item</sl-list-item>
                          </sl-list>
                        </sl-list-item>
                        <sl-list-item>List Item</sl-list-item>
                        <sl-list-item>List Item</sl-list-item>
                        <sl-list-item>List Item</sl-list-item>
                      </sl-list>
                    </sl-list-item>
                    <sl-list-item>List Item</sl-list-item>
                    <sl-list-item>List Item</sl-list-item>
                    <sl-list-item>List Item</sl-list-item>
                  </sl-list>
                </sl-list-item>
                <sl-list-item>List Item</sl-list-item>
                <sl-list-item>List Item</sl-list-item>
                <sl-list-item>List Item</sl-list-item>
              </sl-list>
            </sl-list-item>
            <sl-list-item>List Item</sl-list-item>
            <sl-list-item>List Item</sl-list-item>
            <sl-list-item>List Item</sl-list-item>
          </sl-list>
        </sl-list-item>
        <sl-list-item>List Item</sl-list-item>
        <sl-list-item>List Item</sl-list-item>
        <sl-list-item>List Item</sl-list-item>
      </sl-list>
    </sl-list-item>
    <sl-list-item>List Item</sl-list-item>
    <sl-list-item ?isError=${true}>List Item</sl-list-item>
    <sl-list-item ?isDisabled=${true}>List Item</sl-list-item>
  </sl-list>
`;

export const Horizontal = Template.bind({});
Horizontal.args = {
  orientation: 'horizontal'
};

export const HorizontalOverflow = Template.bind({});
HorizontalOverflow.args = {
  orientation: 'horizontal',
  behavior: 'overflow'
};
