import { decodeBase64 } from '@open-pencil/core/bytes'
import {
  type Fill,
  type ImageScaleMode,
  type SceneGraph,
  type SceneNode,
  type Stroke
} from '@open-pencil/scene-graph'
import { TRANSPARENT } from '@open-pencil/scene-graph/constants'
import { computeImageHash } from '@open-pencil/scene-graph/images'

import {
  colorToFillFromCSS,
  colorToStrokeFromCSS,
  dropShadowFromCSS,
  parseBorderShorthand,
  parseCSSNumber,
  pickStyle
} from './css-values'
import { transformFactsFromCSS } from './transform'
import type { DesignElement, DesignStyleDeclaration } from './types'

/**
 * CSS declarations -> scene node properties.
 *
 * Split from `to-scene-graph.ts`, which owns document STRUCTURE (which element becomes
 * which node, and where). This owns VALUE translation for one node, and it is where the
 * "CSS wins for CSS-expressible properties" half of the precedence rule lives — see the
 * round-trip contract in `packages/docs/development/round-trip.md`.
 */

const DOM_CSS_PLUGIN_ID = 'open-pencil-dom-css'
const IMAGE_SOURCE_URL_KEY = 'image-source-url'

function firstCSSNumber(style: DesignStyleDeclaration, ...properties: string[]): number | null {
  for (const property of properties) {
    const parsed = parseCSSNumber(pickStyle(style, property))
    if (parsed !== null) return parsed
  }
  return null
}

function fillsFromStyle(style: DesignStyleDeclaration, property: string): Fill[] {
  return colorToFillFromCSS(pickStyle(style, property))
}

function aspectRatioFromCSS(value: string | undefined): number | null {
  if (!value || value === 'auto') return null
  const parts = value
    .split('/')
    .map((part) => Number.parseFloat(part.trim()))
    .filter(Number.isFinite)
  if (parts.length === 1 && parts[0] > 0) return parts[0]
  if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) return parts[0] / parts[1]
  return null
}

function setNodeBox(node: SceneNode, style: DesignStyleDeclaration): void {
  const width = firstCSSNumber(style, 'width')
  const height = firstCSSNumber(style, 'height')
  const minWidth = firstCSSNumber(style, 'min-width')
  const maxWidth = firstCSSNumber(style, 'max-width')
  const minHeight = firstCSSNumber(style, 'min-height')
  const maxHeight = firstCSSNumber(style, 'max-height')
  const aspectRatio = aspectRatioFromCSS(pickStyle(style, 'aspect-ratio'))
  if (width !== null) node.width = width
  if (height !== null) node.height = height
  if (height === null && width !== null && aspectRatio !== null) node.height = width / aspectRatio
  if (width === null && height !== null && aspectRatio !== null) node.width = height * aspectRatio
  if (minWidth !== null) node.minWidth = minWidth
  if (maxWidth !== null) node.maxWidth = maxWidth
  if (minHeight !== null) node.minHeight = minHeight
  if (maxHeight !== null) node.maxHeight = maxHeight
}

function firstStrokeColor(style: DesignStyleDeclaration) {
  return (
    pickStyle(style, 'border-color') ??
    pickStyle(style, 'border-top-color') ??
    pickStyle(style, 'border-right-color') ??
    pickStyle(style, 'border-bottom-color') ??
    pickStyle(style, 'border-left-color') ??
    // Longhands first, then the shorthand — a longhand is the more specific statement.
    parseBorderShorthand(pickStyle(style, 'border')).color
  )
}

function strokeWeightFromStyle(style: DesignStyleDeclaration) {
  const borderWidth = firstCSSNumber(style, 'border-width')
  if (borderWidth !== null) return borderWidth

  const sideWeights = [
    firstCSSNumber(style, 'border-top-width'),
    firstCSSNumber(style, 'border-right-width'),
    firstCSSNumber(style, 'border-bottom-width'),
    firstCSSNumber(style, 'border-left-width')
  ].filter((weight): weight is number => weight !== null)
  if (sideWeights.length === 0) {
    const shorthand = parseBorderShorthand(pickStyle(style, 'border')).width
    return shorthand === undefined ? null : parseCSSNumber(shorthand)
  }
  return Math.max(...sideWeights)
}

