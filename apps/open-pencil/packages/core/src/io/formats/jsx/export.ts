import {
  codeBindingOwner,
  resolveInstanceCodeElement,
  type NodeType,
  type ResolvedCodeElement,
  type ResolvedCodeSlot,
  type SceneGraph,
  type SceneNode
} from '@open-pencil/scene-graph'

import { DEFAULT_FONT_FAMILY } from '#core/constants'
import { resolveNodeTextDirection } from '#core/text/direction'

import {
  collectCornerRadii,
  collectPadding,
  emitPadding,
  escapeJSXText,
  formatProp,
  formatShadow,
  formatTracks,
  getNodeContext,
  solidFillColor,
  solidStroke
} from './helpers'
import { collectTailwindClasses } from './tailwind-classes'

export type JSXFormat = 'openpencil' | 'tailwind'

const NODE_TYPE_TO_TAG: Partial<Record<NodeType, string>> = {
  FRAME: 'Frame',
  RECTANGLE: 'Rectangle',
  ROUNDED_RECTANGLE: 'Rectangle',
  ELLIPSE: 'Ellipse',
  TEXT: 'Text',
  LINE: 'Line',
  STAR: 'Star',
  POLYGON: 'Polygon',
  VECTOR: 'Vector',
  GROUP: 'Group',
  SECTION: 'Section',
  COMPONENT: 'Component',
  COMPONENT_SET: 'Frame',
  INSTANCE: 'Frame'
}

const NODE_TYPE_TO_TW_TAG: Partial<Record<NodeType, string>> = {
  FRAME: 'div',
  RECTANGLE: 'div',
  ROUNDED_RECTANGLE: 'div',
  ELLIPSE: 'div',
  TEXT: 'p',
  LINE: 'div',
  STAR: 'div',
  POLYGON: 'div',
  VECTOR: 'div',
  GROUP: 'div',
  SECTION: 'section',
  COMPONENT: 'div',
  COMPONENT_SET: 'div',
  INSTANCE: 'div'
}

// --- OpenPencil format helpers ---

function collectGridSizingProps(node: SceneNode, props: [string, unknown][]): void {
  props.push(['grid', true])
  if (node.gridTemplateColumns.length > 0)
    props.push(['columns', formatTracks(node.gridTemplateColumns)])
  if (node.gridTemplateRows.length > 0) props.push(['rows', formatTracks(node.gridTemplateRows)])
  if (node.width > 0) props.push(['w', node.width])
  if (node.gridTemplateRows.length > 0 && node.height > 0) props.push(['h', node.height])
  if (node.gridColumnGap > 0) props.push(['columnGap', node.gridColumnGap])
  if (node.gridRowGap > 0) props.push(['rowGap', node.gridRowGap])
}

function collectFlexSizingProps(node: SceneNode, props: [string, unknown][]): void {
  props.push(['flex', node.layoutMode === 'HORIZONTAL' ? 'row' : 'col'])
  if (node.layoutDirection === 'RTL') props.push(['dir', 'rtl'])
  const primaryAxis = node.layoutMode === 'HORIZONTAL' ? 'width' : 'height'
  const crossAxis = node.layoutMode === 'HORIZONTAL' ? 'height' : 'width'

  if (node.primaryAxisSizing === 'FILL') props.push([primaryAxis === 'width' ? 'w' : 'h', 'fill'])
  else if (node.primaryAxisSizing !== 'HUG')
    props.push([primaryAxis === 'width' ? 'w' : 'h', node[primaryAxis]])

  if (node.counterAxisSizing === 'FILL') props.push([crossAxis === 'width' ? 'w' : 'h', 'fill'])
  else if (node.counterAxisSizing !== 'HUG')
    props.push([crossAxis === 'width' ? 'w' : 'h', node[crossAxis]])
}

