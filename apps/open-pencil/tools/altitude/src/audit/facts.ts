import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { formatHex8 } from 'culori'
import * as v from 'valibot'

import { importDesignTokens } from '@open-pencil/core/io/formats/dtcg'
import { SceneGraph, type Color, type Variable } from '@open-pencil/scene-graph'

import { CEM_FILE, CONTRACTS_DIR } from '../library/contract'
import { altitudePaths, readAltitudePreset, readTokenTree } from '../tree'

/**
 * What the design audit knows about one Altitude checkout: its tokens (imported with the
 * Altitude preset, the same variables the library binds), its components (code contracts)
 * and the attributes each custom element accepts (Custom Elements Manifest).
 */

export interface TokenRef {
  /** Variable name, e.g. `theme/space/sm`. */
  name: string
  /** CSS custom property, e.g. `--al-theme-space-sm`. */
  css: string | null
}

export type NumericTokenKind = 'spacing' | 'radius' | 'fontSize' | 'lineHeight'

export interface AttributeFact {
  name: string
  /** CEM type text, e.g. `'sm' | 'md'` or `boolean`. */
  type: string | null
  /** String literal options when the type is a literal union; null when open. */
  values: string[] | null
}

export interface AltitudeComponent {
  tag: string
  name: string
}

export interface AltitudeFacts {
  root: string
  variables: SceneGraph
  /** `#rrggbbaa` → tokens with that value in the default modes, semantic tokens first. */
  colors: Map<string, TokenRef[]>
  numbers: Record<NumericTokenKind, Map<number, TokenRef[]>>
  /** Font families the typography tokens name (first family of each stack), by lower case. */
  fontFamilies: Map<string, string>
  /** Normalised component name or tag stem → component. */
  components: Map<string, AltitudeComponent>
  /** Tag → attribute name → fact. Tags absent from the CEM are unknown elements. */
  attributes: Map<string, Map<string, AttributeFact>>
  /** Tag → parsed code contract, as `diffContracts()` expects it. */
  contracts: Map<string, unknown>
}

const NUMERIC_KINDS: Array<[NumericTokenKind, RegExp]> = [
  ['spacing', /(^|\/)space(\/|$)/],
  ['radius', /(^|\/)radius(\/|$)/],
  ['fontSize', /(^|\/)font-size(\/|$)/],
  ['lineHeight', /(^|\/)line-height(\/|$)/]
]

/** Lower-case alphanumerics only: `Text Field`, `text-field` and `al-text-field` → `textfield`. */
export function normalizeComponentName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^al-/, '')
    .replace(/[^a-z0-9]/g, '')
}

export function colorKey(color: Color, opacity = 1): string {
  return formatHex8({ mode: 'rgb', r: color.r, g: color.g, b: color.b, alpha: color.a * opacity })
}

/** Semantic theme tokens before primitives; then by name, so suggestions are stable. */
function tokenOrder(first: TokenRef, second: TokenRef): number {
  const rank = (token: TokenRef) => (token.name.startsWith('theme/') ? 0 : 1)
  return rank(first) - rank(second) || first.name.localeCompare(second.name)
}

function push<K>(map: Map<K, TokenRef[]>, key: K, token: TokenRef): void {
  const list = map.get(key) ?? []
  list.push(token)
  map.set(key, list)
}

function cssName(variable: Variable): string | null {
  const web = variable.codeSyntax?.WEB
  return web ? web.replace(/^var\((.*)\)$/, '$1') : null
}