function borderStyleFromCSS(style: DesignStyleDeclaration): string | undefined {
  return (
    pickStyle(style, 'border-style') ??
    pickStyle(style, 'border-top-style') ??
    pickStyle(style, 'border-right-style') ??
    pickStyle(style, 'border-bottom-style') ??
    pickStyle(style, 'border-left-style') ??
    parseBorderShorthand(pickStyle(style, 'border')).style
  )
}

function dashPatternFromCSS(style: DesignStyleDeclaration, strokeWeight: number): number[] {
  const borderStyle = borderStyleFromCSS(style)
  if (borderStyle === 'dashed') return [strokeWeight * 3, strokeWeight * 2]
  if (borderStyle === 'dotted') return [strokeWeight, strokeWeight]
  return []
}

function setBorderWeights(node: SceneNode, style: DesignStyleDeclaration, stroke: Stroke): void {
  const top = firstCSSNumber(style, 'border-top-width') ?? stroke.weight
  const right = firstCSSNumber(style, 'border-right-width') ?? stroke.weight
  const bottom = firstCSSNumber(style, 'border-bottom-width') ?? stroke.weight
  const left = firstCSSNumber(style, 'border-left-width') ?? stroke.weight
  node.borderTopWeight = top
  node.borderRightWeight = right
  node.borderBottomWeight = bottom
  node.borderLeftWeight = left
  node.independentStrokeWeights = [top, right, bottom, left].some(
    (weight) => weight !== stroke.weight
  )
}

function applyCornerRadii(node: SceneNode, style: DesignStyleDeclaration): void {
  const cornerRadius = firstCSSNumber(style, 'border-radius')
  const topLeft = firstCSSNumber(style, 'border-top-left-radius')
  const topRight = firstCSSNumber(style, 'border-top-right-radius')
  const bottomRight = firstCSSNumber(style, 'border-bottom-right-radius')
  const bottomLeft = firstCSSNumber(style, 'border-bottom-left-radius')

  if (cornerRadius !== null) node.cornerRadius = cornerRadius
  if (topLeft === null && topRight === null && bottomRight === null && bottomLeft === null) return

  const fallback = cornerRadius ?? 0
  node.topLeftRadius = topLeft ?? fallback
  node.topRightRadius = topRight ?? fallback
  node.bottomRightRadius = bottomRight ?? fallback
  node.bottomLeftRadius = bottomLeft ?? fallback
  node.independentCorners = [
    node.topLeftRadius,
    node.topRightRadius,
    node.bottomRightRadius,
    node.bottomLeftRadius
  ].some((radius) => radius !== fallback)
}

function primaryAxisAlignFromCSS(value: string | undefined): SceneNode['primaryAxisAlign'] {
  if (value === 'center') return 'CENTER'
  if (value === 'end' || value === 'flex-end') return 'MAX'
  if (value === 'space-between') return 'SPACE_BETWEEN'
  return 'MIN'
}

function counterAxisAlignFromCSS(value: string | undefined): SceneNode['counterAxisAlign'] {
  if (value === 'center') return 'CENTER'
  if (value === 'end' || value === 'flex-end') return 'MAX'
  if (value === 'stretch') return 'STRETCH'
  if (value === 'baseline') return 'BASELINE'
  return 'MIN'
}

function layoutAlignSelfFromCSS(value: string | undefined): SceneNode['layoutAlignSelf'] {
  if (value === 'center') return 'CENTER'
  if (value === 'end' || value === 'flex-end') return 'MAX'
  if (value === 'stretch') return 'STRETCH'
  if (value === 'baseline') return 'BASELINE'
  if (value === 'start' || value === 'flex-start') return 'MIN'
  return 'AUTO'
}

