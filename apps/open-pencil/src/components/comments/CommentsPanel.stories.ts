import type { Meta, StoryObj } from '@storybook/vue3-vite'

import type { CommentPanelSections } from '@/app/integrations/storage/github/comments/pins'
import type { CommentThread } from '@/app/integrations/storage/github/comments/repository'
import type { CommentReplies } from '@/app/integrations/storage/github/comments/session'

import CommentsPanel from './CommentsPanel.vue'
import { emptySections, storyReplies, storySections, storyThreads } from './story-fixtures'

interface Args {
  sections: CommentPanelSections<CommentThread>
  loading: boolean
  loaded: boolean
  failureText: string | null
  selected: CommentThread | null
  replies: CommentReplies | null
  includeResolved: boolean
}

const meta = {
  title: 'Editor/Comments/Panel',
  component: CommentsPanel,
  args: {
    sections: storySections,
    loading: false,
    loaded: true,
    failureText: null,
    selected: null,
    replies: null,
    includeResolved: false
  },
  render: (args) => ({
    components: { CommentsPanel },
    setup: () => ({ args }),
    template: `
      <div class="relative h-[480px] w-80 rounded-lg bg-canvas">
        <CommentsPanel v-bind="args" />
      </div>
    `
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

export const Populated: Story = {}
export const Loading: Story = { args: { sections: emptySections, loading: true, loaded: false } }
export const Empty: Story = { args: { sections: emptySections } }
export const Error: Story = {
  args: {
    sections: emptySections,
    loaded: false,
    failureText: 'GitHub’s rate limit was reached. Try again after 14:05.'
  }
}
export const Thread: Story = {
  args: {
    selected: storyThreads[0],
    replies: { status: 'ready', items: storyReplies }
  }
}
export const ThreadLoadingReplies: Story = {
  args: { selected: storyThreads[0], replies: { status: 'loading', items: [] } }
}
export const ResolvedThread: Story = {
  args: { selected: storyThreads[1], replies: { status: 'ready', items: [] } }
}
