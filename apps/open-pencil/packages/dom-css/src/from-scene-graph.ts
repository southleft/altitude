import { encodeBase64 } from '@open-pencil/core/bytes'
import { colorToCSS } from '@open-pencil/core/color'
import { renderNodesToSVG } from '@open-pencil/core/io/formats/svg'
import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { BLACK } from '@open-pencil/scene-graph/constants'

import {
  dropShadowToCSS,
  fillToCSS,
  sceneNodeSizeStyle,
  strokeColorToCSS,
  strokeToCSS
} from './css-values'
import { designFactWithAttrsFromNode, type OmittedGeometry } from './design-fact'
import { applyVariableCSS } from './design-tokens'
import type { DesignDocument, DesignNode, DesignStyleDeclaration } from './types'

const DOM_CSS_PLUGIN_ID = 'open-pencil-dom-css'
const IMAGE_SOURCE_URL_KEY = 'image-source-url'

/**
 * Node types whose shape lives in geometry, not in a CSS box.
 *
 * A vector rendered as a `<div>` is a lie: `vectorNetwork`, `fillGeometry` and boolean
 * operations have no CSS expression and never will. The fidelity of those fields is
 * already guaranteed by the design-fact carrier, so this is about the OUTPUT being
 * usable — exported markup should contain the real artwork as inline SVG rather than an
 * empty rectangle where a logo used to be.
 */