function textCaseFromCSS(value: string | undefined): SceneNode['textCase'] {
  if (value === 'uppercase') return 'UPPER'
  if (value === 'lowercase') return 'LOWER'
  if (value === 'capitalize') return 'TITLE'
  return 'ORIGINAL'
}

function applyFlexGap(node: SceneNode, style: DesignStyleDeclaration): void {
  const gap = firstCSSNumber(style, 'gap')
  const rowGap = firstCSSNumber(style, 'row-gap')
  const columnGap = firstCSSNumber(style, 'column-gap')
  const isHorizontal = node.layoutMode === 'HORIZONTAL'
  const isWrapped = node.layoutWrap === 'WRAP'

  node.itemSpacing = (isHorizontal ? columnGap : rowGap) ?? gap ?? 0
  node.counterAxisSpacing = (isHorizontal ? rowGap : columnGap) ?? (isWrapped ? (gap ?? 0) : 0)
}

function applyPositioning(node: SceneNode, style: DesignStyleDeclaration): void {
  const position = pickStyle(style, 'position')
  if (position === 'absolute' || position === 'fixed') node.layoutPositioning = 'ABSOLUTE'

  const left = firstCSSNumber(style, 'left')
  const top = firstCSSNumber(style, 'top')
  if (left !== null) node.x = left
  if (top !== null) node.y = top
}

function applyPadding(node: SceneNode, style: DesignStyleDeclaration): void {
  node.paddingTop = firstCSSNumber(style, 'padding-top', 'padding-block', 'padding') ?? 0
  node.paddingRight = firstCSSNumber(style, 'padding-right', 'padding-inline', 'padding') ?? 0
  node.paddingBottom = firstCSSNumber(style, 'padding-bottom', 'padding-block', 'padding') ?? 0
  node.paddingLeft = firstCSSNumber(style, 'padding-left', 'padding-inline', 'padding') ?? 0
}

function imageScaleModeFromObjectFit(value: string | undefined): ImageScaleMode | null {
  if (value === 'contain' || value === 'scale-down') return 'FIT'
  if (value === 'cover') return 'FILL'
  return null
}

function bytesFromDataURL(value: string | undefined): Uint8Array | null {
  if (!value?.startsWith('data:')) return null
  const commaIndex = value.indexOf(',')
  if (commaIndex === -1) return null
  const metadata = value.slice(0, commaIndex)
  const body = value.slice(commaIndex + 1)
  if (!metadata.endsWith(';base64')) return null
  return decodeBase64(body)
}

function applyImageFill(
  graph: SceneGraph,
  node: SceneNode,
  element: DesignElement,
  style: DesignStyleDeclaration
): void {
  if (element.tagName.toLowerCase() !== 'img') return
  const source = element.attrs.src
  const bytes = bytesFromDataURL(source)
  if (!bytes) {
    if (source) {
      node.pluginData.push({
        pluginId: DOM_CSS_PLUGIN_ID,
        key: IMAGE_SOURCE_URL_KEY,
        value: source
      })
    }
    return
  }

  const imageHash = computeImageHash(bytes)
  graph.images.set(imageHash, bytes)
  node.fills = [
    {
      type: 'IMAGE',
      imageHash,
      imageScaleMode: imageScaleModeFromObjectFit(pickStyle(style, 'object-fit')) ?? 'FILL',
      color: TRANSPARENT,
      opacity: 1,
      visible: true
    }
  ]
}

/** Parse one CSS grid track back into the scene graph's track shape. */
function gridTrackFromCSS(token: string): { sizing: 'FIXED' | 'FR' | 'AUTO'; value: number } {
  const trimmed = token.trim()
  if (trimmed === 'auto') return { sizing: 'AUTO', value: 0 }
  if (trimmed.endsWith('fr')) return { sizing: 'FR', value: Number.parseFloat(trimmed) || 0 }
  return { sizing: 'FIXED', value: parseCSSNumber(trimmed) ?? 0 }
}

