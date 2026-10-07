import type { Color, SceneGraph, SceneNode, Stroke, Variable } from '@open-pencil/scene-graph'
import { BLACK } from '@open-pencil/scene-graph/constants'

import type { CSSTokens } from './plan/index'

/**
 * Bind contract tokens (CSS property → variable name) onto scene nodes.
 *
 * Every binding also writes the variable's resolved default-mode value as the literal, so the
 * component renders and lays out without a variable pass, and switching modes re-resolves.
 * A token with no canvas field is never guessed: it is recorded in `unbound` with the reason,
 * and Altitude's diff reports it as a token-binding disagreement.
 */

export interface BindContext {
  graph: SceneGraph
  variablesByName: ReadonlyMap<string, Variable>
  /** Variable name → why it could not be bound. */
  unbound: Map<string, string>
}

/** Node fields that hold a number (nullable ones included), the targets of numeric tokens. */
type NumberField = {
  [K in keyof SceneNode]-?: number extends SceneNode[K] ? K : never
}[keyof SceneNode]

/** CSS properties a TEXT descendant inherits from its ancestors. */
export const INHERITED_TEXT_PROPS = new Set([
  'color',
  'font-size',
  'line-height',
  'letter-spacing',
  'font-family',
  'font-weight',
  'font'
])

type Side = 'Top' | 'Right' | 'Bottom' | 'Left'
const ALL_SIDES: readonly Side[] = ['Top', 'Right', 'Bottom', 'Left']

const CORNER_FIELDS = [
  'topLeftRadius',
  'topRightRadius',
  'bottomLeftRadius',
  'bottomRightRadius'
] as const

const SIZE_FIELDS: Record<
  string,
  'width' | 'height' | 'minWidth' | 'minHeight' | 'maxWidth' | 'maxHeight'
> = {
  width: 'width',
  height: 'height',
  'min-width': 'minWidth',
  'min-height': 'minHeight',
  'max-width': 'maxWidth',
  'max-height': 'maxHeight'
}

const PADDING_FIELDS: Record<
  string,
  ReadonlyArray<'paddingTop' | 'paddingRight' | 'paddingBottom' | 'paddingLeft'>
> = {
  padding: ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'],
  'padding-top': ['paddingTop'],
  'padding-right': ['paddingRight'],
  'padding-bottom': ['paddingBottom'],
  'padding-left': ['paddingLeft'],
  'padding-block': ['paddingTop', 'paddingBottom'],
  'padding-inline': ['paddingLeft', 'paddingRight']
}

const UNBINDABLE: Record<string, string> = {
  'box-shadow': 'composite shadow token; OpenPencil effects have no variable binding',
  'background-image': 'gradient/image token; fills bind colours only',
  'z-index': 'canvas stacking is layer order, not a bindable field',
  'outline-offset': 'stroke offset has no canvas field',
  font: 'composite typography token; text styles are not generated',
  'font-weight': 'text weight is a font style, not a bindable field (contract-diff skips it)'
}

function sidesOf(cssProp: string): readonly Side[] | null {
  if (/^border(-width|-color|-style)?$/.test(cssProp)) return ALL_SIDES
  if (/^border-(top|block-start)(-|$)/.test(cssProp)) return ['Top']
  if (/^border-(bottom|block-end)(-|$)/.test(cssProp)) return ['Bottom']
  if (/^border-(left|inline-start)(-|$)/.test(cssProp)) return ['Left']
  if (/^border-(right|inline-end)(-|$)/.test(cssProp)) return ['Right']
  return null
}

function numberValue(ctx: BindContext, variable: Variable): number | undefined {
  return ctx.graph.resolveNumberVariable(variable.id)
}

function colorValue(ctx: BindContext, variable: Variable): Color {
  return ctx.graph.resolveColorVariable(variable.id) ?? BLACK
}

