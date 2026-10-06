import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import * as v from 'valibot'

/**
 * The subset of Altitude's code contract (`.altitude/contracts/contract.schema.json`) the
 * library builder reads. Contracts are generated and schema-checked on the Altitude side;
 * this validates only the shape this module depends on, loosely, so new contract fields
 * never break the build.
 */

export const CONTRACTS_DIR = '.altitude/contracts'
export const CEM_FILE = 'libs/al-web-components/custom-elements.json'
export const REACT_COMPONENTS_DIR = 'libs/al-react/src/components'

const TokenBindingSchema = v.looseObject({
  code: v.optional(v.nullable(v.string())),
  figma: v.optional(v.nullable(v.string()))
})
export type TokenBinding = v.InferOutput<typeof TokenBindingSchema>

export interface AnatomyNode {
  tag: string
  cls?: string | null
  component?: string
  text?: string
  box?: { w?: number; h?: number }
  fsPx?: number
  lhPx?: number
  ffCss?: string
  fwCss?: string
  layout?: {
    display?: string
    direction?: string
    align?: string
    justify?: string
    fillInline?: boolean
  } | null
  tokens?: Record<string, TokenBinding>
  children?: AnatomyNode[]
}

const AnatomyNodeSchema: v.GenericSchema<AnatomyNode> = v.looseObject({
  tag: v.string(),
  cls: v.optional(v.nullable(v.string())),
  component: v.optional(v.string()),
  text: v.optional(v.string()),
  box: v.optional(v.looseObject({ w: v.optional(v.number()), h: v.optional(v.number()) })),
  fsPx: v.optional(v.number()),
  lhPx: v.optional(v.number()),
  ffCss: v.optional(v.string()),
  fwCss: v.optional(v.string()),
  layout: v.optional(
    v.nullable(
      v.looseObject({
        display: v.optional(v.string()),
        direction: v.optional(v.string()),
        align: v.optional(v.string()),
        justify: v.optional(v.string()),
        fillInline: v.optional(v.boolean())
      })
    )
  ),
  tokens: v.optional(v.record(v.string(), TokenBindingSchema)),
  children: v.optional(v.array(v.lazy(() => AnatomyNodeSchema)))
})

const FigmaPropBindingSchema = v.looseObject({
  kind: v.optional(v.string()),
  property: v.optional(v.string()),
  options: v.optional(v.array(v.string())),
  pairWith: v.optional(v.string()),
  omit: v.optional(v.boolean()),
  axis: v.optional(v.boolean())
})

const PropSchema = v.looseObject({
  name: v.string(),
  type: v.string(),
  values: v.optional(v.array(v.string())),
  default: v.optional(v.unknown()),
  bindings: v.optional(
    v.looseObject({
      code: v.optional(v.nullable(v.looseObject({ attribute: v.optional(v.string()) }))),
      figma: v.optional(v.nullable(FigmaPropBindingSchema))
    })
  )
})
export type ContractProp = v.InferOutput<typeof PropSchema>

const SlotSchema = v.looseObject({
  name: v.string(),
  figmaPlaceholder: v.optional(v.string()),
  figmaAxis: v.optional(v.boolean()),
  figmaOmit: v.optional(v.boolean())
})
export type ContractSlot = v.InferOutput<typeof SlotSchema>

