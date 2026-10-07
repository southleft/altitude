import { isToolExposed, toolChangesDocument, type ToolDef } from '@open-pencil/core/tools'
import type { ToolDescriptor } from '@open-pencil/mcp/tools'

/** App commands the relay offers besides Core tools. File and script tools are not offered. */
export const RELAY_APP_TOOLS = [
  {
    name: 'list_documents',
    description: 'List open OpenPencil documents/tabs with their IDs, current pages, and pages.',
    effect: 'read',
    availability: 'default',
    capabilities: ['document:read'],
    enabled: true
  },
  {
    name: 'get_codegen_prompt',
    description: 'Get design-to-code generation guidelines. Call before generating frontend code.',
    effect: 'read',
    availability: 'default',
    capabilities: [],
    enabled: true
  }
] as const satisfies readonly ToolDescriptor[]

/**
 * Core tools the relay may offer: exposed to MCP, never the `eval` script
 * tools. A bearer key reaches this tab over the internet, so arbitrary code
 * execution stays a local-only opt-in.
 */
export function relayCoreTools(defs: readonly ToolDef[]): ToolDef[] {
  return defs.filter((def) => isToolExposed(def, 'mcp') && def.availability !== 'eval')
}

/** Descriptors for Settings → Tool access, in the local server's shape. */
export function relayToolDescriptors(defs: readonly ToolDef[]): ToolDescriptor[] {
  return [
    ...relayCoreTools(defs).map((def) => ({
      name: def.name,
      description: def.description,
      effect: toolChangesDocument(def) ? ('write' as const) : ('read' as const),
      availability: def.availability,
      capabilities: [...def.capabilities],
      enabled: true
    })),
    ...RELAY_APP_TOOLS.map((tool) => ({ ...tool, capabilities: [...tool.capabilities] }))
  ]
}

/** Whether `name` is offered: a relay tool that Tool access has not disabled. */
export function isRelayToolEnabled(
  defs: readonly ToolDef[],
  disabled: ReadonlySet<string>,
  name: string
): boolean {
  if (disabled.has(name)) return false
  return (
    RELAY_APP_TOOLS.some((tool) => tool.name === name) ||
    relayCoreTools(defs).some((def) => def.name === name)
  )
}
