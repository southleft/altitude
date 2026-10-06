import { SceneGraph, type SceneNode } from '@open-pencil/scene-graph'

import { applyElementStyle, applyTextStyle, hasBoxStyle } from './apply-css'
import { mergedStyle } from './css-values'
import { RESTORABLE_NODE_TYPES, applyDesignFactToNode, designFactFromAttrs } from './design-fact'
import type {
  DesignDocument,
  DesignElement,
  DesignFact,
  DesignNode,
  DesignStyleDeclaration
} from './types'
import { VariableRecovery } from './variable-recovery'

/**
 * A node type we refuse to restore, and why. Restoring the type is normally strictly
 * more faithful than flattening to FRAME, but a CANVAS cannot be a child of anything —
 * recreating one inside a page would produce a structurally invalid graph.
 */
const UNRESTORABLE_TYPES: Record<string, string> = {
  CANVAS: 'a canvas cannot be nested inside a page',
  DOCUMENT: 'the document root is created by the graph itself'
}

/** A design fact an import could not honour. Named, never silent. */
export interface ImportDegradation {
  nodeName: string
  fact: string
  reason: string
}

export interface DesignDocumentToSceneGraphOptions {
  pageName?: string
  /**
   * Receives every degradation this import records: refused node types, invalid markup
   * facts, variables rebuilt without values. Owned by the caller, so concurrent imports
   * never share a report.
   */
  degradations?: ImportDegradation[]
}

/** Per-call state. Nothing about one import may leak into another. */
interface ImportContext {
  graph: SceneGraph
  degradations: ImportDegradation[]
  facts: WeakMap<DesignElement, DesignFact | null>
}

function elementName(element: DesignElement): string {
  return element.attrs['data-op-name'] || element.attrs.id || element.attrs.class || element.tagName
}

/**
 * The design fact for an element: the typed field if present, else the attributes. Parsed
 * once per element, so markup issues are reported once however often the fact is read.
 */
function resolveDesignFact(ctx: ImportContext, element: DesignElement): DesignFact | undefined {
  const cached = ctx.facts.get(element)
  if (cached !== undefined) return cached ?? undefined
  const fact =
    element.design ??
    designFactFromAttrs(element.attrs, ({ fact: label, reason }) =>
      ctx.degradations.push({ nodeName: elementName(element), fact: label, reason })
    )
  ctx.facts.set(element, fact ?? null)
  return fact
}

function textContent(node: DesignNode): string {
  if (node.type === 'text') return node.text
  return node.children.map(textContent).join('')
}

function isTextLikeElement(node: DesignElement): boolean {
  return [
    'span',
    'p',
    'label',
    'strong',
    'em',
    'button',
    'a',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6'
  ].includes(node.tagName.toLowerCase())
}

function createTextNode(
  { graph }: ImportContext,
  parentId: string,
  text: string,
  style: DesignStyleDeclaration,
  fact?: DesignFact
) {
  const node = graph.createNode('TEXT', parentId, {
    name: text.slice(0, 32) || 'Text',
    text,
    width: Math.max(text.length * 8, 1),
    height: 20
  })
  applyTextStyle(node, style)
  applyDesignFactToNode(node, fact)
  return node
}

