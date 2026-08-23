import type { StoryObj } from '@storybook/react-vite';
import { ALToggleButtonGroup, ALToggleButton, ALIconCalendar, ALPopover, ALLayout } from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';

export default {
  title: 'Molecules/Toggle Button Group',
  component: ALToggleButtonGroup,
  subcomponents: { ALToggleButton },
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
  },
  args: {
    children: (
      <>
        <ALToggleButton>
          <ALIconCalendar size="lg"></ALIconCalendar>
        </ALToggleButton>
        <ALToggleButton>
          <ALIconCalendar size="lg"></ALIconCalendar>
        </ALToggleButton>
        <ALToggleButton>
          <ALIconCalendar size="lg"></ALIconCalendar>
        </ALToggleButton>
      </>
    )
  }
};

export const Default: StoryObj<typeof ALToggleButtonGroup> = { args: {} };

export const Background: StoryObj<typeof ALToggleButtonGroup> = {
  args: {
    variant: 'background'
  }
};

/**
 * Arrangement belongs to `<ALLayout>` — nest the toggle buttons in an
 * `<ALLayout>` and set the direction there.
 */
const verticalChildren = (
  <ALLayout gap="none">
    <ALToggleButton>
      <ALIconCalendar size="lg"></ALIconCalendar>
    </ALToggleButton>
    <ALToggleButton>
      <ALIconCalendar size="lg"></ALIconCalendar>
    </ALToggleButton>
    <ALToggleButton>
      <ALIconCalendar size="lg"></ALIconCalendar>
    </ALToggleButton>
  </ALLayout>
);

export const Vertical: StoryObj<typeof ALToggleButtonGroup> = {
  args: {
    children: verticalChildren
  }
};

export const VerticalBackground: StoryObj<typeof ALToggleButtonGroup> = {
  args: {
    variant: 'background',
    children: verticalChildren
  }
};

export const GapSmall: StoryObj<typeof ALToggleButtonGroup> = {
  args: {
    children: (
      <ALLayout gap="md">
        <ALToggleButton variant="background">
          <ALPopover position="top-left">
            <ALIconCalendar slot="trigger" size="lg"></ALIconCalendar>
            <Fpo>Content</Fpo>
          </ALPopover>
        </ALToggleButton>
        <ALToggleButton variant="background">
          <ALPopover position="top-left">
            <ALIconCalendar slot="trigger" size="lg"></ALIconCalendar>
            <Fpo>Content</Fpo>
          </ALPopover>
        </ALToggleButton>
        <ALToggleButton variant="background">
          <ALPopover position="top-left">
            <ALIconCalendar slot="trigger" size="lg"></ALIconCalendar>
            <Fpo>Content</Fpo>
          </ALPopover>
        </ALToggleButton>
      </ALLayout>
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
