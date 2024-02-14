import type { StoryObj } from '@storybook/react-webpack5';
import { SLPagination } from '../..';

export default {
  title: 'Molecules/Pagination',
  component: SLPagination,
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

export const Default: StoryObj<typeof SLPagination> = { args: {} };

export const Small: StoryObj<typeof SLPagination> = { args: {
  variant: 'small'
} };
