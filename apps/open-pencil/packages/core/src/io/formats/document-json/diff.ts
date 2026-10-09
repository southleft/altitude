import { isEqualWith } from 'es-toolkit'

import { codeBindingOwner } from '@open-pencil/scene-graph'
import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'

import { encodeValue, type JSONValue } from './codec'

/**
 * Structural diff of two OpenPencil documents, keyed by node id.
 *
 * Node ids are stable in the document-json format, so a node that exists on both sides is
 * the same layer, edited or not. The result is deterministic: pages follow the head
 * document's order (removed pages last, in base order), and nodes follow tree order.
 *
 * Renderer caches and derived geometry are ignored; everything else a node owns is
 * compared, so an edit that survives a save shows up here.
 */

/**
 * Fields that are caches, derived from other fields, or bookkeeping (`source` records which
 * imported fields were edited), never a design edit on their own.
 */
export const DIFF_IGNORED_FIELDS: ReadonlySet<string> = new Set([
  'id',
  'type',
  'childIds',
  'source',
  'textPicture',
  'derivedTextGlyphs',
  'derivedLayout',
  'derivedSymbolData',
  'derivedSymbolDataLayoutVersion',
  'fillGeometry',
  'strokeGeometry'
])

/** Values longer than this (as JSON) are reported as changed without the values. */
const MAX_INLINE_VALUE_LENGTH = 120

export type DiffStatus = 'added' | 'removed' | 'changed'

export interface DiffNodeRef {
  id: string
  name: string
  type: string
  /** Layer names from the page (exclusive) down to the node (inclusive). */
  path: string[]
}

export interface DiffPropertyChange {
  field: string
  /** Absent when the value is too large to inline; `complex` is then true. */
  before?: JSONValue
  after?: JSONValue
  complex?: true
}

export interface DiffChangedNode extends DiffNodeRef {
  /** Set when the node changed type (a detached instance becomes a FRAME). */
  typeBefore?: string
  changes: DiffPropertyChange[]
}

export interface DiffTokenBinding extends DiffNodeRef {
  field: string
  /** Variable name when the document defines it, else the variable id. */
  variable: string
}

export interface DiffInstance extends DiffNodeRef {
  /** Code tag (`al-button`) when the component is code-bound, else the component name. */
  component: string
}

export interface PageDiff {
  id: string
  name: string
  status: DiffStatus
  /** Internal pages hold library definitions; they are not shown to designers. */
  internal: boolean
  nodes: {
    /** Roots of added subtrees; `addedCount` counts every added node. */
    added: DiffNodeRef[]
    removed: DiffNodeRef[]
    changed: DiffChangedNode[]
    addedCount: number
    removedCount: number
  }
  tokenBindings: { added: DiffTokenBinding[]; removed: DiffTokenBinding[] }
  instances: { added: DiffInstance[]; removed: DiffInstance[]; detached: DiffInstance[] }
  /** Ids of top-level components and component sets whose subtree changed. */
  changedComponents: string[]
}

export interface DocumentDiffSummary {
  pagesAdded: number
  pagesRemoved: number
  pagesChanged: number
  nodesAdded: number
  nodesRemoved: number
  nodesChanged: number
  tokenBindingsAdded: number
  tokenBindingsRemoved: number
  instancesAdded: number
  instancesRemoved: number
  instancesDetached: number
  variablesAdded: number
  variablesRemoved: number
  variablesChanged: number
}

export interface DocumentDiff {
  changed: boolean
  summary: DocumentDiffSummary
  pages: PageDiff[]
  variables: { added: string[]; removed: string[]; changed: string[] }
}

interface PageIndex {
  page: SceneNode
  /** Node id → node, in tree order (pre-order). */
  nodes: Map<string, SceneNode>
}

function sameValue(first: unknown, second: unknown): boolean {
  return isEqualWith(first, second, (a, b) =>
    typeof a === 'number' && typeof b === 'number' ? Object.is(a, b) : undefined
  )
}

