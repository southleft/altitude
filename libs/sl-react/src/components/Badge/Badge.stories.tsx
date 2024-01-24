import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { SLBadge, SLButton, SLIconEmoji } from '../..';

export default {
  title: 'Components/Badge',
  component: SLBadge,
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
      options: ['default', 'success', 'warning', 'danger']
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

export const Default: StoryObj<typeof SLBadge> = { args: {} };

export const DefaultWithIcon: StoryObj<typeof SLBadge> = { args: {
  children: (
    <><SLIconEmoji></SLIconEmoji></>
  )
} };

export const DefaultSuccess: StoryObj<typeof SLBadge> = {
  args: {
    variant: 'success',
  }
};

export const DefaultSuccessWithIcon: StoryObj<typeof SLBadge> = {
  args: {
    ...DefaultSuccess.args,
    ...DefaultWithIcon.args,
  }
};

export const DefaultWarning: StoryObj<typeof SLBadge> = {
  args: {
    variant: 'warning',
  }
};

export const DefaultWarningWithIcon: StoryObj<typeof SLBadge> = {
  args: {
    ...DefaultWarning.args,
    ...DefaultWithIcon.args,
  }
};

export const DefaultDanger: StoryObj<typeof SLBadge> = {
  args: {
    variant: 'danger',
  }
};

export const DefaultDangerWithIcon: StoryObj<typeof SLBadge> = {
  args: {
    ...DefaultDanger.args,
    ...DefaultWithIcon.args,
  }
};

export const Dot: StoryObj<typeof SLBadge> = {
  args: {
    isDot: true,
  }
};

export const DotSuccess: StoryObj<typeof SLBadge> = {
  args: {
    ...Dot.args,
    variant: 'success',
  }
};

export const DotWarning: StoryObj<typeof SLBadge> = {
  args: {
    ...Dot.args,
    variant: 'warning',
  }
};

export const DotDanger: StoryObj<typeof SLBadge> = {
  args: {
    ...Dot.args,
    variant: 'danger',
  }
};

export const PositionTopLeft: StoryObj<typeof SLBadge> = {
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
        <SLButton>Label</SLButton>
      </div>
    )
  ],
};

export const PositionTopRight: StoryObj<typeof SLBadge> = {
  args: {
    ...PositionTopLeft.args,
    position: 'top-right',
  },
  decorators: [
    ...PositionTopLeft.decorators,
  ],
};

export const PositionBottomLeft: StoryObj<typeof SLBadge> = {
  args: {
    ...PositionTopLeft.args,
    position: 'bottom-left',
  },
  decorators: [
    ...PositionTopLeft.decorators,
  ],
};

export const PositionBottomRight: StoryObj<typeof SLBadge> = {
  args: {
    ...PositionTopLeft.args,
    position: 'bottom-right',
  },
  decorators: [
    ...PositionTopLeft.decorators,
  ],
};