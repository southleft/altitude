import { describe, expect, test } from 'bun:test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'

import { loadCommandExtensions } from '#cli/extensions'

async function extensionModule(name: string, body: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'open-pencil-cli-extension-'))
  const file = join(dir, `${name}.ts`)
  await writeFile(file, body)
  return file
}

const command = (name: string) =>
  `export default { name: '${name}', command: { meta: { description: '${name}' }, run() {} } }\n`

describe('CLI command extensions', () => {
  test('adds each listed module as a top-level command', async () => {
    const first = await extensionModule('first', command('altitude'))
    const second = await extensionModule('second', command('brand'))
    const commands = await loadCommandExtensions(
      new Set(['export']),
      [first, second].join(delimiter)
    )
    expect(Object.keys(commands)).toEqual(['altitude', 'brand'])
  })

  test('is a no-op when the variable is unset', async () => {
    expect(await loadCommandExtensions(new Set(), undefined)).toEqual({})
  })

  test('never replaces a built-in command', async () => {
    const file = await extensionModule('clash', command('export'))
    await expect(loadCommandExtensions(new Set(['export']), file)).rejects.toThrow(
      'already defined'
    )
  })

  test('rejects a module without a { name, command } default export', async () => {
    const file = await extensionModule('bad', 'export default 42\n')
    await expect(loadCommandExtensions(new Set(), file)).rejects.toThrow('default export')
  })
})