function createElementNode(
  ctx: ImportContext,
  parentId: string,
  element: DesignElement
): SceneNode {
  const { graph } = ctx
  const style = mergedStyle(element)
  const elementFact = resolveDesignFact(ctx, element)

  /**
   * A design fact saying `nodeType: TEXT` is authoritative.
   *
   * The heuristic below asks whether an element *looks* like text — and a text node that
   * carries its own width/height trips `hasBoxStyle`, so it used to fall through to the
   * container branch. That produced two nodes for one: an outer TEXT with no text styling
   * and an inner TEXT holding the content. It cost every text metric in the document
   * (lineHeight 0% survival on 2,216 nodes) and inflated the node count.
   */
  const isTextByFact = elementFact?.nodeType === 'TEXT'
  const looksLikeText =
    isTextLikeElement(element) &&
    !hasBoxStyle(style) &&
    element.children.every((child) => child.type === 'text')

  if (isTextByFact || looksLikeText) {
    return createTextNode(ctx, parentId, textContent(element), style, elementFact)
  }

  const fact = elementFact
  const name = element.attrs.id || element.attrs.class || element.tagName

  // Restore what the node IS. Falling back to FRAME is the old behaviour and collapsed
  // every type in the document; it is now the exception, and a named one.
  let nodeType: SceneNode['type'] = 'FRAME'
  if (fact?.nodeType) {
    const refusal =
      UNRESTORABLE_TYPES[fact.nodeType] ??
      (RESTORABLE_NODE_TYPES.has(fact.nodeType)
        ? undefined
        : 'not a known scene node type — markup may be hand-edited or from another tool')
    if (refusal) {
      ctx.degradations.push({
        nodeName: name,
        fact: `nodeType=${fact.nodeType}`,
        reason: refusal
      })
    } else {
      nodeType = fact.nodeType as SceneNode['type']
    }
  }

  const node = graph.createNode(nodeType, parentId, {
    name,
    clipsContent: false
  })
  applyElementStyle(graph, node, element, style)
  applyDesignFactToNode(node, fact)

  for (const child of element.children) {
    createDesignNode(ctx, node.id, child, style)
  }

  return node
}

function createDesignNode(
  ctx: ImportContext,
  parentId: string,
  node: DesignNode,
  inheritedStyle: DesignStyleDeclaration = {}
): SceneNode | null {
  if (node.type === 'text') {
    if (node.text.trim().length === 0) return null
    return createTextNode(ctx, parentId, node.text, inheritedStyle)
  }

  return createElementNode(ctx, parentId, node)
}

function fitPageToChildren(page: SceneNode, graph: SceneGraph): void {
  const children = graph.getChildren(page.id)
  if (children.length === 0) return
  page.width = Math.max(...children.map((child) => child.x + child.width))
  page.height = Math.max(...children.map((child) => child.y + child.height))
}

/**
 * Restore the variable tables the bindings point at.
 *
 * A `boundVariables` entry is only half a fact: without a variable of that id in the
 * graph, the binding resolves to nothing. Two sources, in order of fidelity:
 *
 *  1. `document.sourceGraph` — present on the in-memory path, fully lossless.
 *  2. The design facts themselves — each ref carries id and name, the bound field implies
 *     the type, and the `var(--x, literal)` fallback carries the value where one was written.
 *     Variables without a recoverable value are recorded as a degradation.
 */
function restoreVariables(ctx: ImportContext, document: DesignDocument): void {
  const { graph } = ctx
  const source = document.sourceGraph
  if (source) {
    for (const [id, variable] of source.variables) graph.variables.set(id, variable)
    for (const [id, collection] of source.variableCollections) {
      graph.variableCollections.set(id, collection)
    }
    for (const [id, modeId] of source.activeMode) graph.activeMode.set(id, modeId)
    return
  }

  const recovery = new VariableRecovery()
  const visit = (node: DesignNode): void => {
    if (node.type !== 'element') return
    recovery.visit(node, resolveDesignFact(ctx, node))
    for (const child of node.children) visit(child)
  }
  for (const child of document.children) visit(child)

  const { variables, withValues } = recovery.restoreInto(graph)
  if (variables === 0) return
  ctx.degradations.push({
    nodeName: '(document)',
    fact: `${variables} variable definitions`,
    reason:
      withValues === variables
        ? 'rebuilt from markup refs — single mode, values from CSS fallbacks'
        : `rebuilt from markup refs — ${variables - withValues} without a CSS fallback value`
  })
}

export function designDocumentToSceneGraph(
  document: DesignDocument,
  options: DesignDocumentToSceneGraphOptions = {}
): SceneGraph {
  const graph = new SceneGraph()
  const ctx: ImportContext = {
    graph,
    degradations: options.degradations ?? [],
    facts: new WeakMap()
  }
  const page = graph.getPages().find((node) => node.type === 'CANVAS') ?? graph.addPage('DesignDOM')

  page.name = options.pageName ?? 'DesignDOM'

  restoreVariables(ctx, document)

  for (const child of document.children) {
    createDesignNode(ctx, page.id, child)
  }

  fitPageToChildren(page, graph)
  return graph
}

export type { DesignDocumentToSceneGraphOptions as ToSceneGraphOptions }