function collectGridPositionProps(node: SceneNode, props: [string, unknown][]): void {
  if (!node.gridPosition) return
  const pos = node.gridPosition
  if (pos.column > 0) props.push(['colStart', pos.column])
  if (pos.row > 0) props.push(['rowStart', pos.row])
  if (pos.columnSpan > 1) props.push(['colSpan', pos.columnSpan])
  if (pos.rowSpan > 1) props.push(['rowSpan', pos.rowSpan])
}

function collectFlexAlignmentProps(node: SceneNode, props: [string, unknown][]): void {
  if (node.itemSpacing > 0) props.push(['gap', node.itemSpacing])

  if (node.layoutWrap === 'WRAP') {
    props.push(['wrap', true])
    if (node.counterAxisSpacing > 0) props.push(['rowGap', node.counterAxisSpacing])
  }

  if (node.primaryAxisAlign === 'CENTER') props.push(['justify', 'center'])
  else if (node.primaryAxisAlign === 'MAX') props.push(['justify', 'end'])
  else if (node.primaryAxisAlign === 'SPACE_BETWEEN') props.push(['justify', 'between'])

  if (node.counterAxisAlign === 'CENTER') props.push(['items', 'center'])
  else if (node.counterAxisAlign === 'MAX') props.push(['items', 'end'])
  else if (node.counterAxisAlign === 'STRETCH') props.push(['items', 'stretch'])
}

function collectAutoLayoutPaddingProps(node: SceneNode, props: [string, unknown][]): void {
  const pad = collectPadding(node)
  if (!pad) return
  props.push(
    ...emitPadding(
      pad,
      (v) => ['p', v] as [string, unknown],
      (y, x) =>
        [
          ['py', y],
          ['px', x]
        ] as [string, unknown][],
      ({ pt, pr, pb, pl }) => {
        const r: [string, unknown][] = []
        if (pt > 0) r.push(['pt', pt])
        if (pr > 0) r.push(['pr', pr])
        if (pb > 0) r.push(['pb', pb])
        if (pl > 0) r.push(['pl', pl])
        return r
      }
    )
  )
}

function collectCornerRadiiProps(node: SceneNode, props: [string, unknown][]): void {
  const corners = collectCornerRadii(node)
  if (!corners) return
  const { tl, tr, br, bl } = corners
  if (tl === tr && tr === br && br === bl) {
    props.push(['rounded', tl])
  } else {
    if (tl > 0) props.push(['roundedTL', tl])
    if (tr > 0) props.push(['roundedTR', tr])
    if (br > 0) props.push(['roundedBR', br])
    if (bl > 0) props.push(['roundedBL', bl])
  }
}

function collectAppearanceProps(node: SceneNode, props: [string, unknown][]): void {
  const bg = solidFillColor(node.fills)
  if (bg) props.push(['bg', bg])

  const stroke = solidStroke(node.strokes)
  if (stroke) {
    props.push(['stroke', stroke.color])
    if (stroke.weight !== 1) props.push(['strokeWidth', stroke.weight])
    if (stroke.dash) props.push(['strokeDash', stroke.dash])
  }

  collectCornerRadiiProps(node, props)

  if (node.cornerSmoothing > 0) props.push(['cornerSmoothing', node.cornerSmoothing])
  if (node.opacity < 1) props.push(['opacity', Math.round(node.opacity * 100) / 100])
  if (node.rotation !== 0) props.push(['rotate', Math.round(node.rotation * 100) / 100])
  if (node.blendMode !== 'PASS_THROUGH' && node.blendMode !== 'NORMAL') {
    props.push(['blendMode', node.blendMode.toLowerCase()])
  }
  if (node.clipsContent) props.push(['overflow', 'hidden'])

  for (const effect of node.effects) {
    if (!effect.visible) continue
    if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
      const shadow = formatShadow(effect)
      if (shadow) props.push(['shadow', shadow])
    } else if (effect.type === 'LAYER_BLUR' || effect.type === 'BACKGROUND_BLUR') {
      props.push(['blur', effect.radius])
    }
  }
}

function collectPositionProps(
  node: SceneNode,
  ctx: ReturnType<typeof getNodeContext>,
  props: [string, unknown][]
): void {
  if (ctx.parentIsAutoLayout || ctx.parentIsGrid) return
  if (node.x !== 0) props.push(['x', node.x])
  if (node.y !== 0) props.push(['y', node.y])
}

