import type { StoryObj } from '@storybook/react-webpack5';
import { SLLink, SLIconChevronRight } from '../..';

export default {
  title: 'Components/Link',
  component: SLLink,
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
      <>Link<SLIconChevronRight></SLIconChevronRight></>
    )
  },
};

export const Default: StoryObj<typeof SLLink> = { args: {} };

export const XSmall: StoryObj<typeof SLLink> = { args: {
  variant: 'xs',
} };

export const Small: StoryObj<typeof SLLink> = { args: {
  Small: 'sm',
} };

export const Large: StoryObj<typeof SLLink> = { args: {
  Large: 'lg',
} };

export const WithTargetBlank: StoryObj<typeof SLLink> = { args: {
  target: '_blank',
  href: 'https://google.com'
} };

export const WithoutHref: StoryObj<typeof SLLink> = { args: {
  href: null
} };