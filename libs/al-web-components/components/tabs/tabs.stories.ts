import { expect, userEvent, within } from '@storybook/test';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import { withActions } from '@storybook/addon-actions/decorator';
import '../badge/badge';
import '../icon/icons/check';
import '../tab-panel/tab-panel';
import '../tab/tab';
import './tabs';

export default {
  title: 'Molecules/Tabs',
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
  decorators: [ withActions ],
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
    <al-tab data-testid="tab-item-01"><al-icon-check></al-icon-check><span class="al-u-is-vishidden">Tab 1</span></al-tab>
    <al-tab data-testid="tab-item-02"><al-icon-check></al-icon-check><span class="al-u-is-vishidden">Tab 2</span></al-tab>
    <al-tab data-testid="tab-item-03">Tab 3<al-badge variant="danger">2</al-badge></al-tab>
    <al-tab data-testid="tab-item-04">Tab 4</al-tab>
    <al-tab data-testid="tab-item-05">Tab 5</al-tab>
    <al-tab data-testid="tab-item-06">Tab 6</al-tab>
    <al-tab data-testid="tab-item-07">Tab 7</al-tab>
    <al-tab data-testid="tab-item-08">Tab 8</al-tab>
    <al-tab data-testid="tab-item-09">Tab 9</al-tab>
    <al-tab data-testid="tab-item-10" ?isDisabled=${true}>Tab 10</al-tab>
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
      <al-tab data-testid="tab-item-01"><al-icon-check></al-icon-check><span class="al-u-is-vishidden">Tab 1</span></al-tab>
      <al-tab data-testid="tab-item-02"><al-icon-check></al-icon-check><span class="al-u-is-vishidden">Tab 2</span></al-tab>
      <al-tab data-testid="tab-item-03">Tab 3<al-badge variant="danger">2</al-badge></al-tab>
      <al-tab data-testid="tab-item-04">Tab 4</al-tab>
      <al-tab data-testid="tab-item-05">Tab 5</al-tab>
      <al-tab data-testid="tab-item-06">Tab 6</al-tab>
      <al-tab data-testid="tab-item-07">Tab 7</al-tab>
      <al-tab data-testid="tab-item-08">Tab 8</al-tab>
      <al-tab data-testid="tab-item-09">Tab 9</al-tab>
      <al-tab data-testid="tab-item-10" ?isDisabled=${true}>Tab 10</al-tab>
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

WithActiveIndex.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const tabs = canvas.queryByTestId('tabs') as any;
  const tabItems = canvas.queryAllByTestId(/^tab-item-0/) as any;

  // Make assertions
  expect(tabs).toBeInTheDocument();

  // Query the focusable elements within the tab items
  const firstTab = tabItems[0].shadowRoot.querySelector('.al-c-tab');
  const lastTab = tabItems[8].shadowRoot.querySelector('.al-c-tab');

  // Simulate a click event
  await userEvent.click(firstTab);
  expect(tabItems[0].isActive).toBe(true);

  // Simulate a keyboard event (pressing Arrow Right key)
  await userEvent.type(firstTab, '{arrowRight}');
  expect(tabItems[1].isActive).toBe(true);

  // Simulate a keyboard event (pressing Arrow Left key)
  await userEvent.type(firstTab, '{arrowLeft}');
  expect(tabItems[8].isActive).toBe(true);

  await userEvent.type(lastTab, '{arrowRight}');
  expect(tabItems[0].isActive).toBe(true);

  // Simulate a keyboard event (pressing End key)
  await userEvent.type(firstTab, '{End}');
  expect(tabItems[8].isActive).toBe(true);

  // Simulate a keyboard event (pressing End key)
  await userEvent.type(firstTab, '{Home}');
  expect(tabItems[0].isActive).toBe(true);

  await userEvent.click(tabItems[2].shadowRoot.querySelector('.al-c-tab'));

  // Remove focus
  tabItems[2].blur();
};

// Helper function to wait for the buttons to load
async function waitForButtons(tabs: any) {
  // Create a promise that resolves after 1 ms
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  await delay(1); // Wait for 1 ms
  return tabs.shadowRoot?.querySelectorAll('.al-c-tabs__arrow');
}

WithScroll.play = async ({ canvasElement }) => {
  document.dir = 'ltr';
  const canvas = within(canvasElement);
  const tabs = canvas.queryByTestId('tabs') as any;
  const tabItems = canvas.queryAllByTestId(/^tab-item-0/) as any;
  const arrows = await waitForButtons(tabs);
  const prevButton = arrows[0] as any;
  const nextButton = arrows[1] as any;

  expect(tabs.isScrollable).toBe(true);
  expect(tabItems[0].isActive).toBe(true);

  // Simulate a click event of next button
  await userEvent.click(nextButton);
  expect(tabItems[1].isActive).toBe(true);

  // Simulate a click event of prev button
  await userEvent.click(prevButton);
  expect(tabItems[0].isActive).toBe(true);

  // Simulate a keyboard event (pressing Enter key) while focused on prev button
  prevButton.focus();
  await userEvent.type(prevButton.shadowRoot.querySelector('.al-c-button'), '{Enter}');
  expect(tabItems[8].isActive).toBe(true);

  // Simulate a keyboard event (pressing Enter key) while focused on next button
  nextButton.focus();
  await userEvent.type(nextButton.shadowRoot.querySelector('.al-c-button'), '{Enter}');
  expect(tabItems[0].isActive).toBe(true);
  tabItems[0].blur();

  // Simulate a window resize event
  window.dispatchEvent(new Event('resize'));
  tabs.shadowRoot.querySelector('.al-c-tabs__list').dispatchEvent(new Event('scroll'));
};
