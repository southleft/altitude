import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { ALBreadcrumbsItem, ALIconDocument } from '../..';

export default {
  title: 'Atoms/Breadcrumbs Item',
  component: ALBreadcrumbsItem,
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
        <ALIconDocument></ALIconDocument>Page Name
      </>
    )
  },
};

export const Default: StoryObj<typeof ALBreadcrumbsItem> = { args: {} };

export const Current: StoryObj<typeof ALBreadcrumbsItem> = { args: {
  isCurrent: true,
} };

export const HasSeparator: StoryObj<typeof ALBreadcrumbsItem> = { args: {
  hasSeparator: true,
} };

export const WithHref: StoryObj<typeof ALBreadcrumbsItem> = { args: {
  href: "https://google.com",
  target: '_blank'
} };