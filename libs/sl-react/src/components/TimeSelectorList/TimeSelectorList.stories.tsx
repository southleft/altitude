import type { StoryObj } from '@storybook/react-webpack5';
import { SLTimeSelectorList } from '../..';

export default {
  title: 'Boilerplate/Time Selector List',
  component: SLTimeSelectorList,
  parameters: { status: { type: 'beta' } },
};

export const Default: StoryObj<typeof SLTimeSelectorList> = { args: {} };

export const Horizontal: StoryObj<typeof SLTimeSelectorList> = { args: {
  orientation: 'horizontal'
} };
