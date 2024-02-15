import type { StoryObj } from '@storybook/react-webpack5';
import { SLMenu, SLMenuItem, SLIconDocument, SLIconMenu, SLButton, SLToggleButton } from '../..';

export default {
  title: 'Molecules/Menu',
  component: SLMenu,
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['onMenuItemExpand', 'onMenuItemSelect'],
    },
    controls: {
      exclude: [
        'menuItems',
        'menuList',
        'focusedItem',
        'selectedItem',
        'validItemCount',
        'hasOverflow',
      ]
    }
  },
  argTypes: {
    variant: {
      type: 'radio',
      options: ['default', 'simple']
    },
    width: {
      control: 'number'
    },
    height: {
      control: 'number'
    },
    label: {
      control: 'text'
    },
  },
  args: {
    width: '280',
    children: (
      <>
        <SLMenuItem isHeader={true}>
          <SLIconDocument slot="before"></SLIconDocument>
          Header
        </SLMenuItem>
        <SLMenuItem>Menu Item</SLMenuItem>
        <SLMenuItem>Menu Item</SLMenuItem>
        <SLMenuItem>Menu Item</SLMenuItem>
        <SLMenuItem isDisabled={true}>Menu Item</SLMenuItem>
        <SLMenuItem>Menu Item</SLMenuItem>
      </>
    )
  },
};

export const Default: StoryObj<typeof SLMenu> = { args: {} };

export const DefaultWithScroll: StoryObj<typeof SLMenu> = {
  args: {
    height: '160',
  }
};

export const WithGroups: StoryObj<typeof SLMenu> = {
  args: {
    children: (
      <>
        <SLMenuItem isHeader={true}>
          <SLIconDocument slot="before"></SLIconDocument>
          Menu Item
        </SLMenuItem>
        <SLMenuItem isHeader={true} isExpanded={true} isExpandableHeader={true}>
          <SLIconDocument slot="before"></SLIconDocument>
          Menu Item
        </SLMenuItem>
        <SLMenuItem>Menu Item</SLMenuItem>
        <SLMenuItem>Menu Item</SLMenuItem>
        <SLMenuItem isHeader={true} isExpanded={true} isExpandableHeader={true}>
          <SLIconDocument slot="before"></SLIconDocument>
          Menu Item
        </SLMenuItem>
        <SLMenuItem>Menu Item</SLMenuItem>
        <SLMenuItem>Menu Item</SLMenuItem>
        <SLMenuItem>Menu Item</SLMenuItem>
      </>
    )
  }
};

export const WithGroupsWithScroll: StoryObj<typeof SLMenu> = {
  args: {
    ...WithGroups.args,
    height: 160
  }
};

export const WithHrefs: StoryObj<typeof SLMenu> = {
  args: {
    children: (
      <>
        <SLMenuItem href="#" target="_blank" isHeader={true}>
          <SLIconDocument slot="before"></SLIconDocument>
          Menu Item
        </SLMenuItem>
        <SLMenuItem href="#" target="_blank" isHeader={true} isExpandableHeader={true}>
          <SLIconDocument slot="before"></SLIconDocument>
          Menu Item
        </SLMenuItem>
        <SLMenuItem href="#" target="_blank">Menu Item</SLMenuItem>
        <SLMenuItem href="#" target="_blank" isHeader={true} isExpanded={true} isExpandableHeader={true}>
          <SLIconDocument slot="before"></SLIconDocument>
          Menu Item
        </SLMenuItem>
        <SLMenuItem href="#" target="_blank">Menu Item</SLMenuItem>
      </>
    )
  }
};

export const Simple: StoryObj<typeof SLMenu> = {
  args: {
    variant: 'simple',
  }
};
Simple.parameters= {
  layout: 'fullscreen'
};

export const SimpleWithGroups: StoryObj<typeof SLMenu> = {
  args: {
    ...WithGroups.args,
    ...Simple.args
  }
};
SimpleWithGroups.parameters= {
  layout: 'fullscreen'
};