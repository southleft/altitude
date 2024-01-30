import type { ComponentStoryObj } from '@storybook/react';
import IconGrid from './IconGrid';

export default {
  title: 'Fundamentals/Icons/Icon Grid',
  component: IconGrid,
  parameters: { status: { type: 'stable' } }
};

export const Default: ComponentStoryObj<typeof IconGrid> = { args: {} };
