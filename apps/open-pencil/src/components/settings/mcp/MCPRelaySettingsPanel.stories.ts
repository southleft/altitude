import type { Meta, StoryObj } from '@storybook/vue3-vite'

import type { RelayConnectionView } from '@/app/automation/mcp/agent/setup'
import type { AgentConnectionStatus } from '@/app/automation/mcp/agent/status'

import MCPRelaySettingsPanel from './MCPRelaySettingsPanel.vue'

interface Args {
  status: AgentConnectionStatus
  relay: RelayConnectionView
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
  title: 'Settings/MCP/Hosted relay',
  component: MCPRelaySettingsPanel,
  args: { status: 'waiting', relay },
  argTypes: {
    status: {
      control: 'select',
      options: ['connected', 'waiting', 'starting', 'offline', 'setup']
    }
  },
  render: (args) => ({
    components: { MCPRelaySettingsPanel },
    setup: () => ({ args }),
    template: `
      <div class="max-w-xl bg-panel p-4">
        <MCPRelaySettingsPanel :status="args.status" :relay="args.relay" />
      </div>`
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

/** No connection key yet: one button creates it. */
export const Setup: Story = {
  args: { status: 'setup', relay: { ...relay, keyConfigured: false } }
}

/** The tab is linked to the relay; commands show the key masked. */
export const Waiting: Story = {}

export const KeyRevealed: Story = {
  args: { relay: { ...relay, revealedKey: 'EXAMPLEKEY-not-a-real-credential-0000000000' } }
}

export const Connected: Story = {
  args: { status: 'connected', relay: { ...relay, lastRequestAt: Date.UTC(2026, 9, 7, 14, 30) } }
}

export const Offline: Story = { args: { status: 'offline', relay } }

export const KeyFailed: Story = {
  args: { status: 'setup', relay: { ...relay, keyConfigured: false, keyError: true } }
}