function indexPages(graph: SceneGraph | null): Map<string, PageIndex> {
  const pages = new Map<string, PageIndex>()
  if (!graph) return pages
  for (const page of graph.getPages(true)) {
    const nodes = new Map<string, SceneNode>()
    const stack = [...page.childIds].reverse()
    while (stack.length > 0) {
      const id = stack.pop()
      const node = id === undefined ? undefined : graph.nodes.get(id)
      if (!node || nodes.has(node.id)) continue
      nodes.set(node.id, node)
      for (let index = node.childIds.length - 1; index >= 0; index--)
        stack.push(node.childIds[index])
    }
    pages.set(page.id, { page, nodes })
  }
  return pages
}

function nodePath(graph: SceneGraph, node: SceneNode): string[] {
  const path: string[] = []
  for (
    let current: SceneNode | undefined = node;
    current && current.type !== 'CANVAS' && current.id !== graph.rootId;
    current = current.parentId ? graph.nodes.get(current.parentId) : undefined
  ) {
    path.unshift(current.name)
  }
  return path
}

function ref(graph: SceneGraph, node: SceneNode): DiffNodeRef {
  return { id: node.id, name: node.name, type: node.type, path: nodePath(graph, node) }
}

function inlineValue(value: unknown): JSONValue | undefined {
  const encoded = encodeValue(value)
  return JSON.stringify(encoded).length <= MAX_INLINE_VALUE_LENGTH ? encoded : undefined
}

function propertyChanges(before: SceneNode, after: SceneNode): DiffPropertyChange[] {
  const fields = new Set([...Object.keys(before), ...Object.keys(after)])
  const changes: DiffPropertyChange[] = []
  for (const field of [...fields].sort()) {
    if (DIFF_IGNORED_FIELDS.has(field)) continue
    const previous: unknown = Reflect.get(before, field)
    const next: unknown = Reflect.get(after, field)
    if (sameValue(previous, next)) continue
    const beforeValue = inlineValue(previous)
    const afterValue = inlineValue(next)
    if (beforeValue === undefined || afterValue === undefined)
      changes.push({ field, complex: true })
    else changes.push({ field, before: beforeValue, after: afterValue })
  }
  return changes
}

function componentLabel(graph: SceneGraph, node: SceneNode): string {
  const tag = codeBindingOwner(graph, node)?.codeBinding?.tagName
  if (tag) return tag
  const main = node.componentId ? graph.nodes.get(node.componentId) : undefined
  if (!main) return node.name
  const set = main.parentId ? graph.nodes.get(main.parentId) : undefined
  return set?.type === 'COMPONENT_SET' ? set.name : main.name
}

function instanceRef(graph: SceneGraph, node: SceneNode): DiffInstance {
  return { ...ref(graph, node), component: componentLabel(graph, node) }
}

function variableLabel(graph: SceneGraph, id: string): string {
  return graph.variables.get(id)?.name ?? id
}

function bindingChanges(
  baseGraph: SceneGraph | null,
  headGraph: SceneGraph | null,
  before: SceneNode | undefined,
  after: SceneNode | undefined
): { added: DiffTokenBinding[]; removed: DiffTokenBinding[] } {
  const added: DiffTokenBinding[] = []
  const removed: DiffTokenBinding[] = []
  const previous = before?.boundVariables ?? {}
  const next = after?.boundVariables ?? {}
  for (const field of Object.keys(next).sort()) {
    if (previous[field] === next[field] || !after || !headGraph) continue
    added.push({
      ...ref(headGraph, after),
      field,
      variable: variableLabel(headGraph, next[field])
    })
  }
  for (const field of Object.keys(previous).sort()) {
    if (previous[field] === next[field] || !before || !baseGraph) continue
    removed.push({
      ...ref(baseGraph, before),
      field,
      variable: variableLabel(baseGraph, previous[field])
    })
  }
  return { added, removed }
}

/** Nearest top-level COMPONENT or COMPONENT_SET containing `node` (itself included). */
function owningComponent(graph: SceneGraph, node: SceneNode): SceneNode | null {
  let found: SceneNode | null = null
  for (
    let current: SceneNode | undefined = node;
    current && current.type !== 'CANVAS';
    current = current.parentId ? graph.nodes.get(current.parentId) : undefined
  ) {
    if (current.type === 'COMPONENT_SET' || current.type === 'COMPONENT') found = current
  }
  return found
}

