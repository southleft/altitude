import { describe, expect, setDefaultTimeout, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { parityChange } from '#altitude/audit/parity'
import { COMMENT_MARKER, formatAuditComment } from '#altitude/audit/report'
import { runDesignAudit } from '#altitude/audit/run'

import { writeDocumentJSON } from '@open-pencil/core/io/formats/document-json'
import { SceneGraph } from '@open-pencil/scene-graph'

import { buttonSet, solid, syntheticFacts } from '../helpers/audit-fixtures'

setDefaultTimeout(60_000)

const facts = syntheticFacts()

async function writeFolder(graph: SceneGraph, dir: string) {
  for (const file of writeDocumentJSON(graph, { name: 'Checkout' }).files) {
    const path = join(dir, ...file.path.split('/'))
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, file.bytes)
  }
}

function document() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  graph.updateNode(page.id, { name: 'Checkout' })
  const definitions = graph.addPage('Definitions')
  graph.updateNode(definitions.id, { internalOnly: true })
  const button = buttonSet(graph, definitions.id)
  const card = graph.createNode('FRAME', page.id, {
    name: 'Card',
    width: 200,
    height: 120,
    fills: solid('#ffffff')
  })
  const instance = graph.createInstance(button.md.id, card.id, { name: 'Button' })
  if (!instance) throw new Error('instance')
  return { graph, card, instance, button }
}

describe('design audit', () => {
  test('audits only changed documents and marks findings the change introduced', async () => {
    const root = await mkdtemp(join(tmpdir(), 'design-audit-'))
    const { graph, card, button } = document()
    await writeFolder(graph, join(root, 'base', 'documents', 'checkout'))
    await writeFolder(graph, join(root, 'base', 'documents', 'untouched'))
    await writeFolder(graph, join(root, 'head', 'documents', 'untouched'))
    graph.updateNode(card.id, { fills: solid('#2e5ce6') })
    graph.createInstance(button.lg.id, card.id, { name: 'Big' })
    await writeFolder(graph, join(root, 'head', 'documents', 'checkout'))

    const report = await runDesignAudit({
      base: join(root, 'base'),
      head: join(root, 'head'),
      altitudeRoot: join(root, 'no-altitude'),
      outDir: join(root, 'out'),
      facts,
      repoURL: 'https://github.com/southleft/altitude-designs',
      headSha: 'abc123'
    })

    expect(report.documents.map((d) => [d.slug, d.status])).toEqual([['checkout', 'changed']])
    const [audit] = report.documents
    expect(audit?.diff.summary.instancesAdded).toBe(1)
    const invalid = audit?.findings.find((f) => f.ruleId === 'altitude/invalid-attribute')
    expect(invalid).toMatchObject({ new: true, severity: 'error', document: 'checkout' })
    expect(invalid?.url).toMatch(
      /^https:\/\/github\.com\/southleft\/altitude-designs\/blob\/abc123\/documents\/checkout\/pages\/checkout\.json#L\d+$/
    )
    expect(report.conclusion).toBe('failure')
    expect(existsSync(join(root, 'out', 'report.json'))).toBe(true)

    const page = audit?.renders.find((render) => render.kind === 'page')
    expect(typeof page?.base).toBe('string')
    expect(typeof page?.head).toBe('string')
    expect(page?.changedPercent).toBeGreaterThan(0)
    if (page?.diff) expect(existsSync(join(root, 'out', page.diff))).toBe(true)

    const comment = formatAuditComment(report, {
      assetsBaseURL: 'https://github.com/o/r/blob/audit-assets/pr-1'
    })
    expect(comment.startsWith(COMMENT_MARKER)).toBe(true)
    expect(comment).toContain('| 🔴 error **new** | `invalid-attribute` |')
    expect(comment).toContain('https://github.com/o/r/blob/audit-assets/pr-1/checkout/')
    expect(comment).toContain('?raw=true')
  })

  test('an empty change posts a short comment', async () => {
    const root = await mkdtemp(join(tmpdir(), 'design-audit-'))
    const { graph } = document()
    await writeFolder(graph, join(root, 'base', 'documents', 'checkout'))
    await writeFolder(graph, join(root, 'head', 'documents', 'checkout'))
    const report = await runDesignAudit({
      base: join(root, 'base'),
      head: join(root, 'head'),
      altitudeRoot: root,
      outDir: join(root, 'out'),
      facts,
      render: false
    })
    expect(report.conclusion).toBe('success')
    expect(formatAuditComment(report)).toContain('No document folders changed.')
  })

  test('parity separates disagreements the change introduced from inherited ones', () => {
    const before = document()
    const after = document()
    // A stand-in for Altitude's scoreComponent(): one disagreement per bound variable missing.
    const score = (input: { canvasContract: unknown }) => {
      const contract = input.canvasContract as { tokens: string[] }
      const missing = ['theme/space/md', 'theme/border/radius/md'].filter(
        (name) => !contract.tokens.includes(name)
      )
      return {
        api: { matched: 1, total: 1, percent: 100 },
        token: { matched: 2 - missing.length, total: 2, percent: 50 },
        disagreements: missing.map((key) => ({
          dimension: 'token-binding',
          kind: 'missing-in-canvas',
          key
        }))
      }
    }
    const space = after.graph.createVariable(
      'theme/space/md',
      'FLOAT',
      after.graph.createCollection('Tokens').id,
      12
    )
    after.graph.updateNode(after.button.md.id, { boundVariables: { itemSpacing: space.id } })
    const factsWithContract = { ...facts, contracts: new Map([['al-button', { id: 'al-button' }]]) }
    const change = parityChange(before.graph, after.graph, factsWithContract, score)
    expect(change.components).toHaveLength(1)
    expect(change.components[0]).toMatchObject({
      tag: 'al-button',
      introduced: [],
      resolved: [expect.objectContaining({ key: 'theme/space/md' })],
      unchanged: 1
    })
    const reverse = parityChange(after.graph, before.graph, factsWithContract, score)
    expect(reverse.components[0]?.introduced.map((d) => d.key)).toEqual(['theme/space/md'])
  })
})
