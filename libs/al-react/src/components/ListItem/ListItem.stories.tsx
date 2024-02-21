import type { StoryObj } from '@storybook/react-webpack5';
import { ALListItem, ALList, ALCheckbox } from '../..'

export default {
  title: 'Atoms/List Item',
  component: ALListItem,
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

export const Default: StoryObj<typeof ALListItem> = { args: {} };

export const Error: StoryObj<typeof ALListItem> = {
  args: {
    isError: true
  }
};

export const Disabled: StoryObj<typeof ALListItem> = {
  args: {
    isDisabled: true
  }
};

export const WithStatic: StoryObj<typeof ALListItem> = {
  args: {
    variant: 'static'
  }
};

export const WithCheckbox: StoryObj<typeof ALListItem> = {
  args: {
    children: (
      <>
        <ALCheckbox>List Item</ALCheckbox>
      </>
    )
  }
};

export const WithFlyout: StoryObj<typeof ALListItem> = {
  args: {
    behavior: 'flyout',
    children: (
      <>
        List Item
        <ALList slot="items">
          <ALListItem>List Item</ALListItem>
          <ALListItem>List Item</ALListItem>
          <ALListItem>List Item</ALListItem>
          <ALListItem>List Item</ALListItem>
        </ALList>
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
