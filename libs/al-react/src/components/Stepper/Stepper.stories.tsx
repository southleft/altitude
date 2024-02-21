import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { ALIconEmoji, ALStepper, ALStepperItem } from '../..';

export default {
  title: 'Molecules/Stepper',
  component: ALStepper,
  subcomponents: { ALStepperItem },
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
        <ALStepperItem isComplete={true}>
          <ALIconEmoji slot="icon"></ALIconEmoji>Label
          <span slot="description">Supporting text</span>
        </ALStepperItem>
        <ALStepperItem isActive={true}>
          <ALIconEmoji slot="icon"></ALIconEmoji>Label
          <span slot="description">Supporting text</span>
        </ALStepperItem>
        <ALStepperItem>
          <ALIconEmoji slot="icon"></ALIconEmoji>Label
          <span slot="description">Supporting text</span>
        </ALStepperItem>
        <ALStepperItem>
          <ALIconEmoji slot="icon"></ALIconEmoji>Label
          <span slot="description">Supporting text</span>
        </ALStepperItem>
      </>
    )
  }
};

export const Default: StoryObj<typeof ALStepper> = { args: {} };

export const Vertical: StoryObj<typeof ALStepper> = {
  args: {
    variant: 'vertical'
  }
};
