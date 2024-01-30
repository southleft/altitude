import type { StoryObj } from '@storybook/react-webpack5';
import { SLSearchForm, SLFieldNote, SLIconWarningCircle, SLIconHelp, SLList, SLListItem } from '../..';

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
  title: 'Boilerplate/Search Form',
  component: SLSearchForm,
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['onSearchFormChange']
    }
  },
  args: {
    label: 'Search',
    fieldNote: 'This is a field note.',
    placeholder: 'Placeholder',
    dataSource: dataSource,
    children: (
      <>
        <SLList>
          {dataSource.map((item: any, index) => (
            <SLListItem value={item.value} key={index.toString()}>
              {item.label}
            </SLListItem>
          ))}
        </SLList>
      </>
    )
  }
};

export const Default: StoryObj<typeof SLSearchForm> = { args: {} };

export const Filled: StoryObj<typeof SLSearchForm> = { args: {
  value: 'List item 1'
} };

export const Error: StoryObj<typeof SLSearchForm> = { args: {
  isError: true,
  errorNote: 'This is an error note.',
} };

export const Disabled: StoryObj<typeof SLSearchForm> = { args: {
  isDisabled: true,
} };

export const Required: StoryObj<typeof SLSearchForm> = { args: {
  isRequired: true,
} };

export const RequiredHiddenLabel: StoryObj<typeof SLSearchForm> = { args: {
  isRequired: true,
  hideLabel: true,
} };

export const HiddenLabel: StoryObj<typeof SLSearchForm> = { args: {
  hideLabel: true,
} };

export const SlottedFieldNote: StoryObj<typeof SLSearchForm> = {
  args: {
    children: (
      <>
        <SLFieldNote slot="field-note"><SLIconHelp></SLIconHelp>This is a field note.</SLFieldNote>
      </>
    ),
  },
};

export const SlottedErrorNote: StoryObj<typeof SLSearchForm> = {
  args: {
    isError: true,
    fieldNote: '',
    children: (
      <>
        <SLFieldNote slot="error"><SLIconWarningCircle></SLIconWarningCircle>This is an error note.</SLFieldNote>
      </>
    ),
  },
};