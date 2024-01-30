import type { StoryObj } from '@storybook/react-webpack5';
import { SLToggleButtonGroup, SLToggleButton, SLIconCalendar, SLPopover } from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';

export default {
  title: 'Components/Control Button Group',
  component: SLToggleButtonGroup,
  subcomponents: { SLToggleButton },
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onToggleButtonSelect', 'onToggleButtonDeselect']
    },
    controls: {
      exclude: ['selectedItem', 'toggleButtons']
    }
  },
  argTypes: {
    variant: {
      control: 'radio',
      options: ['default', 'background']
    },
    orientation: {
      control: 'radio',
      options: ['default', 'vertical']
    },
    gap: {
      control: 'radio',
      options: ['default', 'sm']
    }
  },
  args: {
    children: (
      <>
        <SLToggleButton>
          <SLIconCalendar size="lg"></SLIconCalendar>
        </SLToggleButton>
        <SLToggleButton>
          <SLIconCalendar size="lg"></SLIconCalendar>
        </SLToggleButton>
        <SLToggleButton>
          <SLIconCalendar size="lg"></SLIconCalendar>
        </SLToggleButton>
      </>
    )
  }
};

export const Default: StoryObj<typeof SLToggleButtonGroup> = { args: {} };

export const Background: StoryObj<typeof SLToggleButtonGroup> = {
  args: {
    variant: 'background'
  }
};

export const Vertical: StoryObj<typeof SLToggleButtonGroup> = {
  args: {
    orientation: 'vertical'
  }
};

export const VerticalBackground: StoryObj<typeof SLToggleButtonGroup> = {
  args: {
    orientation: 'vertical',
    variant: 'background'
  }
};

export const GapSmall: StoryObj<typeof SLToggleButtonGroup> = {
  args: {
    orientation: 'vertical',
    gap: 'sm',
    children: (
      <>
        <SLToggleButton variant="background">
          <SLPopover position="top-left">
            <SLIconCalendar slot="trigger" size="lg"></SLIconCalendar>
            <Fpo>Content</Fpo>
          </SLPopover>
        </SLToggleButton>
        <SLToggleButton variant="background">
          <SLPopover position="top-left">
            <SLIconCalendar slot="trigger" size="lg"></SLIconCalendar>
            <Fpo>Content</Fpo>
          </SLPopover>
        </SLToggleButton>
        <SLToggleButton variant="background">
          <SLPopover position="top-left">
            <SLIconCalendar slot="trigger" size="lg"></SLIconCalendar>
            <Fpo>Content</Fpo>
          </SLPopover>
        </SLToggleButton>
      </>
    )
  },
  decorators: [
    (Story) => (
      <div style={{ position: 'fixed', insetBlockEnd: '1rem', insetInlineEnd: '1rem' }}>
        {Story()}
      </div>
    )
  ],
  parameters: {
    layout: 'fullscreen'
  }
};
