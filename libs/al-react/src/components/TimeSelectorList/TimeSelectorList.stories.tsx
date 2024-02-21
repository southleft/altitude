import type { StoryObj } from '@storybook/react-webpack5';
import { ALTimeSelectorList } from '../..';

export default {
  title: 'Atoms/Time Selector List',
  component: ALTimeSelectorList,
  parameters: { status: { type: 'beta' } },
};

export const Default: StoryObj<typeof ALTimeSelectorList> = { args: {} };

export const Horizontal: StoryObj<typeof ALTimeSelectorList> = { args: {
  orientation: 'horizontal'
} };
