import RBush, { type BBox } from 'rbush'

import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'

import type { RenderOverlays } from '#core/canvas/renderer'
import { createSceneGeometry } from '#core/geometry'

export interface CachedSection {
  nodeId: string
  absX: number
  absY: number
  nested: boolean
}

export interface CachedComponent {
  nodeId: string
  absX: number
  absY: number
  parentType: string
}

interface Viewport {
  x: number
  y: number
  w: number
  h: number
}

const LABEL_TYPES = new Set(['COMPONENT', 'COMPONENT_SET'])
const COMPONENT_LABEL_PARENT_TYPES = new Set(['CANVAS', 'SECTION', 'COMPONENT_SET'])

/** World geometry captured at rebuild; positions only change with scene or preview versions. */
interface IndexedLabel<T> extends BBox {
  item: T
  order: number
  originX: number
  originY: number
}

export interface LabelQuery {
  /** Skip labels whose node is no wider than this in world units before computing geometry. */
  minWorldWidth?: number
}

type LabelResult<U> = { node: SceneNode; absX: number; absY: number } & U

function isInViewport(absX: number, absY: number, w: number, h: number, vp: Viewport): boolean {
  return absX + w >= vp.x && absY + h >= vp.y && absX <= vp.x + vp.w && absY <= vp.y + vp.h
}

function indexLabels<T extends { nodeId: string }>(
  graph: SceneGraph,
  items: readonly T[]
): RBush<IndexedLabel<T>> {
  const geometry = createSceneGeometry(graph)
  const entries: IndexedLabel<T>[] = []
  items.forEach((item, order) => {
    const node = graph.getNode(item.nodeId)
    if (!node) return
    const bounds = geometry.bounds(node)
    const origin = geometry.toWorld(node, { x: 0, y: 0 })
    entries.push({
      item,
      order,
      originX: origin.x,
      originY: origin.y,
      minX: bounds.x,
      minY: bounds.y,
      maxX: bounds.x + bounds.width,
      maxY: bounds.y + bounds.height
    })
  })
  const tree = new RBush<IndexedLabel<T>>()
  tree.load(entries)
  return tree
}

/** Rotation previews move descendants without a version bump, so they read live geometry. */
function collectLiveLabels<T extends { nodeId: string }, U extends object>(
  graph: SceneGraph,
  viewport: Viewport,
  cachedItems: readonly T[],
  metadata: (cached: T) => U,
  preview: RenderOverlays['rotationPreview'],
  minWorldWidth: number
): Array<LabelResult<U>> {
  const result: Array<LabelResult<U>> = []
  const geometry = createSceneGeometry(graph, preview)
  for (const cached of cachedItems) {
    const node = graph.getNode(cached.nodeId)
    if (!node || node.width <= minWorldWidth) continue
    const bounds = geometry.bounds(node)
    if (!isInViewport(bounds.x, bounds.y, bounds.width, bounds.height, viewport)) continue
    const origin = geometry.toWorld(node, { x: 0, y: 0 })
    result.push({ node, absX: origin.x, absY: origin.y, ...metadata(cached) })
  }
  return result
}

function collectVisibleLabels<T extends { nodeId: string }, U extends object>(
  graph: SceneGraph,
  viewport: Viewport,
  cachedItems: readonly T[],
  index: RBush<IndexedLabel<T>> | null,
  metadata: (cached: T) => U,
  preview: RenderOverlays['rotationPreview'],
  query: LabelQuery
): Array<LabelResult<U>> {
  const minWorldWidth = query.minWorldWidth ?? -Infinity
  if (preview || !index) {
    return collectLiveLabels(graph, viewport, cachedItems, metadata, preview, minWorldWidth)
  }
  const hits = index.search({
    minX: viewport.x,
    minY: viewport.y,
    maxX: viewport.x + viewport.w,
    maxY: viewport.y + viewport.h
  })
  hits.sort((left, right) => left.order - right.order)
  const result: Array<LabelResult<U>> = []
  for (const hit of hits) {
    const node = graph.getNode(hit.item.nodeId)
    if (!node || node.width <= minWorldWidth) continue
    result.push({ node, absX: hit.originX, absY: hit.originY, ...metadata(hit.item) })
  }
  return result
}

