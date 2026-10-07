import type {
  Effect,
  Fill,
  MotionProperty,
  NodeType,
  SceneNode,
  Stroke
} from '@open-pencil/scene-graph'
import type { Color } from '@open-pencil/scene-graph/primitives'

/**
 * Pure interpolation between two visual states of a node.
 *
 * A snapshot holds only the fields motion can touch. Numbers interpolate linearly; paints
 * and effects interpolate channel by channel when both sides have the same structure, and
 * otherwise switch at the midpoint (a structural change has no in-between). Progress may
 * leave [0, 1] for overshooting curves; colours and opacity are clamped, sizes stay ≥ 0.
 */

export const MOTION_NUMERIC_FIELDS = [
  'opacity',
  'x',
  'y',
  'width',
  'height',
  'rotation',
  'cornerRadius',
  'topLeftRadius',
  'topRightRadius',
  'bottomRightRadius',
  'bottomLeftRadius',
  'borderTopWeight',
  'borderRightWeight',
  'borderBottomWeight',
  'borderLeftWeight',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'itemSpacing',
  'counterAxisSpacing'
] as const satisfies readonly (keyof SceneNode)[]

export type MotionNumericField = (typeof MOTION_NUMERIC_FIELDS)[number]

export const MOTION_FIELDS = [
  ...MOTION_NUMERIC_FIELDS,
  'fills',
  'strokes',
  'effects',
  'visible'
] as const satisfies readonly (keyof SceneNode)[]

export type MotionField = (typeof MOTION_FIELDS)[number]

export type MotionSnapshot = Partial<Pick<SceneNode, MotionField>>

const NON_NEGATIVE = new Set<MotionField>([
  'width',
  'height',
  'cornerRadius',
  'topLeftRadius',
  'topRightRadius',
  'bottomRightRadius',
  'bottomLeftRadius',
  'borderTopWeight',
  'borderRightWeight',
  'borderBottomWeight',
  'borderLeftWeight',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft'
])

const PROPERTY_FIELDS: Record<
  Exclude<MotionProperty, 'all' | 'background-color' | 'color'>,
  MotionField[]
> = {
  opacity: ['opacity'],
  transform: ['rotation', 'x', 'y'],
  inset: ['x', 'y'],
  'border-color': ['strokes'],
  'border-width': [
    'strokes',
    'borderTopWeight',
    'borderRightWeight',
    'borderBottomWeight',
    'borderLeftWeight'
  ],
  'border-radius': [
    'cornerRadius',
    'topLeftRadius',
    'topRightRadius',
    'bottomRightRadius',
    'bottomLeftRadius'
  ],
  'box-shadow': ['effects'],
  width: ['width'],
  height: ['height'],
  padding: ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'],
  gap: ['itemSpacing', 'counterAxisSpacing']
}

/**
 * Snapshot fields a set of CSS properties animates on a node of `type`. `background-color`
 * covers the fills of boxes and `color` the fills of text, as in the DOM; `visible` never
 * animates (a display change is discrete).
 */
