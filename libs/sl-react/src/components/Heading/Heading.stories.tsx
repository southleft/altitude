import type { StoryObj } from '@storybook/react-webpack5';
import { SLHeading } from '../..';

export default {
  title: 'Components/Heading',
  component: SLHeading,
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

export const Default: StoryObj<typeof SLHeading> = { args: {} };

export const DefaultBold: StoryObj<typeof SLHeading> = { args: {
  isBold: true,
} };

export const Medium: StoryObj<typeof SLHeading> = { args: {
  variant: 'md',
} };

export const MediumBold: StoryObj<typeof SLHeading> = { args: {
  variant: 'md',
  isBold: true,
} };

export const Large: StoryObj<typeof SLHeading> = { args: {
  variant: 'lg',
} };

export const LargeBold: StoryObj<typeof SLHeading> = { args: {
  variant: 'lg',
  isBold: true,
} };

export const DisplaySmall: StoryObj<typeof SLHeading> = { args: {
  variant: 'display-sm',
} };

export const DisplaySmallBold: StoryObj<typeof SLHeading> = { args: {
  variant: 'display-sm',
  isBold: true,
} };

export const DisplayMedium: StoryObj<typeof SLHeading> = { args: {
  variant: 'display-md',
} };

export const DisplayMediumBold: StoryObj<typeof SLHeading> = { args: {
  variant: 'display-md',
  isBold: true,
} };

export const DisplayLarge: StoryObj<typeof SLHeading> = { args: {
  variant: 'display-lg',
} };

export const DisplayLargeBold: StoryObj<typeof SLHeading> = { args: {
  variant: 'display-lg',
  isBold: true,
} };

export const DefaultWithH1: StoryObj<typeof SLHeading> = { args: {
  tagName: 'h1',
} };

export const DefaultWithH2: StoryObj<typeof SLHeading> = { args: {
  tagName: 'h2',
} };

export const DefaultWithH3: StoryObj<typeof SLHeading> = { args: {
  tagName: 'h3',
} };

export const DefaultWithH4: StoryObj<typeof SLHeading> = { args: {
  tagName: 'h4',
} };

export const DefaultWithH5: StoryObj<typeof SLHeading> = { args: {
  tagName: 'h5',
} };

export const DefaultWithH6: StoryObj<typeof SLHeading> = { args: {
  tagName: 'h6',
} };
