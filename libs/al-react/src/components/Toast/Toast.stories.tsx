import type { StoryObj } from '@storybook/react-webpack5';
import { ALToast, ALButton, ALIconSuccess } from '../..';

export default {
  title: 'Atoms/Toast',
  component: ALToast,
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

export const Default: StoryObj<typeof ALToast> = { args: {} };

export const Info: StoryObj<typeof ALToast> = { args: {
  variant: 'info'
} };

export const Success: StoryObj<typeof ALToast> = { args: {
  variant: 'success'
} };

export const Warning: StoryObj<typeof ALToast> = { args: {
  variant: 'warning'
} };

export const Danger: StoryObj<typeof ALToast> = { args: {
  variant: 'danger'
} };

export const WithoutDescription: StoryObj<typeof ALToast> = { args: {
  description: false
} };

export const WithActions: StoryObj<typeof ALToast> = { args: {
  children: (
    <>
      Toast title
      <ALButton slot="actions" variant="tertiary"><ALIconSuccess slot="before"></ALIconSuccess>Label</ALButton>
      <ALButton slot="actions"><ALIconSuccess slot="before"></ALIconSuccess>Label</ALButton>
    </>
  )
} };

export const WithDismissible: StoryObj<typeof ALToast> = { args: {
  isDismissible: true
} };

export const WithAutoClose: StoryObj<typeof ALToast> = { args: {
  autoClose: true
} };

export const WithAutoCloseWithProgress: StoryObj<typeof ALToast> = { args: {
  ...WithAutoClose.args,
  showProgress: true,
  variant: 'info',
  children: (
    <>
      Toast title
      <ALButton slot="actions" variant="tertiary"><ALIconSuccess slot="before"></ALIconSuccess>Label</ALButton>
      <ALButton slot="actions"><ALIconSuccess slot="before"></ALIconSuccess>Label</ALButton>
    </>
  )
} };