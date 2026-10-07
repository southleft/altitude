import type { Meta, StoryObj } from '@storybook/vue3-vite'

import GitHubBranchList from './GitHubBranchList.vue'

interface Args {
  branches: string[] | null
  current: string
  defaultBranch: string | null
  loading: boolean
  failureText: string | null
}

const branches = [
  'main',
  'design/landing-page-ab12',
  'design/landing-page-cd34',
  'design/pricing-table',
  'release/2026-10'
]

const meta = {
  title: 'Editor/Version control/Branch list',
  component: GitHubBranchList,
  args: {
    branches,
    current: 'design/landing-page-ab12',
    defaultBranch: 'main',
    loading: false,
    failureText: null
  },
  render: (args) => ({
    components: { GitHubBranchList },
    setup: () => ({ args }),
    template: `
      <div class="w-72 rounded-lg border border-border bg-panel p-3 text-surface">
        <GitHubBranchList v-bind="args" />
      </div>
    `
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

export const Populated: Story = {}
export const Loading: Story = { args: { branches: null, loading: true } }
export const Empty: Story = { args: { branches: [] } }
export const Error: Story = {
  args: {
    branches: null,
    failureText: 'The repository or branch was not found, or this account cannot see it.'
  }
}
