import type { StoryObj } from '@storybook/react-webpack5';
import { SLIconEmoji, SLStepperItem } from '../..';

export default {
  title: 'Atoms/Stepper Item',
  component: SLStepperItem,
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
        <SLIconEmoji slot="icon"></SLIconEmoji>Label
        <span slot="description">Supporting text</span>
      </>
    )
  }
};

export const Default: StoryObj<typeof SLStepperItem> = {
  args: {}
};

export const Active: StoryObj<typeof SLStepperItem> = {
  args: {
    isActive: true
  }
};

export const Complete: StoryObj<typeof SLStepperItem> = {
  args: {
    isComplete: true
  }
};

export const Last: StoryObj<typeof SLStepperItem> = {
  args: {
    isLast: true
  }
};

export const Vertical: StoryObj<typeof SLStepperItem> = {
  args: {
    variant: 'vertical'
  }
};

export const VerticalActive: StoryObj<typeof SLStepperItem> = {
  args: {
    variant: 'vertical',
    isActive: true
  }
};

export const VerticalComplete: StoryObj<typeof SLStepperItem> = {
  args: {
    variant: 'vertical',
    isComplete: true
  }
};

export const VerticalLast: StoryObj<typeof SLStepperItem> = {
  args: {
    variant: 'vertical',
    isLast: true
  }
};
