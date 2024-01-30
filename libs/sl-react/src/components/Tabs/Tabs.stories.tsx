import type { StoryObj } from '@storybook/react-webpack5';
import { SLTabs, SLTab, SLTabPanel, SLIconDone, SLBadge } from '../..';

export default {
  title: 'Components/Tabs',
  component: SLTabs,
  subcomponents: { SLTab, SLTabPanel },
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
        <SLTab><SLIconDone></SLIconDone><span className="sl-u-is-vishidden">Tab 1</span></SLTab>
        <SLTab><SLIconDone></SLIconDone><span className="sl-u-is-vishidden">Tab 2</span></SLTab>
        <SLTab>Tab 3<SLBadge variant="danger">2</SLBadge></SLTab>
        <SLTab>Tab 4</SLTab>
        <SLTab>Tab 5</SLTab>
        <SLTab>Tab 6</SLTab>
        <SLTab>Tab 7</SLTab>
        <SLTab>Tab 8</SLTab>
        <SLTab>Tab 9</SLTab>
        <SLTab isDisabled={true}>Tab 10</SLTab>
        <SLTabPanel slot="panel">Tab panel 1</SLTabPanel>
        <SLTabPanel slot="panel">Tab panel 2</SLTabPanel>
        <SLTabPanel slot="panel">Tab panel 3</SLTabPanel>
        <SLTabPanel slot="panel">Tab panel 4</SLTabPanel>
        <SLTabPanel slot="panel">Tab panel 5</SLTabPanel>
        <SLTabPanel slot="panel">Tab panel 6</SLTabPanel>
        <SLTabPanel slot="panel">Tab panel 7</SLTabPanel>
        <SLTabPanel slot="panel">Tab panel 8</SLTabPanel>
        <SLTabPanel slot="panel">Tab panel 9</SLTabPanel>
        <SLTabPanel slot="panel">Tab panel 10</SLTabPanel>
      </>
    )
  },
};

const getActiveIndex = (event) => {
  console.log(event.detail);
};

export const Default: StoryObj<typeof SLTabs> = { args: {} };

export const Stretch: StoryObj<typeof SLTabs> = { args: {
  variant: 'stretch'
} };

export const WithActiveIndex: StoryObj<typeof SLTabs> = { args: {
  activeIndex: '2'
} };

export const WithScroll: StoryObj<typeof SLTabs> = {
  args: {},
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '530px' }}>
        {Story()}
      </div>
    )
  ],
};