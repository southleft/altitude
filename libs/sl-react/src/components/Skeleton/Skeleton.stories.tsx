import type { StoryObj } from '@storybook/react-webpack5';
import { SLSkeleton } from '../..';

export default {
  title: 'Boilerplate/Skeleton',
  component: SLSkeleton,
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
  },
  args: {
    width: '200',
  }
};

export const Default: StoryObj<typeof SLSkeleton> = { args: {} };

export const Circle: StoryObj<typeof SLSkeleton> = { args: {
  variant: 'circle',
  width: 100,
  height: 100
} };

export const Square: StoryObj<typeof SLSkeleton> = { args: {
  variant: 'square'
} };
