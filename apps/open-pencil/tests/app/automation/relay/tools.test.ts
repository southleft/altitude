import { describe, expect, test } from 'bun:test'

import * as v from 'valibot'

import { ALL_TOOLS, defineTool, type ToolDef } from '@open-pencil/core/tools'

import { isRelayToolEnabled, relayToolDescriptors } from '@/app/automation/relay/catalog'
import { relayToolDefinitions } from '@/app/automation/relay/tools'

function tool(name: string, extra: Partial<Parameters<typeof defineTool>[0]> = {}): ToolDef {
  return defineTool({
    name,
    description: `${name} tool`,
    execution: { kind: 'sync', mutation: 'none' },
    input: v.object({ id: v.string() }),
    execute: () => ({}),
    ...extra
  })
}

const fixtures = [
  tool('read_it'),
  tool('write_it', { execution: { kind: 'sync', mutation: 'document' } }),
  tool('hidden_from_mcp', { exposure: { mcp: false } }),
  tool('script_it', { availability: 'eval' })
]

describe('relay tool registry', () => {
  test('lists MCP-exposed tools, never eval tools, and honours Tool access', () => {
    const names = relayToolDefinitions(fixtures, new Set(['write_it'])).map((t) => t.name)
    expect(names).toEqual(['read_it', 'list_documents', 'get_codegen_prompt'])
  })

  test('derives JSON Schemas, targeting arguments, and annotations from the tool contract', () => {
    const [readIt, writeIt] = relayToolDefinitions(fixtures, new Set())
    expect(readIt.inputSchema).toMatchObject({
      type: 'object',
      properties: { id: { type: 'string' }, document_id: { type: 'string' } },
      required: ['id']
    })
    expect(readIt.annotations).toEqual({ readOnlyHint: true, destructiveHint: false })
    expect(writeIt.annotations).toEqual({ readOnlyHint: false, destructiveHint: true })
  })

  test('call-time checks agree with the list', () => {
    const disabled = new Set(['write_it'])
    expect(isRelayToolEnabled(fixtures, disabled, 'read_it')).toBe(true)
    expect(isRelayToolEnabled(fixtures, disabled, 'write_it')).toBe(false)
    expect(isRelayToolEnabled(fixtures, disabled, 'hidden_from_mcp')).toBe(false)
    expect(isRelayToolEnabled(fixtures, disabled, 'script_it')).toBe(false)
    expect(isRelayToolEnabled(fixtures, disabled, 'list_documents')).toBe(true)
    expect(isRelayToolEnabled(fixtures, disabled, 'save_file')).toBe(false)
  })

  test('the real registry converts and keeps script and file tools out', () => {
    const tools = relayToolDefinitions(ALL_TOOLS, new Set())
    const names = new Set(tools.map((t) => t.name))
    expect(names.has('get_node')).toBe(true)
    expect(names.has('render')).toBe(true)
    for (const name of ['eval', 'save_file', 'open_file', 'new_document']) {
      expect(names.has(name)).toBe(false)
    }
    for (const definition of tools) expect(definition.inputSchema).toMatchObject({ type: 'object' })
    expect(relayToolDescriptors(ALL_TOOLS).map((d) => d.name)).toEqual([...names])
  })
})
