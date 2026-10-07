import type { Meta, StoryObj } from '@storybook/vue3-vite'

import {
  agentSetupCommands,
  developmentHTTPCommand,
  MCP_DOCS_URL,
  type AgentSetupCommands,
  type RelayConnectionView
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
  relay: RelayConnectionView | null
}

/** A deterministic hosted-relay fixture; the key below is a placeholder, not a credential. */
const relay: RelayConnectionView = {
  mcpURL: 'https://altitude-open-pencil-mcp.example.workers.dev/mcp',
  keyConfigured: true,
  revealedKey: null,
  busy: false,
  keyError: false,
  lastRequestAt: null
}

const meta = {
  title: 'Editor/Agent connect',
  component: AgentConnectPanel,
  args: {
    status: 'waiting',
    commands: agentSetupCommands,
    docsURL: MCP_DOCS_URL,
    developmentCommand: null,
    failure: null,
    relay: null
  },
  argTypes: {
    status: {
      control: 'select',
      options: ['connected', 'waiting', 'starting', 'offline', 'unavailable', 'setup']
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
          :relay="args.relay"
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

/** Hosted build without a connection key: one button creates it. */
export const RelaySetup: Story = {
  args: { status: 'setup', relay: { ...relay, keyConfigured: false } }
}

/** Hosted build: the tab is linked to the relay and waits for an agent; the key is masked. */
export const RelayWaiting: Story = { args: { status: 'waiting', relay } }

export const RelayKeyRevealed: Story = {
  args: {
    status: 'waiting',
    relay: { ...relay, revealedKey: 'EXAMPLEKEY-not-a-real-credential-0000000000' }
  }
}

export const RelayConnected: Story = {
  args: { status: 'connected', relay: { ...relay, lastRequestAt: Date.UTC(2026, 9, 7, 14, 30) } }
}

export const RelayOffline: Story = { args: { status: 'offline', relay } }

export const RelayKeyFailed: Story = {
  args: { status: 'setup', relay: { ...relay, keyConfigured: false, keyError: true } }
}
