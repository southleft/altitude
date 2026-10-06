import {
  codeBindingOwner,
  type CodeBinding,
  type SceneGraph,
  type SceneNode
} from '@open-pencil/scene-graph'

/**
 * OpenPencil scene graph → Altitude canvas contract (`.altitude/contracts/canvas-contract.schema.json`).
 *
 * The schema was written for Figma-observed sets and forbids extra fields, so OpenPencil
 * identifiers go where Figma ones would: `figma.fileKey` is `open-pencil:<library id>` and
 * `figma.nodeId` is the set's stable `componentKey` (node ids are re-minted on every build).
 * Both choices are stated in `degradations`. Unlike a Figma read, `bindings.code` is filled
 * from the set's code binding, which the schema allows.
 *
 * Token lists hold variable NAMES (`theme/color/background/primary-default`), the same side
 * of a binding the Figma extractor reports, so Altitude's `diffContracts()` runs unchanged.
 */

export interface CanvasNode {
  name: string
  type: string
  textStyle?: string | null
  boundVariables: Record<string, string | null>
  children: CanvasNode[]
}

export interface CanvasContract {
  $schema: string
  component: string
  figma: { name: string | null; nodeId: string | null; fileKey: string | null }
  variantAxes: Array<{ name: string; values: string[] }>
  componentProperties: Array<{ name: string; type: string; values: string[] | null }>
  states: string[]
  textStyles: string[]
  tokens: string[]
  tokensOwn: string[]
  tokensNested: Record<string, string[]>
  anatomySource: 'observed' | 'unavailable'
  anatomyCase: string | null
  anatomy: CanvasNode | null
  bindings: {
    code: { tagName: string; importPath?: string; react?: string } | null
    figma: {
      fileKey: string | null
      componentSetName: string | null
      nodeId: string | null
      url: string | null
    }
  }
  degradations: string[]
}

export interface EmitCanvasOptions {
  libraryId?: string
  schemaPath?: string
}

const STATE_NAMES = ['hover', 'focus', 'active', 'disabled']
const TAG = /^al-[a-z0-9-]+$/

