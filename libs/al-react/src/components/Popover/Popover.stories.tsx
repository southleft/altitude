import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { ALPopover, ALMenu, ALMenuItem, ALButton, ALButtonGroup, ALTabs, ALTab, ALTabPanel,ALToggleButton, ALIconDocument, ALIconHelp, ALIconMenu } from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';

export default {
  title: 'Molecules/Popover',
  component: ALPopover,
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['onPopoverOpen', 'onPopoverClose', 'onPopoverCloseButton', 'onMenuItemSelect', 'onMenuItemExpand']
    },
    controls: {
      exclude: ['ariaLabelledBy', 'popoverTrigger', 'popoverTriggerButton', 'handleOnClickOutside', 'transitionDelay']
    },
  },
  argTypes: {
    variant: {
      options: ['default', 'menu'],
      control: { type: 'radio' },
    },
    heading: {
      type: 'text'
    },
    position: {
      options: ['bottom-center', 'bottom-right', 'bottom-left', 'top-center', 'top-right', 'top-left', 'left', 'left-top', 'right', 'right-top'],
      control: { type: 'radio' }
    },
    isActive: {
      type: 'boolean'
    },
    isDismissible: {
      type: 'boolean'
    }
  },
  args: {
    children: (
      <>
        <ALButton slot="trigger">Open Popover</ALButton>
        <Fpo>Popover content</Fpo>
      </>
    )
  },
};

function closePopover() {
  const popover = document.querySelector<any>('al-popover');
  if (popover) {
    popover.close();
  }
}

export const Default: StoryObj<typeof ALPopover> = { args: {} };

export const PositionBottomCenter: StoryObj<typeof ALPopover> = { args: {
  position: 'bottom-center',
} };

export const PositionBottomRight: StoryObj<typeof ALPopover> = { args: {
  position: 'bottom-right',
} };

export const PositionTopLeft: StoryObj<typeof ALPopover> = { args: {
  position: 'top-left',
} };

export const PositionTopCenter: StoryObj<typeof ALPopover> = { args: {
  position: 'top-center',
} };

export const PositionTopRight: StoryObj<typeof ALPopover> = { args: {
  position: 'top-right',
} };

export const PositionLeft: StoryObj<typeof ALPopover> = { args: {
  position: 'left',
} };

export const PositionLeftTop: StoryObj<typeof ALPopover> = { args: {
  position: 'left-top',
} };

export const PositionRight: StoryObj<typeof ALPopover> = { args: {
  position: 'right',
} };

export const PositionRightTop: StoryObj<typeof ALPopover> = { args: {
  position: 'right-top',
} };

export const WithDismissible: StoryObj<typeof ALPopover> = { args: {
  isDismissible: true,
  heading: "Popover heading",
} };

export const WithMenu: StoryObj<typeof ALPopover> = {
  args: {
    position: 'bottom-right',
    children: (
      <>
        <ALButton slot="trigger" variant="tertiary" hideText={true}>
          <ALIconMenu slot="before"></ALIconMenu>
          Menu
        </ALButton>
        <ALMenu>
        <ALMenuItem isHeader={true}>
          <ALIconDocument slot="before"></ALIconDocument>
          Header
        </ALMenuItem>
        <ALMenuItem>Menu Item</ALMenuItem>
        <ALMenuItem>Menu Item</ALMenuItem>
        <ALMenuItem>Menu Item</ALMenuItem>
        <ALMenuItem isDisabled={true}>Menu Item</ALMenuItem>
        <ALMenuItem>Menu Item</ALMenuItem>
      </ALMenu>
      </>
    )
  },
  parameters: {
    layout: 'fullscreen'
  }
};

export const WithMenWithGroups: StoryObj<typeof ALPopover> = {
  args: {
    position: 'bottom-right',
    children: (
      <>
        <ALButton slot="trigger" variant="tertiary" hideText={true}>
          <ALIconMenu slot="before"></ALIconMenu>
          Menu
        </ALButton>
        <ALMenu>
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
        </ALMenu>
      </>
    )
  },
  parameters: {
    layout: 'fullscreen'
  }
};

export const WithContent: StoryObj<typeof ALPopover> = {
  args: {
    position: 'top-left',
    heading: "Popover heading",
    isDismissible: true,
    children: (
      <>
        <ALToggleButton slot="trigger"><ALIconHelp size="lg"></ALIconHelp></ALToggleButton>
        <ALTabs variant="stretch">
          <ALTab>Tab 1</ALTab>
          <ALTab>Tab 2</ALTab>
          <ALTab>Tab 3</ALTab>
          <ALTabPanel slot="panel">
            <Fpo>Tab panel 1 - Instance slot 1</Fpo>
            <Fpo>Tab panel 1 - Instance slot 2</Fpo>
          </ALTabPanel>
          <ALTabPanel slot="panel">
            <Fpo>Tab panel 2 - Instance slot 1</Fpo>
            <Fpo>Tab panel 2 - Instance slot 2</Fpo>
          </ALTabPanel>
          <ALTabPanel slot="panel">
            <Fpo>Tab panel 3 - Instance slot 1</Fpo>
            <Fpo>Tab panel 3 - Instance slot 2</Fpo>
          </ALTabPanel>
        </ALTabs>
        <ALButton slot="footer" variant="tertiary" onClick={closePopover}>Close</ALButton>
        <ALButtonGroup slot="footer" alignment="right">
          <ALButton variant="secondary">Label</ALButton>
          <ALButton>Label</ALButton>
        </ALButtonGroup>
      </>
    )
  },
  parameters: {
    layout: 'fullscreen'
  },
  decorators: [
    (Story) => (
      <div className="c-popover" style={{ position: 'fixed', insetBlockEnd: '1rem', insetInlineEnd: '1rem' }}>{Story()}</div>
    )
  ]
};