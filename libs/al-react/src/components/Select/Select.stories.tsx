import type { StoryObj } from '@storybook/react-webpack5';
import { ALSelect, ALFieldNote, ALIconWarningCircle, ALIconHelp, ALList, ALListItem } from '../..';

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
  title: 'Molecules/Select Field',
  component: ALSelect,
  parameters: {
    status: { type: 'beta' },
    layout: 'centered',
    actions: {
      handles: ['onSelectOpen', 'onSelectClose']
    }
  },
  args: {
    label: 'Select Option',
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

export const Default: StoryObj<typeof ALSelect> = { args: {} };

export const Filled: StoryObj<typeof ALSelect> = { args: {
  value: 'List item 1'
} };

export const Error: StoryObj<typeof ALSelect> = { args: {
  isError: true,
  errorNote: 'This is an error note.',
} };

export const Disabled: StoryObj<typeof ALSelect> = { args: {
  isDisabled: true,
} };

export const Required: StoryObj<typeof ALSelect> = { args: {
  isRequired: true,
} };

export const RequiredHiddenLabel: StoryObj<typeof ALSelect> = { args: {
  isRequired: true,
  hideLabel: true,
} };

export const Optional: StoryObj<typeof ALSelect> = { args: {
  isOptional: true,
} };

export const HiddenLabel: StoryObj<typeof ALSelect> = { args: {
  hideLabel: true,
} };

export const SlottedFieldNote: StoryObj<typeof ALSelect> = {
  args: {
    children: (
      <>
        <ALFieldNote slot="field-note"><ALIconHelp></ALIconHelp>This is a field note.</ALFieldNote>
      </>
    ),
  },
};

export const SlottedErrorNote: StoryObj<typeof ALSelect> = {
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

export const WithAlignTop: StoryObj<typeof ALSelect> = {
  args: {
    align: 'top',
  }
};
WithAlignTop.decorators = [(Story) => <div style={{ display: 'flex', height: '90vh', alignItems: 'flex-end' }}>{Story()}</div>];

export const WithAlignAuto: StoryObj<typeof ALSelect> = {args: {}};
WithAlignAuto.decorators = [
  (Story) => <div style={{ display: 'flex', height: '90vh', alignItems: 'flex-end' }}>{Story()}</div>
];

export const WithSearch: StoryObj<typeof ALSelect> = { args: {
  hasSearch: true,
} };