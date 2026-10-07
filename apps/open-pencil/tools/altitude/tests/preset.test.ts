import { describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { importDesignTokens, readTokenMetadata } from '@open-pencil/core/io/formats/dtcg'
import { resolveWorkspaceRoot } from '@open-pencil/package-artifacts'
import { SceneGraph, type Variable } from '@open-pencil/scene-graph'

import { runTokenParity } from '../src/parity'
import { altitudePaths, readAltitudePreset, readTokenTree } from '../src/tree'

/**
 * Runs the Altitude preset against the real Altitude token tree. OpenPencil lives at
 * `apps/open-pencil` inside Altitude; set ALTITUDE_ROOT to point elsewhere. Skips when
 * the tree (or, for parity, the built CSS) is not there.
 */
const workspace = await resolveWorkspaceRoot(import.meta.dir)
const paths = altitudePaths(process.env.ALTITUDE_ROOT ?? join(workspace, '../..'))
const hasTokens = existsSync(paths.tokens)
const hasDist = existsSync(join(paths.dist, 'css/brand'))

function byCSS(graph: SceneGraph, name: string): Variable | undefined {
  return [...graph.variables.values()].find((v) => v.codeSyntax?.WEB === `var(${name})`)
}

describe.skipIf(!hasTokens)('Altitude preset on the real token tree', () => {
  test('lays tokens out in the Figma collection convention plus Brand × Mode', async () => {
    const graph = new SceneGraph()
    const result = importDesignTokens(
      graph,
      await readTokenTree(paths.tokens),
      await readAltitudePreset()
    )
    expect(result.collections.map((c) => c.name)).toEqual([
      'Tier 1 | Primitive',
      'Tier 2 | Semantic',
      'Tier 3 | Component',
      'Tier 2 | Theme',
      'Tier 2 | Brand',
      'Tier 2 | Density',
      'Tier 2 | Contrast',
      'Tier 2 | Motion',
      'Tier 2 | Shape',
      // contrast="more" overrides a border whose base value varies by brand and mode.
      'Tokens · Mode × Brand × Contrast'
    ])
    const brand = result.collections.find((c) => c.name === 'Tier 2 | Brand')
    expect(brand?.modes).toEqual([
      'Altitude / Light',
      'Altitude / Dark',
      'Southleft / Light',
      'Southleft / Dark'
    ])
    expect(result.stats.variables).toBeGreaterThan(500)
  })

  test('names follow token-map.mjs and code syntax is the emitted custom property', async () => {
    const graph = new SceneGraph()
    importDesignTokens(graph, await readTokenTree(paths.tokens), await readAltitudePreset())
    expect(byCSS(graph, '--al-theme-space')?.name).toBe('theme/space/@')
    expect(byCSS(graph, '--al-font-size-12')?.name).toBe('typography/font-size/12')
    expect(byCSS(graph, '--al-theme-border-radius-role-surface')?.name).toBe(
      'theme/border/radius/role/surface'
    )
    const bg = byCSS(graph, '--al-theme-color-background-primary-default')
    expect(bg?.name).toBe('theme/color/background/primary-default')
    expect(readTokenMetadata(bg ?? {})?.extensions).toEqual({
      'org.altitude.token': { cssType: 'color' }
    })
  })

  test('theme axes become collections; motion keeps easings and transitions with metadata', async () => {
    const graph = new SceneGraph()
    const result = importDesignTokens(
      graph,
      await readTokenTree(paths.tokens),
      await readAltitudePreset()
    )
    const motion = result.collections.find((c) => c.name === 'Tier 2 | Motion')
    expect(motion?.modes).toEqual(['Full', 'Reduced', 'Expressive'])
    const hover = byCSS(graph, '--al-theme-animation-transition-hover')
    expect(hover?.type).toBe('STRING')
    expect(readTokenMetadata(hover ?? {})).toMatchObject({ type: 'transition' })
    expect(readTokenMetadata(hover ?? {})?.composite).toBeDefined()
    const easing = byCSS(graph, '--al-theme-animation-timing-role-standard')
    expect(readTokenMetadata(easing ?? {})?.type).toBe('cubicBezier')
    const duration = byCSS(graph, '--al-theme-animation-duration-role-fast')
    expect(readTokenMetadata(duration ?? {})).toMatchObject({ type: 'duration', unit: 's' })
  })

  test('re-importing the same tree is a no-op', async () => {
    const graph = new SceneGraph()
    const files = await readTokenTree(paths.tokens)
    const preset = await readAltitudePreset()
    importDesignTokens(graph, files, preset)
    const again = importDesignTokens(graph, files, preset)
    expect(again.created.length + again.updated.length + again.removed.length).toBe(0)
  })

  test('every token that is not a variable is named', async () => {
    const graph = new SceneGraph()
    const result = importDesignTokens(
      graph,
      await readTokenTree(paths.tokens),
      await readAltitudePreset()
    )
    const dropped = result.issues.filter((issue) =>
      ['invalid-value', 'unsupported-type', 'unresolved-alias', 'circular-alias'].includes(
        issue.code
      )
    )
    for (const issue of dropped) expect(issue.token).toBeTruthy()
    // A value that fails in some modes only (currentColor) keeps the variable; the rest drop.
    const imported = new Set([...graph.variables.values()].map((v) => readTokenMetadata(v)?.path))
    const droppedTokens = new Set(
      dropped.map((issue) => issue.token).filter((t) => !imported.has(t))
    )
    expect(result.stats.tokens - result.stats.variables).toBe(droppedTokens.size)
    expect(droppedTokens).toContain('font-weight.italic')
  })

  test.skipIf(!hasDist)(
    're-export reproduces every non-composite --al-* value per brand × mode',
    async () => {
      const report = await runTokenParity(paths.root)
      expect(report.combinations).toHaveLength(4)
      expect(report.nonComposite.percent).toBe(100)
    }
  )
})
