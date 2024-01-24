import type { StoryObj } from '@storybook/react-webpack5';
import { SLPaginationItem } from '../..';

export default {
  title: 'Boilerplate/Pagination Item',
  component: SLPaginationItem,
  parameters: { status: { type: 'beta' } },
  args: { children: '1' },
};

export const Default: StoryObj<typeof SLPaginationItem> = { args: {} };

export const Disabled: StoryObj<typeof SLPaginationItem> = { args: {
  isDisabled: true
} };

export const Selected: StoryObj<typeof SLPaginationItem> = { args: {
  isSelected: true
} };
