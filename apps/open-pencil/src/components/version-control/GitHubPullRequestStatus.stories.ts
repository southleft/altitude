import type { Meta, StoryObj } from '@storybook/vue3-vite'

import type { GitHubPullRequestSummary } from '@/app/integrations/storage/github/branches/pulls'

import GitHubPullRequestStatus from './GitHubPullRequestStatus.vue'

interface Args {
  pullRequest: GitHubPullRequestSummary | null
  branch: string
  defaultBranch: string
  readyAction?: boolean
  readyPending?: boolean
}

const open: GitHubPullRequestSummary = {
  number: 12,
  url: 'https://github.com/southleft/altitude-designs/pull/12',
  title: 'Update Landing page',
  state: 'open',
  review: 'changes-requested',
  base: 'main',
  nodeId: 'PR_kwDOexample'
}

const meta = {
  title: 'Editor/Version control/Pull request status',
  component: GitHubPullRequestStatus,
  args: { pullRequest: null, branch: 'design/landing-page-ab12', defaultBranch: 'main' },
  render: (args) => ({
    components: { GitHubPullRequestStatus },
    setup: () => ({ args }),
    template: `
      <div class="w-72 rounded-lg border border-border bg-panel p-3 text-surface">
        <GitHubPullRequestStatus v-bind="args" />
      </div>
    `
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

export const NoPullRequest: Story = {}
export const Open: Story = { args: { pullRequest: open } }
export const Draft: Story = { args: { pullRequest: { ...open, state: 'draft', review: null } } }
/** A document's draft pull request in the commit popover, with Ready for review. */
export const DraftReadyForReview: Story = {
  args: {
    pullRequest: { ...open, title: 'Design: Landing page', state: 'draft', review: null },
    branch: 'design/landing-page/octo',
    readyAction: true
  }
}
export const MarkingReady: Story = {
  args: { ...DraftReadyForReview.args, readyPending: true }
}
export const Approved: Story = { args: { pullRequest: { ...open, review: 'approved' } } }
export const Merged: Story = { args: { pullRequest: { ...open, state: 'merged', review: null } } }
export const Closed: Story = { args: { pullRequest: { ...open, state: 'closed', review: null } } }
