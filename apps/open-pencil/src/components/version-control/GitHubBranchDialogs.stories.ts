import type { Meta, StoryObj } from '@storybook/vue3-vite'

import GitHubNewBranchDialog from './GitHubNewBranchDialog.vue'
import GitHubPullRequestDialog from './GitHubPullRequestDialog.vue'
import GitHubSwitchBranchDialog from './GitHubSwitchBranchDialog.vue'

interface Args {
  pending: boolean
  errorText: string | null
}

const body = [
  '**Document:** Landing page (`documents/landing-page`)',
  '',
  '**Changed pages**',
  '',
  '- Cover',
  '- Components',
  '',
  '_Opened from OpenPencil._'
].join('\n')

/** The branch and pull request dialogs, open, with their pending and failure states. */
const meta = {
  title: 'Editor/Version control/Dialogs',
  args: { pending: false, errorText: null }
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

export const NewBranch: Story = {
  render: (args) => ({
    components: { GitHubNewBranchDialog },
    setup: () => ({ args }),
    template: `
      <GitHubNewBranchDialog
        :open="true"
        base="main"
        suggestion="design/landing-page-ab12"
        :pending="args.pending"
        :error-text="args.errorText"
      />
    `
  })
}

export const NewBranchExists: Story = {
  ...NewBranch,
  args: { errorText: 'A branch with this name already exists.' }
}

export const PullRequest: Story = {
  render: (args) => ({
    components: { GitHubPullRequestDialog },
    setup: () => ({ args, body }),
    template: `
      <GitHubPullRequestDialog
        :open="true"
        head="design/landing-page-ab12"
        base="main"
        initial-title="Update Landing page"
        :initial-body="body"
        :pending="args.pending"
        :error-text="args.errorText"
      />
    `
  })
}

export const PullRequestCreating: Story = { ...PullRequest, args: { pending: true } }

export const SwitchWithChanges: Story = {
  render: (args) => ({
    components: { GitHubSwitchBranchDialog },
    setup: () => ({ args }),
    template: `
      <GitHubSwitchBranchDialog
        :open="true"
        current="design/landing-page-ab12"
        target="main"
        :pending="args.pending"
        :error-text="args.errorText"
      />
    `
  })
}
