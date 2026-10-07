import { isPlainObject } from 'es-toolkit/predicate'

/**
 * Code identity of a component: which element or framework component renders it, and how its
 * component properties and layers map onto that element's attributes and slots.
 *
 * Lives on COMPONENT and COMPONENT_SET nodes. Instances resolve it through their main
 * component (and that component's set), so it is never copied onto instances.
 */
export type CodeBindingPropType = 'enum' | 'boolean' | 'string' | 'number'

export interface CodeBindingProp {
  /** Component property name on the canvas, e.g. `Size` or `Text`. */
  property: string
  /** Attribute or property name on the element, e.g. `size` or `isPill`. */
  attribute: string
  type: CodeBindingPropType
  /**
   * Canvas value → code value. For a VARIANT axis this maps option labels (`Md` → `md`); a
   * label missing from the map omits the attribute. A boolean attribute uses `"true"` as the
   * code value. Absent for TEXT/BOOLEAN properties whose value passes through unchanged.
   */
  values?: Record<string, string>
}

export interface CodeBindingSlot {
  /** Slot name; `''` is the default slot. */
  slot: string
  /** TEXT, BOOLEAN or INSTANCE_SWAP component property that fills or toggles the slot. */
  property?: string
  /** Layer name inside the component that renders the slot placeholder. */
  layer?: string
}

export interface CodeBindingReact {
  importPath: string
  component: string
}

export interface CodeBinding {
  tagName: string
  /** Package that ships the element, e.g. `@southleft/al-web-components`. */
  package?: string
  /** Module that registers the element. */
  importPath?: string
  react?: CodeBindingReact
  props: CodeBindingProp[]
  slots: CodeBindingSlot[]
  /** Attributes the element always carries, e.g. an icon's `name`. */
  attributes?: Record<string, string>
  events?: string[]
  parts?: string[]
}

const PROP_TYPES: readonly CodeBindingPropType[] = ['enum', 'boolean', 'string', 'number']

function stringRecord(value: unknown): Record<string, string> | undefined {
  if (!isPlainObject(value)) return undefined
  const entries = Object.entries(value)
  if (!entries.every((entry): entry is [string, string] => typeof entry[1] === 'string')) {
    return undefined
  }
  return Object.fromEntries(entries)
}

function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.every((item): item is string => typeof item === 'string') ? [...value] : undefined
}

function parseProp(value: unknown): CodeBindingProp | null {
  if (!isPlainObject(value)) return null
  const { property, attribute, type, values } = value
  if (typeof property !== 'string' || typeof attribute !== 'string') return null
  const propType = PROP_TYPES.find((candidate) => candidate === type)
  if (!propType) return null
  const prop: CodeBindingProp = { property, attribute, type: propType }
  if (values !== undefined) {
    const parsed = stringRecord(values)
    if (!parsed) return null
    prop.values = parsed
  }
  return prop
}

function parseSlot(value: unknown): CodeBindingSlot | null {
  if (!isPlainObject(value) || typeof value.slot !== 'string') return null
  const slot: CodeBindingSlot = { slot: value.slot }
  if (typeof value.property === 'string') slot.property = value.property
  if (typeof value.layer === 'string') slot.layer = value.layer
  return slot
}

/**
 * Validate untrusted data (plugin data, markup attributes) as a code binding. Returns null
 * rather than a partial binding when any part is malformed: a half-read binding would emit
 * wrong attributes with confidence.
 */
export function parseCodeBinding(value: unknown): CodeBinding | null {
  if (!isPlainObject(value) || typeof value.tagName !== 'string' || !value.tagName) return null
  if (!Array.isArray(value.props) || !Array.isArray(value.slots)) return null
  const props = value.props.map(parseProp)
  const slots = value.slots.map(parseSlot)
  if (props.some((prop) => prop === null) || slots.some((slot) => slot === null)) return null
  const binding: CodeBinding = {
    tagName: value.tagName,
    props: props.filter((prop): prop is CodeBindingProp => prop !== null),
    slots: slots.filter((slot): slot is CodeBindingSlot => slot !== null)
  }
  if (typeof value.package === 'string') binding.package = value.package
  if (typeof value.importPath === 'string') binding.importPath = value.importPath
  if (isPlainObject(value.react)) {
    const { importPath, component } = value.react
    if (typeof importPath !== 'string' || typeof component !== 'string') return null
    binding.react = { importPath, component }
  }
  if (value.attributes !== undefined) {
    const attributes = stringRecord(value.attributes)
    if (!attributes) return null
    binding.attributes = attributes
  }
  for (const key of ['events', 'parts'] as const) {
    if (value[key] === undefined) continue
    const list = stringList(value[key])
    if (!list) return null
    binding[key] = list
  }
  return binding
}

export function copyCodeBinding(binding: CodeBinding | null): CodeBinding | null {
  return binding ? structuredClone(binding) : null
}
