import type { StoryObj } from '@storybook/react-webpack5';
import { ALChip, ALIconWarningTriangle } from '../..';

export default {
  title: 'Atoms/Chip',
  component: ALChip,
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['click', 'onChipClose']
    },
  },
  argTypes: {
    variant: {
      control: { type: 'radio' },
      options: ['default', 'secondary', 'info', 'success', 'warning', 'danger'],
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

export const Default: StoryObj<typeof ALChip> = { args: {} };

export const Secondary: StoryObj<typeof ALChip> = { args: {
  variant: 'secondary',
} };

export const Info: StoryObj<typeof ALChip> = { args: {
  variant: 'info',
} };

export const Success: StoryObj<typeof ALChip> = { args: {
  variant: 'success',
} };

export const Warning: StoryObj<typeof ALChip> = { args: {
  variant: 'warning',
} };

export const Danger: StoryObj<typeof ALChip> = { args: {
  variant: 'danger',
} };

export const WithIcon: StoryObj<typeof ALChip> = { args: {
  children: (
    <>
      <ALIconWarningTriangle></ALIconWarningTriangle>Label
    </>
  )
} };

export const WithIconDismissible: StoryObj<typeof ALChip> = { args: {
  isDismissible: true,
  ...WithIcon.args,
} };

export const WithDismissible: StoryObj<typeof ALChip> = { args: {
  isDismissible: true,
} };

export const Squared: StoryObj<typeof ALChip> = { args: {
  type: 'squared',
} };