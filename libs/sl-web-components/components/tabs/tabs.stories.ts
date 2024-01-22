import { expect } from '@storybook/jest';
import { userEvent, within } from '@storybook/testing-library';
import { html } from 'lit';
import { spread } from '../../directives/spread';
import '../badge/badge';
import '../icon/icons/done';
import '../tab-panel/tab-panel';
import '../tab/tab';
import './tabs';

export default {
  title: 'Components/Tabs',
  component: 'sl-tabs',
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['tabSelect', 'tabChange']
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
  <sl-tabs ${spread(args)} data-testid="tabs">
    <sl-tab data-testid="tab-item-01"><sl-icon-done></sl-icon-done><span class="sl-u-is-vishidden">Tab 1</span></sl-tab>
    <sl-tab data-testid="tab-item-02"><sl-icon-done></sl-icon-done><span class="sl-u-is-vishidden">Tab 2</span></sl-tab>
    <sl-tab data-testid="tab-item-03">Tab 3<sl-badge variant="danger">2</sl-badge></sl-tab>
    <sl-tab data-testid="tab-item-04">Tab 4</sl-tab>
    <sl-tab data-testid="tab-item-05">Tab 5</sl-tab>
    <sl-tab data-testid="tab-item-06">Tab 6</sl-tab>
    <sl-tab data-testid="tab-item-07">Tab 7</sl-tab>
    <sl-tab data-testid="tab-item-08">Tab 8</sl-tab>
    <sl-tab data-testid="tab-item-09">Tab 9</sl-tab>
    <sl-tab data-testid="tab-item-10" ?isDisabled=${true}>Tab 10</sl-tab>
    <sl-tab-panel slot="panel">Tab panel 1</sl-tab-panel>
    <sl-tab-panel slot="panel">Tab panel 2</sl-tab-panel>
    <sl-tab-panel slot="panel">Tab panel 3</sl-tab-panel>
    <sl-tab-panel slot="panel">Tab panel 4</sl-tab-panel>
    <sl-tab-panel slot="panel">Tab panel 5</sl-tab-panel>
    <sl-tab-panel slot="panel">Tab panel 6</sl-tab-panel>
    <sl-tab-panel slot="panel">Tab panel 7</sl-tab-panel>
    <sl-tab-panel slot="panel">Tab panel 8</sl-tab-panel>
    <sl-tab-panel slot="panel">Tab panel 9</sl-tab-panel>
    <sl-tab-panel slot="panel">Tab panel 10</sl-tab-panel>
  </sl-tabs>
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
    <sl-tabs ${spread(args)} data-testid="tabs">
      <sl-tab data-testid="tab-item-01"><sl-icon-done></sl-icon-done><span class="sl-u-is-vishidden">Tab 1</span></sl-tab>
      <sl-tab data-testid="tab-item-02"><sl-icon-done></sl-icon-done><span class="sl-u-is-vishidden">Tab 2</span></sl-tab>
      <sl-tab data-testid="tab-item-03">Tab 3<sl-badge variant="danger">2</sl-badge></sl-tab>
      <sl-tab data-testid="tab-item-04">Tab 4</sl-tab>
      <sl-tab data-testid="tab-item-05">Tab 5</sl-tab>
      <sl-tab data-testid="tab-item-06">Tab 6</sl-tab>
      <sl-tab data-testid="tab-item-07">Tab 7</sl-tab>
      <sl-tab data-testid="tab-item-08">Tab 8</sl-tab>
      <sl-tab data-testid="tab-item-09">Tab 9</sl-tab>
      <sl-tab data-testid="tab-item-10" ?isDisabled=${true}>Tab 10</sl-tab>
      <sl-tab-panel slot="panel">Tab panel 1</sl-tab-panel>
      <sl-tab-panel slot="panel">Tab panel 2</sl-tab-panel>
      <sl-tab-panel slot="panel">Tab panel 3</sl-tab-panel>
      <sl-tab-panel slot="panel">Tab panel 4</sl-tab-panel>
      <sl-tab-panel slot="panel">Tab panel 5</sl-tab-panel>
      <sl-tab-panel slot="panel">Tab panel 6</sl-tab-panel>
      <sl-tab-panel slot="panel">Tab panel 7</sl-tab-panel>
      <sl-tab-panel slot="panel">Tab panel 8</sl-tab-panel>
      <sl-tab-panel slot="panel">Tab panel 9</sl-tab-panel>
      <sl-tab-panel slot="panel">Tab panel 10</sl-tab-panel>
    </sl-tabs>
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
  const firstTab = tabItems[0].shadowRoot.querySelector('.sl-c-tab');
  const lastTab = tabItems[8].shadowRoot.querySelector('.sl-c-tab');

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

  await userEvent.click(tabItems[2].shadowRoot.querySelector('.sl-c-tab'));

  // Remove focus
  tabItems[2].blur();
};

// Helper function to wait for the buttons to load
async function waitForButtons(tabs: any) {
  // Create a promise that resolves after 1 ms
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  await delay(1); // Wait for 1 ms
  return tabs.shadowRoot?.querySelectorAll('.sl-c-tabs__arrow');
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
  await userEvent.type(prevButton.shadowRoot.querySelector('.sl-c-button'), '{Enter}');
  expect(tabItems[8].isActive).toBe(true);

  // Simulate a keyboard event (pressing Enter key) while focused on next button
  nextButton.focus();
  await userEvent.type(nextButton.shadowRoot.querySelector('.sl-c-button'), '{Enter}');
  expect(tabItems[0].isActive).toBe(true);
  tabItems[0].blur();

  // Simulate a window resize event
  window.dispatchEvent(new Event('resize'));
  tabs.shadowRoot.querySelector('.sl-c-tabs__list').dispatchEvent(new Event('scroll'));
};
