import type { StoryObj } from '@storybook/react-vite';
import IconSvgs from './IconSvgs';

export default {
  title: 'Foundations/Icons/Icon Svgs',
  component: IconSvgs,
  parameters: { status: { type: 'beta' } }
};

export const Default: StoryObj<typeof IconSvgs> = { args: {} };
