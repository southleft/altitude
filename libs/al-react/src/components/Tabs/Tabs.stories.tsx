import type { StoryObj } from '@storybook/react-webpack5';
import { ALTabs, ALTab, ALTabPanel, ALIconCheck, ALBadge } from '../..';

export default {
  title: 'Molecules/Tabs',
  component: ALTabs,
  subcomponents: { ALTab, ALTabPanel },
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onTabsChange']
    },
    controls: {
      exclude: ['activeTab', 'isScrollable', 'tabsList', 'tabPanels', 'tabItems', 'isLTR', 'handleOnScroll', 'handleOnResize']
    },
  },
  argTypes: {
    variant: {
      control: { type: 'radio' },
      options: ['default', 'stretch']
    },
    activeIndex: {
      control: 'number'
    },
  },
  args: {
    onTabChange: (event) => getActiveIndex(event),
    children: (
      <>
        <ALTab><ALIconCheck></ALIconCheck><span className="al-u-is-vishidden">Tab 1</span></ALTab>
        <ALTab><ALIconCheck></ALIconCheck><span className="al-u-is-vishidden">Tab 2</span></ALTab>
        <ALTab>Tab 3<ALBadge variant="danger">2</ALBadge></ALTab>
        <ALTab>Tab 4</ALTab>
        <ALTab>Tab 5</ALTab>
        <ALTab>Tab 6</ALTab>
        <ALTab>Tab 7</ALTab>
        <ALTab>Tab 8</ALTab>
        <ALTab>Tab 9</ALTab>
        <ALTab isDisabled={true}>Tab 10</ALTab>
        <ALTabPanel slot="panel">Tab panel 1</ALTabPanel>
        <ALTabPanel slot="panel">Tab panel 2</ALTabPanel>
        <ALTabPanel slot="panel">Tab panel 3</ALTabPanel>
        <ALTabPanel slot="panel">Tab panel 4</ALTabPanel>
        <ALTabPanel slot="panel">Tab panel 5</ALTabPanel>
        <ALTabPanel slot="panel">Tab panel 6</ALTabPanel>
        <ALTabPanel slot="panel">Tab panel 7</ALTabPanel>
        <ALTabPanel slot="panel">Tab panel 8</ALTabPanel>
        <ALTabPanel slot="panel">Tab panel 9</ALTabPanel>
        <ALTabPanel slot="panel">Tab panel 10</ALTabPanel>
      </>
    )
  },
};

const getActiveIndex = (event) => {
  console.log(event.detail);
};

export const Default: StoryObj<typeof ALTabs> = { args: {} };

export const Stretch: StoryObj<typeof ALTabs> = { args: {
  variant: 'stretch'
} };

export const WithActiveIndex: StoryObj<typeof ALTabs> = { args: {
  activeIndex: '2'
} };

export const WithScroll: StoryObj<typeof ALTabs> = {
  args: {},
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '530px' }}>
        {Story()}
      </div>
    )
  ],
};