function collectSizingProps(
  node: SceneNode,
  ctx: ReturnType<typeof getNodeContext>,
  graph: SceneGraph,
  props: [string, unknown][]
): void {
  if (ctx.isGrid) collectGridSizingProps(node, props)
  else if (ctx.isFlex) collectFlexSizingProps(node, props)
  else if (node.type === 'TEXT') collectTextSizingProps(node, graph, props)
  else {
    if (node.width > 0) props.push(['w', node.width])
    if (node.height > 0) props.push(['h', node.height])
  }

  if (!ctx.parentIsAutoLayout) return
  if (node.layoutGrow > 0) props.push(['grow', node.layoutGrow])
  if (node.layoutAlignSelf === 'STRETCH') {
    const parent = node.parentId ? graph.getNode(node.parentId) : null
    if (parent && (parent.layoutMode === 'HORIZONTAL' || parent.layoutMode === 'VERTICAL')) {
      const crossDim = parent.layoutMode === 'HORIZONTAL' ? 'h' : 'w'
      if (!props.some(([k]) => k === crossDim)) props.push([crossDim, 'fill'])
    }
  }
}

function collectTextSizingProps(
  node: SceneNode,
  graph: SceneGraph,
  props: [string, unknown][]
): void {
  const autoResize = node.textAutoResize
  const emitH = autoResize === 'NONE' || autoResize === 'TRUNCATE'
  // Don't emit fixed w when text stretches to fill parent — the layoutAlignSelf
  // check below will emit w="fill" instead. Without this guard, w={computedPx}
  // gets emitted first and blocks the fill detection.
  const isFillWidth =
    node.layoutAlignSelf === 'STRETCH' &&
    (() => {
      const parent = node.parentId ? graph.getNode(node.parentId) : null
      return parent?.layoutMode === 'VERTICAL'
    })()
  const isGrowWidth =
    node.layoutGrow > 0 &&
    (() => {
      const parent = node.parentId ? graph.getNode(node.parentId) : null
      return parent?.layoutMode === 'HORIZONTAL'
    })()
  const emitW = autoResize !== 'WIDTH_AND_HEIGHT' && !isFillWidth && !isGrowWidth
  if (emitW && node.width > 0) props.push(['w', node.width])
  if (emitH && node.height > 0) props.push(['h', node.height])
}

function collectTextNodeProps(node: SceneNode, props: [string, unknown][]): void {
  const direction = resolveNodeTextDirection(node)
  if (node.fontSize !== 14) props.push(['size', node.fontSize])
  if (node.fontFamily && node.fontFamily !== DEFAULT_FONT_FAMILY)
    props.push(['font', node.fontFamily])
  if (node.fontWeight !== 400) {
    if (node.fontWeight === 700) props.push(['weight', 'bold'])
    else if (node.fontWeight === 500) props.push(['weight', 'medium'])
    else props.push(['weight', node.fontWeight])
  }
  if (direction === 'RTL') props.push(['dir', 'rtl'])
  if (node.textAlignHorizontal !== 'LEFT') {
    props.push(['textAlign', node.textAlignHorizontal.toLowerCase()])
  }
  if (node.lineHeight != null) props.push(['lineHeight', node.lineHeight])
  if (node.letterSpacing !== 0) props.push(['letterSpacing', node.letterSpacing])
  if (node.textDecoration !== 'NONE')
    props.push(['textDecoration', node.textDecoration.toLowerCase()])
  if (node.textCase !== 'ORIGINAL') props.push(['textCase', node.textCase.toLowerCase()])
  if (node.maxLines != null) props.push(['maxLines', node.maxLines])
  if (node.textTruncation === 'ENDING' && node.maxLines == null) props.push(['truncate', true])
  const textColor = solidFillColor(node.fills)
  if (textColor) {
    const bgIdx = props.findIndex(([k]) => k === 'bg')
    if (bgIdx !== -1) props.splice(bgIdx, 1)
    props.push(['color', textColor])
  }
}