function variableFor(ctx: BindContext, name: string): Variable | null {
  const variable = ctx.variablesByName.get(name)
  if (!variable && !ctx.unbound.has(name)) ctx.unbound.set(name, 'not in the imported tokens')
  return variable ?? null
}

function bind(ctx: BindContext, node: SceneNode, field: string, variable: Variable): void {
  ctx.graph.bindVariable(node.id, field, variable.id)
}

function bindNumber(
  ctx: BindContext,
  node: SceneNode,
  fields: readonly NumberField[],
  variable: Variable,
  transform: (value: number) => number = (value) => value
): void {
  const value = numberValue(ctx, variable)
  if (value === undefined) {
    ctx.unbound.set(variable.name, `${variable.type} variable bound to a numeric field`)
    return
  }
  const changes: Partial<Record<NumberField, number>> = {}
  for (const field of fields) changes[field] = transform(value)
  ctx.graph.updateNode(node.id, changes)
  for (const field of fields) bind(ctx, node, field, variable)
}

function ensureStroke(
  ctx: BindContext,
  node: SceneNode,
  index: number,
  align: Stroke['align']
): void {
  const strokes = [...node.strokes]
  while (strokes.length <= index) {
    strokes.push({ color: { ...BLACK }, weight: 1, opacity: 1, visible: true, align })
  }
  ctx.graph.updateNode(node.id, { strokes })
}

function applyBorder(ctx: BindContext, node: SceneNode, cssProp: string, variable: Variable): void {
  const sides = sidesOf(cssProp) ?? ALL_SIDES
  ensureStroke(ctx, node, 0, 'INSIDE')
  if (variable.type === 'COLOR') {
    const strokes = node.strokes.map((stroke, i) =>
      i === 0 ? { ...stroke, color: colorValue(ctx, variable) } : stroke
    )
    ctx.graph.updateNode(node.id, { strokes })
    bind(ctx, node, 'strokes/0/color', variable)
    return
  }
  const value = numberValue(ctx, variable)
  if (value === undefined) {
    ctx.unbound.set(variable.name, `${variable.type} variable on ${cssProp}`)
    return
  }
  const uniform = sides.length === 4
  const changes: Partial<SceneNode> = {
    independentStrokeWeights: !uniform || node.independentStrokeWeights,
    strokes: node.strokes.map((stroke, i) => (i === 0 ? { ...stroke, weight: value } : stroke))
  }
  if (!uniform && !node.independentStrokeWeights) {
    for (const side of ALL_SIDES) changes[`border${side}Weight`] = 0
  }
  for (const side of sides) changes[`border${side}Weight`] = value
  ctx.graph.updateNode(node.id, changes)
  for (const side of sides) bind(ctx, node, `border${side}Weight`, variable)
}

/** Focus outline: an OUTSIDE stroke after any border. */
function applyOutline(
  ctx: BindContext,
  node: SceneNode,
  cssProp: string,
  variable: Variable
): void {
  const hasBorder = node.strokes.some((stroke) => stroke.align === 'INSIDE')
  const index = hasBorder ? 1 : 0
  ensureStroke(ctx, node, index, 'OUTSIDE')
  if (variable.type === 'COLOR') {
    const strokes = node.strokes.map((stroke, i) =>
      i === index ? { ...stroke, color: colorValue(ctx, variable) } : stroke
    )
    ctx.graph.updateNode(node.id, { strokes })
    bind(ctx, node, `strokes/${index}/color`, variable)
    return
  }
  const value = numberValue(ctx, variable)
  if (value === undefined) return
  const strokes = node.strokes.map((stroke, i) =>
    i === index ? { ...stroke, weight: value } : stroke
  )
  ctx.graph.updateNode(node.id, { strokes })
  if (index === 0) {
    for (const side of ALL_SIDES) bind(ctx, node, `border${side}Weight`, variable)
  } else if (!ctx.unbound.has(variable.name)) {
    ctx.unbound.set(
      variable.name,
      'outline width on a node that also has a border: one stroke-weight binding per node'
    )
  }
}

