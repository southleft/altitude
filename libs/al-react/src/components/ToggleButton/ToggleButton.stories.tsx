import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { ALToggleButton, ALIconCalendar, ALAvatar, ALTooltip, ALPopover, ALIconChevronDown } from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';

export default {
  title: 'Atoms/Toggle Button',
  component: ALToggleButton,
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['onToggleButtonDeselect', 'onToggleButtonSelect', 'onPopoverCloseButton']
    },
    controls: {
      exclude: ['isSmall', 'slottedEls', 'toggleButton', 'toggleButtonContent', 'hasPanel']
    }
  },
  argTypes: {
    variant: {
      control: 'radio',
      options: ['default', 'background']
    },
    isSelected: {
      control: 'boolean'
    },
    hasToggle: {
      control: 'boolean'
    }
  },
  args: {
    children: 'Text Label'
  }
};

export const Default: StoryObj<typeof ALToggleButton> = { args: {} };

export const DefaultIcon: StoryObj<typeof ALToggleButton> = {
  args: {
    children: (
      <>
        <ALIconCalendar size="lg"></ALIconCalendar>
      </>
    )
  }
};

export const DefaultPrefixIcon: StoryObj<typeof ALToggleButton> = {
  args: {
    children: (
      <>
        <ALIconCalendar size="lg"></ALIconCalendar>
        Text Label
      </>
    )
  }
};

export const DefaultAvatar: StoryObj<typeof ALToggleButton> = {
  args:{
    children: (
      <>
        <ALAvatar variant="sm" hasBadge={true} badgeVariant="success">
          <img src="https://picsum.photos/80/80" alt="Alt text" />
        </ALAvatar>
      </>
    )
  }
};

export const DefaultWithDropdown: StoryObj<typeof ALToggleButton> = {
  args: {
    ...Default.args,
    children: (
      <>
        <ALPopover heading="Heading" isDismissible={true}>
          <span slot="trigger">Text label</span>
          <ALIconChevronDown slot="trigger"></ALIconChevronDown>
          <Fpo>Content</Fpo>
        </ALPopover>
      </>
    )
  }
};

export const DefaultWithDropdownIcon: StoryObj<typeof ALToggleButton> = {
  args: {
    ...DefaultIcon.args,
    children: (
      <>
        <ALPopover>
          <ALIconCalendar slot="trigger" size="lg"></ALIconCalendar>
          <ALIconChevronDown slot="trigger"></ALIconChevronDown>
          <Fpo>Content</Fpo>
        </ALPopover>
      </>
    )
  }
};

export const DefaultWithDropdownPrefixIcon: StoryObj<typeof ALToggleButton> = {
  args: {
    ...DefaultPrefixIcon.args,
    children: (
      <>
        <ALPopover>
          <ALIconCalendar slot="trigger" size="lg"></ALIconCalendar>
          <span slot="trigger">Text label</span>
          <ALIconChevronDown slot="trigger"></ALIconChevronDown>
          <Fpo>Content</Fpo>
        </ALPopover>
      </>
    )
  }
};

export const DefaultWithTooltip: StoryObj<typeof ALToggleButton> = {
  args: {
    ...Default.args
  },
  decorators: [
    (Story) => (
      <ALTooltip>
        <span slot="trigger">{Story()}</span>
        Tooltip Text
      </ALTooltip>
    )
  ]
};

export const DefaultWithTooltipAndDropdown: StoryObj<typeof ALToggleButton> = {
  args: {
    ...Default.args,
    ...DefaultWithDropdown.args,
  },
  decorators: [
    (Story) => (
      <ALTooltip>
        <span slot="trigger">{Story()}</span>
        Tooltip Text
      </ALTooltip>
    )
  ]
};

export const Background: StoryObj<typeof ALToggleButton> = {
  args: {
    ...Default.args,
    variant: 'background'
  }
};

export const BackgroundIcon: StoryObj<typeof ALToggleButton> = {
  args: {
    ...DefaultIcon.args,
    variant: 'background'
  }
};

export const BackgroundPrefixIcon: StoryObj<typeof ALToggleButton> = {
  args: {
    ...DefaultPrefixIcon.args,
    variant: 'background'
  }
};

export const BackgroundAvatar: StoryObj<typeof ALToggleButton> = {
  args: {
    ...DefaultAvatar.args,
    variant: 'background'
  }
};

export const BackgroundWithDropdown: StoryObj<typeof ALToggleButton> = {
  args: {
    ...DefaultWithDropdown.args,
    variant: 'background'
  }
};

export const BackgroundWithDropdownIcon: StoryObj<typeof ALToggleButton> = {
  args: {
    ...DefaultWithDropdownIcon.args,
    variant: 'background'
  }
};

export const BackgroundWithDropdownPrefixIcon: StoryObj<typeof ALToggleButton> = {
  args: {
    ...DefaultWithDropdownPrefixIcon.args,
    variant: 'background'
  }
};

export const BackgroundWithTooltip: StoryObj<typeof ALToggleButton> = {
  args: {
    ...Default.args,
    variant: 'background'
  },
  decorators: [
    ...DefaultWithTooltip.decorators,
  ]
};

export const BackgroundWithTooltipAndDropdown: StoryObj<typeof ALToggleButton> = {
  args: {
    ...DefaultWithTooltipAndDropdown.args,
    variant: 'background'
  },
  decorators: [
    ...DefaultWithTooltip.decorators,
  ]
};
