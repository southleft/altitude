import { html } from 'lit';
import { spread } from '../../directives/spread';
import '../badge/badge';
import '../icon/icons/success';
import '../tab-panel/tab-panel';
import '../tab/tab';
import './tabs';

export default {
  title: 'Molecules/Navigation/Tabs',
  component: 'al-tabs',
  tags: [ 'autodocs' ],
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onTabsChange']
    },
    controls: {
      exclude: ['activeTab', 'isScrollable', 'tabsList', 'tabPanels', 'tabItems', 'isLTR', 'handleOnScroll', 'handleOnResize']
    }
  },
  argTypes: {
    variant: {
      control: { type: 'radio' },
      options: ['default', 'stretch']
    },
    activeIndex: {
      control: 'number'
    }
  }
};

const Template = (args) => html`
  <al-tabs ${spread(args)} data-testid="tabs">
    <al-tab data-testid="tab-item-01"><al-icon-success></al-icon-success><span class="al-u-is-vishidden">Overview</span></al-tab>
    <al-tab data-testid="tab-item-02"><al-icon-success></al-icon-success><span class="al-u-is-vishidden">Usage</span></al-tab>
    <al-tab data-testid="tab-item-03">Accessibility<al-badge variant="danger">4</al-badge></al-tab>
    <al-tab data-testid="tab-item-04">Tokens</al-tab>
    <al-tab data-testid="tab-item-05">Patterns</al-tab>
    <al-tab data-testid="tab-item-06">Anatomy</al-tab>
    <al-tab data-testid="tab-item-07">Behavior</al-tab>
    <al-tab data-testid="tab-item-08">Theming</al-tab>
    <al-tab data-testid="tab-item-09">Migration</al-tab>
    <al-tab data-testid="tab-item-10" ?isDisabled=${true}>Changelog</al-tab>
    <al-tab-panel slot="panel">Tab panel 1</al-tab-panel>
    <al-tab-panel slot="panel">Tab panel 2</al-tab-panel>
    <al-tab-panel slot="panel">Tab panel 3</al-tab-panel>
    <al-tab-panel slot="panel">Tab panel 4</al-tab-panel>
    <al-tab-panel slot="panel">Tab panel 5</al-tab-panel>
    <al-tab-panel slot="panel">Tab panel 6</al-tab-panel>
    <al-tab-panel slot="panel">Tab panel 7</al-tab-panel>
    <al-tab-panel slot="panel">Tab panel 8</al-tab-panel>
    <al-tab-panel slot="panel">Tab panel 9</al-tab-panel>
    <al-tab-panel slot="panel">Tab panel 10</al-tab-panel>
  </al-tabs>
`;

export const Default = Template.bind({});
Default.args = {};

export const Stretch = Template.bind({});
Stretch.args = {
  variant: 'stretch'
};

export const WithActiveIndex = Template.bind({});
WithActiveIndex.args = {
  activeIndex: '2'
};

const TemplateWithScroll = (args) => html`
  <div style="max-width: 530px;">
    <al-tabs ${spread(args)} data-testid="tabs">
      <al-tab data-testid="tab-item-01"><al-icon-success></al-icon-success><span class="al-u-is-vishidden">Overview</span></al-tab>
      <al-tab data-testid="tab-item-02"><al-icon-success></al-icon-success><span class="al-u-is-vishidden">Usage</span></al-tab>
      <al-tab data-testid="tab-item-03">Accessibility<al-badge variant="danger">4</al-badge></al-tab>
      <al-tab data-testid="tab-item-04">Tokens</al-tab>
      <al-tab data-testid="tab-item-05">Patterns</al-tab>
      <al-tab data-testid="tab-item-06">Anatomy</al-tab>
      <al-tab data-testid="tab-item-07">Behavior</al-tab>
      <al-tab data-testid="tab-item-08">Theming</al-tab>
      <al-tab data-testid="tab-item-09">Migration</al-tab>
      <al-tab data-testid="tab-item-10" ?isDisabled=${true}>Changelog</al-tab>
      <al-tab-panel slot="panel">Tab panel 1</al-tab-panel>
      <al-tab-panel slot="panel">Tab panel 2</al-tab-panel>
      <al-tab-panel slot="panel">Tab panel 3</al-tab-panel>
      <al-tab-panel slot="panel">Tab panel 4</al-tab-panel>
      <al-tab-panel slot="panel">Tab panel 5</al-tab-panel>
      <al-tab-panel slot="panel">Tab panel 6</al-tab-panel>
      <al-tab-panel slot="panel">Tab panel 7</al-tab-panel>
      <al-tab-panel slot="panel">Tab panel 8</al-tab-panel>
      <al-tab-panel slot="panel">Tab panel 9</al-tab-panel>
      <al-tab-panel slot="panel">Tab panel 10</al-tab-panel>
    </al-tabs>
  </div>
`;
export const WithScroll = TemplateWithScroll.bind({});
WithScroll.args = {};

/*------------------------------------*\
  #STORYBOOK TESTS
\*------------------------------------*/

// Helper function to wait for the buttons to load
async function waitForButtons(tabs: any) {
  // Create a promise that resolves after 1 ms
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  await delay(1); // Wait for 1 ms
  return tabs.shadowRoot?.querySelectorAll('.al-c-tabs__arrow');
}

