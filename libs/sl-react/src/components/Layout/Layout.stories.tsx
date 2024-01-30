import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { SLLayout } from '../..';
import { Fpo } from '../../../.storybook/components/Fpo/Fpo';
import { SLLayoutSection } from '../LayoutSection/LayoutSection';

export default {
  title: 'Organisms/Layout',
  component: SLLayout,
  subcomponents: { SLLayoutSection },
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
        <SLLayoutSection>
          <Fpo>Layout Section</Fpo>
        </SLLayoutSection>
        <SLLayoutSection>
          <Fpo>Layout Section</Fpo>
        </SLLayoutSection>
      </>
    )
  }
};

export const Default: StoryObj<typeof SLLayout> = { args: {} };

export const DefaultWithGapSm: StoryObj<typeof SLLayout> = { args: {
  gap: 'sm'
} };

export const DefaultWithGapLg: StoryObj<typeof SLLayout> = { args: {
  gap: 'lg'
} };

export const DefaultWithGapXl: StoryObj<typeof SLLayout> = { args: {
  gap: 'xl'
} };

export const SidebarRight: StoryObj<typeof SLLayout> = { args: {
  variant: 'sidebar-right'
} };

export const SidebarLeft: StoryObj<typeof SLLayout> = { args: {
  variant: 'sidebar-left'
} };