import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { ALToggleButtonGroup, ALToggleButton, ALIconCalendar, ALPopover } from '../..';
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

export const Vertical: StoryObj<typeof ALToggleButtonGroup> = {
  args: {
    orientation: 'vertical'
  }
};

export const VerticalBackground: StoryObj<typeof ALToggleButtonGroup> = {
  args: {
    orientation: 'vertical',
    variant: 'background'
  }
};

export const GapSmall: StoryObj<typeof ALToggleButtonGroup> = {
  args: {
    orientation: 'vertical',
    gap: 'sm',
    children: (
      <>
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
