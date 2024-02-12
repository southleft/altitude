import type { StoryObj } from '@storybook/react-webpack5';
import { SLListItem, SLList, SLCheckbox } from '../..'

export default {
  title: 'Atoms/List Item',
  component: SLListItem,
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['select']
    }
  },
  args: {
    children: (
      <>
        List Item
      </>
    )
  }
};

export const Default: StoryObj<typeof SLListItem> = { args: {} };

export const Error: StoryObj<typeof SLListItem> = {
  args: {
    isError: true
  }
};

export const Disabled: StoryObj<typeof SLListItem> = {
  args: {
    isDisabled: true
  }
};

export const WithStatic: StoryObj<typeof SLListItem> = {
  args: {
    variant: 'static'
  }
};

export const WithCheckbox: StoryObj<typeof SLListItem> = {
  args: {
    children: (
      <>
        <SLCheckbox>List Item</SLCheckbox>
      </>
    )
  }
};

export const WithFlyout: StoryObj<typeof SLListItem> = {
  args: {
    behavior: 'flyout',
    children: (
      <>
        List Item
        <SLList slot="items">
          <SLListItem>List Item</SLListItem>
          <SLListItem>List Item</SLListItem>
          <SLListItem>List Item</SLListItem>
          <SLListItem>List Item</SLListItem>
        </SLList>
      </>
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ width: '150px' }}>
        {Story()}
      </div>
    )
  ]
};