function applyGridLayout(node: SceneNode, style: DesignStyleDeclaration): void {
  node.layoutMode = 'GRID'
  const columns = pickStyle(style, 'grid-template-columns')
  const rows = pickStyle(style, 'grid-template-rows')
  if (columns) node.gridTemplateColumns = columns.trim().split(/\s+/).map(gridTrackFromCSS)
  if (rows) node.gridTemplateRows = rows.trim().split(/\s+/).map(gridTrackFromCSS)

  const columnGap = parseCSSNumber(pickStyle(style, 'column-gap'))
  if (columnGap !== null) node.gridColumnGap = columnGap
  const rowGap = parseCSSNumber(pickStyle(style, 'row-gap'))
  if (rowGap !== null) node.gridRowGap = rowGap
}

/** Inverse of the export-side blend map. */
const BLEND_MODE_FROM_CSS: Record<string, string> = {
  darken: 'DARKEN',
  multiply: 'MULTIPLY',
  'color-burn': 'COLOR_BURN',
  lighten: 'LIGHTEN',
  screen: 'SCREEN',
  'color-dodge': 'COLOR_DODGE',
  overlay: 'OVERLAY',
  'soft-light': 'SOFT_LIGHT',
  'hard-light': 'HARD_LIGHT',
  difference: 'DIFFERENCE',
  exclusion: 'EXCLUSION',
  hue: 'HUE',
  saturation: 'SATURATION',
  color: 'COLOR',
  luminosity: 'LUMINOSITY'
}

/**
 * Read back rotation, flips and `mix-blend-mode`.
 *
 * The authored inline transform is preferred when present: it is the exact functional form
 * the exporter wrote. Otherwise the computed value is used, which a browser always reports
 * as a matrix — see `transform.ts`.
 */
function applyTransformAndBlend(
  node: SceneNode,
  element: DesignElement,
  style: DesignStyleDeclaration
): void {
  const transform =
    transformFactsFromCSS(pickStyle(element.inlineStyle, 'transform')) ??
    transformFactsFromCSS(pickStyle(style, 'transform'))
  if (transform) {
    node.rotation = transform.rotation
    if (transform.flipX) node.flipX = true
    if (transform.flipY) node.flipY = true
  }

  const blend = pickStyle(style, 'mix-blend-mode')
  const mapped = blend ? BLEND_MODE_FROM_CSS[blend.trim().toLowerCase()] : undefined
  if (mapped) node.blendMode = mapped as SceneNode['blendMode']
}

export function applyElementStyle(
  graph: SceneGraph,
  node: SceneNode,
  element: DesignElement,
  style: DesignStyleDeclaration
): void {
  setNodeBox(node, style)
  applyPositioning(node, style)
  applyPadding(node, style)
  applyTransformAndBlend(node, element, style)

  const fills = fillsFromStyle(style, 'background-color')
  if (fills.length > 0) node.fills = fills
  applyImageFill(graph, node, element, style)

  const strokes = colorToStrokeFromCSS(
    firstStrokeColor(style),
    strokeWeightFromStyle(style)?.toString()
  )
  if (strokes.length > 0) {
    const dashPattern = dashPatternFromCSS(style, strokes[0].weight)
    if (dashPattern.length > 0) {
      strokes[0].dashPattern = dashPattern
      node.dashPattern = dashPattern
    }
    node.strokes = strokes
    setBorderWeights(node, style, strokes[0])
  }

  const effects = dropShadowFromCSS(pickStyle(style, 'box-shadow'))
  if (effects.length > 0) node.effects = effects

  const opacity = parseCSSNumber(pickStyle(style, 'opacity'))
  if (opacity !== null) node.opacity = opacity

  applyCornerRadii(node, style)

  const overflow = pickStyle(style, 'overflow')
  if (overflow === 'hidden' || overflow === 'clip') node.clipsContent = true

  const alignSelf = layoutAlignSelfFromCSS(pickStyle(style, 'align-self'))
  if (alignSelf !== 'AUTO') node.layoutAlignSelf = alignSelf

  const display = pickStyle(style, 'display')
  if (display === 'grid' || display === 'inline-grid') {
    // Padding is already applied unconditionally at the top of this function.
    applyGridLayout(node, style)
  } else if (display === 'flex' || display === 'inline-flex') {
    node.layoutMode = pickStyle(style, 'flex-direction') === 'column' ? 'VERTICAL' : 'HORIZONTAL'
    node.primaryAxisAlign = primaryAxisAlignFromCSS(pickStyle(style, 'justify-content'))
    node.counterAxisAlign = counterAxisAlignFromCSS(pickStyle(style, 'align-items'))
    node.layoutWrap = pickStyle(style, 'flex-wrap') === 'wrap' ? 'WRAP' : 'NO_WRAP'
    applyFlexGap(node, style)
  }
}

