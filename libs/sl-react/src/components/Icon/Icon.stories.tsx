import type { StoryObj } from '@storybook/react-webpack5';
import { SLIcon, SLIconAdd } from '../..';

export default {
  title: 'Components/Icon',
  component: SLIcon,
  tags: [  'autodocs' ],
  parameters: { status: { type: 'beta' } },
  argTypes: {
    size: {
      control: 'radio',
      options: ['default', 'md', 'lg', 'xl'],
    },
    iconTitle: {
      control: 'text',
    },
  },
};

export const Default: StoryObj<typeof SLIcon> = { args: {} };
