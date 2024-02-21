import type { StoryObj } from '@storybook/react-webpack5';
import { ALTab, ALIconCheck, ALBadge } from '../..';

export default {
  title: 'Atoms/Tab',
  component: ALTab,
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onTabSelect']
    },
    controls: {
      exclude: ['ariaId', 'ariaControls', 'idx', 'tabEl']
    },
  },
  argTypes: {
    isActive: {
      control: 'boolean',
    },
    isDisabled: {
      control: 'boolean',
    },
  },
  args: {
    children: (
      <>
        <ALIconCheck></ALIconCheck>Label<ALBadge variant="danger">2</ALBadge>
      </>
    )
  },
};

export const Default: StoryObj<typeof ALTab> = { args: {} };

export const Selected: StoryObj<typeof ALTab> = { args: {
  isActive: true
} };

export const Disabled: StoryObj<typeof ALTab> = { args: {
  isDisabled: true
} };

export const DisabledSelected: StoryObj<typeof ALTab> = { args: {
  isActive: true,
  isDisabled: true,
} };

export const WithIconOnly: StoryObj<typeof ALTab> = { args: {
  children: (
    <>
      <ALIconCheck></ALIconCheck>
    </>
  )
} };