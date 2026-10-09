import type { Meta, StoryObj } from '@storybook/vue3-vite'

import type { GitHubSaveIndicator as Indicator } from '@/app/integrations/storage/github/autosave/indicator'

import GitHubSaveIndicator from './GitHubSaveIndicator.vue'

interface Args {
  indicator: Indicator
}

const TWO_MINUTES_AGO = new Date(Date.now() - 2 * 60_000).toISOString()

const meta = {
  title: 'Editor/Version control/Save indicator',
  component: GitHubSaveIndicator,
  args: { indicator: { kind: 'unsaved' } },
  render: (args) => ({
    components: { GitHubSaveIndicator },
    setup: () => ({ args }),
    template: `
      <div class="inline-flex h-7 items-center rounded border border-border px-2 text-[11px] font-medium text-surface">
        <GitHubSaveIndicator v-bind="args" />
      </div>
    `
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

export const Unpublished: Story = { args: { indicator: { kind: 'unpublished' } } }
export const Unsaved: Story = {}
export const Saving: Story = { args: { indicator: { kind: 'saving' } } }
export const Committed: Story = {
  args: {
    indicator: {
      kind: 'committed',
      committedAt: TWO_MINUTES_AGO,
      commitURL: 'https://github.com/southleft/altitude-designs/commit/abc1234'
    }
  }
}
export const Offline: Story = { args: { indicator: { kind: 'offline', retryAt: null } } }
export const Failed: Story = {
  args: {
    indicator: {
      kind: 'failed',
      conflict: false,
      failure: { kind: 'rate-limited', message: 'API rate limit exceeded', resetAt: null }
    }
  }
}
export const Conflict: Story = {
  args: { indicator: { kind: 'failed', conflict: true, failure: null } }
}