function collectShapeNodeProps(node: SceneNode, props: [string, unknown][]): void {
  if (node.type === 'STAR') {
    if (node.pointCount !== 5) props.push(['points', node.pointCount])
    if (node.starInnerRadius !== 0.382) props.push(['innerRadius', node.starInnerRadius])
  }
  if (node.type === 'POLYGON' && node.pointCount !== 3) {
    props.push(['points', node.pointCount])
  }
}

function collectProps(node: SceneNode, graph: SceneGraph): [string, unknown][] {
  const props: [string, unknown][] = []
  const ctx = getNodeContext(node, graph)

  if (node.name && node.name !== node.type) props.push(['name', node.name])

  collectPositionProps(node, ctx, props)
  collectSizingProps(node, ctx, graph, props)
  if (ctx.parentIsGrid) collectGridPositionProps(node, props)
  if (ctx.isFlex) collectFlexAlignmentProps(node, props)
  if (ctx.isAutoLayout) collectAutoLayoutPaddingProps(node, props)
  collectAppearanceProps(node, props)
  if (node.type === 'TEXT') collectTextNodeProps(node, props)
  collectShapeNodeProps(node, props)

  return props
}

// --- Code-bound instances ---

const JSX_ATTRIBUTE_NAME = /^[A-Za-z_][\w-]*$/

