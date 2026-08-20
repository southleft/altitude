import type { StoryObj } from '@storybook/react-vite';
import { ALSplitContent, ALHeading, ALTextPassage } from '../..';

export default {
  title: 'Organisms/Split Content',
  component: ALSplitContent,
  parameters: {
    status: { type: 'beta' }
  },
  argTypes: {
    mediaPosition: {
      control: 'radio',
      options: ['end', 'start']
    },
    verticalAlignment: {
      control: 'radio',
      options: ['center', 'start', 'end']
    }
  }
};

export const Default: StoryObj<typeof ALSplitContent> = {
  render: (args) => (
    <ALSplitContent {...args}>
      <div slot="media" style={{ minHeight: '16rem', background: 'var(--al-theme-color-background-default-weak)' }} />
      <div slot="content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--al-theme-space)' }}>
        <ALHeading tagName="h2" variant="lg" isBold>
          A feature worth explaining
        </ALHeading>
        <ALTextPassage>Pair a media column with supporting copy.</ALTextPassage>
      </div>
    </ALSplitContent>
  )
};
