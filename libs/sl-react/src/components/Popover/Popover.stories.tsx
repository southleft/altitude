import type { StoryObj } from '@storybook/react-webpack5';
import { SLPopover, SLButton, SLMenu, SLMenuItem, SLToggleButton, SLIconDocument, SLIconMenu } from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';

export default {
  title: 'Molecules/Popover',
  component: SLPopover,
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['onPopoverOpen', 'onPopoverClose', 'onPopoverCloseButton']
    },
    controls: {
      exclude: ['ariaLabelledBy']
    },
  },
  argTypes: {
    heading: {
      type: 'text'
    },
    position: {
      options: ['bottom-center', 'bottom-right', 'bottom-left', 'top-center', 'top-right', 'top-left', 'left', 'left-top', 'right', 'right-top'],
      control: { type: 'radio' }
    },
    isActive: {
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

function closePanel() {
  const panel = document.querySelector<any>('.c-panel').querySelector('*');
  if (panel) {
    panel.close();
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

export const WithMenu: StoryObj<typeof SLPopover> = {
  args: {
    position: 'bottom-right',
    children: (
      <>
        <SLButton slot="trigger" variant="tertiary" hideText={true}>
          <SLIconMenu slot="before"></SLIconMenu>
          Menu
        </SLButton>
        <SLMenu data-testid="menu" id="menu-123">
        <SLMenuItem isHeader={true} data-testid="menu-item-01">
          <SLIconDocument slot="before"></SLIconDocument>
          Header
        </SLMenuItem>
        <SLMenuItem data-testid="menu-item-02">Menu Item</SLMenuItem>
        <SLMenuItem data-testid="menu-item-03">Menu Item</SLMenuItem>
        <SLMenuItem data-testid="menu-item-04">Menu Item</SLMenuItem>
        <SLMenuItem isDisabled={true} data-testid="menu-item-05">Menu Item</SLMenuItem>
        <SLMenuItem data-testid="menu-item-06">Menu Item</SLMenuItem>
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
        <SLMenu data-testid="menu" id="group-menu-123">
          <SLMenuItem isHeader={true} data-testid="menu-item-01">
            <SLIconDocument slot="before"></SLIconDocument>
            Menu Item
          </SLMenuItem>
          <SLMenuItem isHeader={true} isExpanded={true} isExpandableHeader={true} data-testid="menu-item-02">
            <SLIconDocument slot="before"></SLIconDocument>
            Menu Item
          </SLMenuItem>
          <SLMenuItem data-testid="menu-item-03">Menu Item</SLMenuItem>
          <SLMenuItem data-testid="menu-item-04">Menu Item</SLMenuItem>
          <SLMenuItem isHeader={true} isExpanded={true} isExpandableHeader={true} data-testid="menu-item-05">
            <SLIconDocument slot="before"></SLIconDocument>
            Menu Item
          </SLMenuItem>
          <SLMenuItem data-testid="menu-item-06">Menu Item</SLMenuItem>
          <SLMenuItem data-testid="menu-item-07">Menu Item</SLMenuItem>
          <SLMenuItem data-testid="menu-item-08">Menu Item</SLMenuItem>
        </SLMenu>
      </>
    )
  },
  parameters: {
    layout: 'fullscreen'
  }
};