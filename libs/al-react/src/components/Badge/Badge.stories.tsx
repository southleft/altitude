import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { ALBadge, ALButton } from '../..';

export default {
  title: 'Atoms/Badge',
  component: ALBadge,
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
  },
  argTypes: {
    isDot: {
      control: 'boolean'
    },
    variant: {
      control: 'radio',
      options: ['default', 'info', 'success', 'warning', 'danger']
    },
    position: {
      control: 'radio',
      options: ['top-left', 'top-right', 'bottom-left', 'bottom-right']
    },
  },
  args: {
    children: '0',
  },
};

export const Default: StoryObj<typeof ALBadge> = { args: {} };

export const DefaultInfo: StoryObj<typeof ALBadge> = {
  args: {
    variant: 'info',
  }
};

export const DefaultSuccess: StoryObj<typeof ALBadge> = {
  args: {
    variant: 'success',
  }
};

export const DefaultWarning: StoryObj<typeof ALBadge> = {
  args: {
    variant: 'warning',
  }
};

export const DefaultDanger: StoryObj<typeof ALBadge> = {
  args: {
    variant: 'danger',
  }
};

export const Dot: StoryObj<typeof ALBadge> = {
  args: {
    isDot: true,
  }
};

export const DotInfo: StoryObj<typeof ALBadge> = {
  args: {
    ...Dot.args,
    variant: 'info',
  }
};

export const DotSuccess: StoryObj<typeof ALBadge> = {
  args: {
    ...Dot.args,
    variant: 'success',
  }
};

export const DotWarning: StoryObj<typeof ALBadge> = {
  args: {
    ...Dot.args,
    variant: 'warning',
  }
};

export const DotDanger: StoryObj<typeof ALBadge> = {
  args: {
    ...Dot.args,
    variant: 'danger',
  }
};

export const PositionTopLeft: StoryObj<typeof ALBadge> = {
  args: {
    isDot: true,
    children: 'Notification',
    variant: 'success',
    position: 'top-left',
  },
  decorators: [
    (Story) => (
      <div>
        {Story()}
        <ALButton>Label</ALButton>
      </div>
    )
  ],
};

export const PositionTopRight: StoryObj<typeof ALBadge> = {
  args: {
    ...PositionTopLeft.args,
    position: 'top-right',
  },
  decorators: [
    ...PositionTopLeft.decorators,
  ],
};

export const PositionBottomLeft: StoryObj<typeof ALBadge> = {
  args: {
    ...PositionTopLeft.args,
    position: 'bottom-left',
  },
  decorators: [
    ...PositionTopLeft.decorators,
  ],
};

export const PositionBottomRight: StoryObj<typeof ALBadge> = {
  args: {
    ...PositionTopLeft.args,
    position: 'bottom-right',
  },
  decorators: [
    ...PositionTopLeft.decorators,
  ],
};