function applyFill(ctx: BindContext, node: SceneNode, variable: Variable): void {
  if (variable.type !== 'COLOR') {
    ctx.unbound.set(variable.name, `${variable.type} variable on a fill`)
    return
  }
  ctx.graph.updateNode(node.id, {
    fills: [{ type: 'SOLID', color: colorValue(ctx, variable), opacity: 1, visible: true }]
  })
  bind(ctx, node, 'fills/0/color', variable)
}

/** Box (non-inherited) CSS properties on a frame. */
export function applyBoxTokens(ctx: BindContext, node: SceneNode, tokens: CSSTokens): void {
  // Cascade order (later layers win), outlines last so they know whether a border exists.
  const ordered = Object.entries(tokens).sort(([a], [b]) => outlineLast(a) - outlineLast(b))
  for (const [cssProp, name] of ordered) {
    if (INHERITED_TEXT_PROPS.has(cssProp) && cssProp !== 'font-weight') continue
    const variable = variableFor(ctx, name)
    if (!variable) continue
    const current = ctx.graph.getNode(node.id) ?? node
    applyBoxToken(ctx, current, cssProp, variable)
  }
}

function outlineLast(cssProp: string): number {
  return cssProp.startsWith('outline') ? 1 : 0
}

function applySizeToken(
  ctx: BindContext,
  node: SceneNode,
  cssProp: string,
  variable: Variable
): void {
  const field = SIZE_FIELDS[cssProp]
  if (field === 'width' || field === 'height') {
    const primary = (field === 'width') === (node.layoutMode === 'HORIZONTAL')
    ctx.graph.updateNode(
      node.id,
      primary ? { primaryAxisSizing: 'FIXED' } : { counterAxisSizing: 'FIXED' }
    )
  }
  bindNumber(ctx, node, [field], variable)
}

function applyRadiusToken(
  ctx: BindContext,
  node: SceneNode,
  cssProp: string,
  variable: Variable
): void {
  if (cssProp === 'border-radius') {
    bindNumber(ctx, node, ['cornerRadius', ...CORNER_FIELDS], variable)
    return
  }
  const corner = /^border-(top|bottom)-(left|right)-radius$/.exec(cssProp)
  const field = CORNER_FIELDS.find(
    (candidate) => candidate.toLowerCase() === `${corner?.[1]}${corner?.[2]}radius`
  )
  if (field) bindNumber(ctx, node, [field], variable)
}

function applyGapToken(
  ctx: BindContext,
  node: SceneNode,
  cssProp: string,
  variable: Variable
): void {
  const along =
    cssProp === 'gap' || (cssProp === 'column-gap') === (node.layoutMode === 'HORIZONTAL')
  bindNumber(ctx, node, [along ? 'itemSpacing' : 'counterAxisSpacing'], variable)
}

type TokenBinder = (ctx: BindContext, node: SceneNode, cssProp: string, variable: Variable) => void

const ICON_PROPS = new Set(['--al-icon-fill', '--al-icon-width', '--al-icon-height'])

/** The binder for a box CSS property, or null when the canvas has no field for it. */
function binderFor(cssProp: string): TokenBinder | null {
  if (cssProp === 'background-color')
    return (ctx, node, _, variable) => applyFill(ctx, node, variable)
  if (cssProp === 'opacity') {
    return (ctx, node, _, variable) =>
      bindNumber(ctx, node, ['opacity'], variable, (v) => (v > 1 ? v / 100 : v))
  }
  if (cssProp in PADDING_FIELDS) {
    return (ctx, node, prop, variable) => bindNumber(ctx, node, PADDING_FIELDS[prop], variable)
  }
  if (cssProp in SIZE_FIELDS) return applySizeToken
  if (/^border(-[a-z]+-[a-z]+)?-radius$/.test(cssProp)) return applyRadiusToken
  if (cssProp === 'gap' || cssProp === 'column-gap' || cssProp === 'row-gap') return applyGapToken
  if (cssProp.startsWith('outline')) return applyOutline
  if (cssProp.startsWith('border')) return applyBorder
  if (ICON_PROPS.has(cssProp)) return applyIconToken
  return null
}

