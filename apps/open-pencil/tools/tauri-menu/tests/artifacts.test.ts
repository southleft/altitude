import { expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { resolveWorkspaceRoot } from '@open-pencil/package-artifacts'

import { APP_MENU_SCHEMA } from '@/app/shell/menu/schema'

import { MENU_ARTIFACTS, renderMenu } from '../src/menu'

test('committed menus match the schema', async () => {
  const root = await resolveWorkspaceRoot(import.meta.dir)

  for (const [path, render] of Object.entries(MENU_ARTIFACTS)) {
    expect(await readFile(join(root, path), 'utf8'), `${path} is stale`).toBe(render())
  }
})

test('groups kept off the menubar are left out of the native menu', () => {
  const hidden = APP_MENU_SCHEMA.filter((group) => group.menubar === false).map(
    (group) => group.label
  )
  expect(hidden.length).toBeGreaterThan(0)
  const nativeLabels = (JSON.parse(renderMenu()) as { label: string }[]).map((group) => group.label)
  for (const label of hidden) expect(nativeLabels).not.toContain(label)
})
