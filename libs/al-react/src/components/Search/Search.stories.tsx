import type { StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { ALSearch, ALFieldNote, ALIconWarningCircle, ALIconHelp, ALList, ALListItem } from '../..';

const dataSource = [
  { label: 'List item 1', value: 'List item 1' },
  { label: 'List item 2', value: 'List item 2' },
  { label: 'List item 3', value: 'List item 3' },
  { label: 'List item 4', value: 'List item 4' },
  { label: 'List item 5', value: 'List item 5' },
  { label: 'List item 6', value: 'List item 6' },
  { label: 'List item 7', value: 'List item 7' },
  { label: 'List item 8', value: 'List item 8' },
  { label: 'List item 9', value: 'List item 9' },
  { label: 'List item 10', value: 'List item 10' }
];

export default {
  title: 'Molecules/Search',
  component: ALSearch,
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['onSearchChange']
    }
  },
  args: {
    label: 'Search',
    fieldNote: 'This is a field note.',
    placeholder: 'Placeholder',
    dataSource: dataSource,
    children: (
      <>
        <ALList>
          {dataSource.map((item: any, index) => (
            <ALListItem value={item.value} key={index.toString()}>
              {item.label}
            </ALListItem>
          ))}
        </ALList>
      </>
    )
  }
};

export const Default: StoryObj<typeof ALSearch> = { args: {} };

export const Filled: StoryObj<typeof ALSearch> = { args: {
  value: 'List item 1'
} };

export const Error: StoryObj<typeof ALSearch> = { args: {
  isError: true,
  errorNote: 'This is an error note.',
} };

export const Disabled: StoryObj<typeof ALSearch> = { args: {
  isDisabled: true,
} };

export const Required: StoryObj<typeof ALSearch> = { args: {
  isRequired: true,
} };

export const RequiredHiddenLabel: StoryObj<typeof ALSearch> = { args: {
  isRequired: true,
  hideLabel: true,
} };

export const HiddenLabel: StoryObj<typeof ALSearch> = { args: {
  hideLabel: true,
} };

export const SlottedFieldNote: StoryObj<typeof ALSearch> = {
  args: {
    children: (
      <>
        <ALFieldNote slot="field-note"><ALIconHelp></ALIconHelp>This is a field note.</ALFieldNote>
      </>
    ),
  },
};

export const SlottedErrorNote: StoryObj<typeof ALSearch> = {
  args: {
    isError: true,
    fieldNote: '',
    children: (
      <>
        <ALFieldNote slot="error"><ALIconWarningCircle></ALIconWarningCircle>This is an error note.</ALFieldNote>
      </>
    ),
  },
};