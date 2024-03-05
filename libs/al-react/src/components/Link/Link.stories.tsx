import type { StoryObj } from '@storybook/react-webpack5';
import { ALLink, ALIconChevronRight } from '../..';

export default {
  title: 'Atoms/Link',
  component: ALLink,
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['click']
    },
   },
   argTypes: {
    variant: {
      control: { type: 'radio' },
      options: ['default', 'xs', 'sm', 'lg']
    },
    target: {
      control: { type: 'radio' },
      options: ['_blank', '_self', '_parent', '_top']
    },
    label: {
      control: 'text'
    },
    ariaLabelledBy: {
      control: 'text'
    },
    linkTitle: {
      control: 'text'
    },
  },
  args: {
    href: '#',
    linkTitle: 'Link title',
    children: (
      <>Link<ALIconChevronRight></ALIconChevronRight></>
    )
  },
};

export const Default: StoryObj<typeof ALLink> = { args: {} };

export const XSmall: StoryObj<typeof ALLink> = { args: {
  variant: 'xs',
} };

export const Small: StoryObj<typeof ALLink> = { args: {
  Small: 'sm',
} };

export const Large: StoryObj<typeof ALLink> = { args: {
  Large: 'lg',
} };

export const WithTargetBlank: StoryObj<typeof ALLink> = { args: {
  target: '_blank',
  href: 'https://google.com'
} };

export const WithoutHref: StoryObj<typeof ALLink> = { args: {
  href: null
} };