/** A string attribute, as an expression when the value would break a quoted literal. */
function codeAttr(name: string, value: string): string {
  return /["{}<>]/.test(value) ? `${name}={${JSON.stringify(value)}}` : formatProp(name, value)
}

function slotChildJSX(graph: SceneGraph, slot: ResolvedCodeSlot, prefix: string): string | null {
  if (slot.text !== undefined) {
    const text = escapeJSXText(slot.text)
    return slot.slot ? `${prefix}<span slot="${slot.slot}">${text}</span>` : `${prefix}${text}`
  }
  if (!slot.component) return null
  const binding = codeBindingOwner(graph, slot.component)?.codeBinding
  if (!binding) return null
  const attrs = Object.entries(binding.attributes ?? {}).map(([k, v]) => codeAttr(k, v))
  if (slot.slot) attrs.push(codeAttr('slot', slot.slot))
  return `${prefix}<${binding.tagName}${attrs.length ? ` ${attrs.join(' ')}` : ''} />`
}

/**
 * React output for an instance of a code-bound component: `<ALButton size="md">Label</ALButton>`
 * through its `react` binding, or the custom element tag when there is none.
 */
function codeElementJSX(graph: SceneGraph, element: ResolvedCodeElement, indent: number): string {
  const prefix = '  '.repeat(indent)
  const tag = element.binding.react?.component ?? element.binding.tagName
  const attrs = element.attributes.map(([name, value]) =>
    value === 'true' ? name : codeAttr(name, value)
  )
  const opening = `<${tag}${attrs.length ? ` ${attrs.join(' ')}` : ''}`
  const children = element.slots
    .map((slot) => slotChildJSX(graph, slot, `${prefix}  `))
    .filter((child): child is string => child !== null)
  if (children.length === 0) return `${prefix}${opening} />`
  return [`${prefix}${opening}>`, ...children, `${prefix}</${tag}>`].join('\n')
}

/**
 * Design-JSX for the same instance: `<Instance component="Button" Size="Md" />` re-renders
 * as an instance of the right variant, which a Frame rebuilt from its layers would not.
 */
function codeBoundInstanceDesignJSX(graph: SceneGraph, node: SceneNode, indent: number): string {
  const component = node.componentId ? graph.getNode(node.componentId) : undefined
  const set = component?.parentId ? graph.getNode(component.parentId) : undefined
  const owner = set?.type === 'COMPONENT_SET' ? set : component
  const props: [string, unknown][] = [['component', owner?.name ?? node.name]]
  for (const [name, value] of Object.entries(component?.componentPropertyValues ?? {})) {
    // A JSX attribute name cannot hold spaces; such an axis falls back to the set default.
    if (JSX_ATTRIBUTE_NAME.test(name)) props.push([name, value])
  }
  return `${'  '.repeat(indent)}<Instance ${props.map(([k, v]) => formatProp(k, v)).join(' ')} />`
}

// --- JSX rendering ---

function nodeToJSX(node: SceneNode, graph: SceneGraph, indent: number, format: JSXFormat): string {
  if (node.type === 'INSTANCE') {
    const element = resolveInstanceCodeElement(graph, node)
    if (element) {
      return format === 'tailwind'
        ? codeElementJSX(graph, element, indent)
        : codeBoundInstanceDesignJSX(graph, node, indent)
    }
  }
  const tagMap = format === 'tailwind' ? NODE_TYPE_TO_TW_TAG : NODE_TYPE_TO_TAG
  const tag = tagMap[node.type]
  if (!tag) return ''

  const prefix = '  '.repeat(indent)
  let attrsStr: string

  if (format === 'tailwind') {
    const classes = collectTailwindClasses(node, graph)
    const nameAttr = node.name && node.name !== node.type ? ` data-name="${node.name}"` : ''
    const classAttr = classes.length > 0 ? ` className="${classes.join(' ')}"` : ''
    attrsStr = `${nameAttr}${classAttr}`.trim()
  } else {
    const props = collectProps(node, graph)
    attrsStr = props.map(([k, v]) => formatProp(k, v)).join(' ')
  }

  const opening = attrsStr ? `<${tag} ${attrsStr}` : `<${tag}`
  const children = graph.getChildren(node.id)

  if (node.type === 'TEXT') {
    const text = node.text
    if (!text) return `${prefix}${opening} />`
    const escaped = escapeJSXText(text)
    if (!escaped.includes('\n')) {
      return `${prefix}${opening}>${escaped}</${tag}>`
    }
    return [
      `${prefix}${opening}>`,
      ...escaped.split('\n').map((l) => `${prefix}  ${l}`),
      `${prefix}</${tag}>`
    ].join('\n')
  }

  if (children.length === 0) return `${prefix}${opening} />`

  const childJSX = children
    .filter((c) => c.visible)
    .map((c) => nodeToJSX(c, graph, indent + 1, format))
    .filter(Boolean)

  if (childJSX.length === 0) return `${prefix}${opening} />`

  return [`${prefix}${opening}>`, ...childJSX, `${prefix}</${tag}>`].join('\n')
}

export function sceneNodeToJSX(
  nodeId: string,
  graph: SceneGraph,
  format: JSXFormat = 'openpencil'
): string {
  const node = graph.getNode(nodeId)
  if (!node) return ''
  return nodeToJSX(node, graph, 0, format)
}

/**
 * Count the nodes a serialisation would walk, stopping once it passes `limit`.
 *
 * `nodeToJSX` recurses a whole subtree synchronously with no bound, so selecting a large
 * frame serialises every descendant on the main thread — and because the code panel
 * recomputes on `sceneVersion`, it does that again on every scene mutation. On a real
 * design system that is tens of thousands of nodes per click, which is exactly the UI
 * stall it feels like. Callers use this to decide whether to render a preview at all.
 *
 * Bounded so the check itself can never become the stall it is meant to prevent.
 */
export function countSelectionNodes(
  nodeIds: readonly string[],
  graph: SceneGraph,
  limit = 5000
): number {
  let count = 0
  const stack = [...nodeIds]
  while (stack.length > 0) {
    const id = stack.pop()
    if (id === undefined) break
    const node = graph.getNode(id)
    if (!node) continue
    count++
    if (count > limit) return count
    for (const childId of node.childIds) stack.push(childId)
  }
  return count
}

export function selectionToJSX(
  nodeIds: string[],
  graph: SceneGraph,
  format: JSXFormat = 'openpencil'
): string {
  return nodeIds
    .map((id) => sceneNodeToJSX(id, graph, format))
    .filter(Boolean)
    .join('\n\n')
}
