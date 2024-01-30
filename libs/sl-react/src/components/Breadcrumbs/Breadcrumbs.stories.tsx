import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { SLBreadcrumbs, SLBreadcrumbsItem, SLIconDocument } from '../..';

export default {
  title: 'Molecules/Breadcrumbs',
  component: SLBreadcrumbs,
  subcomponents: { SLBreadcrumbsItem },
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
        <SLBreadcrumbsItem>
          <SLIconDocument></SLIconDocument>
          Page Name 1
        </SLBreadcrumbsItem>
        <SLBreadcrumbsItem>
          <SLIconDocument></SLIconDocument>
          Page Name 2
        </SLBreadcrumbsItem>
        <SLBreadcrumbsItem>
          <SLIconDocument></SLIconDocument>
          Page Name 3
        </SLBreadcrumbsItem>
      </>
    )
  }
};

export const Default: StoryObj<typeof SLBreadcrumbs> = {
  args: {}
};

export const Truncated: StoryObj<typeof SLBreadcrumbs> = {
  args: {
    isTruncated: true,
    children: (
      <>
        <SLBreadcrumbsItem>
          <SLIconDocument></SLIconDocument>
          Page Name 1
        </SLBreadcrumbsItem>
        <SLBreadcrumbsItem>
          <SLIconDocument></SLIconDocument>
          Page Name 2
        </SLBreadcrumbsItem>
        <SLBreadcrumbsItem>
          <SLIconDocument></SLIconDocument>
          Page Name 3
        </SLBreadcrumbsItem>
        <SLBreadcrumbsItem>
          <SLIconDocument></SLIconDocument>
          Page Name 4
        </SLBreadcrumbsItem>
        <SLBreadcrumbsItem>
          <SLIconDocument></SLIconDocument>
          Page Name 5
        </SLBreadcrumbsItem>
        <SLBreadcrumbsItem>
          <SLIconDocument></SLIconDocument>
          Page Name 6
        </SLBreadcrumbsItem>
        <SLBreadcrumbsItem>
          <SLIconDocument></SLIconDocument>
          Page Name 7
        </SLBreadcrumbsItem>
        <SLBreadcrumbsItem>
          <SLIconDocument></SLIconDocument>
          Page Name 8
        </SLBreadcrumbsItem>
      </>
    )
  }
};

export const TruncatedWithBeforeCollapse: StoryObj<typeof SLBreadcrumbs> = {
  args: {
    ...Truncated.args,
    itemsBeforeCollapse: 2,
  }
};

export const TruncatedWithAfterCollapse: StoryObj<typeof SLBreadcrumbs> = {
  args: {
    ...Truncated.args,
    itemsAfterCollapse: 2,
  }
};