import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { SLBreadcrumbsItem, SLIconDocument } from '../..';

export default {
  title: 'Components/Breadcrumbs Item',
  component: SLBreadcrumbsItem,
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['click']
    },
    controls: {
      exclude: ['isTruncated']
    },
  },
  argTypes: {
    href: {
      control: 'text'
    },
    target: {
      control: 'radio',
      options: ['_blank' , '_self' , '_parent' , '_top']
    },
    isCurrent: {
      control: 'boolean'
    },
    hasSeparator: {
      control: 'boolean'
    }
  },
  args: {
    children: (
      <>
        <SLIconDocument></SLIconDocument>Page Name
      </>
    )
  },
};

export const Default: StoryObj<typeof SLBreadcrumbsItem> = { args: {} };

export const Current: StoryObj<typeof SLBreadcrumbsItem> = { args: {
  isCurrent: true,
} };

export const HasSeparator: StoryObj<typeof SLBreadcrumbsItem> = { args: {
  hasSeparator: true,
} };

export const WithHref: StoryObj<typeof SLBreadcrumbsItem> = { args: {
  href: "https://google.com",
  target: '_blank'
} };