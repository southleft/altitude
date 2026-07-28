import type { StoryObj } from '@storybook/react-vite';
import React from 'react';
import { ALLayoutContainer } from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';

export default {
  title: 'Organisms/Layout Container',
  component: ALLayoutContainer,
  parameters: { status: { type: 'beta' } },
  args: {
    children: <Fpo>Layout Container</Fpo>
  }
};

export const Default: StoryObj<typeof ALLayoutContainer> = { args: {} };