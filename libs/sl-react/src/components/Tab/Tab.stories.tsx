import type { StoryObj } from '@storybook/react-webpack5';
import { SLTab, SLIconDone, SLBadge } from '../..';

export default {
  title: 'Components/Tab',
  component: SLTab,
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['tabSelect']
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
        <SLIconDone></SLIconDone>Label<SLBadge variant="danger">2</SLBadge>
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
      <SLIconDone></SLIconDone>
    </>
  )
} };