import type { StoryObj } from '@storybook/react-webpack5';
import { SLAvatar, SLIconUser } from '../..';

export default {
  title: 'Atoms/Avatar',
  component: SLAvatar,
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

export const Default: StoryObj<typeof SLAvatar> = {};

export const WithIcon: StoryObj<typeof SLAvatar> = {
  args: {
    children: (
      <>
        <SLIconUser></SLIconUser>
      </>
    )
  }
};

export const WithImage: StoryObj<typeof SLAvatar> = {
  args: {
    children: (
      <>
        <img src="https://picsum.photos/80/80" alt="Alt text" />
      </>
    )
  }
};

export const Small: StoryObj<typeof SLAvatar> = {
  args: {
    variant: 'sm',
  }
};

export const SmallWithIcon: StoryObj<typeof SLAvatar> = {
  args: {
    ...WithIcon.args,
    ...Small.args,
  }
};

export const SmallWithImage: StoryObj<typeof SLAvatar> = {
  args: {
    ...WithImage.args,
    ...Small.args,
  }
};

export const HasBadge: StoryObj<typeof SLAvatar> = {
  hasBadge: true,
  badgeVariant: 'success'
};

export const HasBadgeWithIcon: StoryObj<typeof SLAvatar> = {
  args: {
    ...HasBadge.args,
    ...WithIcon.args,
  }
};

export const HasBadgeWithImage: StoryObj<typeof SLAvatar> = {
  args: {
    ...HasBadge.args,
    ...WithImage.args,
  }
};

export const HasBadgeSmall: StoryObj<typeof SLAvatar> = {
  args: {
    ...HasBadge.args,
    ...Small.args,
  }
};

export const HasBadgeSmallWithIcon: StoryObj<typeof SLAvatar> = {
  args: {
    ...HasBadge.args,
    ...SmallWithIcon.args,
  }
};

export const HasBadgeSmallWithImage: StoryObj<typeof SLAvatar> = {
  args: {
    ...HasBadge.args,
    ...SmallWithImage.args,
  }
};