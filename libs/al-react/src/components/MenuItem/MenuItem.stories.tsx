import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { ALMenuItem, ALIconAdd } from '../..';

export default {
  title: 'Atoms/Menu Item',
  component: ALMenuItem,
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['onMenuItemSelect', 'onMenuItemExpand'],
    },
    controls: {
      exclude: ['isFocused', 'idx', 'ariaControls', 'menuItemLink', 'menuItemControl', 'menuItemLinkEl', 'menuItemControlEl']
    },
  },
  argTypes: {
    href: {
      control: 'text'
    },
    target: {
      control: { type: 'radio' },
      options: ['_blank', '_self', '_parent', '_top']
    },
    linkTitle: {
      control: 'text'
    },
    isHeader: {
      control: 'boolean'
    },
    isExpandableHeader: {
      control: 'boolean'
    },
    isExpanded: {
      control: 'boolean'
    },
    isSelected: {
      control: 'boolean'
    },
    isDisabled: {
      control: 'boolean'
    },
    isHidden: {
      control: 'boolean'
    },
    indentation: {
      control: 'number'
    },
    label: {
      control: 'text'
    },
    groupId: {
      control: 'text'
    },
  },
  args: {
    children: (
      <>
        Menu Item
      </>
    )
  },
};

export const Default: StoryObj<typeof ALMenuItem> = { args: {} };

export const DefaultSelected: StoryObj<typeof ALMenuItem> = {
  args: {
    isSelected: true
  }
};

export const DefaultDisabled: StoryObj<typeof ALMenuItem> = {
  args: {
    isDisabled: true
  }
};

export const DefaultWithIcon: StoryObj<typeof ALMenuItem> = {
  args: {
    children: (
      <>
        <ALIconAdd slot="before"></ALIconAdd>
        Menu Item
      </>
    )
  }
};

export const DefaultWithIconSelected: StoryObj<typeof ALMenuItem> = {
  args: {
    ...DefaultWithIcon.args,
    isSelected: true
  }
};
export const DefaultWithIconDisabled: StoryObj<typeof ALMenuItem> = {
  args: {
    ...DefaultWithIcon.args,
    isDisabled: true
  }
};

export const Header: StoryObj<typeof ALMenuItem> = {
  args: {
    isHeader: true
  }
};

export const HeaderSelected: StoryObj<typeof ALMenuItem> = {
  args: {
    ...Header.args,
    isSelected: true
  }
};

export const HeaderDisabled: StoryObj<typeof ALMenuItem> = {
  args: {
    ...Header.args,
    isDisabled: true
  }
};

export const HeaderWithIcon: StoryObj<typeof ALMenuItem> = {
  args: {
    ...Header.args,
    ...DefaultWithIcon.args
  }
};

export const HeaderWithIconSelected: StoryObj<typeof ALMenuItem> = {
  args: {
    ...HeaderSelected.args,
    ...DefaultWithIcon.args
  }
};

export const HeaderWithIconDisabled: StoryObj<typeof ALMenuItem> = {
  args: {
    ...HeaderSelected.args,
    ...DefaultWithIcon.args,
    isDisabled: true,
  }
};

export const HeaderGroup: StoryObj<typeof ALMenuItem> = {
  args: {
    ...Header.args,
    groupId: '123'
  }
};

export const HeaderGroupSelected: StoryObj<typeof ALMenuItem> = {
  args: {
    ...HeaderGroup.args,
    isSelected: true
  }
};

export const HeaderGroupDisabled: StoryObj<typeof ALMenuItem> = {
  args: {
    ...HeaderGroup.args,
    isDisabled: true
  }
};

export const HeaderGroupWithIcon: StoryObj<typeof ALMenuItem> = {
  args: {
    ...HeaderGroup.args,
    ...DefaultWithIcon.args
  }
};

export const HeaderGroupWithIconSelected: StoryObj<typeof ALMenuItem> = {
  args: {
    ...HeaderGroupWithIcon.args,
    isSelected: true
  }
};

export const HeaderGroupWithIconDisabled: StoryObj<typeof ALMenuItem> = {
  args: {
    ...HeaderGroupWithIcon.args,
    isDisabled: true
  }
};

