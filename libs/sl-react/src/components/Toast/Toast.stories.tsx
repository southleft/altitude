import type { StoryObj } from '@storybook/react-webpack5';
import { SLToast, SLButton, SLIconDone } from '../..';

export default {
  title: 'Atoms/Toast',
  component: SLToast,
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['onToastClose']
    }
  },
  argTypes: {
    variant: {
      control: { type: 'radio' },
      options: ['default', 'info', 'success', 'warning', 'danger'],
    },
    description: {
      control: 'text'
    },
    isActive: {
      control: 'boolean',
    },
    isDismissible: {
      control: 'boolean',
    },
    autoClose: {
      control: 'boolean'
    },
    autoCloseDelay: {
      control: 'number'
    },
    showProgress: {
      control: 'boolean',
    },
  },
  args: {
    isActive: true,
    description: 'A description should go here',
    children: 'Toast title',
  },
};

export const Default: StoryObj<typeof SLToast> = { args: {} };

export const Info: StoryObj<typeof SLToast> = { args: {
  variant: 'info'
} };

export const Success: StoryObj<typeof SLToast> = { args: {
  variant: 'success'
} };

export const Warning: StoryObj<typeof SLToast> = { args: {
  variant: 'warning'
} };

export const Danger: StoryObj<typeof SLToast> = { args: {
  variant: 'danger'
} };

export const WithoutDescription: StoryObj<typeof SLToast> = { args: {
  description: false
} };

export const WithActions: StoryObj<typeof SLToast> = { args: {
  children: (
    <>
      Toast title
      <SLButton slot="actions" variant="secondary"><SLIconDone slot="before"></SLIconDone>Label</SLButton>
      <SLButton slot="actions"><SLIconDone slot="before"></SLIconDone>Label</SLButton>
    </>
  )
} };

export const WithDismissible: StoryObj<typeof SLToast> = { args: {
  isDismissible: true
} };

export const WithAutoClose: StoryObj<typeof SLToast> = { args: {
  autoClose: true
} };

export const WithAutoCloseWithProgress: StoryObj<typeof SLToast> = { args: {
  ...WithAutoClose.args,
  showProgress: true,
  variant: 'info',
  children: (
    <>
      Toast title
      <SLButton slot="actions" variant="secondary"><SLIconDone slot="before"></SLIconDone>Label</SLButton>
      <SLButton slot="actions"><SLIconDone slot="before"></SLIconDone>Label</SLButton>
    </>
  )
} };