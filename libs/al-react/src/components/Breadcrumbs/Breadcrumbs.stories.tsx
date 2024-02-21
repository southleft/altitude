import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { ALBreadcrumbs, ALBreadcrumbsItem, ALIconDocument } from '../..';

export default {
  title: 'Molecules/Breadcrumbs',
  component: ALBreadcrumbs,
  subcomponents: { ALBreadcrumbsItem },
  parameters: {
    status: { type: 'beta' },
  },
  argTypes: {
    label: {
      control: 'text'
    },
    isTruncated: {
      control: 'boolean'
    },
    itemsBeforeCollapse: {
      control: 'number'
    },
    itemsAfterCollapse: {
      control: 'number'
    },
  },
  args: {
    children: (
      <>
        <ALBreadcrumbsItem>
          <ALIconDocument></ALIconDocument>
          Page Name 1
        </ALBreadcrumbsItem>
        <ALBreadcrumbsItem>
          <ALIconDocument></ALIconDocument>
          Page Name 2
        </ALBreadcrumbsItem>
        <ALBreadcrumbsItem>
          <ALIconDocument></ALIconDocument>
          Page Name 3
        </ALBreadcrumbsItem>
      </>
    )
  }
};

export const Default: StoryObj<typeof ALBreadcrumbs> = {
  args: {}
};

export const Truncated: StoryObj<typeof ALBreadcrumbs> = {
  args: {
    isTruncated: true,
    children: (
      <>
        <ALBreadcrumbsItem>
          <ALIconDocument></ALIconDocument>
          Page Name 1
        </ALBreadcrumbsItem>
        <ALBreadcrumbsItem>
          <ALIconDocument></ALIconDocument>
          Page Name 2
        </ALBreadcrumbsItem>
        <ALBreadcrumbsItem>
          <ALIconDocument></ALIconDocument>
          Page Name 3
        </ALBreadcrumbsItem>
        <ALBreadcrumbsItem>
          <ALIconDocument></ALIconDocument>
          Page Name 4
        </ALBreadcrumbsItem>
        <ALBreadcrumbsItem>
          <ALIconDocument></ALIconDocument>
          Page Name 5
        </ALBreadcrumbsItem>
        <ALBreadcrumbsItem>
          <ALIconDocument></ALIconDocument>
          Page Name 6
        </ALBreadcrumbsItem>
        <ALBreadcrumbsItem>
          <ALIconDocument></ALIconDocument>
          Page Name 7
        </ALBreadcrumbsItem>
        <ALBreadcrumbsItem>
          <ALIconDocument></ALIconDocument>
          Page Name 8
        </ALBreadcrumbsItem>
      </>
    )
  }
};

export const TruncatedWithBeforeCollapse: StoryObj<typeof ALBreadcrumbs> = {
  args: {
    ...Truncated.args,
    itemsBeforeCollapse: 2,
  }
};

export const TruncatedWithAfterCollapse: StoryObj<typeof ALBreadcrumbs> = {
  args: {
    ...Truncated.args,
    itemsAfterCollapse: 2,
  }
};