const VECTOR_TYPES = new Set(['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'POLYGON', 'LINE'])

export interface SceneGraphToDesignOptions {
  rootId?: string
  includeSourceIds?: boolean
  /**
   * Record node type, component identity and token bindings as `data-op-*` attributes.
   * Without it CSS is the only carrier and those facts are lost. Defaults to true —
   * losing them silently was the defect this exists to fix.
   */
  includeDesignFacts?: boolean
  /** Prefix for generated custom properties, e.g. 'al' produces `--al-color-primary`. */
  cssVarPrefix?: string
  /**
   * Emit vector nodes as inline SVG. On by default; turning it off leaves vectors as
   * empty boxes, which is faster but exports artwork that is not there.
   */
  inlineVectorSVG?: boolean
  /**
   * Carry raw vector geometry (`vectorNetwork`, `fillGeometry`, `strokeGeometry`) as
   * facts. Default true, which is exact but bulky — on a real design system these three
   * fields were 95% of a 114MB export. Set false for markup meant to be read; the inline
   * SVG still carries the artwork, and the omission is reported through
   * `omittedGeometry`.
   */
  geometryFacts?: boolean
  /**
   * Receives the geometry fields left out when `geometryFacts` is false. Owned by the
   * caller, so concurrent exports never share a report.
   */
  omittedGeometry?: OmittedGeometry[]
  /**
   * Build only what HTML serialisation emits. A vector emitted as inline SVG serialises
   * that SVG instead of its children, so its children are not built at all (nor reported
   * in `omittedGeometry`). Leave off for documents that go back into a scene graph: the
   * in-memory round trip restores those children. Default false.
   */
  markupOnly?: boolean
}

type ResolvedDesignOptions = Required<Omit<SceneGraphToDesignOptions, 'omittedGeometry'>> &
  Pick<SceneGraphToDesignOptions, 'omittedGeometry'>

function resolveDesignOptions(
  graph: SceneGraph,
  options: SceneGraphToDesignOptions
): ResolvedDesignOptions {
  return {
    rootId: options.rootId ?? graph.rootId,
    includeSourceIds: options.includeSourceIds ?? true,
    includeDesignFacts: options.includeDesignFacts ?? true,
    cssVarPrefix: options.cssVarPrefix ?? '',
    inlineVectorSVG: options.inlineVectorSVG ?? true,
    geometryFacts: options.geometryFacts ?? true,
    omittedGeometry: options.omittedGeometry,
    markupOnly: options.markupOnly ?? false
  }
}

function nodeChildren(graph: SceneGraph, node: SceneNode): SceneNode[] {
  return node.childIds
    .map((id) => graph.getNode(id))
    .filter((child): child is SceneNode => child !== undefined)
}

function justifyContentToCSS(value: SceneNode['primaryAxisAlign']): string | undefined {
  if (value === 'CENTER') return 'center'
  if (value === 'MAX') return 'flex-end'
  if (value === 'SPACE_BETWEEN') return 'space-between'
  return undefined
}

function alignItemsToCSS(value: SceneNode['counterAxisAlign']): string | undefined {
  if (value === 'CENTER') return 'center'
  if (value === 'MAX') return 'flex-end'
  if (value === 'STRETCH') return 'stretch'
  if (value === 'BASELINE') return 'baseline'
  return undefined
}

function alignSelfToCSS(value: SceneNode['layoutAlignSelf']): string | undefined {
  if (value === 'MIN') return 'flex-start'
  if (value === 'CENTER') return 'center'
  if (value === 'MAX') return 'flex-end'
  if (value === 'STRETCH') return 'stretch'
  if (value === 'BASELINE') return 'baseline'
  return undefined
}

function textCaseToCSS(value: SceneNode['textCase']): string | undefined {
  if (value === 'UPPER') return 'uppercase'
  if (value === 'LOWER') return 'lowercase'
  if (value === 'TITLE') return 'capitalize'
  return undefined
}

function addPositioning(style: DesignStyleDeclaration, node: SceneNode): void {
  if (node.layoutPositioning !== 'ABSOLUTE') return
  style.position = 'absolute'
  style.left = `${node.x}px`
  style.top = `${node.y}px`
}

function addSizeConstraints(style: DesignStyleDeclaration, node: SceneNode): void {
  if (node.minWidth !== null) style['min-width'] = `${node.minWidth}px`
  if (node.maxWidth !== null) style['max-width'] = `${node.maxWidth}px`
  if (node.minHeight !== null) style['min-height'] = `${node.minHeight}px`
  if (node.maxHeight !== null) style['max-height'] = `${node.maxHeight}px`
}

function addCornerRadii(style: DesignStyleDeclaration, node: SceneNode): void {
  if (node.independentCorners) {
    if (node.topLeftRadius > 0) style['border-top-left-radius'] = `${node.topLeftRadius}px`
    if (node.topRightRadius > 0) style['border-top-right-radius'] = `${node.topRightRadius}px`
    if (node.bottomRightRadius > 0)
      style['border-bottom-right-radius'] = `${node.bottomRightRadius}px`
    if (node.bottomLeftRadius > 0) style['border-bottom-left-radius'] = `${node.bottomLeftRadius}px`
    return
  }

  if (node.cornerRadius > 0) style['border-radius'] = `${node.cornerRadius}px`
}

function addStroke(style: DesignStyleDeclaration, node: SceneNode): void {
  const stroke = node.strokes[0]
  const border = strokeToCSS(stroke)
  if (!border) return
  const borderStyle = node.dashPattern.length > 0 ? 'dashed' : 'solid'
  if (!node.independentStrokeWeights) {
    style.border = border
    if (borderStyle !== 'solid') style['border-style'] = borderStyle
  } else {
    const color = strokeColorToCSS(stroke) ?? 'currentColor'
    style['border-style'] = borderStyle
    style['border-color'] = color
  }

  // Emitted in both cases. The uniform branch used to publish only the `border`
  // shorthand, so re-import had to guess every side from the stroke weight and lost
  // ~600 values whose per-side weight differed from it. Longhands after the shorthand
  // win in the cascade, so the idiomatic form is preserved and the value is recoverable.
  style['border-top-width'] = `${node.borderTopWeight}px`
  style['border-right-width'] = `${node.borderRightWeight}px`
  style['border-bottom-width'] = `${node.borderBottomWeight}px`
  style['border-left-width'] = `${node.borderLeftWeight}px`
}

/** Scene blend modes map onto `mix-blend-mode` almost one-for-one. */
const BLEND_MODE_CSS: Record<string, string> = {
  DARKEN: 'darken',
  MULTIPLY: 'multiply',
  COLOR_BURN: 'color-burn',
  LIGHTEN: 'lighten',
  SCREEN: 'screen',
  COLOR_DODGE: 'color-dodge',
  OVERLAY: 'overlay',
  SOFT_LIGHT: 'soft-light',
  HARD_LIGHT: 'hard-light',
  DIFFERENCE: 'difference',
  EXCLUSION: 'exclusion',
  HUE: 'hue',
  SATURATION: 'saturation',
  COLOR: 'color',
  LUMINOSITY: 'luminosity'
}

/** A grid track in CSS terms: FIXED -> px, FR -> fr, AUTO -> auto. */
function gridTrackToCSS(track: { sizing: string; value: number }): string {
  if (track.sizing === 'FR') return `${track.value}fr`
  if (track.sizing === 'AUTO') return 'auto'
  return `${track.value}px`
}

/**
 * CSS Grid.
 *
 * The layout engine has shipped grid since the Yoga fork, but the CSS bridge never read
 * or wrote any of it, so grid frames exported as plain boxes and came back as plain
 * boxes. Tracks map cleanly onto `grid-template-*`, so this belongs in CSS rather than
 * in the fact carrier.
 */
function addGridLayout(style: DesignStyleDeclaration, node: SceneNode): void {
  style.display = 'grid'
  if (node.gridTemplateColumns.length) {
    style['grid-template-columns'] = node.gridTemplateColumns.map(gridTrackToCSS).join(' ')
  }
  if (node.gridTemplateRows.length) {
    style['grid-template-rows'] = node.gridTemplateRows.map(gridTrackToCSS).join(' ')
  }
  if (node.gridColumnGap) style['column-gap'] = `${node.gridColumnGap}px`
  if (node.gridRowGap) style['row-gap'] = `${node.gridRowGap}px`
}

/**
 * Rotation and blend mode. Both are plainly expressible in CSS and neither was emitted,
 * so both were lost on every node that used them (509 and 406 respectively). Node
 * rotation is in degrees — CanvasKit's `rotate` takes degrees, see canvas/highlight-rect.
 */
function addTransformAndBlend(style: DesignStyleDeclaration, node: SceneNode): void {
  const transforms: string[] = []
  if (node.rotation) transforms.push(`rotate(${node.rotation}deg)`)
  if (node.flipX) transforms.push('scaleX(-1)')
  if (node.flipY) transforms.push('scaleY(-1)')
  if (transforms.length) style.transform = transforms.join(' ')

  const blend = BLEND_MODE_CSS[node.blendMode]
  if (blend) style['mix-blend-mode'] = blend
}

function addPadding(style: DesignStyleDeclaration, node: SceneNode): void {
  const { paddingTop, paddingRight, paddingBottom, paddingLeft } = node
  if (paddingTop === 0 && paddingRight === 0 && paddingBottom === 0 && paddingLeft === 0) return

  if (
    paddingTop === paddingRight &&
    paddingRight === paddingBottom &&
    paddingBottom === paddingLeft
  ) {
    style.padding = `${paddingTop}px`
    return
  }

  if (paddingTop === paddingBottom && paddingRight === paddingLeft) {
    if (paddingTop > 0) style['padding-block'] = `${paddingTop}px`
    if (paddingRight > 0) style['padding-inline'] = `${paddingRight}px`
    return
  }

  if (paddingTop > 0) style['padding-top'] = `${paddingTop}px`
  if (paddingRight > 0) style['padding-right'] = `${paddingRight}px`
  if (paddingBottom > 0) style['padding-bottom'] = `${paddingBottom}px`
  if (paddingLeft > 0) style['padding-left'] = `${paddingLeft}px`
}

function addFlexGap(style: DesignStyleDeclaration, node: SceneNode): void {
  if (node.itemSpacing <= 0 && node.counterAxisSpacing <= 0) return
  if (node.counterAxisSpacing <= 0) {
    style.gap = `${node.itemSpacing}px`
    return
  }

  if (node.layoutMode === 'HORIZONTAL') {
    if (node.itemSpacing > 0) style['column-gap'] = `${node.itemSpacing}px`
    style['row-gap'] = `${node.counterAxisSpacing}px`
    return
  }

  if (node.itemSpacing > 0) style['row-gap'] = `${node.itemSpacing}px`
  style['column-gap'] = `${node.counterAxisSpacing}px`
}

function addImageStyle(style: DesignStyleDeclaration, node: SceneNode): void {
  const fill = node.fills.at(0)
  if (fill?.type !== 'IMAGE' || !fill.visible) return
  if (node.width > 0 && node.height > 0) style['aspect-ratio'] = `${node.width} / ${node.height}`
  if (fill.imageScaleMode === 'FIT') style['object-fit'] = 'contain'
  if (fill.imageScaleMode === 'FILL') style['object-fit'] = 'cover'
}

function styleFromSceneNode(node: SceneNode): DesignStyleDeclaration {
  const style = sceneNodeSizeStyle(node)
  addPositioning(style, node)
  addSizeConstraints(style, node)
  const fill = fillToCSS(node.fills.at(0))
  if (fill) style['background-color'] = fill
  addImageStyle(style, node)
  addStroke(style, node)
  const shadow = dropShadowToCSS(node.effects[0])
  if (shadow) style['box-shadow'] = shadow
  if (node.opacity < 1) style.opacity = String(node.opacity)
  addCornerRadii(style, node)
  addTransformAndBlend(style, node)
  if (node.clipsContent) style.overflow = 'hidden'
  const alignSelf = alignSelfToCSS(node.layoutAlignSelf)
  if (alignSelf) style['align-self'] = alignSelf

  if (node.layoutMode === 'GRID') {
    addGridLayout(style, node)
    addPadding(style, node)
  } else if (node.layoutMode !== 'NONE') {
    style.display = 'flex'
    style['flex-direction'] = node.layoutMode === 'HORIZONTAL' ? 'row' : 'column'
    const justifyContent = justifyContentToCSS(node.primaryAxisAlign)
    const alignItems = alignItemsToCSS(node.counterAxisAlign)
    if (justifyContent) style['justify-content'] = justifyContent
    if (alignItems) style['align-items'] = alignItems
    if (node.layoutWrap === 'WRAP') style['flex-wrap'] = 'wrap'
    addFlexGap(style, node)
    addPadding(style, node)
  }

  return style
}

function styleFromTextNode(node: SceneNode): DesignStyleDeclaration {
  const style = sceneNodeSizeStyle(node)
  addPositioning(style, node)
  style.color = fillToCSS(node.fills.at(0)) ?? colorToCSS(BLACK)
  style['font-family'] = node.fontFamily
  style['font-size'] = `${node.fontSize}px`
  style['font-weight'] = String(node.fontWeight)
  if (node.italic) style['font-style'] = 'italic'
  if (node.lineHeight !== null) style['line-height'] = `${node.lineHeight}px`
  if (node.letterSpacing !== 0) style['letter-spacing'] = `${node.letterSpacing}px`
  if (node.textAlignHorizontal !== 'LEFT')
    style['text-align'] = node.textAlignHorizontal.toLowerCase()
  if (node.opacity < 1) style.opacity = String(node.opacity)
  const shadow = dropShadowToCSS(node.effects[0])
  if (shadow) style['text-shadow'] = shadow
  if (node.textDecoration !== 'NONE') {
    style['text-decoration-line'] =
      node.textDecoration === 'UNDERLINE' ? 'underline' : 'line-through'
  }
  const textTransform = textCaseToCSS(node.textCase)
  if (textTransform) style['text-transform'] = textTransform
  style['white-space'] = node.maxLines === 1 ? 'nowrap' : 'pre-wrap'
  return style
}

function imageSourceURL(node: SceneNode): string | undefined {
  return node.pluginData.find(
    (entry) => entry.pluginId === DOM_CSS_PLUGIN_ID && entry.key === IMAGE_SOURCE_URL_KEY
  )?.value
}

function attrsForNode(
  graph: SceneGraph,
  node: SceneNode,
  includeSourceIds: boolean,
  factAttrs: Record<string, string>
): Record<string, string> {
  const attrs: Record<string, string> = includeSourceIds
    ? { 'data-open-pencil-node-id': node.id }
    : {}
  Object.assign(attrs, factAttrs)
  const sourceURL = imageSourceURL(node)
  if (sourceURL) attrs.src = sourceURL
  const fill = node.fills.at(0)
  if (fill?.type !== 'IMAGE' || !fill.imageHash) return attrs
  const bytes = graph.images.get(fill.imageHash)
  if (!bytes) return attrs
  return { ...attrs, src: `data:image/png;base64,${encodeBase64(bytes)}` }
}

function tagNameForNode(node: SceneNode): string {
  const fill = node.fills.at(0)
  if ((fill?.type === 'IMAGE' || imageSourceURL(node)) && node.childIds.length === 0) return 'img'
  return 'div'
}

function sceneNodeToDesignNode(
  graph: SceneGraph,
  node: SceneNode,
  options: ResolvedDesignOptions
): DesignNode | null {
  if (!node.visible || node.internalOnly) return null

  const { fact, attrs: factAttrs } = options.includeDesignFacts
    ? designFactWithAttrsFromNode(graph, node, {
        cssVarPrefix: options.cssVarPrefix,
        geometryFacts: options.geometryFacts,
        omittedGeometry: options.omittedGeometry
      })
    : { fact: undefined, attrs: {} }

  if (node.type === 'TEXT') {
    const inlineStyle = styleFromTextNode(node)
    applyVariableCSS(inlineStyle, fact)
    return {
      type: 'element',
      tagName: 'span',
      attrs: attrsForNode(graph, node, options.includeSourceIds, factAttrs),
      inlineStyle,
      sourceSceneNodeId: node.id,
      sourceSceneNode: node,
      design: fact,
      children: [{ type: 'text', text: node.text }]
    }
  }

  const buildChildren = () =>
    nodeChildren(graph, node)
      .map((child) => sceneNodeToDesignNode(graph, child, options))
      .filter((child): child is DesignNode => child !== null)

  if (node.type === 'CANVAS') {
    const children = buildChildren()
    return {
      type: 'element',
      tagName: 'main',
      attrs: attrsForNode(graph, node, options.includeSourceIds, factAttrs),
      sourceSceneNodeId: node.id,
      sourceSceneNode: node,
      design: fact,
      children
    }
  }

  const emitsSVG = options.inlineVectorSVG && VECTOR_TYPES.has(node.type)
  // Children are built before the node's own SVG, as they always were, unless they will
  // not be emitted: then the SVG decides whether they are needed at all.
  let children = options.markupOnly && emitsSVG ? [] : buildChildren()
  const rawHTML = emitsSVG ? vectorSVG(graph, node) : undefined
  if (options.markupOnly && emitsSVG && rawHTML === undefined) children = buildChildren()

  const inlineStyle = styleFromSceneNode(node)
  applyVariableCSS(inlineStyle, fact)

  return {
    type: 'element',
    tagName: tagNameForNode(node),
    attrs: attrsForNode(graph, node, options.includeSourceIds, factAttrs),
    inlineStyle,
    sourceSceneNodeId: node.id,
    sourceSceneNode: node,
    design: fact,
    rawHTML,
    children
  }
}

/**
 * Render one node to inline SVG, reusing the exporter the app already ships rather than
 * writing a second geometry serialiser. Returns undefined when the node has no
 * renderable bounds; callers then fall back to the plain box.
 */
function vectorSVG(graph: SceneGraph, node: SceneNode): string | undefined {
  try {
    const pageId = node.parentId ?? graph.rootId
    return renderNodesToSVG(graph, pageId, [node.id]) ?? undefined
  } catch (error) {
    // A vector that cannot be rendered must not take the whole export down; the design
    // fact still carries its geometry losslessly. But it must not be silent either.
    console.warn(`[dom-css] could not render ${node.name || node.id} to SVG:`, error)
    return undefined
  }
}

/**
 * Build a document from specific nodes rather than a root's children.
 *
 * `sceneGraphToDesignDocument` emits a root's CHILDREN, which is right for a whole page
 * but wrong for a selection — passing a selected frame's id would emit its contents and
 * drop the frame itself. The code panel needs the selected nodes, so it needs this.
 */
export function sceneNodesToDesignDocument(
  graph: SceneGraph,
  nodeIds: readonly string[],
  options: SceneGraphToDesignOptions = {}
): DesignDocument {
  const resolvedOptions = resolveDesignOptions(graph, options)

  const children = nodeIds
    .map((id) => graph.getNode(id))
    .filter((node): node is SceneNode => node !== undefined)
    .map((node) => sceneNodeToDesignNode(graph, node, resolvedOptions))
    .filter((child): child is DesignNode => child !== null)

  return { type: 'document', sourceGraph: graph, children }
}

export function sceneGraphToDesignDocument(
  graph: SceneGraph,
  options: SceneGraphToDesignOptions = {}
): DesignDocument {
  const resolvedOptions = resolveDesignOptions(graph, options)
  const root = graph.getNode(resolvedOptions.rootId)

  const children = root
    ? nodeChildren(graph, root)
        .map((child) => sceneNodeToDesignNode(graph, child, resolvedOptions))
        .filter((child): child is DesignNode => child !== null)
    : []

  return {
    type: 'document',
    sourceGraph: graph,
    children
  }
}

export type { SceneGraphToDesignOptions as ToDesignDocumentOptions }
