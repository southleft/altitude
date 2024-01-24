import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { SLLayoutContainer } from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';

export default {
  title: 'Components/Layout Container',
  component: SLLayoutContainer,
  parameters: { status: { type: 'stable' } },
  args: {
    children: <Fpo>Layout Container</Fpo>
  }
};

export const Default: StoryObj<typeof SLLayoutContainer> = { args: {} };