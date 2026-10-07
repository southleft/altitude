import { computed, ref } from 'vue'

import { ALL_TOOLS } from '@open-pencil/core/tools'

import { configurableAITools } from '@/app/ai/tools/catalog'
import { aiToolOverrides, disabledAITools } from '@/app/ai/tools/preferences'
import { configurableMCPTools, disabledMCPTools } from '@/app/automation/mcp/preferences'
import { relayToolDescriptors } from '@/app/automation/relay/catalog'
import { isRelayMode } from '@/app/automation/relay/config'
import { openSettingsDialog } from '@/app/settings/dialog'

import type { ToolAccessTarget } from '../types'

// Local MCP is the only reachable target while the built-in AI stays dormant.
const target = ref<ToolAccessTarget>('mcp')

export function openToolAccessSettings(value: ToolAccessTarget) {
  target.value = value
  openSettingsDialog('tools')
}

export function useToolAccessSettings() {
  // Hosted builds have no local server to discover tools from; list what the relay offers.
  const mcpTools = isRelayMode() ? relayToolDescriptors(ALL_TOOLS) : null
  const tools = computed(() =>
    target.value === 'ai' ? configurableAITools : (mcpTools ?? configurableMCPTools.value)
  )
  const disabled = computed({
    get: () => (target.value === 'ai' ? disabledAITools.value : disabledMCPTools.value),
    set: (names: string[]) => {
      if (target.value === 'ai') disabledAITools.value = names
      else disabledMCPTools.value = names
    }
  })

  function selectTarget(value: string) {
    if (value === 'ai' || value === 'mcp') target.value = value
  }

  function reset() {
    if (target.value === 'ai') aiToolOverrides.value = {}
    else disabledMCPTools.value = []
  }

  return { target, tools, disabled, selectTarget, reset }
}
