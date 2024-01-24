import type { StoryObj } from '@storybook/react-webpack5';
import { SLChipGroup, SLChip } from '../..';

export default {
  title: 'Components/Chip Group',
  component: SLChipGroup,
  subcomponents: { SLChip },
  parameters: {
    status: { type: 'beta' },
    themes: { default: 'dark-subtle' },
    actions: {
      handles: ['click', 'showChips']
    }
  },
  argTypes: {
    chipsVisible: {
      control: 'number',
    },
  },
  args: {
    children: (
      <>
        <SLChip variant="green">Label</SLChip>
        <SLChip variant="blue">Label</SLChip>
        <SLChip variant="purple">Label</SLChip>
        <SLChip variant="amber">Label</SLChip>
        <SLChip variant="red">Label</SLChip>
      </>
    )
  },
};

export const Default: StoryObj<typeof SLChipGroup> = { args: {} };

export const With2Visible: StoryObj<typeof SLChipGroup> = { args: {
  chipsVisible: 2
} };

export const With3Visible: StoryObj<typeof SLChipGroup> = { args: {
  chipsVisible: 3
} };

export const With4Visible: StoryObj<typeof SLChipGroup> = { args: {
  chipsVisible: '4'
} };