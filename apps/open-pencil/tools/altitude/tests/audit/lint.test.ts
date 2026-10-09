import { describe, expect, test } from 'bun:test'

import {
  applyLintConfig,
  failsOn,
  parseLintConfig,
  type ConfiguredFinding
} from '#altitude/audit/config'
import { literalOptions, normalizeComponentName } from '#altitude/audit/facts'
import { lintAltitudeDocument, type AuditFinding } from '#altitude/audit/lint'

import { SceneGraph } from '@open-pencil/scene-graph'

import { buttonSet, solid, syntheticFacts } from '../helpers/audit-fixtures'

const facts = syntheticFacts()

function lint(build: (graph: SceneGraph, pageId: string) => void): AuditFinding[] {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  build(graph, page.id)
  return lintAltitudeDocument(graph, facts)
}

const rules = (findings: AuditFinding[]) => findings.map((finding) => finding.ruleId)

describe('Altitude lint', () => {
  test('suggests the semantic token for a hard-coded colour', () => {
    const findings = lint((graph, page) => {
      graph.createNode('FRAME', page, { name: 'Hero', fills: solid('#2e5ce6') })
    })
    expect(findings).toEqual([
      expect.objectContaining({
        ruleId: 'altitude/hardcoded-color',
        severity: 'warning',
        value: '#2e5ce6ff',
        nodePath: ['Hero'],
        suggest: expect.stringContaining('`theme/color/background/primary-default`')
      })
    ])
  })

  test('a bound colour passes; an off-palette colour is info', () => {
    const variable = [...facts.variables.variables.values()][0]
    const findings = lint((graph, page) => {
      const bound = graph.createNode('FRAME', page, { name: 'Bound', fills: solid('#2e5ce6') })
      graph.updateNode(bound.id, { boundVariables: { 'fills/0/color': variable.id } })
      graph.createNode('FRAME', page, { name: 'Odd', fills: solid('#123456') })
    })
    expect(findings.map((f) => [f.nodeName, f.ruleId, f.severity])).toEqual([
      ['Odd', 'altitude/off-palette-color', 'info']
    ])
  })

  test('hard-coded spacing and radius matching a token', () => {
    const findings = lint((graph, page) => {
      graph.createNode('FRAME', page, {
        name: 'Stack',
        layoutMode: 'VERTICAL',
        itemSpacing: 12,
        paddingTop: 7,
        cornerRadius: 8,
        fills: []
      })
    })
    expect(findings.map((f) => [f.ruleId, f.value])).toEqual([
      ['altitude/hardcoded-spacing', '12'],
      ['altitude/hardcoded-radius', '8']
    ])
    expect(findings[0]?.suggest).toContain('`--al-theme-space-md`')
  })

  test('text: unknown font, missing text style and hard-coded typography', () => {
    const findings = lint((graph, page) => {
      graph.createNode('TEXT', page, {
        name: 'Body',
        text: 'Hi',
        fontFamily: 'Inter',
        fontSize: 16,
        lineHeight: 24,
        fills: []
      })
      graph.createNode('TEXT', page, {
        name: 'Styled',
        text: 'Hi',
        fontFamily: 'Public Sans',
        fontSize: 13,
        textStyleId: 'style-1',
        fills: []
      })
    })
    expect(rules(findings)).toEqual([
      'altitude/unknown-font',
      'altitude/text-style-required',
      'altitude/hardcoded-typography',
      'altitude/hardcoded-typography'
    ])
    expect(findings[0]?.suggest).toBe('Use "Public Sans"')
  })

  test('layers named like Altitude components that are not instances', () => {
    const findings = lint((graph, page) => {
      graph.createNode('FRAME', page, { name: 'Button / Primary', fills: [] })
      graph.createNode('FRAME', page, { name: 'al-button', fills: [] })
      graph.createNode('FRAME', page, { name: 'Buttons row', fills: [] })
    })
    expect(findings.map((f) => [f.nodeName, f.ruleId, f.value])).toEqual([
      ['Button / Primary', 'altitude/detached-component', 'al-button'],
      ['al-button', 'altitude/detached-component', 'al-button']
    ])
  })

  test('instances: foreign components and attribute values outside the CEM', () => {
    const findings = lint((graph, page) => {
      const library = graph.addPage('Library')
      const { md, lg } = buttonSet(graph, library.id)
      const local = graph.createNode('COMPONENT', library.id, { name: 'Promo tile' })
      graph.createInstance(md.id, page, { name: 'Ok' })
      graph.createInstance(lg.id, page, { name: 'Big' })
      graph.createInstance(local.id, page, { name: 'Promo' })
    })
    const onPage = findings.filter((f) => f.page === 'Page 1')
    expect(onPage.map((f) => [f.nodeName, f.ruleId, f.severity, f.value])).toEqual([
      ['Big', 'altitude/invalid-attribute', 'error', 'size="xl"'],
      ['Promo', 'altitude/foreign-component', 'warning', 'Promo tile']
    ])
    expect(onPage[0]?.suggest).toBe('One of: "sm", "md"')
  })

  test('internal pages and layers inside instances are not linted', () => {
    const findings = lint((graph, page) => {
      const internal = graph.addPage('Definitions')
      graph.updateNode(internal.id, { internalOnly: true })
      const { md } = buttonSet(graph, internal.id)
      graph.createNode('FRAME', md.id, { name: 'Fill', fills: solid('#2e5ce6') })
      graph.createInstance(md.id, page, { name: 'Ok' })
    })
    expect(findings).toEqual([])
  })
})

