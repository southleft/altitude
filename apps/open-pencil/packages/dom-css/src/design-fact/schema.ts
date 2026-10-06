import * as v from 'valibot'

/**
 * Runtime shapes for design facts read back from markup.
 *
 * `data-op-*` attributes are meant to be read and edited by people and agents, so what comes
 * back is untrusted input. A fill of `{"type":"SOLID"}` has no colour, and a node holding it
 * breaks every consumer that reads `fill.color`. Entries are validated one at a time so one
 * bad paint is dropped and named without discarding its valid siblings. Assigning the output
 * to `DesignFact` (typed with scene-graph `Fill`/`Stroke`/`Effect`) keeps these shapes honest.
 */

const finite = v.pipe(v.number(), v.finite())
const unit = v.pipe(finite, v.minValue(0), v.maxValue(1))

const ColorSchema = v.object({ r: finite, g: finite, b: finite, a: unit })
const VectorSchema = v.object({ x: finite, y: finite })
const MatrixSchema = v.object({
  m00: finite,
  m01: finite,
  m02: finite,
  m10: finite,
  m11: finite,
  m12: finite
})

const BlendModeSchema = v.picklist([
  'NORMAL',
  'DARKEN',
  'MULTIPLY',
  'COLOR_BURN',
  'LIGHTEN',
  'SCREEN',
  'COLOR_DODGE',
  'OVERLAY',
  'SOFT_LIGHT',
  'HARD_LIGHT',
  'DIFFERENCE',
  'EXCLUSION',
  'HUE',
  'SATURATION',
  'COLOR',
  'LUMINOSITY',
  'PASS_THROUGH'
])

const PatternAlignmentSchema = v.picklist(['START', 'CENTER', 'END'])

export const FillSchema = v.object({
  type: v.picklist([
    'SOLID',
    'GRADIENT_LINEAR',
    'GRADIENT_RADIAL',
    'GRADIENT_ANGULAR',
    'GRADIENT_DIAMOND',
    'IMAGE',
    'VIDEO',
    'PATTERN',
    'NOISE',
    'CUSTOM'
  ]),
  color: ColorSchema,
  opacity: unit,
  visible: v.boolean(),
  blendMode: v.optional(BlendModeSchema),
  gradientStops: v.optional(v.array(v.object({ color: ColorSchema, position: finite }))),
  gradientTransform: v.optional(MatrixSchema),
  imageHash: v.optional(v.string()),
  imageScaleMode: v.optional(v.picklist(['FILL', 'FIT', 'CROP', 'TILE'])),
  imageTransform: v.optional(MatrixSchema),
  sourceNodeId: v.optional(v.string()),
  scale: v.optional(finite),
  spacing: v.optional(finite),
  patternSpacing: v.optional(VectorSchema),
  patternTileType: v.optional(
    v.picklist(['RECTANGULAR', 'HORIZONTAL_HEXAGONAL', 'VERTICAL_HEXAGONAL'])
  ),
  verticalAlignment: v.optional(PatternAlignmentSchema),
  horizontalAlignment: v.optional(PatternAlignmentSchema),
  noiseType: v.optional(v.picklist(['MULTITONE', 'MONOTONE', 'DUOTONE'])),
  density: v.optional(finite),
  noiseSize: v.optional(VectorSchema),
  customEffectId: v.optional(v.string())
})

export const StrokeSchema = v.object({
  color: ColorSchema,
  weight: v.pipe(finite, v.minValue(0)),
  opacity: unit,
  visible: v.boolean(),
  align: v.picklist(['INSIDE', 'CENTER', 'OUTSIDE']),
  cap: v.optional(v.picklist(['NONE', 'ROUND', 'SQUARE', 'ARROW_LINES', 'ARROW_EQUILATERAL'])),
  join: v.optional(v.picklist(['MITER', 'BEVEL', 'ROUND'])),
  dashPattern: v.optional(v.array(finite))
})

export const EffectSchema = v.object({
  type: v.picklist([
    'DROP_SHADOW',
    'INNER_SHADOW',
    'LAYER_BLUR',
    'BACKGROUND_BLUR',
    'FOREGROUND_BLUR'
  ]),
  color: ColorSchema,
  offset: VectorSchema,
  radius: finite,
  spread: finite,
  visible: v.boolean(),
  blendMode: v.optional(BlendModeSchema),
  showShadowBehindNode: v.optional(v.boolean())
})

export const VariableRefsSchema = v.record(
  v.string(),
  v.object({ id: v.string(), name: v.optional(v.string()), cssVar: v.optional(v.string()) })
)

export const StringRecordSchema = v.record(v.string(), v.string())

export const PositionSchema = v.object({ x: v.optional(finite), y: v.optional(finite) })

export const ResidualSchema = v.record(v.string(), v.unknown())

/** One rejected markup value: which attribute, and a short reason. */
export interface FactIssue {
  fact: string
  reason: string
}

export type FactIssueSink = (issue: FactIssue) => void

function issueSummary(issues: readonly v.BaseIssue<unknown>[]): string {
  const first = issues.at(0)
  if (!first) return 'invalid value'
  const path = first.path?.map((item) => String(item.key)).join('.')
  return path ? `${path}: ${first.message}` : first.message
}

/** Validate each entry of a markup array, keeping valid entries and reporting the rest. */
export function validateEntries<TSchema extends v.GenericSchema>(
  schema: TSchema,
  raw: unknown[],
  label: string,
  report: FactIssueSink
): v.InferOutput<TSchema>[] {
  const valid: v.InferOutput<TSchema>[] = []
  for (const [index, entry] of raw.entries()) {
    const result = v.safeParse(schema, entry)
    if (result.success) valid.push(result.output)
    else report({ fact: `${label}[${index}]`, reason: issueSummary(result.issues) })
  }
  return valid
}

/** Validate a whole markup value, reporting and discarding it on failure. */
export function validateValue<TSchema extends v.GenericSchema>(
  schema: TSchema,
  raw: unknown,
  label: string,
  report: FactIssueSink
): v.InferOutput<TSchema> | undefined {
  const result = v.safeParse(schema, raw)
  if (result.success) return result.output
  report({ fact: label, reason: issueSummary(result.issues) })
  return undefined
}
