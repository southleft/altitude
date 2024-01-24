import type { StoryObj } from '@storybook/react-webpack5';
import { SLChip, SLIconEmoji } from '../..';

export default {
  title: 'Components/Chip',
  component: SLChip,
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['click', 'close']
    },
    themes: { default: 'dark-subtle' },
  },
  argTypes: {
    variant: {
      control: { type: 'radio' },
      options: ['default', 'secondary', 'tertiary', 'green', 'red', 'blue', 'amber', 'purple'],
    },
    type: {
      control: { type: 'radio' },
      options: ['default', 'squared'],
    },
    isDismissible: {
      control: 'boolean',
    },
  },
  args: {
    children: 'Label',
  },
};

export const Default: StoryObj<typeof SLChip> = { args: {} };

export const Secondary: StoryObj<typeof SLChip> = { args: {
  variant: 'secondary',
} };

export const Tertiary: StoryObj<typeof SLChip> = { args: {
  variant: 'tertiary',
} };

export const Green: StoryObj<typeof SLChip> = { args: {
  variant: 'green',
} };

export const Red: StoryObj<typeof SLChip> = { args: {
  variant: 'red',
} };

export const Blue: StoryObj<typeof SLChip> = { args: {
  variant: 'blue',
} };

export const Amber: StoryObj<typeof SLChip> = { args: {
  variant: 'amber',
} };

export const Purple: StoryObj<typeof SLChip> = { args: {
  variant: 'purple',
} };

export const WithIcon: StoryObj<typeof SLChip> = { args: {
  children: (
    <>
      <SLIconEmoji></SLIconEmoji>Label
    </>
  )
} };

export const WithIconDismissible: StoryObj<typeof SLChip> = { args: {
  isDismissible: true,
  ...WithIcon.args,
} };

export const WithDismissible: StoryObj<typeof SLChip> = { args: {
  isDismissible: true,
} };

export const Squared: StoryObj<typeof SLChip> = { args: {
  type: 'squared',
} };