const ContractSchema = v.looseObject({
  id: v.string(),
  name: v.string(),
  version: v.optional(v.string()),
  props: v.optional(v.array(PropSchema), []),
  slots: v.optional(v.array(SlotSchema), []),
  events: v.optional(v.array(v.looseObject({ name: v.string() })), []),
  states: v.optional(v.array(v.string()), []),
  anatomySource: v.optional(v.string()),
  anatomyCase: v.optional(v.nullable(v.string())),
  anatomy: v.optional(
    v.nullable(
      v.looseObject({
        root: AnatomyNodeSchema,
        cases: v.optional(v.array(v.looseObject({ case: v.string(), root: AnatomyNodeSchema }))),
        stateOverrides: v.optional(
          v.record(v.string(), v.record(v.string(), v.record(v.string(), TokenBindingSchema)))
        )
      })
    )
  ),
  conditionalBindings: v.optional(v.nullable(v.record(v.string(), v.unknown()))),
  a11y: v.optional(v.looseObject({ cssParts: v.optional(v.array(v.string())) })),
  bindings: v.optional(
    v.looseObject({
      code: v.optional(
        v.nullable(
          v.looseObject({
            importPath: v.optional(v.string()),
            tagName: v.optional(v.string()),
            workspace: v.optional(v.string())
          })
        )
      )
    })
  )
})
export type CodeContract = v.InferOutput<typeof ContractSchema>

export interface ContractIssue {
  file: string
  message: string
}

export interface ContractSet {
  contracts: CodeContract[]
  issues: ContractIssue[]
}

/** Every `<tag>.contract.json` for one Altitude project, sorted by tag. */
export async function readContracts(root: string, project = 'altitude'): Promise<ContractSet> {
  const dir = join(root, CONTRACTS_DIR, project)
  if (!existsSync(dir)) throw new Error(`Contract directory not found: ${dir}`)
  const files = (await readdir(dir)).filter((file) => file.endsWith('.contract.json')).sort()
  const contracts: CodeContract[] = []
  const issues: ContractIssue[] = []
  for (const file of files) {
    const parsed = v.safeParse(ContractSchema, JSON.parse(await readFile(join(dir, file), 'utf8')))
    if (parsed.success) contracts.push(parsed.output)
    else issues.push({ file, message: v.summarize(parsed.issues) })
  }
  return { contracts, issues }
}

const CemSchema = v.looseObject({
  modules: v.array(
    v.looseObject({
      path: v.optional(v.string()),
      declarations: v.optional(
        v.array(
          v.looseObject({
            tagName: v.optional(v.string()),
            events: v.optional(v.array(v.looseObject({ name: v.optional(v.string()) }))),
            cssParts: v.optional(v.array(v.looseObject({ name: v.string() })))
          })
        )
      )
    })
  )
})

export interface CemElement {
  tagName: string
  modulePath: string | null
  events: string[]
  parts: string[]
}

/** Custom elements by tag from the Custom Elements Manifest. */
export async function readCustomElements(root: string): Promise<Map<string, CemElement>> {
  const file = join(root, CEM_FILE)
  if (!existsSync(file)) {
    throw new Error(
      `Custom Elements Manifest not found: ${file}\nBuild it: pnpm --filter @southleft/al-web-components build:custom-elements.json`
    )
  }
  const cem = v.parse(CemSchema, JSON.parse(await readFile(file, 'utf8')))
  const elements = new Map<string, CemElement>()
  for (const module of cem.modules) {
    for (const declaration of module.declarations ?? []) {
      if (!declaration.tagName) continue
      elements.set(declaration.tagName, {
        tagName: declaration.tagName,
        modulePath: module.path ?? null,
        events: (declaration.events ?? []).flatMap((event) => (event.name ? [event.name] : [])),
        parts: (declaration.cssParts ?? []).map((part) => part.name)
      })
    }
  }
  return elements
}

/**
 * React wrapper component names exported by `@southleft/al-react`, read from its component
 * sources (`export const ALButton = createComponent(...)`). Empty when the package is absent.
 */
export async function readReactComponents(root: string): Promise<Set<string>> {
  const dir = join(root, REACT_COMPONENTS_DIR)
  const names = new Set<string>()
  if (!existsSync(dir)) return names
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    for (const file of await readdir(join(dir, entry.name))) {
      if (!file.endsWith('.tsx')) continue
      const source = await readFile(join(dir, entry.name, file), 'utf8')
      for (const match of source.matchAll(/export const (AL[A-Za-z0-9]+)\s*=\s*createComponent/g)) {
        names.add(match[1])
      }
    }
  }
  return names
}
