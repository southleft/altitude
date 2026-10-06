import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import {
  importDesignTokens,
  readTokenMetadata,
  resolveTokenImportConfig,
  tokenCSSName,
  tokenModeSelection,
  variableCSSName,
  type TokenImportResult
} from '@open-pencil/core/io/formats/dtcg'
import { variableCollectionsToCSS } from '@open-pencil/dom-css'
import { SceneGraph } from '@open-pencil/scene-graph'

import {
  compareAxes,
  readAxesManifest,
  type AxisParityCombination,
  type AxisParityEntry
} from './axes'
import { canonicalCSSValue, parseCustomProperties, resolveCustomProperties } from './css'
import { altitudePaths, readAltitudePreset, readTokenTree } from './tree'

/**
 * Token parity: Altitude's built CSS vs OpenPencil's re-export of the imported tokens.
 *
 * For every brand × mode, both stylesheets are reduced to resolved, canonical values and
 * compared name by name. Names whose token is a composite (typography, shadow, …) are
 * counted separately, because a CSS-string variable cannot reproduce every formatting
 * choice of Altitude's emitter; the floor applies to the non-composite set.
 */

export type ParityStatus = 'match' | 'mismatch' | 'missing' | 'extra'

export interface ParityEntry {
  name: string
  status: ParityStatus
  composite: boolean
  expected?: string
  actual?: string
  reason?: string
}

export interface ParityCombination {
  brand: string
  mode: string
  file: string
  entries: ParityEntry[]
  counts: Record<ParityStatus, number>
  nonComposite: { total: number; matched: number }
  composite: { total: number; matched: number }
}

export interface ParityReport {
  altitudeRoot: string
  combinations: ParityCombination[]
  /** Axis mode parity from `dist-v5/axes.json`; empty when the manifest is not built. */
  axes: AxisParityCombination[]
  axesManifest: boolean
  /** Brand × mode and axis values; the floor applies here. */
  nonComposite: { total: number; matched: number; percent: number }
  composite: { total: number; matched: number; percent: number }
  /** Axis values that are CSS keywords (`currentColor`) no variable can hold. */
  unrepresentable: { total: number; matched: number; percent: number }
  overall: { total: number; matched: number; percent: number }
  importIssues: TokenImportResult['issues']
}

function percent(matched: number, total: number): number {
  return total === 0 ? 100 : Math.round((matched / total) * 10000) / 100
}

interface NameFacts {
  composite: Set<string>
  reasons: Map<string, string>
}

function nameFacts(
  graph: SceneGraph,
  result: TokenImportResult,
  cssVar: { prefix: string; dropSegments: string[] }
): NameFacts {
  const composite = new Set<string>()
  for (const variable of graph.variables.values()) {
    const name = variableCSSName(variable)
    if (name && readTokenMetadata(variable)?.composite !== undefined) composite.add(name)
  }
  const reasons = new Map<string, string>()
  for (const issue of result.issues) {
    if (!issue.token) continue
    const name = tokenCSSName(issue.token.split('.'), cssVar)
    if (!reasons.has(name)) reasons.set(name, `${issue.code}: ${issue.message}`)
  }
  return { composite, reasons }
}

/**
 * Why Altitude emits a name the re-export lacks. Altitude's emitter renames
 * `typography…-regular` presets and adds `-letter-spacing` / `-text-decoration`
 * companion properties for typography sub-values; neither is a token of its own.
 */
function missingReason(
  name: string,
  actual: ReadonlyMap<string, string>,
  facts: NameFacts
): { reason: string; composite: boolean } {
  const known = facts.reasons.get(name)
  if (known) return { reason: known, composite: known.startsWith('composite') }
  const companion = /^(.*typography.*)-(letter-spacing|text-decoration)$/.exec(name)
  if (companion) {
    return {
      reason: `typography ${companion[2]} companion emitted by Altitude's formatter, carried in the composite's metadata`,
      composite: true
    }
  }
  if (actual.has(`${name}-regular`)) {
    return { reason: 'Altitude drops -regular from typography preset names', composite: true }
  }
  return { reason: 'not produced by the import', composite: false }
}

/** Known formatting differences of Altitude's emitter, so a mismatch is named. */
function mismatchReason(expected: string, actual: string): string | undefined {
  if (canonicalCSSValue(expected.replace(/,\s*sans-serif$/, '')) === canonicalCSSValue(actual)) {
    return "Altitude's typography formatter appends a sans-serif fallback to the font shorthand"
  }
  return undefined
}

