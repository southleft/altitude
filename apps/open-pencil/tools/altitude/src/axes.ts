import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { colorToCSS } from '@open-pencil/core/color'
import {
  readTokenMetadata,
  tokenFloatCSS,
  tokenModeSelection
} from '@open-pencil/core/io/formats/dtcg'
import type { SceneGraph, Variable, VariableValue } from '@open-pencil/scene-graph'

import { canonicalCSSValue } from './css'

/**
 * Axis parity: Altitude's `dist-v5/axes.json` (per axis: modes, default, and each role
 * token's resolved value per mode, `null` meaning the base value applies) against the
 * imported variables resolved in that axis mode, with every other axis at its default.
 */

export type AxisCategory = 'value' | 'composite' | 'unrepresentable'

export interface AxisParityEntry {
  name: string
  path: string
  status: 'match' | 'mismatch' | 'missing'
  category: AxisCategory
  expected: string
  actual?: string
  reason?: string
}

export interface AxisParityCombination {
  axis: string
  mode: string
  entries: AxisParityEntry[]
}

interface AxesManifest {
  axes: Record<
    string,
    {
      default: string
      modes: string[]
      tokens: Record<string, { path: string; type: string; values: Record<string, unknown> }>
    }
  >
}

/** CSS keywords a variable cannot hold; Altitude uses them for high-contrast borders. */
const CSS_KEYWORDS = new Set(['currentcolor', 'inherit', 'initial', 'unset', 'revert'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isManifest(value: unknown): value is AxesManifest {
  return typeof value === 'object' && value !== null && 'axes' in value
}

function transitionText(value: Record<string, unknown>): string {
  return [value.duration, value.timingFunction, value.delay ?? '0s']
    .map((part) => (Array.isArray(part) ? `cubic-bezier(${part.join(', ')})` : String(part)))
    .join(' ')
}

function valueCSS(variable: Variable, value: VariableValue | undefined): string | undefined {
  if (typeof value === 'number') return tokenFloatCSS(variable, value) ?? `${value}px`
  if (typeof value === 'string') return value
  if (typeof value === 'boolean') return value ? '1' : '0'
  if (value && typeof value === 'object' && 'r' in value) return colorToCSS(value)
  return undefined
}

function expectedFor(
  raw: unknown,
  name: string,
  base: ReadonlyMap<string, string>
): { expected: string; category: AxisCategory } | null {
  if (raw === null) {
    const fallback = base.get(name)
    return fallback === undefined ? null : { expected: fallback, category: 'value' }
  }
  if (isRecord(raw)) {
    return { expected: transitionText(raw), category: 'composite' }
  }
  const text = String(raw)
  return {
    expected: text,
    category: CSS_KEYWORDS.has(text.toLowerCase()) ? 'unrepresentable' : 'value'
  }
}

export async function readAxesManifest(dist: string): Promise<AxesManifest | null> {
  const file = join(dist, 'axes.json')
  if (!existsSync(file)) return null
  const parsed: unknown = JSON.parse(await readFile(file, 'utf8'))
  return isManifest(parsed) ? parsed : null
}

export function compareAxes(
  graph: SceneGraph,
  manifest: AxesManifest,
  base: ReadonlyMap<string, string>,
  baseContext: Readonly<Record<string, string>>
): AxisParityCombination[] {
  const byPath = new Map<string, Variable>()
  for (const variable of graph.variables.values()) {
    const path = readTokenMetadata(variable)?.path
    if (path) byPath.set(path, variable)
  }
  const combinations: AxisParityCombination[] = []
  for (const [axis, definition] of Object.entries(manifest.axes)) {
    for (const mode of definition.modes) {
      const selection = tokenModeSelection(graph, { ...baseContext, [axis]: mode })
      const entries: AxisParityEntry[] = []
      for (const [name, token] of Object.entries(definition.tokens)) {
        const want = expectedFor(token.values[mode] ?? null, name, base)
        if (!want) continue
        const variable = byPath.get(token.path)
        const actual = variable
          ? valueCSS(variable, graph.resolveVariableInModes(variable.id, selection))
          : undefined
        if (actual === undefined) {
          entries.push({
            name,
            path: token.path,
            status: 'missing',
            ...want,
            reason: 'no variable for this token path'
          })
          continue
        }
        const same = canonicalCSSValue(want.expected) === canonicalCSSValue(actual)
        entries.push({
          name,
          path: token.path,
          status: same ? 'match' : 'mismatch',
          ...want,
          actual,
          reason:
            !same && want.category === 'unrepresentable'
              ? `CSS keyword ${want.expected} has no variable value; the importer keeps the base value`
              : undefined
        })
      }
      combinations.push({ axis, mode, entries })
    }
  }
  return combinations
}
