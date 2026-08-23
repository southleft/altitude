import type { StoryObj } from '@storybook/react-vite';
import { ALEmptyState, ALButton } from '../..';
import { loremSentences, placeholderImage } from '../../../../al-web-components/.storybook/fixtures';

export default {
  title: 'Molecules/Empty State',
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

export const WithIllustration: StoryObj<typeof ALEmptyState> = {
  args: {
    heading: 'Nothing to show yet',
    description: loremSentences(1, 'empty-state', false)
  },
  render: (args) => (
    <ALEmptyState {...args}>
      <img slot="icon" src={placeholderImage(96, 96)} alt="" width={96} height={96} />
      <ALButton slot="actions">Import data</ALButton>
    </ALEmptyState>
  )
};

export const WithActions: StoryObj<typeof ALEmptyState> = {
  render: (args) => (
    <ALEmptyState {...args}>
      <ALButton slot="actions">Create your first project</ALButton>
    </ALEmptyState>
  )
};