/** First family of a CSS font stack: `"Archivo", Arial, sans-serif` → `Archivo`. */
export function firstFontFamily(stack: string): string {
  return (stack.split(',')[0] ?? '').replace(/['"]/g, '').trim()
}

function indexTokens(graph: SceneGraph) {
  const colors = new Map<string, TokenRef[]>()
  const numbers: AltitudeFacts['numbers'] = {
    spacing: new Map(),
    radius: new Map(),
    fontSize: new Map(),
    lineHeight: new Map()
  }
  const fontFamilies = new Map<string, string>()
  for (const variable of graph.variables.values()) {
    const token = { name: variable.name, css: cssName(variable) }
    const value = graph.resolveVariable(variable.id)
    if (variable.type === 'COLOR' && value && typeof value === 'object' && 'r' in value) {
      push(colors, colorKey(value), token)
    } else if (variable.type === 'FLOAT' && typeof value === 'number') {
      for (const [kind, pattern] of NUMERIC_KINDS) {
        if (pattern.test(variable.name)) push(numbers[kind], value, token)
      }
    } else if (
      variable.type === 'STRING' &&
      typeof value === 'string' &&
      /(^|\/)font-family(\/|$)/.test(variable.name)
    ) {
      const family = firstFontFamily(value)
      if (family && !fontFamilies.has(family.toLowerCase()))
        fontFamilies.set(family.toLowerCase(), family)
    }
  }
  for (const list of colors.values()) list.sort(tokenOrder)
  for (const map of Object.values(numbers)) for (const list of map.values()) list.sort(tokenOrder)
  return { colors, numbers, fontFamilies }
}

const CemSchema = v.looseObject({
  modules: v.array(
    v.looseObject({
      declarations: v.optional(
        v.array(
          v.looseObject({
            tagName: v.optional(v.string()),
            attributes: v.optional(
              v.array(
                v.looseObject({
                  name: v.string(),
                  type: v.optional(v.looseObject({ text: v.optional(v.string()) }))
                })
              )
            )
          })
        )
      )
    })
  )
})

/** `'sm' | 'md'` → `['sm', 'md']`; null when any member is not a string literal. */
export function literalOptions(type: string | null): string[] | null {
  if (!type) return null
  const members = type
    .split('|')
    .map((member) => member.trim())
    .filter((member) => member !== 'undefined' && member !== 'null')
  const values: string[] = []
  for (const member of members) {
    const literal = /^'([^']*)'$|^"([^"]*)"$/.exec(member)
    if (!literal) return null
    values.push(literal[1] || literal[2] || '')
  }
  return values.length > 0 ? values : null
}

async function readAttributes(root: string): Promise<AltitudeFacts['attributes']> {
  const file = join(root, CEM_FILE)
  const attributes: AltitudeFacts['attributes'] = new Map()
  if (!existsSync(file)) return attributes
  const cem = v.parse(CemSchema, JSON.parse(await readFile(file, 'utf8')))
  for (const module of cem.modules) {
    for (const declaration of module.declarations ?? []) {
      if (!declaration.tagName) continue
      const facts = new Map<string, AttributeFact>()
      for (const attribute of declaration.attributes ?? []) {
        const type = attribute.type?.text ?? null
        facts.set(attribute.name, { name: attribute.name, type, values: literalOptions(type) })
      }
      attributes.set(declaration.tagName, facts)
    }
  }
  return attributes
}

const ContractHeadSchema = v.looseObject({ id: v.string(), name: v.optional(v.string()) })

async function readContractFiles(root: string, project: string): Promise<Map<string, unknown>> {
  const dir = join(root, CONTRACTS_DIR, project)
  const contracts = new Map<string, unknown>()
  if (!existsSync(dir)) return contracts
  for (const file of (await readdir(dir))
    .filter((name) => name.endsWith('.contract.json'))
    .sort()) {
    const raw: unknown = JSON.parse(await readFile(join(dir, file), 'utf8'))
    const head = v.safeParse(ContractHeadSchema, raw)
    if (head.success) contracts.set(head.output.id, raw)
  }
  return contracts
}

export interface AltitudeFactsInput {
  root: string
  /** A graph holding the Altitude variables (other content is ignored). */
  variables: SceneGraph
  contracts: Map<string, unknown>
  attributes: AltitudeFacts['attributes']
}

/** Index tokens and components; `loadAltitudeFacts` reads the inputs from a checkout. */
export function createAltitudeFacts(input: AltitudeFactsInput): AltitudeFacts {
  const components = new Map<string, AltitudeComponent>()
  for (const [tag, raw] of input.contracts) {
    const head = v.safeParse(ContractHeadSchema, raw)
    const component = { tag, name: head.success ? (head.output.name ?? tag) : tag }
    components.set(normalizeComponentName(tag), component)
    if (!components.has(normalizeComponentName(component.name)))
      components.set(normalizeComponentName(component.name), component)
  }
  return { ...input, ...indexTokens(input.variables), components }
}

export async function loadAltitudeFacts(
  root: string,
  options: { project?: string } = {}
): Promise<AltitudeFacts> {
  const paths = altitudePaths(root)
  const variables = new SceneGraph()
  importDesignTokens(variables, await readTokenTree(paths.tokens), await readAltitudePreset())
  return createAltitudeFacts({
    root: paths.root,
    variables,
    contracts: await readContractFiles(paths.root, options.project ?? 'altitude'),
    attributes: await readAttributes(paths.root)
  })
}