describe('.openpencil-lint.json', () => {
  const finding = (overrides: Partial<ConfiguredFinding> = {}): ConfiguredFinding => ({
    ruleId: 'altitude/unknown-font' as const,
    severity: 'warning' as const,
    message: 'Font "Inter"',
    pageId: '0:1',
    page: 'Home',
    nodeId: '1:2',
    nodeName: 'Body',
    nodePath: ['Card', 'Body'],
    value: 'Inter',
    document: 'checkout',
    ...overrides
  })

  test('allow entries match on every field they name', () => {
    const config = parseLintConfig({
      allow: [
        { rule: 'altitude/unknown-font', value: 'Inter', reason: 'marketing' },
        { rule: '*', document: 'playground' },
        { rule: 'altitude/hardcoded-color', path: 'Card / ' }
      ]
    })
    const result = applyLintConfig(
      [
        finding(),
        finding({ value: 'Roboto' }),
        finding({ document: 'playground', ruleId: 'altitude/hardcoded-radius' }),
        finding({ ruleId: 'altitude/hardcoded-color', value: '#fff' })
      ],
      config
    )
    expect(result.allowed).toBe(3)
    expect(result.findings.map((f) => f.value)).toEqual(['Roboto'])
  })

  test('rules change severity or turn a rule off', () => {
    const config = parseLintConfig({
      rules: { 'altitude/unknown-font': 'error', 'altitude/hardcoded-color': 'off' }
    })
    const result = applyLintConfig(
      [finding(), finding({ ruleId: 'altitude/hardcoded-color' })],
      config
    )
    expect(result.findings.map((f) => [f.ruleId, f.severity])).toEqual([
      ['altitude/unknown-font', 'error']
    ])
  })

  test('rejects unknown rules and fields', () => {
    expect(() => parseLintConfig({ rules: { 'altitude/nope': 'off' } })).toThrow()
    expect(() => parseLintConfig({ allowlist: [] })).toThrow()
  })

  test('failOn thresholds', () => {
    expect(failsOn('error', 'error')).toBe(true)
    expect(failsOn('warning', 'error')).toBe(false)
    expect(failsOn('warning', 'warning')).toBe(true)
    expect(failsOn('error', 'never')).toBe(false)
  })
})

describe('facts helpers', () => {
  test('literal unions and component names', () => {
    expect(literalOptions("'sm' | 'md' | undefined")).toEqual(['sm', 'md'])
    expect(literalOptions('string')).toBeNull()
    expect(normalizeComponentName('al-text-field')).toBe(normalizeComponentName('Text Field'))
  })
})
