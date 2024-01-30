import type { StoryObj } from '@storybook/react-webpack5';
import { SLChipGroup, SLChip } from '../..';

export default {
  title: 'Molecules/Chip Group',
  component: SLChipGroup,
  subcomponents: { SLChip },
  parameters: {
    status: { type: 'beta' },
    actions: {
      handles: ['click', 'onChipGroupExpand']
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
        <SLChip>Label</SLChip>
        <SLChip variant="info">Label</SLChip>
        <SLChip variant="success">Label</SLChip>
        <SLChip variant="warning">Label</SLChip>
        <SLChip variant="danger">Label</SLChip>
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