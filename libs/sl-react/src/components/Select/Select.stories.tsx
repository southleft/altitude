import type { StoryObj } from '@storybook/react-webpack5';
import { SLSelect, SLFieldNote, SLIconWarningCircle, SLIconHelp, SLList, SLListItem } from '../..';

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
  component: SLSelect,
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

export const Default: StoryObj<typeof SLSelect> = { args: {} };

export const Filled: StoryObj<typeof SLSelect> = { args: {
  value: 'List item 1'
} };

export const Error: StoryObj<typeof SLSelect> = { args: {
  isError: true,
  errorNote: 'This is an error note.',
} };

export const Disabled: StoryObj<typeof SLSelect> = { args: {
  isDisabled: true,
} };

export const Required: StoryObj<typeof SLSelect> = { args: {
  isRequired: true,
} };

export const RequiredHiddenLabel: StoryObj<typeof SLSelect> = { args: {
  isRequired: true,
  hideLabel: true,
} };

export const Optional: StoryObj<typeof SLSelect> = { args: {
  isOptional: true,
} };

export const HiddenLabel: StoryObj<typeof SLSelect> = { args: {
  hideLabel: true,
} };

export const SlottedFieldNote: StoryObj<typeof SLSelect> = {
  args: {
    children: (
      <>
        <SLFieldNote slot="field-note"><SLIconHelp></SLIconHelp>This is a field note.</SLFieldNote>
      </>
    ),
  },
};

export const SlottedErrorNote: StoryObj<typeof SLSelect> = {
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

export const WithAlignTop: StoryObj<typeof SLSelect> = {
  args: {
    align: 'top',
  }
};
WithAlignTop.decorators = [(Story) => <div style={{ display: 'flex', height: '90vh', alignItems: 'flex-end' }}>{Story()}</div>];

export const WithAlignAuto: StoryObj<typeof SLSelect> = {args: {}};
WithAlignAuto.decorators = [
  (Story) => <div style={{ display: 'flex', height: '90vh', alignItems: 'flex-end' }}>{Story()}</div>
];

export const WithSearch: StoryObj<typeof SLSelect> = { args: {
  hasSearch: true,
} };