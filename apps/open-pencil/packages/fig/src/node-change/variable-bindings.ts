import type {
  VariableAnyValue,
  VariableConsumptionEntry,
  VariableDataEntry
} from '@open-pencil/kiwi/fig/codec'
import { guidToString } from '@open-pencil/kiwi/fig/guid'
import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'

export const VARIABLE_BINDING_FIELDS: Record<string, string> = {
  cornerRadius: 'CORNER_RADIUS',
  topLeftRadius: 'RECTANGLE_TOP_LEFT_CORNER_RADIUS',
  topRightRadius: 'RECTANGLE_TOP_RIGHT_CORNER_RADIUS',
  bottomLeftRadius: 'RECTANGLE_BOTTOM_LEFT_CORNER_RADIUS',
  bottomRightRadius: 'RECTANGLE_BOTTOM_RIGHT_CORNER_RADIUS',
  strokeWeight: 'STROKE_WEIGHT',
  borderTopWeight: 'BORDER_TOP_WEIGHT',
  borderBottomWeight: 'BORDER_BOTTOM_WEIGHT',
  borderLeftWeight: 'BORDER_LEFT_WEIGHT',
  borderRightWeight: 'BORDER_RIGHT_WEIGHT',
  itemSpacing: 'STACK_SPACING',
  paddingLeft: 'STACK_PADDING_LEFT',
  paddingTop: 'STACK_PADDING_TOP',
  paddingRight: 'STACK_PADDING_RIGHT',
  paddingBottom: 'STACK_PADDING_BOTTOM',
  counterAxisSpacing: 'STACK_COUNTER_SPACING',
  gridRowGap: 'GRID_ROW_GAP',
  gridColumnGap: 'GRID_COLUMN_GAP',
  visible: 'VISIBLE',
  opacity: 'OPACITY',
  width: 'WIDTH',
  height: 'HEIGHT',
  minWidth: 'MIN_WIDTH',
  maxWidth: 'MAX_WIDTH',
  minHeight: 'MIN_HEIGHT',
  maxHeight: 'MAX_HEIGHT',
  x: 'X_POSITION',
  y: 'Y_POSITION',
  rotation: 'ROTATION',
  fontSize: 'FONT_SIZE',
  letterSpacing: 'LETTER_SPACING',
  lineHeight: 'LINE_HEIGHT',
  fontFamily: 'FONT_FAMILY',
  fontStyle: 'FONT_STYLE'
}

export const VARIABLE_BINDING_FIELDS_INVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(VARIABLE_BINDING_FIELDS).map(([field, kiwiField]) => [kiwiField, field])
)

export interface ResolvedVariableConsumption {
  field: string
  variableId: string
}

export type VariableAliasReference = NonNullable<VariableAnyValue['alias']>

export interface VariableConsumptionAlias {
  field: string
  alias: VariableAliasReference
}

/**
 * The bound field and variable alias of a consumption entry. The alias is a local GUID or,
 * for a subscribed library variable, an asset key the importer maps to its local copy.
 * `FONT_STYLE` nests its alias inside `fontStyleValue.asString`.
 */
export function variableConsumptionAlias(
  entry: VariableConsumptionEntry
): VariableConsumptionAlias | undefined {
  const field = entry.variableField
    ? VARIABLE_BINDING_FIELDS_INVERSE[entry.variableField]
    : undefined
  if (!field) return undefined
  const value = entry.variableData?.value as
    | (VariableAnyValue & { fontStyleValue?: { asString?: VariableDataEntry } })
    | undefined
  const alias = value?.alias ?? value?.fontStyleValue?.asString?.value?.alias
  return alias && (alias.guid || alias.assetRef) ? { field, alias } : undefined
}

export function resolveVariableConsumptionEntry(
  entry: VariableConsumptionEntry
): ResolvedVariableConsumption | undefined {
  const binding = variableConsumptionAlias(entry)
  const guid = binding?.alias.guid
  return binding && guid ? { field: binding.field, variableId: guidToString(guid) } : undefined
}

const NUMERIC_BINDING_FIELDS = new Set([
  'cornerRadius',
  'topLeftRadius',
  'topRightRadius',
  'bottomLeftRadius',
  'bottomRightRadius',
  'strokeWeight',
  'borderTopWeight',
  'borderBottomWeight',
  'borderLeftWeight',
  'borderRightWeight',
  'itemSpacing',
  'paddingLeft',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'counterAxisSpacing',
  'gridRowGap',
  'gridColumnGap',
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'x',
  'y',
  'rotation',
  'fontSize',
  'letterSpacing',
  'lineHeight'
])

export function resolvedNumericBindingUpdate(
  field: string,
  value: number
): Partial<SceneNode> | undefined {
  if (field === 'opacity') return { opacity: Math.max(0, Math.min(1, value / 100)) }
  return NUMERIC_BINDING_FIELDS.has(field) ? { [field]: value } : undefined
}

function rawConsumptionEntries(node: SceneNode): VariableConsumptionEntry[] {
  const raw = node.source.fig.rawNodeFields.variableConsumptionMap as
    | { entries?: VariableConsumptionEntry[] }
    | undefined
  return raw?.entries ?? []
}

/**
 * Source consumption entries that bind a subscribed library variable by asset key and are
 * still current, keyed by Kiwi field. An entry is kept verbatim while the node is still bound
 * to that library variable, or while it has no binding for the field and its bindings were
 * never edited (the library copy may be missing, or instance population may not carry it).
 */
export function rawLibraryBindingEntries(
  node: SceneNode,
  graph: SceneGraph
): Map<string, VariableConsumptionEntry> {
  const kept = new Map<string, VariableConsumptionEntry>()
  const entries = rawConsumptionEntries(node)
  if (entries.length === 0) return kept
  const bindingsEdited = node.source.editedFields.includes('boundVariables')
  for (const entry of entries) {
    const binding = variableConsumptionAlias(entry)
    const key = binding?.alias.assetRef?.key
    if (!binding || !key || !entry.variableField || kept.has(entry.variableField)) continue
    const boundId = node.boundVariables[binding.field]
    const bound = boundId ? graph.variables.get(boundId) : undefined
    if (bound ? bound.key === key : !boundId && !bindingsEdited)
      kept.set(entry.variableField, structuredClone(entry))
  }
  return kept
}

/** Keep the source file's entry order so unchanged bindings round-trip stably. */
export function inSourceBindingOrder(
  node: SceneNode,
  entries: VariableConsumptionEntry[]
): VariableConsumptionEntry[] {
  const order = new Map<string, number>()
  rawConsumptionEntries(node).forEach((entry, index) => {
    if (entry.variableField && !order.has(entry.variableField))
      order.set(entry.variableField, index)
  })
  if (order.size === 0) return entries
  const rank = (entry: VariableConsumptionEntry) =>
    order.get(entry.variableField ?? '') ?? Number.MAX_SAFE_INTEGER
  return entries.slice().sort((a, b) => rank(a) - rank(b))
}