export function applyTextStyle(node: SceneNode, style: DesignStyleDeclaration): void {
  setNodeBox(node, style)
  applyPositioning(node, style)

  const fills = fillsFromStyle(style, 'color')
  if (fills.length > 0) node.fills = fills

  const fontSize = parseCSSNumber(pickStyle(style, 'font-size'))
  if (fontSize !== null) node.fontSize = fontSize

  const fontWeight = parseCSSNumber(pickStyle(style, 'font-weight'))
  if (fontWeight !== null) node.fontWeight = fontWeight

  const lineHeight = parseCSSNumber(pickStyle(style, 'line-height'))
  if (lineHeight !== null) node.lineHeight = lineHeight

  const letterSpacing = parseCSSNumber(pickStyle(style, 'letter-spacing'))
  if (letterSpacing !== null) node.letterSpacing = letterSpacing

  const opacity = parseCSSNumber(pickStyle(style, 'opacity'))
  if (opacity !== null) node.opacity = opacity

  const effects = dropShadowFromCSS(pickStyle(style, 'text-shadow'))
  if (effects.length > 0) node.effects = effects

  const fontFamily = pickStyle(style, 'font-family')
  if (fontFamily)
    node.fontFamily = fontFamily.split(',')[0]?.replaceAll('"', '').trim() || node.fontFamily

  node.italic = pickStyle(style, 'font-style') === 'italic'

  const textAlign = pickStyle(style, 'text-align')?.toUpperCase()
  if (textAlign === 'CENTER' || textAlign === 'RIGHT' || textAlign === 'JUSTIFIED') {
    node.textAlignHorizontal = textAlign
  }

  const textDecoration = pickStyle(style, 'text-decoration-line')
  if (textDecoration === 'underline') node.textDecoration = 'UNDERLINE'
  if (textDecoration === 'line-through') node.textDecoration = 'STRIKETHROUGH'

  const textCase = textCaseFromCSS(pickStyle(style, 'text-transform'))
  if (textCase !== 'ORIGINAL') node.textCase = textCase

  if (pickStyle(style, 'white-space') === 'nowrap') node.maxLines = 1
}

export function hasBoxStyle(style: DesignStyleDeclaration): boolean {
  return [
    'aspect-ratio',
    'background-color',
    'border-color',
    'border-style',
    'border-width',
    'border-top-style',
    'border-top-width',
    'border-right-style',
    'border-right-width',
    'border-bottom-style',
    'border-bottom-width',
    'border-left-style',
    'border-left-width',
    'border-radius',
    'box-shadow',
    'display',
    'height',
    'padding',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'padding-block',
    'padding-inline',
    'width',
    'min-width',
    'max-width',
    'min-height',
    'max-height',
    'object-fit',
    'overflow',
    'position',
    'top',
    'right',
    'bottom',
    'left',
    'flex-wrap',
    'align-self'
  ].some((property) => pickStyle(style, property) !== undefined)
}
