import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { ALLayout } from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';
import { ALLayoutSection } from '../LayoutSection/LayoutSection';

export default {
  title: 'Organisms/Layout',
  component: ALLayout,
  subcomponents: { ALLayoutSection },
  parameters: { status: { type: 'beta' } },
  argTypes: {
    variant: {
      control: 'radio',
      options: ['default', 'sidebar-left', 'sidebar-right'],
    },
    gap: {
      control: 'radio',
      options: ['default', 'sm', 'lg', 'xl'],
    },
  },
  args: {
    children: (
      <>
        <ALLayoutSection>
          <Fpo>Layout Section</Fpo>
        </ALLayoutSection>
        <ALLayoutSection>
          <Fpo>Layout Section</Fpo>
        </ALLayoutSection>
      </>
    )
  }
};

export const Default: StoryObj<typeof ALLayout> = { args: {} };

export const DefaultWithGapSm: StoryObj<typeof ALLayout> = { args: {
  gap: 'sm'
} };

export const DefaultWithGapLg: StoryObj<typeof ALLayout> = { args: {
  gap: 'lg'
} };

export const DefaultWithGapXl: StoryObj<typeof ALLayout> = { args: {
  gap: 'xl'
} };

export const SidebarRight: StoryObj<typeof ALLayout> = { args: {
  variant: 'sidebar-right'
} };

export const SidebarLeft: StoryObj<typeof ALLayout> = { args: {
  variant: 'sidebar-left'
} };