import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { ALAvatar, ALIconUser } from '../..';

export default {
  title: 'Atoms/Avatar',
  component: ALAvatar,
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: { type: 'radio' },
      options: ['default', 'sm']
    },
    hasBadge: {
      control: 'boolean',
    },
    badgeVariant: {
      control: 'radio',
      options: ['default', 'success', 'warning', 'danger'],
    },
  },
  args: {
    children: 'WW',
  },
};

export const Default: StoryObj<typeof ALAvatar> = {};

export const WithIcon: StoryObj<typeof ALAvatar> = {
  args: {
    children: (
      <>
        <ALIconUser></ALIconUser>
      </>
    )
  }
};

export const WithImage: StoryObj<typeof ALAvatar> = {
  args: {
    children: (
      <>
        <img src="https://picsum.photos/80/80" alt="Alt text" />
      </>
    )
  }
};

export const Small: StoryObj<typeof ALAvatar> = {
  args: {
    variant: 'sm',
  }
};

export const SmallWithIcon: StoryObj<typeof ALAvatar> = {
  args: {
    ...WithIcon.args,
    ...Small.args,
  }
};

export const SmallWithImage: StoryObj<typeof ALAvatar> = {
  args: {
    ...WithImage.args,
    ...Small.args,
  }
};

export const HasBadge: StoryObj<typeof ALAvatar> = {
  hasBadge: true,
  badgeVariant: 'success'
};

export const HasBadgeWithIcon: StoryObj<typeof ALAvatar> = {
  args: {
    ...HasBadge.args,
    ...WithIcon.args,
  }
};

export const HasBadgeWithImage: StoryObj<typeof ALAvatar> = {
  args: {
    ...HasBadge.args,
    ...WithImage.args,
  }
};

export const HasBadgeSmall: StoryObj<typeof ALAvatar> = {
  args: {
    ...HasBadge.args,
    ...Small.args,
  }
};

export const HasBadgeSmallWithIcon: StoryObj<typeof ALAvatar> = {
  args: {
    ...HasBadge.args,
    ...SmallWithIcon.args,
  }
};

export const HasBadgeSmallWithImage: StoryObj<typeof ALAvatar> = {
  args: {
    ...HasBadge.args,
    ...SmallWithImage.args,
  }
};