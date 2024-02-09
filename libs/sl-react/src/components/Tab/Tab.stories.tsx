import type { StoryObj } from '@storybook/react-webpack5';
import { SLTab, SLIconCheck, SLBadge } from '../..';

export default {
  title: 'Atoms/Tab',
  component: SLTab,
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
        <SLIconCheck></SLIconCheck>Label<SLBadge variant="danger">2</SLBadge>
      </>
    )
  },
};

export const Default: StoryObj<typeof SLTab> = { args: {} };

export const Selected: StoryObj<typeof SLTab> = { args: {
  isActive: true
} };

export const Disabled: StoryObj<typeof SLTab> = { args: {
  isDisabled: true
} };

export const DisabledSelected: StoryObj<typeof SLTab> = { args: {
  isActive: true,
  isDisabled: true,
} };

export const WithIconOnly: StoryObj<typeof SLTab> = { args: {
  children: (
    <>
      <SLIconCheck></SLIconCheck>
    </>
  )
} };