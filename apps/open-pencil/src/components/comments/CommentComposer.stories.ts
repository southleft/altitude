import type { Meta, StoryObj } from '@storybook/vue3-vite'

import CommentComposer from './CommentComposer.vue'

interface Args {
  modelValue: string
  pending: boolean
  error: string | null
  autofocus: boolean
}

const meta = {
  title: 'Editor/Comments/Composer',
  component: CommentComposer,
  args: { modelValue: '', pending: false, error: null, autofocus: false },
  render: (args) => ({
    components: { CommentComposer },
    setup: () => ({ args }),
    template: `
      <div class="w-64 rounded-lg border border-border bg-panel p-2">
        <CommentComposer v-bind="args" />
      </div>
    `
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}
export const Filled: Story = { args: { modelValue: 'Tighten the spacing under the title.' } }
export const Posting: Story = {
  args: { modelValue: 'Tighten the spacing under the title.', pending: true }
}
export const Failed: Story = {
  args: {
    modelValue: 'Tighten the spacing under the title.',
    error: 'This account cannot access the repository. Check its permissions.'
  }
}
