import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import '../heading/heading';
import '../list-item/list-item';
import './list';

export default {
  title: 'Molecules/List',
  component: 'al-list',
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
  <al-list ${spread(args)}>
    <al-list-item>List Item</al-list-item>
    <al-list-item>List Item</al-list-item>
    <al-list-item>List Item</al-list-item>
    <al-list-item>List Item</al-list-item>
    <al-list-item>List Item</al-list-item>
    <al-list-item>List Item</al-list-item>
    <al-list-item>List Item</al-list-item>
    <al-list-item>List Item</al-list-item>
    <al-list-item ?isError=${true}>List Item</al-list-item>
    <al-list-item ?isDisabled=${true}>List Item</al-list-item>
  </al-list>
`;

export const Default = Template.bind({});
Default.args = {};

export const WithLinks = () => html`
  <al-list>
    <al-list-item href="#">List Item</al-list-item>
    <al-list-item href="#">List Item</al-list-item>
    <al-list-item href="#">List Item</al-list-item>
    <al-list-item href="#">List Item</al-list-item>
    <al-list-item href="#">List Item</al-list-item>
    <al-list-item href="#">List Item</al-list-item>
    <al-list-item href="#">List Item</al-list-item>
    <al-list-item href="#">List Item</al-list-item>
    <al-list-item href="#" ?isError=${true}>List Item</al-list-item>
    <al-list-item href="#" ?isDisabled=${true}>List Item</al-list-item>
  </al-list>
`;

export const WithStatic = () => html`
  <al-list>
    <al-list-item variant="static">List Item</al-list-item>
    <al-list-item variant="static">List Item</al-list-item>
    <al-list-item variant="static">List Item</al-list-item>
    <al-list-item variant="static">List Item</al-list-item>
    <al-list-item variant="static">List Item</al-list-item>
    <al-list-item variant="static">List Item</al-list-item>
    <al-list-item variant="static">List Item</al-list-item>
    <al-list-item variant="static">List Item</al-list-item>
    <al-list-item variant="static" ?isError=${true}>List Item</al-list-item>
    <al-list-item variant="static" ?isDisabled=${true}>List Item</al-list-item>
  </al-list>
`;

export const WithFlyoutMenu = () => html`
  <al-dropdown-panel style="display: block; max-width: 10rem">
    <al-list>
      <al-list-item behavior="flyout">
        List Item
        <al-list slot="items">
          <al-list-item behavior="flyout">
            List Item
            <al-list slot="items">
              <al-list-item behavior="flyout">
                List Item
                <al-list slot="items">
                  <al-list-item behavior="flyout">
                    List Item
                    <al-list slot="items">
                      <al-list-item>List Item</al-list-item>
                      <al-list-item>List Item</al-list-item>
                      <al-list-item>List Item</al-list-item>
                      <al-list-item>List Item</al-list-item>
                    </al-list>
                  </al-list-item>
                  <al-list-item>List Item</al-list-item>
                  <al-list-item>List Item</al-list-item>
                  <al-list-item>List Item</al-list-item>
                </al-list>
              </al-list-item>
              <al-list-item>List Item</al-list-item>
              <al-list-item>List Item</al-list-item>
              <al-list-item>List Item</al-list-item>
            </al-list>
          </al-list-item>
          <al-list-item>List Item</al-list-item>
          <al-list-item>List Item</al-list-item>
          <al-list-item>List Item</al-list-item>
        </al-list>
      </al-list-item>
      <al-list-item>List Item</al-list-item>
      <al-list-item ?isError=${true}>List Item</al-list-item>
      <al-list-item ?isDisabled=${true}>List Item</al-list-item>
    </al-list>
  </al-dropdown-panel>
`;

export const WithExpandableList = () => html`
  <al-list>
    <al-list-item>
      List Item
      <al-list slot="items">
        <al-list-item>
          List Item
          <al-list slot="items">
            <al-list-item>
              List Item
              <al-list slot="items">
                <al-list-item>
                  List Item
                  <al-list slot="items">
                    <al-list-item>
                      List Item
                      <al-list slot="items">
                        <al-list-item>
                          List Item
                          <al-list slot="items">
                            <al-list-item>
                              List Item
                              <al-list slot="items">
                                <al-list-item>List Item</al-list-item>
                                <al-list-item>List Item</al-list-item>
                                <al-list-item>List Item</al-list-item>
                                <al-list-item>List Item</al-list-item>
                              </al-list>
                            </al-list-item>
                            <al-list-item>List Item</al-list-item>
                            <al-list-item>List Item</al-list-item>
                            <al-list-item>List Item</al-list-item>
                          </al-list>
                        </al-list-item>
                        <al-list-item>List Item</al-list-item>
                        <al-list-item>List Item</al-list-item>
                        <al-list-item>List Item</al-list-item>
                      </al-list>
                    </al-list-item>
                    <al-list-item>List Item</al-list-item>
                    <al-list-item>List Item</al-list-item>
                    <al-list-item>List Item</al-list-item>
                  </al-list>
                </al-list-item>
                <al-list-item>List Item</al-list-item>
                <al-list-item>List Item</al-list-item>
                <al-list-item>List Item</al-list-item>
              </al-list>
            </al-list-item>
            <al-list-item>List Item</al-list-item>
            <al-list-item>List Item</al-list-item>
            <al-list-item>List Item</al-list-item>
          </al-list>
        </al-list-item>
        <al-list-item>List Item</al-list-item>
        <al-list-item>List Item</al-list-item>
        <al-list-item>List Item</al-list-item>
      </al-list>
    </al-list-item>
    <al-list-item>List Item</al-list-item>
    <al-list-item ?isError=${true}>List Item</al-list-item>
    <al-list-item ?isDisabled=${true}>List Item</al-list-item>
  </al-list>
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
