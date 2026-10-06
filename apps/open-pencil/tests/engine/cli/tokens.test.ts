import { expect, setDefaultTimeout, test } from 'bun:test'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { parseFigFile } from '@open-pencil/core/io'

import { runOpenPencilCLI } from '#tests/helpers/cli'
import { cliSourcePath } from '#tests/helpers/paths'

setDefaultTimeout(60_000)

async function tokenFixture(): Promise<{ dir: string; tokens: string; preset: string }> {
  const dir = await mkdtemp(join(tmpdir(), 'open-pencil-tokens-cli-'))
  const tokens = join(dir, 'tokens')
  await mkdir(join(tokens, 'theme'), { recursive: true })
  await writeFile(
    join(tokens, 'base.json'),
    JSON.stringify({ space: { $type: 'dimension', md: { $value: '8px' } } })
  )
  await writeFile(
    join(tokens, 'theme/light.json'),
    JSON.stringify({ bg: { $type: 'color', $value: '#fff' } })
  )
  await writeFile(
    join(tokens, 'theme/dark.json'),
    JSON.stringify({ bg: { $type: 'color', $value: '#000' } })
  )
  const preset = join(dir, 'demo.json')
  await writeFile(
    preset,
    JSON.stringify({
      name: 'demo',
      layers: [{ files: ['base.json'] }, { files: ['theme/{mode}.json'] }],
      axes: [{ name: 'mode', modes: ['light', 'dark'] }],
      collections: [{ name: 'Base' }, { name: 'Theme', axes: ['mode'] }],
      cssVar: { prefix: 'ds' }
    })
  )
  return { dir, tokens, preset }
}

test('tokens import writes variables into a document and re-imports without duplicates', async () => {
  const { dir, tokens, preset } = await tokenFixture()
  const fig = join(dir, 'tokens.fig')
  const first = await runOpenPencilCLI([
    'tokens',
    'import',
    tokens,
    '--preset',
    preset,
    '--into',
    fig,
    '--json'
  ])
  expect(first.exitCode).toBe(0)
  expect(JSON.parse(first.stdout)).toMatchObject({ source: 'demo', output: fig })

  const second = await runOpenPencilCLI([
    'tokens',
    'import',
    tokens,
    '--preset',
    preset,
    '--into',
    fig,
    '--json'
  ])
  const report = JSON.parse(second.stdout) as { created: string[]; unchanged: string[] }
  expect(report.created).toEqual([])
  expect(report.unchanged).toHaveLength(2)

  const graph = await parseFigFile((await readFile(fig)).buffer as ArrayBuffer)
  expect([...graph.variableCollections.values()].map((c) => c.name)).toEqual(['Base', 'Theme'])
  expect([...graph.variables.values()].map((v) => v.codeSyntax?.WEB).sort()).toEqual([
    'var(--ds-bg)',
    'var(--ds-space-md)'
  ])
})

test('tokens import resolves named presets from OPENPENCIL_TOKEN_PRESETS and reports a dry run', async () => {
  const { dir, tokens } = await tokenFixture()
  const proc = Bun.spawn(
    [process.execPath, cliSourcePath('index.ts'), 'tokens', 'import', tokens, '--preset', 'demo'],
    { stdout: 'pipe', stderr: 'pipe', env: { ...process.env, OPENPENCIL_TOKEN_PRESETS: dir } }
  )
  const stdout = await new Response(proc.stdout).text()
  expect(await proc.exited).toBe(0)
  expect(stdout).toContain('Theme')
  expect(stdout).toContain('Dry run')

  const missing = await runOpenPencilCLI(['tokens', 'import', tokens, '--preset', 'nope'])
  expect(missing.exitCode).toBe(1)
  expect(missing.stderr + missing.stdout).toContain('Token preset "nope" not found')
})
