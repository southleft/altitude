import type { StoryObj } from '@storybook/react-vite';
import { ALEmptyState, ALButton } from '../..';

export default {
  title: 'Organisms/Empty State',
  component: ALEmptyState,
  parameters: {
    status: { type: 'beta' }
  },
  args: {
    heading: 'No projects yet',
    description: 'Projects you create will show up here.'
  }
};

export const Default: StoryObj<typeof ALEmptyState> = {};

export const WithActions: StoryObj<typeof ALEmptyState> = {
  render: (args) => (
    <ALEmptyState {...args}>
      <ALButton slot="actions">Create your first project</ALButton>
    </ALEmptyState>
  )
};
