import { describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { buildAltitudeLibrary, emitCanvasContracts } from '#altitude/library/index'

import { createLibraryRevision } from '@open-pencil/core/library'
import { resolveWorkspaceRoot } from '@open-pencil/package-artifacts'

/**
 * Builds from the real Altitude checkout (OpenPencil lives at `apps/open-pencil`; set
 * ALTITUDE_ROOT to point elsewhere). Skips when the contracts are not there.
 */
const workspace = await resolveWorkspaceRoot(import.meta.dir)
const root = process.env.ALTITUDE_ROOT ?? join(workspace, '../..')
const hasContracts = existsSync(join(root, '.altitude/contracts/altitude/al-button.contract.json'))

describe.skipIf(!hasContracts)('Altitude library from the real contracts', () => {
  test('builds al-button from its measured anatomy with its full variant matrix', async () => {
    const result = await buildAltitudeLibrary(root, { only: ['al-button'] })
    const button = result.built.find((item) => item.tag === 'al-button')
    expect(button?.axes.map((axis) => axis.name)).toEqual(['State', 'Variant', 'Shape', 'Size'])
    expect(button?.variants).toBe(120)
    const [contract] = emitCanvasContracts(result.graph)
    expect(contract.component).toBe('al-button')
    expect(contract.tokensOwn).toContain('theme/color/background/primary-default')
    expect(contract.tokensOwn).toContain('theme/size/control-sm')
  }, 30_000)

  test('rebuilding from the same inputs yields the same library revision', async () => {
    const revision = async () => {
      const { graph } = await buildAltitudeLibrary(root, { only: ['al-button', 'al-badge'] })
      return createLibraryRevision({
        libraryId: 'altitude',
        name: 'Altitude',
        graph,
        publishedAt: 'fixed'
      })
    }
    const first = await revision()
    const second = await revision()
    expect(second.manifest.revisionId).toBe(first.manifest.revisionId)
    expect(second.manifest.assets.map((asset) => asset.contentHash)).toEqual(
      first.manifest.assets.map((asset) => asset.contentHash)
    )
  }, 30_000)

  test('names every contract without measured anatomy as a skip', async () => {
    const result = await buildAltitudeLibrary(root, { only: ['al-theme'] })
    expect(result.built).toHaveLength(0)
    expect(result.skipped[0]?.reason).toContain('no measured anatomy')
  })
})