export function motionFieldsForProperties(
  properties: readonly MotionProperty[],
  type: NodeType
): Set<MotionField> {
  const fields = new Set<MotionField>()
  for (const property of properties) {
    if (property === 'all') {
      for (const field of MOTION_FIELDS) if (field !== 'visible') fields.add(field)
      continue
    }
    if (property === 'background-color') {
      if (type !== 'TEXT') fields.add('fills')
      continue
    }
    if (property === 'color') {
      if (type === 'TEXT') fields.add('fills')
      continue
    }
    for (const field of PROPERTY_FIELDS[property]) fields.add(field)
  }
  return fields
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function lerpColor(a: Color, b: Color, t: number): Color {
  return {
    r: clamp01(lerp(a.r, b.r, t)),
    g: clamp01(lerp(a.g, b.g, t)),
    b: clamp01(lerp(a.b, b.b, t)),
    a: clamp01(lerp(a.a, b.a, t))
  }
}

function sameStops(a: Fill, b: Fill): boolean {
  return (a.gradientStops?.length ?? 0) === (b.gradientStops?.length ?? 0)
}

function lerpFill(a: Fill, b: Fill, t: number): Fill | null {
  if (a.type !== b.type || !sameStops(a, b)) return null
  if (a.type === 'IMAGE' && a.imageHash !== b.imageHash) return null
  const fill: Fill = {
    ...(t < 0.5 ? a : b),
    color: lerpColor(a.color, b.color, t),
    opacity: clamp01(lerp(a.opacity, b.opacity, t))
  }
  if (a.gradientStops && b.gradientStops) {
    const to = b.gradientStops
    fill.gradientStops = a.gradientStops.map((stop, index) => ({
      color: lerpColor(stop.color, to[index].color, t),
      position: clamp01(lerp(stop.position, to[index].position, t))
    }))
  }
  return fill
}

/** Paint lists of one structure interpolate per entry; otherwise they switch at t = 0.5. */
export function lerpFills(a: readonly Fill[], b: readonly Fill[], t: number): Fill[] {
  if (a.length === b.length) {
    const fills = a.map((fill, index) => lerpFill(fill, b[index], t))
    if (fills.every((fill): fill is Fill => fill !== null)) return fills
  }
  return structuredClone([...(t < 0.5 ? a : b)])
}

export function lerpStrokes(a: readonly Stroke[], b: readonly Stroke[], t: number): Stroke[] {
  if (a.length !== b.length) return structuredClone([...(t < 0.5 ? a : b)])
  return a.map((stroke, index) => {
    const to = b[index]
    return {
      ...(t < 0.5 ? stroke : to),
      color: lerpColor(stroke.color, to.color, t),
      opacity: clamp01(lerp(stroke.opacity, to.opacity, t)),
      weight: Math.max(0, lerp(stroke.weight, to.weight, t))
    }
  })
}

export function lerpEffects(a: readonly Effect[], b: readonly Effect[], t: number): Effect[] {
  if (a.length !== b.length || a.some((effect, index) => effect.type !== b[index].type)) {
    return structuredClone([...(t < 0.5 ? a : b)])
  }
  return a.map((effect, index) => {
    const to = b[index]
    return {
      ...(t < 0.5 ? effect : to),
      color: lerpColor(effect.color, to.color, t),
      offset: {
        x: lerp(effect.offset.x, to.offset.x, t),
        y: lerp(effect.offset.y, to.offset.y, t)
      },
      radius: Math.max(0, lerp(effect.radius, to.radius, t)),
      spread: lerp(effect.spread, to.spread, t)
    }
  })
}

function interpolateField(
  field: MotionField,
  from: MotionSnapshot,
  to: MotionSnapshot,
  t: number
): MotionSnapshot[MotionField] {
  if (field === 'fills') return lerpFills(from.fills ?? [], to.fills ?? [], t)
  if (field === 'strokes') return lerpStrokes(from.strokes ?? [], to.strokes ?? [], t)
  if (field === 'effects') return lerpEffects(from.effects ?? [], to.effects ?? [], t)
  const a = from[field]
  const b = to[field]
  if (typeof a !== 'number' || typeof b !== 'number') return t < 0.5 ? a : b
  const value = lerp(a, b, t)
  if (field === 'opacity') return clamp01(value)
  return NON_NEGATIVE.has(field) ? Math.max(0, value) : value
}

/**
 * The state at eased progress `t` between `from` and `to`. Fields in `animated` interpolate;
 * every other field present in `to` takes its destination value immediately, the way a CSS
 * property without a transition jumps when the state changes.
 */
export function interpolateSnapshot(
  from: MotionSnapshot,
  to: MotionSnapshot,
  t: number,
  animated?: ReadonlySet<MotionField>
): MotionSnapshot {
  const result: Record<string, unknown> = {}
  for (const field of Object.keys(to) as MotionField[]) {
    if (field === 'visible' && Object.hasOwn(from, 'visible')) {
      // Appear at the start, disappear only once the motion completes (the final state).
      result.visible = to.visible === true ? true : from.visible
      continue
    }
    if (!Object.hasOwn(from, field) || (animated && !animated.has(field))) {
      result[field] = structuredClone(to[field])
      continue
    }
    result[field] = interpolateField(field, from, to, t)
  }
  return result as MotionSnapshot
}
