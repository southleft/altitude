import type { StoryObj } from '@storybook/react-vite';
import IconFont from './IconFont';

export default {
  title: 'Foundations/Icons/Icon Font',
  component: IconFont,
  parameters: { status: { type: 'beta' } }
};

export const Default: StoryObj<typeof IconFont> = { args: {} };
