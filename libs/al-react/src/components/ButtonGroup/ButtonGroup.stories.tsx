import type { StoryObj } from '@storybook/react-webpack5';
import { ALButtonGroup, ALButton } from '../..';

export default {
  title: 'Molecules/Button Group',
  component: ALButtonGroup,
  parameters: { status: { type: 'beta' } },
  argTypes: {
    behavior: {
      type: 'radio',
      options: ['default', 'stacked', 'stretched', 'responsive']
    },
    alignment: {
      type: 'radio',
      options: ['default', 'center', 'right']
    },
  },
  args: {
    children: (
      <>
        <ALButton variant="tertiary">Button</ALButton>
        <ALButton>Button</ALButton>
      </>
    )
  },
};

export const Default: StoryObj<typeof ALButtonGroup> = { args: {} };

export const AlignmentCenter: StoryObj<typeof ALButtonGroup> = { args: {
  alignment: 'center',
} };

export const AlignmentRight: StoryObj<typeof ALButtonGroup> = { args: {
  alignment: 'right',
} };

export const BehaviorStacked: StoryObj<typeof ALButtonGroup> = { args: {
  behavior: 'stacked',
} };

export const BehaviorStretched: StoryObj<typeof ALButtonGroup> = { args: {
  behavior: 'stretched',
} };

export const BehaviorResponsive: StoryObj<typeof ALButtonGroup> = { args: {
  behavior: 'responsive',
} };