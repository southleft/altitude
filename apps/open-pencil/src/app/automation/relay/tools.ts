// eslint-disable-next-line open-pencil/no-mixed-case-acronym-identifiers -- Upstream export spelling.
import { toJsonSchema as toJSONSchema } from '@valibot/to-json-schema'
import * as v from 'valibot'

import { toolChangesDocument, type ToolDef } from '@open-pencil/core/tools'
import type { MCPToolDefinition } from '@open-pencil/relay/protocol'

import { RELAY_APP_TOOLS, relayCoreTools } from './catalog'

/** Same optional targeting arguments the local MCP server adds to every tool. */
const automationTargetEntries = {
  document_id: v.optional(
    v.pipe(v.string(), v.description('Optional OpenPencil document/tab ID to target'))
  ),
  page_id: v.optional(
    v.pipe(v.string(), v.description('Optional page ID to target within the document'))
  )
}

function inputSchema(schema: v.GenericSchema): object {
  return toJSONSchema(schema, { typeMode: 'input', errorMode: 'ignore' })
}

/** The MCP `tools/list` result: enabled tools with JSON Schemas from their Valibot inputs. */
export function relayToolDefinitions(
  defs: readonly ToolDef[],
  disabled: ReadonlySet<string>
): MCPToolDefinition[] {
  const core = relayCoreTools(defs)
    .filter((def) => !disabled.has(def.name))
    .map((def) => {
      const effect = toolChangesDocument(def) ? 'write' : 'read'
      return {
        name: def.name,
        description: def.description,
        inputSchema: inputSchema(v.object({ ...def.input.entries, ...automationTargetEntries })),
        annotations: { readOnlyHint: effect === 'read', destructiveHint: effect === 'write' },
        _meta: { 'openpencil/capabilities': [...def.capabilities] }
      }
    })
  const app = RELAY_APP_TOOLS.filter((tool) => !disabled.has(tool.name)).map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: inputSchema(v.object({})),
    annotations: { readOnlyHint: true, destructiveHint: false },
    _meta: { 'openpencil/capabilities': [...tool.capabilities] }
  }))
  return [...core, ...app]
}
