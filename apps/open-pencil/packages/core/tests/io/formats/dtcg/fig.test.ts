import { describe, expect, test } from 'bun:test'

import { exportFigFile, parseFigFile } from '@open-pencil/core/io'
import {
  importDesignTokens,
  readCollectionTokenMetadata,
  readTokenMetadata
} from '@open-pencil/core/io/formats/dtcg'
import { SceneGraph } from '@open-pencil/scene-graph'

import { themedMapping, themedTokenFiles } from './fixtures'

describe('DTCG import through a .fig round trip', () => {
  test('code syntax and token metadata survive, and re-import updates instead of duplicating', async () => {
    const graph = new SceneGraph()
    importDesignTokens(graph, themedTokenFiles(), themedMapping)
    const bytes = await exportFigFile(graph)
    const reopened = await parseFigFile(bytes.slice().buffer, { populate: 'first-page' })

    const md = [...reopened.variables.values()].find((v) => readTokenMetadata(v)?.path === 'space.md')
    expect(md?.codeSyntax).toEqual({ WEB: 'var(--ds-space-md)' })
    expect(readTokenMetadata(md ?? {})?.unit).toBe('rem')
    const brand = [...reopened.variableCollections.values()].find((c) => c.name === 'Brand')
    expect(readCollectionTokenMetadata(brand ?? {})?.axes).toEqual(['brand'])

    const count = reopened.variables.size
    const again = importDesignTokens(reopened, themedTokenFiles(), themedMapping)
    expect(again.created).toEqual([])
    expect(reopened.variables.size).toBe(count)
  })
})