const fieldName = (field: string): string =>
  field.replace(/\/(\d+)\//g, '[$1].').replace(/\//g, '.')

function variableName(graph: SceneGraph, id: string): string {
  return graph.variables.get(id)?.name ?? id
}

function nestedTag(graph: SceneGraph, node: SceneNode): string | null {
  if (node.type !== 'INSTANCE') return null
  const tag = codeBindingOwner(graph, node)?.codeBinding?.tagName
  return tag && TAG.test(tag) ? tag : null
}

function canvasNode(graph: SceneGraph, node: SceneNode): CanvasNode {
  const boundVariables: Record<string, string | null> = {}
  for (const [field, id] of Object.entries(node.boundVariables).sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    boundVariables[fieldName(field)] = variableName(graph, id)
  }
  return {
    name: node.name,
    type: node.type,
    ...(node.type === 'TEXT' ? { textStyle: textStyleName(graph, node) } : {}),
    boundVariables,
    children: graph.getChildren(node.id).map((child) => canvasNode(graph, child))
  }
}

function textStyleName(graph: SceneGraph, node: SceneNode): string | null {
  if (!node.textStyleId) return null
  return graph.getNode(node.textStyleId)?.name ?? null
}

function collect(
  graph: SceneGraph,
  node: SceneNode,
  own: Set<string>,
  nested: Map<string, Set<string>>,
  textStyles: Set<string>,
  owner: string | null
): void {
  const tag = owner ?? nestedTag(graph, node)
  const target = tag ? (nested.get(tag) ?? nested.set(tag, new Set()).get(tag)) : own
  for (const id of Object.values(node.boundVariables)) target?.add(variableName(graph, id))
  const style = node.type === 'TEXT' ? textStyleName(graph, node) : null
  if (style && !tag) textStyles.add(style)
  for (const child of graph.getChildren(node.id))
    collect(graph, child, own, nested, textStyles, tag)
}

function defaultVariant(graph: SceneGraph, set: SceneNode): SceneNode | undefined {
  const variants = graph.getChildren(set.id).filter((child) => child.type === 'COMPONENT')
  const defaults = Object.fromEntries(
    set.componentPropertyDefinitions
      .filter((definition) => definition.type === 'VARIANT')
      .map((definition) => [definition.name, definition.defaultValue])
  )
  return (
    variants.find((variant) =>
      Object.entries(defaults).every(
        ([name, value]) => variant.componentPropertyValues[name] === value
      )
    ) ?? variants[0]
  )
}

/** The code facts a canvas generated from code can state, unlike a Figma read. */
function codeFacts(binding: CodeBinding): NonNullable<CanvasContract['bindings']['code']> {
  const facts: NonNullable<CanvasContract['bindings']['code']> = { tagName: binding.tagName }
  if (binding.importPath) facts.importPath = binding.importPath
  if (binding.react) facts.react = `${binding.react.importPath}#${binding.react.component}`
  return facts
}

export function canvasContractForSet(
  graph: SceneGraph,
  set: SceneNode,
  options: EmitCanvasOptions = {}
): CanvasContract | null {
  const binding = set.codeBinding
  if (!binding || !TAG.test(binding.tagName)) return null
  const fileKey = `open-pencil:${options.libraryId ?? 'altitude'}`
  const componentProperties = set.componentPropertyDefinitions
    .map((definition) => ({
      name: definition.name,
      type: definition.type,
      values: definition.variantOptions?.length ? [...definition.variantOptions].sort() : null
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
  const variantAxes = componentProperties
    .filter((property) => property.type === 'VARIANT')
    .map((property) => ({ name: property.name, values: property.values ?? [] }))
  const stateAxis = variantAxes.find((axis) => axis.name.toLowerCase() === 'state')
  const states = stateAxis
    ? STATE_NAMES.filter((state) => stateAxis.values.some((value) => value.toLowerCase() === state))
    : []

  const own = new Set<string>()
  const nested = new Map<string, Set<string>>()
  const textStyles = new Set<string>()
  for (const variant of graph.getChildren(set.id)) {
    collect(graph, variant, own, nested, textStyles, null)
  }
  const sample = defaultVariant(graph, set)
  const anatomy = sample ? canvasNode(graph, sample) : null
  const sampleTokens = new Set<string>()
  if (sample) collect(graph, sample, sampleTokens, new Map(), new Set(), null)

  const degradations = [
    `figma — OpenPencil canvas, not Figma: figma.fileKey is "${fileKey}" and figma.nodeId is the component set's stable componentKey; OpenPencil node ids are re-minted on every library build.`,
    "events, slots — the canvas carries them in the component set's code binding (see bindings.code); this schema has no field for them.",
    'a11y.{ariaAttributes,cssParts} — ARIA attributes and CSS parts are code (CEM) facts; no accessibility read is performed from canvas.',
    'semantics.role — no accessibility-tree read is performed from canvas.',
    'anatomy.*.tokens — tokens are listed as variable NAMES; the `--al-*` name of each variable is its codeSyntax.WEB in the document, not repeated here.'
  ]
  if (!states.length) degradations.push('states — no "State" variant axis found on this set.')

  return {
    $schema: options.schemaPath ?? '../canvas-contract.schema.json',
    component: binding.tagName,
    figma: { name: set.name, nodeId: set.componentKey, fileKey },
    variantAxes,
    componentProperties,
    states,
    textStyles: [...textStyles].sort(),
    tokens: [...sampleTokens].sort(),
    tokensOwn: [...own].sort(),
    tokensNested: Object.fromEntries(
      [...nested]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([tag, names]) => [tag, [...names].sort()])
    ),
    anatomySource: anatomy ? 'observed' : 'unavailable',
    anatomyCase: sample?.name ?? null,
    anatomy,
    bindings: {
      code: codeFacts(binding),
      figma: { fileKey, componentSetName: set.name, nodeId: set.componentKey, url: null }
    },
    degradations
  }
}

/** One canvas contract per code-bound component set in the graph, sorted by tag. */
export function emitCanvasContracts(
  graph: SceneGraph,
  options: EmitCanvasOptions = {}
): CanvasContract[] {
  const contracts: CanvasContract[] = []
  for (const node of graph.getAllNodes()) {
    if (node.type !== 'COMPONENT_SET') continue
    const contract = canvasContractForSet(graph, node, options)
    if (contract) contracts.push(contract)
  }
  return contracts.sort((a, b) => a.component.localeCompare(b.component))
}
