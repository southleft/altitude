import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { ALSkeleton } from '../..';

export default {
  title: 'Atoms/Skeleton',
  component: ALSkeleton,
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
  },
  args: {
    width: '200',
  }
};

export const Default: StoryObj<typeof ALSkeleton> = { args: {} };

export const Circle: StoryObj<typeof ALSkeleton> = { args: {
  variant: 'circle',
  width: 100,
  height: 100
} };

export const Square: StoryObj<typeof ALSkeleton> = { args: {
  variant: 'square'
} };
