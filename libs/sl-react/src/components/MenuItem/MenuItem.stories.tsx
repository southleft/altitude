import type { StoryObj } from '@storybook/react-webpack5';
import { SLMenuItem, SLIconAddSquare } from '../..';

export default {
  title: 'Atoms/Menu Item',
  component: SLMenuItem,
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['onMenuItemSelect', 'onMenuExpand'],
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

export const Default: StoryObj<typeof SLMenuItem> = { args: {} };

export const DefaultSelected: StoryObj<typeof SLMenuItem> = {
  args: {
    isSelected: true
  }
};

export const DefaultDisabled: StoryObj<typeof SLMenuItem> = {
  args: {
    isDisabled: true
  }
};

export const DefaultWithIcon: StoryObj<typeof SLMenuItem> = {
  args: {
    children: (
      <>
        <SLIconAddSquare slot="before"></SLIconAddSquare>
        Menu Item
      </>
    )
  }
};

export const DefaultWithIconSelected: StoryObj<typeof SLMenuItem> = {
  args: {
    ...DefaultWithIcon.args,
    isSelected: true
  }
};
export const DefaultWithIconDisabled: StoryObj<typeof SLMenuItem> = {
  args: {
    ...DefaultWithIcon.args,
    isDisabled: true
  }
};

export const Header: StoryObj<typeof SLMenuItem> = {
  args: {
    isHeader: true
  }
};

export const HeaderSelected: StoryObj<typeof SLMenuItem> = {
  args: {
    ...Header.args,
    isSelected: true
  }
};

export const HeaderDisabled: StoryObj<typeof SLMenuItem> = {
  args: {
    ...Header.args,
    isDisabled: true
  }
};

export const HeaderWithIcon: StoryObj<typeof SLMenuItem> = {
  args: {
    ...Header.args,
    ...DefaultWithIcon.args
  }
};

export const HeaderWithIconSelected: StoryObj<typeof SLMenuItem> = {
  args: {
    ...HeaderSelected.args,
    ...DefaultWithIcon.args
  }
};

export const HeaderWithIconDisabled: StoryObj<typeof SLMenuItem> = {
  args: {
    ...HeaderSelected.args,
    ...DefaultWithIcon.args,
    isDisabled: true,
  }
};

export const HeaderGroup: StoryObj<typeof SLMenuItem> = {
  args: {
    ...Header.args,
    groupId: '123'
  }
};

export const HeaderGroupSelected: StoryObj<typeof SLMenuItem> = {
  args: {
    ...HeaderGroup.args,
    isSelected: true
  }
};

export const HeaderGroupDisabled: StoryObj<typeof SLMenuItem> = {
  args: {
    ...HeaderGroup.args,
    isDisabled: true
  }
};

export const HeaderGroupWithIcon: StoryObj<typeof SLMenuItem> = {
  args: {
    ...HeaderGroup.args,
    ...DefaultWithIcon.args
  }
};

export const HeaderGroupWithIconSelected: StoryObj<typeof SLMenuItem> = {
  args: {
    ...HeaderGroupWithIcon.args,
    isSelected: true
  }
};

export const HeaderGroupWithIconDisabled: StoryObj<typeof SLMenuItem> = {
  args: {
    ...HeaderGroupWithIcon.args,
    isDisabled: true
  }
};

