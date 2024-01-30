import type { StoryObj } from '@storybook/react-webpack5';
import { SLToggleButton, SLIconCalendar, SLAvatar, SLTooltip, SLPopover, SLIconChevronDown } from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';

export default {
  title: 'Components/Control Button',
  component: SLToggleButton,
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

export const Default: StoryObj<typeof SLToggleButton> = { args: {} };

export const DefaultIcon: StoryObj<typeof SLToggleButton> = {
  args: {
    children: (
      <>
        <SLIconCalendar size="lg"></SLIconCalendar>
      </>
    )
  }
};

export const DefaultPrefixIcon: StoryObj<typeof SLToggleButton> = {
  args: {
    children: (
      <>
        <SLIconCalendar size="lg"></SLIconCalendar>
        Text Label
      </>
    )
  }
};

export const DefaultAvatar: StoryObj<typeof SLToggleButton> = {
  args:{
    children: (
      <>
        <SLAvatar variant="sm" hasBadge={true} badgeVariant="success">
          <img src="https://picsum.photos/80/80" alt="Alt text" />
        </SLAvatar>
      </>
    )
  }
};

export const DefaultWithDropdown: StoryObj<typeof SLToggleButton> = {
  args: {
    ...Default.args,
    children: (
      <>
        <SLPopover heading="Heading" isDismissible={true}>
          <span slot="trigger">Text label</span>
          <SLIconChevronDown slot="trigger"></SLIconChevronDown>
          <Fpo>Content</Fpo>
        </SLPopover>
      </>
    )
  }
};

export const DefaultWithDropdownIcon: StoryObj<typeof SLToggleButton> = {
  args: {
    ...DefaultIcon.args,
    children: (
      <>
        <SLPopover>
          <SLIconCalendar slot="trigger" size="lg"></SLIconCalendar>
          <SLIconChevronDown slot="trigger"></SLIconChevronDown>
          <Fpo>Content</Fpo>
        </SLPopover>
      </>
    )
  }
};

export const DefaultWithDropdownPrefixIcon: StoryObj<typeof SLToggleButton> = {
  args: {
    ...DefaultPrefixIcon.args,
    children: (
      <>
        <SLPopover>
          <SLIconCalendar slot="trigger" size="lg"></SLIconCalendar>
          <span slot="trigger">Text label</span>
          <SLIconChevronDown slot="trigger"></SLIconChevronDown>
          <Fpo>Content</Fpo>
        </SLPopover>
      </>
    )
  }
};

export const DefaultWithTooltip: StoryObj<typeof SLToggleButton> = {
  args: {
    ...Default.args
  },
  decorators: [
    (Story) => (
      <SLTooltip>
        <span slot="trigger">{Story()}</span>
        Tooltip Text
      </SLTooltip>
    )
  ]
};

export const DefaultWithTooltipAndDropdown: StoryObj<typeof SLToggleButton> = {
  args: {
    ...Default.args,
    ...DefaultWithDropdown.args,
  },
  decorators: [
    (Story) => (
      <SLTooltip>
        <span slot="trigger">{Story()}</span>
        Tooltip Text
      </SLTooltip>
    )
  ]
};

export const Background: StoryObj<typeof SLToggleButton> = {
  args: {
    ...Default.args,
    variant: 'background'
  }
};

export const BackgroundIcon: StoryObj<typeof SLToggleButton> = {
  args: {
    ...DefaultIcon.args,
    variant: 'background'
  }
};

export const BackgroundPrefixIcon: StoryObj<typeof SLToggleButton> = {
  args: {
    ...DefaultPrefixIcon.args,
    variant: 'background'
  }
};

export const BackgroundAvatar: StoryObj<typeof SLToggleButton> = {
  args: {
    ...DefaultAvatar.args,
    variant: 'background'
  }
};

export const BackgroundWithDropdown: StoryObj<typeof SLToggleButton> = {
  args: {
    ...DefaultWithDropdown.args,
    variant: 'background'
  }
};

export const BackgroundWithDropdownIcon: StoryObj<typeof SLToggleButton> = {
  args: {
    ...DefaultWithDropdownIcon.args,
    variant: 'background'
  }
};

export const BackgroundWithDropdownPrefixIcon: StoryObj<typeof SLToggleButton> = {
  args: {
    ...DefaultWithDropdownPrefixIcon.args,
    variant: 'background'
  }
};

export const BackgroundWithTooltip: StoryObj<typeof SLToggleButton> = {
  args: {
    ...Default.args,
    variant: 'background'
  },
  decorators: [
    ...DefaultWithTooltip.decorators,
  ]
};

export const BackgroundWithTooltipAndDropdown: StoryObj<typeof SLToggleButton> = {
  args: {
    ...DefaultWithTooltipAndDropdown.args,
    variant: 'background'
  },
  decorators: [
    ...DefaultWithTooltip.decorators,
  ]
};
