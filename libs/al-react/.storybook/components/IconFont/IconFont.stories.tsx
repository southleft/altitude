import type { ComponentStoryObj } from '@storybook/react';
import IconFont from './IconFont';

export default {
  title: 'Foundations/Icons/Icon Font',
  component: IconFont,
  parameters: { status: { type: 'beta' } }
};

export const Default: ComponentStoryObj<typeof IconFont> = { args: {} };
