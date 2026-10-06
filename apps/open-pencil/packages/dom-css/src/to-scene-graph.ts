import { SceneGraph, type SceneNode } from '@open-pencil/scene-graph'

import { applyElementStyle, applyTextStyle, hasBoxStyle } from './apply-css'
import { mergedStyle } from './css-values'
import {
  RESTORABLE_NODE_TYPES,
  applyDesignFactToNode,
  designFactFromAttrs
} from './design-fact'
import type {
  DesignDocument,
  DesignElement,
  DesignFact,
  DesignNode,
  DesignStyleDeclaration
} from './types'

/**
 * A node type we refuse to restore, and why. Restoring the type is normally strictly
 * more faithful than flattening to FRAME, but a CANVAS cannot be a child of anything —
 * recreating one inside a page would produce a structurally invalid graph.
 */
const UNRESTORABLE_TYPES: Record<string, string> = {
  CANVAS: 'a canvas cannot be nested inside a page',
  DOCUMENT: 'the document root is created by the graph itself'
}

/** Design facts the last import could not honour. Named, never silent. */
export interface ImportDegradation {
  nodeName: string
  fact: string
  reason: string
}

let degradations: ImportDegradation[] = []

/** Degradations recorded by the most recent `designDocumentToSceneGraph` call. */
export function lastImportDegradations(): readonly ImportDegradation[] {
  return degradations
}

/** The design fact for an element: the typed field if present, else the attributes. */
function resolveDesignFact(element: DesignElement): DesignFact | undefined {
  return element.design ?? designFactFromAttrs(element.attrs)
}

export interface DesignDocumentToSceneGraphOptions {
  pageName?: string
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
  graph: SceneGraph,
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

function createElementNode(graph: SceneGraph, parentId: string, element: DesignElement): SceneNode {
  const style = mergedStyle(element)
  const elementFact = resolveDesignFact(element)

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
    return createTextNode(graph, parentId, textContent(element), style, elementFact)
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
      degradations.push({ nodeName: name, fact: `nodeType=${fact.nodeType}`, reason: refusal })
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
    createDesignNode(graph, node.id, child, style)
  }

  return node
}

function createDesignNode(
  graph: SceneGraph,
  parentId: string,
  node: DesignNode,
  inheritedStyle: DesignStyleDeclaration = {}
): SceneNode | null {
  if (node.type === 'text') {
    if (node.text.trim().length === 0) return null
    return createTextNode(graph, parentId, node.text, inheritedStyle)
  }

  return createElementNode(graph, parentId, node)
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
 *  2. The design facts themselves — each ref carries id and name, so an HTML-only
 *     document can still rebuild variable identity. Values live in the CSS custom
 *     properties and are not recovered here, which is recorded as a degradation.
 */
function restoreVariables(graph: SceneGraph, document: DesignDocument): void {
  const source = document.sourceGraph
  if (source) {
    for (const [id, variable] of source.variables) graph.variables.set(id, variable)
    for (const [id, collection] of source.variableCollections) {
      graph.variableCollections.set(id, collection)
    }
    for (const [id, modeId] of source.activeMode) graph.activeMode.set(id, modeId)
    return
  }

  // HTML-only path: synthesise identity from the refs actually referenced.
  const seen = new Map<string, string>()
  const visit = (node: DesignNode): void => {
    if (node.type !== 'element') return
    const fact = resolveDesignFact(node)
    for (const [, ref] of Object.entries(fact?.boundVariables ?? {})) {
      if (ref.id && !seen.has(ref.id)) seen.set(ref.id, ref.name ?? ref.id)
    }
    for (const child of node.children) visit(child)
  }
  for (const child of document.children) visit(child)
  if (seen.size === 0) return

  const collectionId = 'recovered-from-markup'
  const modeId = 'recovered-default'
  graph.variableCollections.set(collectionId, {
    id: collectionId,
    name: 'Recovered from markup',
    modes: [{ modeId, name: 'Default' }],
    defaultModeId: modeId,
    variableIds: [...seen.keys()]
  })
  graph.activeMode.set(collectionId, modeId)
  for (const [id, name] of seen) {
    graph.variables.set(id, {
      id,
      name,
      type: 'COLOR',
      collectionId,
      valuesByMode: {},
      description: 'Recovered from data-op-vars; value not carried in markup.',
      hiddenFromPublishing: false
    })
  }
  degradations.push({
    nodeName: '(document)',
    fact: `${seen.size} variable definitions`,
    reason: 'rebuilt from markup refs — identity and name only, values live in the CSS'
  })
}

export function designDocumentToSceneGraph(
  document: DesignDocument,
  options: DesignDocumentToSceneGraphOptions = {}
): SceneGraph {
  degradations = []
  const graph = new SceneGraph()
  const page = graph.getPages().find((node) => node.type === 'CANVAS') ?? graph.addPage('DesignDOM')

  page.name = options.pageName ?? 'DesignDOM'

  restoreVariables(graph, document)

  for (const child of document.children) {
    createDesignNode(graph, page.id, child)
  }

  fitPageToChildren(page, graph)
  return graph
}

export type { DesignDocumentToSceneGraphOptions as ToSceneGraphOptions }
