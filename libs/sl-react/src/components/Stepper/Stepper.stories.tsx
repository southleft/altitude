import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { SLIconEmoji, SLStepper, SLStepperItem } from '../..';

export default {
  title: 'Components/Stepper',
  component: SLStepper,
  subcomponents: { SLStepperItem },
  parameters: {
    status: {
      type: 'beta'
    },
    controls: {
      exclude: ['StepperItems']
    }
  },
  argTypes: {
    variant: {
      type: 'radio',
      options: ['default', 'vertical']
    }
  },
  args: {
    children: (
      <>
        <SLStepperItem isComplete={true}>
          <SLIconEmoji slot="icon"></SLIconEmoji>Label
          <span slot="description">Supporting text</span>
        </SLStepperItem>
        <SLStepperItem isActive={true}>
          <SLIconEmoji slot="icon"></SLIconEmoji>Label
          <span slot="description">Supporting text</span>
        </SLStepperItem>
        <SLStepperItem>
          <SLIconEmoji slot="icon"></SLIconEmoji>Label
          <span slot="description">Supporting text</span>
        </SLStepperItem>
        <SLStepperItem>
          <SLIconEmoji slot="icon"></SLIconEmoji>Label
          <span slot="description">Supporting text</span>
        </SLStepperItem>
      </>
    )
  }
};

export const Default: StoryObj<typeof SLStepper> = { args: {} };

export const Vertical: StoryObj<typeof SLStepper> = {
  args: {
    variant: 'vertical'
  }
};