export class LabelCache {
  private sections: CachedSection[] = []
  private components: CachedComponent[] = []
  private sectionIndex: RBush<IndexedLabel<CachedSection>> | null = null
  private componentIndex: RBush<IndexedLabel<CachedComponent>> | null = null
  private cachedSceneVersion = -1
  private cachedPositionPreviewVersion = -1
  private cachedPageId: string | null = null

  update(
    graph: SceneGraph,
    pageId: string | null,
    sceneVersion: number,
    positionPreviewVersion = graph.positionPreviewVersion
  ): void {
    if (
      sceneVersion === this.cachedSceneVersion &&
      positionPreviewVersion === this.cachedPositionPreviewVersion &&
      pageId === this.cachedPageId
    ) {
      return
    }
    this.rebuild(graph, pageId)
    this.cachedSceneVersion = sceneVersion
    this.cachedPositionPreviewVersion = positionPreviewVersion
    this.cachedPageId = pageId
  }

  invalidate(): void {
    this.cachedSceneVersion = -1
    this.cachedPositionPreviewVersion = -1
    this.cachedPageId = null
    this.sections = []
    this.components = []
    this.sectionIndex = null
    this.componentIndex = null
  }

  getSections(
    graph: SceneGraph,
    viewport: Viewport,
    preview?: RenderOverlays['rotationPreview'],
    query: LabelQuery = {}
  ): Array<{ node: SceneNode; absX: number; absY: number; nested: boolean }> {
    return collectVisibleLabels(
      graph,
      viewport,
      this.sections,
      this.sectionIndex,
      (cached) => ({
        nested: cached.nested
      }),
      preview,
      query
    )
  }

  getComponents(
    graph: SceneGraph,
    viewport: Viewport,
    preview?: RenderOverlays['rotationPreview'],
    query: LabelQuery = {}
  ): Array<{ node: SceneNode; absX: number; absY: number; inside: boolean }> {
    return collectVisibleLabels(
      graph,
      viewport,
      this.components,
      this.componentIndex,
      () => ({
        inside: false
      }),
      preview,
      query
    )
  }

  getAllSections(): readonly CachedSection[] {
    return this.sections
  }

  getAllComponents(): readonly CachedComponent[] {
    return this.components
  }

  private rebuild(graph: SceneGraph, pageId: string | null): void {
    this.sections = []
    this.components = []
    this.sectionIndex = null
    this.componentIndex = null

    const pageNode = graph.getNode(pageId ?? graph.rootId)
    if (!pageNode) return

    this.walkChildren(graph, pageNode.id, false)
    this.sectionIndex = indexLabels(graph, this.sections)
    this.componentIndex = indexLabels(graph, this.components)
  }

  private walkChildren(graph: SceneGraph, parentId: string, insideSection: boolean): void {
    const parent = graph.getNode(parentId)
    if (!parent) return
    const parentType = parent.type

    for (const childId of parent.childIds) {
      const child = graph.getNode(childId)
      if (!child || !child.visible) continue

      if (child.type === 'SECTION') {
        const origin = graph.getAbsolutePosition(childId)
        this.sections.push({
          nodeId: childId,
          absX: origin.x,
          absY: origin.y,
          nested: insideSection
        })
        this.walkChildren(graph, childId, true)
      } else if (LABEL_TYPES.has(child.type)) {
        if (COMPONENT_LABEL_PARENT_TYPES.has(parentType)) {
          const origin = graph.getAbsolutePosition(childId)
          this.components.push({ nodeId: childId, absX: origin.x, absY: origin.y, parentType })
        }
        if (child.childIds.length > 0) {
          this.walkChildren(graph, childId, insideSection)
        }
      } else if (child.childIds.length > 0) {
        this.walkChildren(graph, childId, insideSection)
      }
    }
  }
}
