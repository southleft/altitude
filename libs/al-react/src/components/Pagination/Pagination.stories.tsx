import type { StoryObj } from '@storybook/react-webpack5';
import { ALPagination } from '../..';

export default {
  title: 'Molecules/Pagination',
  component: ALPagination,
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onPaginationChange']
    },
    layout: 'centered'
  },
  args: {
    totalRecords: 200,
    pageSize: 20
  }
};

export const Default: StoryObj<typeof ALPagination> = { args: {} };

export const Small: StoryObj<typeof ALPagination> = { args: {
  variant: 'small'
} };