function applyBoxToken(
  ctx: BindContext,
  node: SceneNode,
  cssProp: string,
  variable: Variable
): void {
  const reason = UNBINDABLE[cssProp] ? `${cssProp}: ${UNBINDABLE[cssProp]}` : null
  const binder = reason ? null : binderFor(cssProp)
  if (binder) {
    binder(ctx, node, cssProp, variable)
    return
  }
  if (!ctx.unbound.has(variable.name))
    ctx.unbound.set(variable.name, reason ?? `${cssProp}: no canvas field`)
}

/** `--al-icon-*` custom properties style the icon instances inside the node. */
function applyIconToken(
  ctx: BindContext,
  node: SceneNode,
  cssProp: string,
  variable: Variable
): void {
  const glyph = (child: SceneNode) =>
    (child.type === 'INSTANCE' && child.name.startsWith('Icon ')) || child.name === 'svg'
  const found = descendants(ctx.graph, node).filter(glyph)
  const icons = found.length || !glyph(node) ? found : [node]
  if (!icons.length) {
    if (!ctx.unbound.has(variable.name))
      ctx.unbound.set(variable.name, `${cssProp}: the node has no icon slot`)
    return
  }
  for (const icon of icons) {
    if (cssProp === '--al-icon-fill') applyFill(ctx, icon, variable)
    else bindNumber(ctx, icon, [cssProp === '--al-icon-width' ? 'width' : 'height'], variable)
  }
}

function descendants(graph: SceneGraph, node: SceneNode): SceneNode[] {
  const out: SceneNode[] = []
  for (const child of graph.getChildren(node.id)) out.push(child, ...descendants(graph, child))
  return out
}

const TEXT_NUMBER_FIELDS: Record<string, 'fontSize' | 'lineHeight'> = {
  'font-size': 'fontSize',
  'line-height': 'lineHeight'
}

/** Inherited typography and colour on a TEXT node (or an icon instance, for colour). */
export function applyTextTokens(ctx: BindContext, node: SceneNode, tokens: CSSTokens): void {
  for (const [cssProp, name] of Object.entries(tokens)) {
    if (!INHERITED_TEXT_PROPS.has(cssProp)) continue
    if (node.type !== 'TEXT' && cssProp !== 'color') continue
    const variable = variableFor(ctx, name)
    if (!variable) continue
    if (cssProp === 'color') {
      applyFill(ctx, node, variable)
      continue
    }
    if (UNBINDABLE[cssProp]) {
      if (!ctx.unbound.has(name)) ctx.unbound.set(name, `${cssProp}: ${UNBINDABLE[cssProp]}`)
      if (cssProp === 'font-weight') {
        const weight = numberValue(ctx, variable)
        if (weight !== undefined && weight >= 100)
          ctx.graph.updateNode(node.id, { fontWeight: weight })
      }
      continue
    }
    if (cssProp === 'font-family') {
      const value = ctx.graph.resolveVariable(variable.id)
      if (typeof value === 'string')
        ctx.graph.updateNode(node.id, {
          fontFamily: value.split(',')[0].replace(/['"]/g, '').trim()
        })
      bind(ctx, node, 'fontFamily', variable)
      continue
    }
    const field = TEXT_NUMBER_FIELDS[cssProp] ?? 'letterSpacing'
    const fontSize = node.fontSize
    bindNumber(ctx, node, [field], variable, (value) =>
      field === 'lineHeight' && value < 4 ? value * fontSize : value
    )
  }
}
