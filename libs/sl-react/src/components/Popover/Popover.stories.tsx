import type { StoryObj } from '@storybook/react-webpack5';
import { SLPopover, SLMenu, SLMenuItem, SLButton, SLButtonGroup, SLTabs, SLTab, SLTabPanel,SLToggleButton, SLIconDocument, SLIconHelp, SLIconMenu } from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';

export default {
  title: 'Molecules/Popover',
  component: SLPopover,
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
        <SLButton slot="trigger">Open Popover</SLButton>
        <Fpo>Popover content</Fpo>
      </>
    )
  },
};

function closePopover() {
  const popover = document.querySelector<any>('sl-popover');
  if (popover) {
    popover.close();
  }
}

export const Default: StoryObj<typeof SLPopover> = { args: {} };

export const PositionBottomCenter: StoryObj<typeof SLPopover> = { args: {
  position: 'bottom-center',
} };

export const PositionBottomRight: StoryObj<typeof SLPopover> = { args: {
  position: 'bottom-right',
} };

export const PositionTopLeft: StoryObj<typeof SLPopover> = { args: {
  position: 'top-left',
} };

export const PositionTopCenter: StoryObj<typeof SLPopover> = { args: {
  position: 'top-center',
} };

export const PositionTopRight: StoryObj<typeof SLPopover> = { args: {
  position: 'top-right',
} };

export const PositionLeft: StoryObj<typeof SLPopover> = { args: {
  position: 'left',
} };

export const PositionLeftTop: StoryObj<typeof SLPopover> = { args: {
  position: 'left-top',
} };

export const PositionRight: StoryObj<typeof SLPopover> = { args: {
  position: 'right',
} };

export const PositionRightTop: StoryObj<typeof SLPopover> = { args: {
  position: 'right-top',
} };

export const WithDismissible: StoryObj<typeof SLPopover> = { args: {
  isDismissible: true,
  heading: "Popover heading",
} };

export const WithMenu: StoryObj<typeof SLPopover> = {
  args: {
    position: 'bottom-right',
    children: (
      <>
        <SLButton slot="trigger" variant="tertiary" hideText={true}>
          <SLIconMenu slot="before"></SLIconMenu>
          Menu
        </SLButton>
        <SLMenu>
        <SLMenuItem isHeader={true}>
          <SLIconDocument slot="before"></SLIconDocument>
          Header
        </SLMenuItem>
        <SLMenuItem>Menu Item</SLMenuItem>
        <SLMenuItem>Menu Item</SLMenuItem>
        <SLMenuItem>Menu Item</SLMenuItem>
        <SLMenuItem isDisabled={true}>Menu Item</SLMenuItem>
        <SLMenuItem>Menu Item</SLMenuItem>
      </SLMenu>
      </>
    )
  },
  parameters: {
    layout: 'fullscreen'
  }
};

export const WithMenWithGroups: StoryObj<typeof SLPopover> = {
  args: {
    position: 'bottom-right',
    children: (
      <>
        <SLButton slot="trigger" variant="tertiary" hideText={true}>
          <SLIconMenu slot="before"></SLIconMenu>
          Menu
        </SLButton>
        <SLMenu>
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
        </SLMenu>
      </>
    )
  },
  parameters: {
    layout: 'fullscreen'
  }
};

export const WithContent: StoryObj<typeof SLPopover> = {
  args: {
    position: 'top-left',
    heading: "Popover heading",
    isDismissible: true,
    children: (
      <>
        <SLToggleButton slot="trigger"><SLIconHelp size="lg"></SLIconHelp></SLToggleButton>
        <SLTabs variant="stretch">
          <SLTab>Tab 1</SLTab>
          <SLTab>Tab 2</SLTab>
          <SLTab>Tab 3</SLTab>
          <SLTabPanel slot="panel">
            <Fpo>Tab panel 1 - Instance slot 1</Fpo>
            <Fpo>Tab panel 1 - Instance slot 2</Fpo>
          </SLTabPanel>
          <SLTabPanel slot="panel">
            <Fpo>Tab panel 2 - Instance slot 1</Fpo>
            <Fpo>Tab panel 2 - Instance slot 2</Fpo>
          </SLTabPanel>
          <SLTabPanel slot="panel">
            <Fpo>Tab panel 3 - Instance slot 1</Fpo>
            <Fpo>Tab panel 3 - Instance slot 2</Fpo>
          </SLTabPanel>
        </SLTabs>
        <SLButton slot="footer" variant="tertiary" onClick={closePopover}>Close</SLButton>
        <SLButtonGroup slot="footer" alignment="right">
          <SLButton variant="secondary">Label</SLButton>
          <SLButton>Label</SLButton>
        </SLButtonGroup>
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