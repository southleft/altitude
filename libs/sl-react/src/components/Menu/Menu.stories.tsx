import type { StoryObj } from '@storybook/react-webpack5';
import { SLMenu, SLMenuItem, SLIconAdd, SLIconMenu, SLButton, SLToggleButton } from '../..';

export default {
  title: 'Molecules/Menu',
  component: SLMenu,
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['onMenuOpen', 'onMenuClose', 'onMenuItemExpand', 'onMenuItemSelect'],
    },
    controls: {
      exclude: [
        'menuId',
        'menuItems',
        'menuList',
        'menuTrigger',
        'tabIndex',
        'focusedItem',
        'selectedItem',
        'validItemCount',
        'firstValidItem',
        'hasOverflow',
      ]
    }
  },
  argTypes: {
    variant: {
      type: 'radio',
      options: ['default', 'cascading']
    },
    position: {
      options: ['bottom-right', 'bottom-left', 'top-right', 'top-left', 'left', 'right' ],
      control: { type: 'radio' }
    },
    isActive: {
      control: 'boolean'
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
    indentGroupItems: {
      control: 'boolean'
    },
  },
  args: {
    isActive: true,
    width: '280',
    children: (
      <>
        <SLMenuItem isHeader={true}>
          <SLIconAdd slot="before"></SLIconAdd>
          Menu Item
        </SLMenuItem>
        <SLMenuItem>Menu Item</SLMenuItem>
        <SLMenuItem>Menu Item</SLMenuItem>
        <SLMenuItem>Menu Item</SLMenuItem>
        <SLMenuItem>Menu Item</SLMenuItem>
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

export const DefaultWithTrigger: StoryObj<typeof SLMenu> = {
  args: {
    isActive: false,
    height: '160',
    children: (
      <>
        <SLButton slot="trigger">Open Menu</SLButton>
        <SLMenuItem isHeader={true}>
          <SLIconAdd slot="before"></SLIconAdd>
          Menu Item
        </SLMenuItem>
        <SLMenuItem>Menu Item</SLMenuItem>
        <SLMenuItem>Menu Item</SLMenuItem>
        <SLMenuItem>Menu Item</SLMenuItem>
        <SLMenuItem>Menu Item</SLMenuItem>
        <SLMenuItem>Menu Item</SLMenuItem>
      </>
    )
  }
};

export const WithGroups: StoryObj<typeof SLMenu> = {
  args: {
    children: (
      <>
        <SLMenuItem isHeader={true}>
          <SLIconAdd slot="before"></SLIconAdd>
          Menu Item
        </SLMenuItem>
        <SLMenuItem isHeader={true} isExpanded={true} isExpandableHeader={true}>
          <SLIconAdd slot="before"></SLIconAdd>
          Menu Item
        </SLMenuItem>
        <SLMenuItem>Menu Item</SLMenuItem>
        <SLMenuItem>Menu Item</SLMenuItem>
        <SLMenuItem isHeader={true} isExpanded={true} isExpandableHeader={true}>
          <SLIconAdd slot="before"></SLIconAdd>
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

export const WithGroupsWithTrigger: StoryObj<typeof SLMenu> = {
  args: {
    isActive: false,
    children: (
      <>
        <SLToggleButton slot="trigger" variant="background"><SLIconMenu size="lg"></SLIconMenu></SLToggleButton>
        <SLMenuItem isHeader={true}>
          <SLIconAdd slot="before"></SLIconAdd>
          Menu Item
        </SLMenuItem>
        <SLMenuItem isHeader={true} isExpanded={true} isExpandableHeader={true}>
          <SLIconAdd slot="before"></SLIconAdd>
          Menu Item
        </SLMenuItem>
        <SLMenuItem>Menu Item</SLMenuItem>
        <SLMenuItem>Menu Item</SLMenuItem>
        <SLMenuItem isHeader={true} isExpanded={true} isExpandableHeader={true}>
          <SLIconAdd slot="before"></SLIconAdd>
          Menu Item
        </SLMenuItem>
        <SLMenuItem>Menu Item</SLMenuItem>
        <SLMenuItem>Menu Item</SLMenuItem>
        <SLMenuItem>Menu Item</SLMenuItem>
      </>
    )
  },
  parameters: {
    layout: 'fullscreen'
  }
};

export const WithGroupIndentation: StoryObj<typeof SLMenu> = {
  args: {
    indentGroupItems: true,
    children: (
      <>
        <SLMenuItem isHeader={true} isExpanded={true} isExpandableHeader={true}>
          <SLIconAdd slot="before"></SLIconAdd>
          Menu Item
        </SLMenuItem>
        <SLMenuItem>Menu Item</SLMenuItem>
        <SLMenuItem>Menu Item</SLMenuItem>
        <SLMenuItem>Menu Item</SLMenuItem>
      </>
    )
  }
};

export const WithHrefs: StoryObj<typeof SLMenu> = {
  args: {
    children: (
      <>
        <SLMenuItem href="#" target="_blank" isHeader={true}>
          <SLIconAdd slot="before"></SLIconAdd>
          Menu Item
        </SLMenuItem>
        <SLMenuItem href="#" target="_blank" isHeader={true} isExpandableHeader={true}>
          <SLIconAdd slot="before"></SLIconAdd>
          Menu Item
        </SLMenuItem>
        <SLMenuItem href="#" target="_blank">Menu Item</SLMenuItem>
        <SLMenuItem href="#" target="_blank" isHeader={true} isExpanded={true} isExpandableHeader={true}>
          <SLIconAdd slot="before"></SLIconAdd>
          Menu Item
        </SLMenuItem>
        <SLMenuItem href="#" target="_blank">Menu Item</SLMenuItem>
      </>
    )
  }
};

export const Cascading: StoryObj<typeof SLMenu> = {
  args: {
    variant: 'cascading',
  }
};
Cascading.parameters= {
  layout: 'fullscreen'
};

export const CascadingWithGroups: StoryObj<typeof SLMenu> = {
  args: {
    ...WithGroups.args,
    ...Cascading.args
  }
};
CascadingWithGroups.parameters= {
  layout: 'fullscreen'
};

export const PositionTopLeft: StoryObj<typeof SLMenu> = {
  args: {
    ...DefaultWithTrigger.args,
    position: 'top-left'
  }
};

export const PositionTopRight: StoryObj<typeof SLMenu> = {
  args: {
    ...DefaultWithTrigger.args,
    position: 'top-right'
  }
};

export const PositionBottomLeft: StoryObj<typeof SLMenu> = {
  args: {
    ...DefaultWithTrigger.args,
    position: 'bottom-left'
  }
};

export const PositionBottomRight: StoryObj<typeof SLMenu> = {
  args: {
    ...DefaultWithTrigger.args,
    position: 'bottom-right'
  }
};

export const PositionLeft: StoryObj<typeof SLMenu> = {
  args: {
    ...DefaultWithTrigger.args,
    position: 'left'
  }
};

export const PositionRight: StoryObj<typeof SLMenu> = {
  args: {
    ...DefaultWithTrigger.args,
    position: 'right'
  }
};