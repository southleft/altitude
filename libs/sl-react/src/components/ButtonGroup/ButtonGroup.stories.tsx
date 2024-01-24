import type { StoryObj } from '@storybook/react-webpack5';
import { SLButtonGroup, SLButton } from '../..';

export default {
  title: 'Components/Button Group',
  component: SLButtonGroup,
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
        <SLButton variant="secondary">Button</SLButton>
        <SLButton>Button</SLButton>
      </>
    )
  },
};

export const Default: StoryObj<typeof SLButtonGroup> = { args: {} };

export const AlignmentCenter: StoryObj<typeof SLButtonGroup> = { args: {
  alignment: 'center',
} };

export const AlignmentRight: StoryObj<typeof SLButtonGroup> = { args: {
  alignment: 'right',
} };

export const BehaviorStacked: StoryObj<typeof SLButtonGroup> = { args: {
  behavior: 'stacked',
} };

export const BehaviorStretched: StoryObj<typeof SLButtonGroup> = { args: {
  behavior: 'stretched',
} };

export const BehaviorResponsive: StoryObj<typeof SLButtonGroup> = { args: {
  behavior: 'responsive',
} };