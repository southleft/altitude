import type { StoryObj } from '@storybook/react-vite';
import React from 'react';
import { ALLayoutSection } from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';

export default {
  title: 'Organisms/Layout Section',
  component: ALLayoutSection,
  parameters: { status: { type: 'beta' } },
  args: {
    children: <Fpo>Layout Section</Fpo>
  }
};

export const Default: StoryObj<typeof ALLayoutSection> = { args: {} };