export function compareStylesheets(
  expectedCSS: string,
  actualCSS: string,
  facts: NameFacts
): Omit<ParityCombination, 'brand' | 'mode' | 'file'> {
  const expected = resolveCustomProperties(parseCustomProperties(expectedCSS))
  const actual = resolveCustomProperties(parseCustomProperties(actualCSS))
  const entries: ParityEntry[] = []
  for (const [name, raw] of expected) {
    const got = actual.get(name)
    if (got === undefined) {
      const { reason, composite } = missingReason(name, actual, facts)
      entries.push({ name, status: 'missing', composite, expected: raw, reason })
      continue
    }
    const composite = facts.composite.has(name)
    if (canonicalCSSValue(raw) === canonicalCSSValue(got)) {
      entries.push({ name, status: 'match', composite, expected: raw, actual: got })
      continue
    }
    entries.push({
      name,
      status: 'mismatch',
      composite,
      expected: raw,
      actual: got,
      reason: mismatchReason(raw, got)
    })
  }
  for (const [name, got] of actual) {
    if (!expected.has(name)) {
      entries.push({ name, status: 'extra', composite: facts.composite.has(name), actual: got })
    }
  }
  const counts: Record<ParityStatus, number> = { match: 0, mismatch: 0, missing: 0, extra: 0 }
  for (const entry of entries) counts[entry.status]++
  const scored = entries.filter((entry) => entry.status !== 'extra')
  const tally = (composite: boolean) => {
    const set = scored.filter((entry) => entry.composite === composite)
    return { total: set.length, matched: set.filter((entry) => entry.status === 'match').length }
  }
  return { entries, counts, nonComposite: tally(false), composite: tally(true) }
}

export interface ParityOptions {
  /** Built Altitude token output; defaults to `<root>/libs/al-web-components/styles/dist-v5`. */
  dist?: string
  brands?: string[]
  modes?: string[]
}

export async function runTokenParity(
  altitudeRoot: string,
  options: ParityOptions = {}
): Promise<ParityReport> {
  const paths = altitudePaths(altitudeRoot, options.dist)
  const preset = await readAltitudePreset()
  const config = resolveTokenImportConfig(preset)
  const cssVar = config.cssVar ?? { prefix: 'al', dropSegments: ['@', '$root'] }
  const graph = new SceneGraph()
  const result = importDesignTokens(graph, await readTokenTree(paths.tokens), preset)
  const facts = nameFacts(graph, result, cssVar)

  const brands =
    options.brands ??
    config.axes.find((axis) => axis.name === 'brand')?.modes.map((m) => m.name) ??
    []
  const modes =
    options.modes ??
    config.axes.find((axis) => axis.name === 'mode')?.modes.map((m) => m.name) ??
    []
  const combinations: ParityCombination[] = []
  for (const brand of brands) {
    for (const mode of modes) {
      const file = join(paths.dist, 'css/brand', `tokens-${brand}-${mode}.css`)
      if (!existsSync(file)) {
        throw new Error(
          `Built Altitude CSS not found: ${file}\nBuild it first: pnpm --filter @southleft/al-web-components build:tokens (or pass --dist).`
        )
      }
      const actualCSS = variableCollectionsToCSS(graph, {
        cssVarPrefix: cssVar.prefix,
        modes: tokenModeSelection(graph, { brand, mode })
      })
      combinations.push({
        brand,
        mode,
        file,
        ...compareStylesheets(await readFile(file, 'utf8'), actualCSS, facts)
      })
    }
  }

  const baseContext = Object.fromEntries(config.axes.map((axis) => [axis.name, axis.defaultMode]))
  const manifest = await readAxesManifest(paths.dist)
  const baseFile = join(
    paths.dist,
    'css/brand',
    `tokens-${baseContext.brand}-${baseContext.mode}.css`
  )
  const baseValues = existsSync(baseFile)
    ? resolveCustomProperties(parseCustomProperties(await readFile(baseFile, 'utf8')))
    : new Map<string, string>()
  const axes = manifest ? compareAxes(graph, manifest, baseValues, baseContext) : []
  const axisEntries = axes.flatMap((combination) => combination.entries)
  const axisTally = (category: AxisParityEntry['category']) => {
    const set = axisEntries.filter((entry) => entry.category === category)
    return { total: set.length, matched: set.filter((entry) => entry.status === 'match').length }
  }

  const sum = (
    pick: (c: ParityCombination) => { total: number; matched: number },
    extra: { total: number; matched: number }
  ) => {
    const total = combinations.reduce((n, c) => n + pick(c).total, extra.total)
    const matched = combinations.reduce((n, c) => n + pick(c).matched, extra.matched)
    return { total, matched, percent: percent(matched, total) }
  }
  const nonComposite = sum((c) => c.nonComposite, axisTally('value'))
  const composite = sum((c) => c.composite, axisTally('composite'))
  const unrepresentable = axisTally('unrepresentable')
  return {
    altitudeRoot: paths.root,
    combinations,
    axes,
    axesManifest: manifest !== null,
    nonComposite,
    composite,
    unrepresentable: {
      ...unrepresentable,
      percent: percent(unrepresentable.matched, unrepresentable.total)
    },
    overall: {
      total: nonComposite.total + composite.total + unrepresentable.total,
      matched: nonComposite.matched + composite.matched + unrepresentable.matched,
      percent: percent(
        nonComposite.matched + composite.matched + unrepresentable.matched,
        nonComposite.total + composite.total + unrepresentable.total
      )
    },
    importIssues: result.issues
  }
}
