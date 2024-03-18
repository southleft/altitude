import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { ALMenu, ALMenuItem, ALIconDocument, ALIconMenu, ALButton, ALToggleButton } from '../..';

export default {
  title: 'Molecules/Menu',
  component: ALMenu,
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
        <ALMenuItem isHeader={true}>
          <ALIconDocument slot="before"></ALIconDocument>
          Header
        </ALMenuItem>
        <ALMenuItem>Menu Item</ALMenuItem>
        <ALMenuItem>Menu Item</ALMenuItem>
        <ALMenuItem>Menu Item</ALMenuItem>
        <ALMenuItem isDisabled={true}>Menu Item</ALMenuItem>
        <ALMenuItem>Menu Item</ALMenuItem>
      </>
    )
  },
};

export const Default: StoryObj<typeof ALMenu> = { args: {} };

export const DefaultWithScroll: StoryObj<typeof ALMenu> = {
  args: {
    height: '160',
  }
};

export const WithGroups: StoryObj<typeof ALMenu> = {
  args: {
    children: (
      <>
        <ALMenuItem isHeader={true}>
          <ALIconDocument slot="before"></ALIconDocument>
          Menu Item
        </ALMenuItem>
        <ALMenuItem isHeader={true} isExpanded={true} isExpandableHeader={true}>
          <ALIconDocument slot="before"></ALIconDocument>
          Menu Item
        </ALMenuItem>
        <ALMenuItem>Menu Item</ALMenuItem>
        <ALMenuItem>Menu Item</ALMenuItem>
        <ALMenuItem isHeader={true} isExpanded={true} isExpandableHeader={true}>
          <ALIconDocument slot="before"></ALIconDocument>
          Menu Item
        </ALMenuItem>
        <ALMenuItem>Menu Item</ALMenuItem>
        <ALMenuItem>Menu Item</ALMenuItem>
        <ALMenuItem>Menu Item</ALMenuItem>
      </>
    )
  }
};

export const WithGroupsWithScroll: StoryObj<typeof ALMenu> = {
  args: {
    ...WithGroups.args,
    height: 160
  }
};

export const WithHrefs: StoryObj<typeof ALMenu> = {
  args: {
    children: (
      <>
        <ALMenuItem href="#" target="_blank" isHeader={true}>
          <ALIconDocument slot="before"></ALIconDocument>
          Menu Item
        </ALMenuItem>
        <ALMenuItem href="#" target="_blank" isHeader={true} isExpandableHeader={true}>
          <ALIconDocument slot="before"></ALIconDocument>
          Menu Item
        </ALMenuItem>
        <ALMenuItem href="#" target="_blank">Menu Item</ALMenuItem>
        <ALMenuItem href="#" target="_blank" isHeader={true} isExpanded={true} isExpandableHeader={true}>
          <ALIconDocument slot="before"></ALIconDocument>
          Menu Item
        </ALMenuItem>
        <ALMenuItem href="#" target="_blank">Menu Item</ALMenuItem>
      </>
    )
  }
};

export const Simple: StoryObj<typeof ALMenu> = {
  args: {
    variant: 'simple',
  }
};
Simple.parameters= {
  layout: 'fullscreen'
};

export const SimpleWithGroups: StoryObj<typeof ALMenu> = {
  args: {
    ...WithGroups.args,
    ...Simple.args
  }
};
SimpleWithGroups.parameters= {
  layout: 'fullscreen'
};