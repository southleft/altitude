import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { SLLayoutContainer } from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';

export default {
  title: 'Organisms/Layout Container',
  component: SLLayoutContainer,
  parameters: { status: { type: 'beta' } },
  args: {
    children: <Fpo>Layout Container</Fpo>
  }
};

export const Default: StoryObj<typeof SLLayoutContainer> = { args: {} };