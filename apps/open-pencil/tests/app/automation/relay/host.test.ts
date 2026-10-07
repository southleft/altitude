import { describe, expect, test } from 'bun:test'

import { RELAY_ERROR_CODES } from '@open-pencil/relay/protocol'

import { createRelayToolHost, RELAY_MAX_RESULT_BYTES } from '@/app/automation/relay/host'

type Call = { command: string; args: Record<string, unknown> }

function host(response: unknown, enabled: (name: string) => boolean = () => true) {
  const calls: Call[] = []
  const toolHost = createRelayToolHost({
    listTools: () => [{ name: 'get_node', description: '', inputSchema: { type: 'object' } }],
    isToolEnabled: enabled,
    runCommand: async (command, args) => {
      calls.push({ command, args })
      return response
    },
    codegenPrompt: () => 'PROMPT'
  })
  return { toolHost, calls }
}

describe('relay tool host', () => {
  test('tools/list answers from the registry', async () => {
    const { toolHost, calls } = host(null)
    expect(await toolHost.handle('tools/list', {})).toEqual({
      result: { tools: [{ name: 'get_node', description: '', inputSchema: { type: 'object' } }] }
    })
    expect(calls).toEqual([])
  })

  test('tools/call runs the shared automation `tool` command with targeting split out', async () => {
    const { toolHost, calls } = host({ ok: true, result: { id: '1:2' }, target: {} })
    const outcome = await toolHost.handle('tools/call', {
      name: 'get_node',
      arguments: { id: '1:2', document_id: 'tab-1', page_id: '0:1' }
    })
    expect(calls).toEqual([
      {
        command: 'tool',
        args: { document_id: 'tab-1', page_id: '0:1', name: 'get_node', args: { id: '1:2' } }
      }
    ])
    expect(outcome).toEqual({
      result: { content: [{ type: 'text', text: JSON.stringify({ id: '1:2' }, null, 2) }] }
    })
  })

  test('disabled tools are refused before anything runs', async () => {
    const { toolHost, calls } = host({ ok: true }, () => false)
    const outcome = await toolHost.handle('tools/call', { name: 'delete_node', arguments: {} })
    expect(outcome).toMatchObject({ error: { code: RELAY_ERROR_CODES.invalidParams } })
    expect(calls).toEqual([])
  })

  test('tool failures and thrown errors become MCP error results', async () => {
    const failed = await host({ ok: false, error: 'Node not found' }).toolHost.handle(
      'tools/call',
      { name: 'get_node' }
    )
    expect(failed).toEqual({
      result: {
        content: [{ type: 'text', text: JSON.stringify({ error: 'Node not found' }) }],
        isError: true
      }
    })
    const thrown = createRelayToolHost({
      listTools: () => [],
      isToolEnabled: () => true,
      runCommand: async () => {
        throw new Error('No active OpenPencil document')
      },
      codegenPrompt: () => ''
    })
    expect(await thrown.handle('tools/call', { name: 'get_node' })).toMatchObject({
      result: { isError: true }
    })
  })

  test('image exports become MCP image content; oversized ones fail with a hint', async () => {
    const image = await host({
      ok: true,
      result: { base64: 'iVBORw0KGgo=', mimeType: 'image/png' }
    }).toolHost.handle('tools/call', { name: 'export_image' })
    expect(image).toEqual({
      result: { content: [{ type: 'image', data: 'iVBORw0KGgo=', mimeType: 'image/png' }] }
    })
    const big = await host({
      ok: true,
      result: { base64: 'A'.repeat(RELAY_MAX_RESULT_BYTES + 1), mimeType: 'image/png' }
    }).toolHost.handle('tools/call', { name: 'export_image' })
    expect(big).toMatchObject({ result: { isError: true } })
  })

  test('app tools: list_documents and get_codegen_prompt', async () => {
    const { toolHost, calls } = host({ ok: true, result: { documents: [] } })
    expect(await toolHost.handle('tools/call', { name: 'list_documents' })).toEqual({
      result: { content: [{ type: 'text', text: JSON.stringify({ documents: [] }, null, 2) }] }
    })
    expect(calls).toEqual([{ command: 'list_documents', args: {} }])
    expect(await toolHost.handle('tools/call', { name: 'get_codegen_prompt' })).toEqual({
      result: { content: [{ type: 'text', text: JSON.stringify({ prompt: 'PROMPT' }, null, 2) }] }
    })
  })
})
