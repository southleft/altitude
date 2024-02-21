import type { StoryObj } from '@storybook/react-webpack5';
import { ALIconEmoji, ALStepperItem } from '../..';

export default {
  title: 'Atoms/Stepper Item',
  component: ALStepperItem,
  parameters: {
    status: {
      type: 'beta'
    },
    layout: 'centered',
    controls: {
      exclude: ['stepNumber']
    }
  },
  argTypes: {
    variant: {
      type: 'radio',
      options: ['default', 'vertical']
    },
    isActive: {
      type: 'boolean'
    },
    isComplete: {
      type: 'boolean'
    },
    isLast: {
      type: 'boolean'
    }
  },
  args: {
    children: (
      <>
        <ALIconEmoji slot="icon"></ALIconEmoji>Label
        <span slot="description">Supporting text</span>
      </>
    )
  }
};

export const Default: StoryObj<typeof ALStepperItem> = {
  args: {}
};

export const Active: StoryObj<typeof ALStepperItem> = {
  args: {
    isActive: true
  }
};

export const Complete: StoryObj<typeof ALStepperItem> = {
  args: {
    isComplete: true
  }
};

export const Last: StoryObj<typeof ALStepperItem> = {
  args: {
    isLast: true
  }
};

export const Vertical: StoryObj<typeof ALStepperItem> = {
  args: {
    variant: 'vertical'
  }
};

export const VerticalActive: StoryObj<typeof ALStepperItem> = {
  args: {
    variant: 'vertical',
    isActive: true
  }
};

export const VerticalComplete: StoryObj<typeof ALStepperItem> = {
  args: {
    variant: 'vertical',
    isComplete: true
  }
};

export const VerticalLast: StoryObj<typeof ALStepperItem> = {
  args: {
    variant: 'vertical',
    isLast: true
  }
};