function hasAncestorIn(graph: SceneGraph, node: SceneNode, ids: ReadonlySet<string>): boolean {
  for (
    let current = node.parentId ? graph.nodes.get(node.parentId) : undefined;
    current && current.type !== 'CANVAS';
    current = current.parentId ? graph.nodes.get(current.parentId) : undefined
  ) {
    if (ids.has(current.id)) return true
  }
  return false
}

function insideInstance(graph: SceneGraph, node: SceneNode): boolean {
  for (
    let current = node.parentId ? graph.nodes.get(node.parentId) : undefined;
    current && current.type !== 'CANVAS';
    current = current.parentId ? graph.nodes.get(current.parentId) : undefined
  ) {
    if (current.type === 'INSTANCE') return true
  }
  return false
}

function emptyPageDiff(page: SceneNode, status: DiffStatus): PageDiff {
  return {
    id: page.id,
    name: page.name,
    status,
    internal: page.internalOnly,
    nodes: { added: [], removed: [], changed: [], addedCount: 0, removedCount: 0 },
    tokenBindings: { added: [], removed: [] },
    instances: { added: [], removed: [], detached: [] },
    changedComponents: []
  }
}

function pageStatus(before: PageIndex | undefined, after: PageIndex | undefined): DiffStatus {
  if (!before) return 'added'
  return after ? 'changed' : 'removed'
}

/** Accumulates one page's diff; `base`/`head` are null for a document that does not exist. */
class PageDiffer {
  readonly result: PageDiff
  private readonly components = new Set<string>()
  private readonly baseNodes: Map<string, SceneNode>
  private readonly headNodes: Map<string, SceneNode>
  private readonly addedIds: Set<string>
  private readonly removedIds: Set<string>

  constructor(
    private readonly base: SceneGraph | null,
    private readonly head: SceneGraph | null,
    private readonly before: PageIndex | undefined,
    private readonly after: PageIndex | undefined,
    page: SceneNode
  ) {
    this.result = emptyPageDiff(page, pageStatus(before, after))
    this.baseNodes = before?.nodes ?? new Map()
    this.headNodes = after?.nodes ?? new Map()
    this.addedIds = new Set([...this.headNodes.keys()].filter((id) => !this.baseNodes.has(id)))
    this.removedIds = new Set([...this.baseNodes.keys()].filter((id) => !this.headNodes.has(id)))
  }

  private markComponent(graph: SceneGraph, node: SceneNode): void {
    const owner = owningComponent(graph, node)
    if (owner) this.components.add(owner.id)
  }

  private added(head: SceneGraph, node: SceneNode): void {
    const { nodes, instances } = this.result
    nodes.addedCount++
    this.markComponent(head, node)
    if (!hasAncestorIn(head, node, this.addedIds)) nodes.added.push(ref(head, node))
    if (node.type === 'INSTANCE' && !insideInstance(head, node))
      instances.added.push(instanceRef(head, node))
  }

  private kept(head: SceneGraph, previous: SceneNode, node: SceneNode): void {
    const changes = propertyChanges(previous, node)
    const retyped = previous.type !== node.type
    if (retyped && previous.type === 'INSTANCE' && this.base) {
      this.result.instances.detached.push(instanceRef(this.base, previous))
    }
    if (changes.length === 0 && !retyped) return
    this.markComponent(head, node)
    const changed: DiffChangedNode = { ...ref(head, node), changes }
    if (retyped) changed.typeBefore = previous.type
    this.result.nodes.changed.push(changed)
  }

  private removed(base: SceneGraph, node: SceneNode): void {
    const { nodes, instances, tokenBindings } = this.result
    nodes.removedCount++
    this.markComponent(base, node)
    if (!hasAncestorIn(base, node, this.removedIds)) nodes.removed.push(ref(base, node))
    if (node.type === 'INSTANCE' && !insideInstance(base, node))
      instances.removed.push(instanceRef(base, node))
    tokenBindings.removed.push(...bindingChanges(base, this.head, node, undefined).removed)
  }

