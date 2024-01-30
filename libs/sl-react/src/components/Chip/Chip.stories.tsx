import type { StoryObj } from '@storybook/react-webpack5';
import { SLChip, SLIconEmoji } from '../..';

export default {
  title: 'Atoms/Chip',
  component: SLChip,
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['click', 'onChipClose']
    },
  },
  argTypes: {
    variant: {
      control: { type: 'radio' },
      options: ['default', 'info', 'success', 'warning', 'danger'],
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

export const Info: StoryObj<typeof SLChip> = { args: {
  variant: 'info',
} };

export const Success: StoryObj<typeof SLChip> = { args: {
  variant: 'success',
} };

export const Warning: StoryObj<typeof SLChip> = { args: {
  variant: 'warning',
} };

export const Danger: StoryObj<typeof SLChip> = { args: {
  variant: 'danger',
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