import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { ALPaginationItem } from '../..';

export default {
  title: 'Atoms/Pagination Item',
  component: ALPaginationItem,
  parameters: { status: { type: 'beta' } },
  args: { children: '1' },
};

export const Default: StoryObj<typeof ALPaginationItem> = { args: {} };

export const Disabled: StoryObj<typeof ALPaginationItem> = { args: {
  isDisabled: true
} };

export const Selected: StoryObj<typeof ALPaginationItem> = { args: {
  isSelected: true
} };
