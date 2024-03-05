import type { StoryObj } from '@storybook/react-webpack5';
import { ALHeading } from '../..';

export default {
  title: 'Atoms/Heading',
  component: ALHeading,
  parameters: { status: { type: 'beta' } },
  argTypes: {
    variant: {
      control: { type: 'radio' },
      options: ['default', 'md', 'lg', 'display-sm', 'display-md', 'display-lg']
    },
    tagName: {
      control: { type: 'radio' },
      options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
    },
    isBold: {
      control: 'boolean'
    },
  },
  args: { children: 'This is a heading' },
};

export const Default: StoryObj<typeof ALHeading> = { args: {} };

export const DefaultBold: StoryObj<typeof ALHeading> = { args: {
  isBold: true,
} };

export const Medium: StoryObj<typeof ALHeading> = { args: {
  variant: 'md',
} };

export const MediumBold: StoryObj<typeof ALHeading> = { args: {
  variant: 'md',
  isBold: true,
} };

export const Large: StoryObj<typeof ALHeading> = { args: {
  variant: 'lg',
} };

export const LargeBold: StoryObj<typeof ALHeading> = { args: {
  variant: 'lg',
  isBold: true,
} };

export const DisplaySmall: StoryObj<typeof ALHeading> = { args: {
  variant: 'display-sm',
} };

export const DisplaySmallBold: StoryObj<typeof ALHeading> = { args: {
  variant: 'display-sm',
  isBold: true,
} };

export const DisplayMedium: StoryObj<typeof ALHeading> = { args: {
  variant: 'display-md',
} };

export const DisplayMediumBold: StoryObj<typeof ALHeading> = { args: {
  variant: 'display-md',
  isBold: true,
} };

export const DisplayLarge: StoryObj<typeof ALHeading> = { args: {
  variant: 'display-lg',
} };

export const DisplayLargeBold: StoryObj<typeof ALHeading> = { args: {
  variant: 'display-lg',
  isBold: true,
} };

export const DefaultWithH1: StoryObj<typeof ALHeading> = { args: {
  tagName: 'h1',
} };

export const DefaultWithH2: StoryObj<typeof ALHeading> = { args: {
  tagName: 'h2',
} };

export const DefaultWithH3: StoryObj<typeof ALHeading> = { args: {
  tagName: 'h3',
} };

export const DefaultWithH4: StoryObj<typeof ALHeading> = { args: {
  tagName: 'h4',
} };

export const DefaultWithH5: StoryObj<typeof ALHeading> = { args: {
  tagName: 'h5',
} };

export const DefaultWithH6: StoryObj<typeof ALHeading> = { args: {
  tagName: 'h6',
} };