  private pageProperties(): void {
    if (!this.before || !this.after) return
    const changes = propertyChanges(this.before.page, this.after.page)
    if (changes.length === 0) return
    const { id, name, type } = this.after.page
    this.result.nodes.changed.unshift({ id, name, type, path: [], changes })
  }

  run(): PageDiff | null {
    const { head, base } = this
    if (head) {
      for (const [id, node] of this.headNodes) {
        const previous = this.baseNodes.get(id)
        if (previous) this.kept(head, previous, node)
        else this.added(head, node)
        const bindings = bindingChanges(base, head, previous, node)
        this.result.tokenBindings.added.push(...bindings.added)
        this.result.tokenBindings.removed.push(...bindings.removed)
      }
    }
    if (base) {
      for (const [id, node] of this.baseNodes) if (!this.headNodes.has(id)) this.removed(base, node)
    }
    this.pageProperties()
    this.result.changedComponents = [...this.components]
    const { nodes, status } = this.result
    const reordered =
      (this.before?.page.childIds.join(',') ?? '') !== (this.after?.page.childIds.join(',') ?? '')
    const touched =
      status !== 'changed' ||
      nodes.addedCount > 0 ||
      nodes.removedCount > 0 ||
      nodes.changed.length > 0 ||
      reordered
    return touched ? this.result : null
  }
}

function diffPage(
  base: SceneGraph | null,
  head: SceneGraph | null,
  before: PageIndex | undefined,
  after: PageIndex | undefined
): PageDiff | null {
  const page = after?.page ?? before?.page
  return page ? new PageDiffer(base, head, before, after, page).run() : null
}

function variableChanges(base: SceneGraph | null, head: SceneGraph | null) {
  const previous = base?.variables ?? new Map()
  const next = head?.variables ?? new Map()
  const added: string[] = []
  const removed: string[] = []
  const changed: string[] = []
  for (const [id, variable] of next) {
    const old = previous.get(id)
    if (!old) added.push(variable.name)
    else if (!sameValue(old, variable)) changed.push(variable.name)
  }
  for (const [id, variable] of previous) if (!next.has(id)) removed.push(variable.name)
  return { added: added.sort(), removed: removed.sort(), changed: changed.sort() }
}

/**
 * Diff two documents. Pass `null` for a side that does not exist (a document added or
 * deleted by the change).
 */
export function diffDocuments(base: SceneGraph | null, head: SceneGraph | null): DocumentDiff {
  const basePages = indexPages(base)
  const headPages = indexPages(head)
  const pages: PageDiff[] = []
  for (const [id, after] of headPages) {
    const diff = diffPage(base, head, basePages.get(id), after)
    if (diff) pages.push(diff)
  }
  for (const [id, before] of basePages) {
    if (headPages.has(id)) continue
    const diff = diffPage(base, head, before, undefined)
    if (diff) pages.push(diff)
  }
  const variables = variableChanges(base, head)
  const sum = (pick: (page: PageDiff) => number) =>
    pages.reduce((total, page) => total + pick(page), 0)
  const summary: DocumentDiffSummary = {
    pagesAdded: pages.filter((page) => page.status === 'added').length,
    pagesRemoved: pages.filter((page) => page.status === 'removed').length,
    pagesChanged: pages.filter((page) => page.status === 'changed').length,
    nodesAdded: sum((page) => page.nodes.addedCount),
    nodesRemoved: sum((page) => page.nodes.removedCount),
    nodesChanged: sum((page) => page.nodes.changed.length),
    tokenBindingsAdded: sum((page) => page.tokenBindings.added.length),
    tokenBindingsRemoved: sum((page) => page.tokenBindings.removed.length),
    instancesAdded: sum((page) => page.instances.added.length),
    instancesRemoved: sum((page) => page.instances.removed.length),
    instancesDetached: sum((page) => page.instances.detached.length),
    variablesAdded: variables.added.length,
    variablesRemoved: variables.removed.length,
    variablesChanged: variables.changed.length
  }
  return {
    changed: pages.length > 0 || Object.values(variables).some((list) => list.length > 0),
    summary,
    pages,
    variables
  }
}
