import type { Meta, StoryObj } from '@storybook/vue3-vite'

import {
  agentSetupCommands,
  developmentHTTPCommand,
  MCP_DOCS_URL,
  type AgentSetupCommands
} from '@/app/automation/mcp/agent/setup'
import type { AgentConnectionStatus } from '@/app/automation/mcp/agent/status'
import type { MCPFailure } from '@/app/automation/mcp/failure'

import AgentConnectPanel from './AgentConnectPanel.vue'

interface Args {
  status: AgentConnectionStatus
  commands: AgentSetupCommands
  docsURL: string
  developmentCommand: string | null
  failure: MCPFailure | null
}

const meta = {
  title: 'Editor/Agent connect',
  component: AgentConnectPanel,
  args: {
    status: 'waiting',
    commands: agentSetupCommands,
    docsURL: MCP_DOCS_URL,
    developmentCommand: null,
    failure: null
  },
  argTypes: {
    status: {
      control: 'select',
      options: ['connected', 'waiting', 'starting', 'offline', 'unavailable']
    }
  },
  render: (args) => ({
    components: { AgentConnectPanel },
    setup: () => ({ args }),
    template: `
      <div class="w-80 rounded-xl bg-panel p-3 text-surface">
        <AgentConnectPanel
          :status="args.status"
          :commands="args.commands"
          :docs-u-r-l="args.docsURL"
          :development-command="args.developmentCommand"
          :failure="args.failure"
        />
      </div>`
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

/** The local server is up; no agent has called it yet. */
export const NotConnected: Story = {}

export const Connected: Story = { args: { status: 'connected' } }

export const Starting: Story = { args: { status: 'starting' } }

/** The server stopped without a recorded reason; the panel offers a restart. */
export const ServerNotRunning: Story = { args: { status: 'offline' } }

export const ServerNotInstalled: Story = {
  args: {
    status: 'offline',
    failure: { code: 'not-installed', detail: '/usr/local/bin, /Users/you/.bun/bin' }
  }
}

/** A statically hosted browser build cannot reach a local MCP server. */
export const Unavailable: Story = { args: { status: 'unavailable' } }

export const DevelopmentServer: Story = {
  args: { developmentCommand: developmentHTTPCommand('http://127.0.0.1:7600/mcp') }
}
