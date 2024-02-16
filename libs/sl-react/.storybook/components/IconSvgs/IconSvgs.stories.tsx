import type { ComponentStoryObj } from '@storybook/react';
import IconSvgs from './IconSvgs';

export default {
  title: 'Foundations/Icons/Icon Svgs',
  component: IconSvgs,
  parameters: { status: { type: 'beta' } }
};

export const Default: ComponentStoryObj<typeof IconSvgs> = { args: {} };
