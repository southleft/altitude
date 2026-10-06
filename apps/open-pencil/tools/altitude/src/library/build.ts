import type {
  CodeBinding,
  ComponentPropertyDefinition,
  ComponentPropertyReference,
  LayoutAlign,
  LayoutCounterAlign,
  LayoutMode,
  SceneGraph,
  SceneNode,
  Variable
} from '@open-pencil/scene-graph'

import type { AnatomyNode } from './contract'
import {
  layerTokens,
  tokenNames,
  type ComponentPlan,
  type CSSTokens,
  type PlanVariant
} from './plan/index'
import { applyBoxTokens, applyTextTokens, INHERITED_TEXT_PROPS, type BindContext } from './style'

/**
 * Component plan → OpenPencil component set.
 *
 * Node ids come from the graph, but every component carries a stable `componentKey`
 * (`altitude/<tag>/<variant>`) and every property a stable id, so a library revision built
 * from the same Altitude inputs has the same content hash and update review shows only real
 * changes.
 */

export const LIBRARY_KEY_PREFIX = 'altitude'
const COMPONENT_COLOR = { r: 0x97 / 255, g: 0x47 / 255, b: 1, a: 1 }
const ICON_SIZE = 16
const SET_WIDTH = 1200

export interface BuildContext extends BindContext {
  pageId: string
  /** Built component sets by tag, for nested instances. */
  sets: Map<string, BuiltComponentSet>
  /** Icon placeholder components by name. */
  icons: Map<string, string>
}

export interface BuiltComponentSet {
  tag: string
  setId: string
  defaultComponentId: string
  variantCount: number
}

const slug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export const componentSetKey = (tag: string): string => `${LIBRARY_KEY_PREFIX}/${tag}`
export const iconKey = (name: string): string => `${LIBRARY_KEY_PREFIX}/icon/${slug(name)}`
const propertyId = (tag: string, name: string): string => `${tag}:${slug(name)}`

export function createBindContext(graph: SceneGraph, pageId: string): BuildContext {
  const variablesByName = new Map<string, Variable>()
  for (const variable of graph.variables.values()) {
    if (!variablesByName.has(variable.name)) variablesByName.set(variable.name, variable)
  }
  return { graph, pageId, variablesByName, unbound: new Map(), sets: new Map(), icons: new Map() }
}

/**
 * An icon placeholder: the component a slot's INSTANCE_SWAP property defaults to. It renders
 * a neutral glyph on the canvas and exports as `<al-icon name="…">`.
 */
export function ensureIconComponent(ctx: BuildContext, name: string): string {
  const existing = ctx.icons.get(name)
  if (existing) return existing
  const binding: CodeBinding = { tagName: 'al-icon', attributes: { name }, props: [], slots: [] }
  const icon = ctx.graph.createNode('COMPONENT', ctx.pageId, {
    name: `Icon/${name}`,
    componentKey: iconKey(name),
    codeBinding: binding,
    width: ICON_SIZE,
    height: ICON_SIZE,
    cornerRadius: ICON_SIZE / 2,
    topLeftRadius: ICON_SIZE / 2,
    topRightRadius: ICON_SIZE / 2,
    bottomLeftRadius: ICON_SIZE / 2,
    bottomRightRadius: ICON_SIZE / 2,
    fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2, a: 1 }, opacity: 1, visible: true }],
    isPublishable: true
  })
  ctx.icons.set(name, icon.id)
  return icon.id
}

function layoutModeOf(node: AnatomyNode): LayoutMode {
  const layout = node.layout
  if (!node.children?.length && !layout) return 'NONE'
  const display = layout?.display ?? 'block'
  if (display.includes('flex') || display.includes('grid')) {
    return layout?.direction === 'column' ? 'VERTICAL' : 'HORIZONTAL'
  }
  return display.startsWith('inline') ? 'HORIZONTAL' : 'VERTICAL'
}

function primaryAlign(value: string | undefined): LayoutAlign {
  if (value === 'center') return 'CENTER'
  if (value === 'flex-end' || value === 'end' || value === 'right') return 'MAX'
  if (value === 'space-between') return 'SPACE_BETWEEN'
  return 'MIN'
}

function counterAlign(value: string | undefined): LayoutCounterAlign {
  if (value === 'center') return 'CENTER'
  if (value === 'flex-end' || value === 'end') return 'MAX'
  if (value === 'stretch') return 'STRETCH'
  if (value === 'baseline') return 'BASELINE'
  return 'MIN'
}

function layerName(node: AnatomyNode): string {
  const cls = node.cls?.split(/\s+/)[0]
  return cls ? cls.replace(/^al-c-/, '') : node.tag
}

function frameProps(node: AnatomyNode): Partial<SceneNode> {
  const layoutMode = layoutModeOf(node)
  return {
    name: layerName(node),
    layoutMode,
    primaryAxisAlign: primaryAlign(node.layout?.justify),
    counterAxisAlign: counterAlign(node.layout?.align),
    primaryAxisSizing: 'HUG',
    counterAxisSizing: 'HUG',
    width: Math.max(1, Math.round(node.box?.w ?? 1)),
    height: Math.max(1, Math.round(node.box?.h ?? 1))
  }
}

interface TreeState {
  plan: ComponentPlan
  variant: PlanVariant
  definitions: Map<string, ComponentPropertyDefinition>
  textBound: boolean
  /** CSS parts whose conditional tokens were already applied in this variant. */
  appliedParts: Set<string>
  /** Inherited tokens on the measured case root, before variant layering. */
  measuredRoot: CSSTokens
}

/**
 * A node's own tokens. An inherited property whose variable equals the measured root's is
 * the node inheriting it, so the variant-layered value from its ancestors wins instead.
 */
function ownTokens(node: AnatomyNode, state: TreeState): CSSTokens {
  return Object.fromEntries(
    Object.entries(tokenNames(node.tokens)).filter(
      ([prop, name]) => !INHERITED_TEXT_PROPS.has(prop) || state.measuredRoot[prop] !== name
    )
  )
}

/** Conditional `parts` tokens for the first node whose class names that part. */
function partTokensFor(node: AnatomyNode, state: TreeState): CSSTokens {
  const classes = node.cls?.split(/s+/) ?? []
  const tokens: CSSTokens = {}
  for (const [part, names] of Object.entries(state.variant.partTokens)) {
    if (state.appliedParts.has(part)) continue
    if (!classes.some((cls) => cls === `al-c-${part}` || cls.endsWith(`__${part}`))) continue
    state.appliedParts.add(part)
    layerTokens(tokens, names)
  }
  return tokens
}

function textNode(
  ctx: BuildContext,
  parentId: string,
  node: AnatomyNode,
  state: TreeState,
  inherited: CSSTokens
): void {
  const textDefinition = state.definitions.get('Text')
  const bindsText = Boolean(textDefinition) && !state.textBound
  const references: ComponentPropertyReference[] = []
  if (bindsText && textDefinition) {
    references.push({ propertyId: textDefinition.id, field: 'TEXT' })
    state.textBound = true
  }
  const text = ctx.graph.createNode('TEXT', parentId, {
    name: bindsText ? 'Text' : layerName(node),
    text: bindsText ? (textDefinition?.defaultValue ?? node.text ?? '') : (node.text ?? ''),
    fontSize: node.fsPx ?? 14,
    lineHeight: node.lhPx ?? null,
    fontFamily: node.ffCss?.split(',')[0].replace(/['"]/g, '').trim() || 'Inter',
    fontWeight: Number(node.fwCss) || 400,
    textAutoResize: 'WIDTH_AND_HEIGHT',
    componentPropertyReferences: references,
    width: Math.max(1, Math.round(node.box?.w ?? 1)),
    height: Math.max(1, Math.round(node.box?.h ?? 1))
  })
  applyTextTokens(ctx, text, inherited)
}

function pickInherited(tokens: CSSTokens): CSSTokens {
  return Object.fromEntries(
    Object.entries(tokens).filter(([prop]) => INHERITED_TEXT_PROPS.has(prop))
  )
}

function nestedInstance(ctx: BuildContext, parentId: string, tag: string): boolean {
  const nested = ctx.sets.get(tag)
  if (!nested) return false
  const instance = ctx.graph.createInstance(nested.defaultComponentId, parentId, { name: tag })
  return instance !== null
}

function buildChildren(
  ctx: BuildContext,
  parentId: string,
  node: AnatomyNode,
  path: string,
  state: TreeState,
  inherited: CSSTokens
): void {
  for (const [index, child] of (node.children ?? []).entries()) {
    const childPath = `${path}.${index}`
    if (child.component && nestedInstance(ctx, parentId, child.component)) continue
    const tokens = ownTokens(child, state)
    layerTokens(tokens, state.variant.pathTokens[childPath] ?? {})
    layerTokens(tokens, partTokensFor(child, state))
    const isTextLeaf = child.text !== undefined && !child.children?.length
    const boxed = Object.keys(tokens).some((prop) => !INHERITED_TEXT_PROPS.has(prop))
    if (isTextLeaf && !boxed) {
      textNode(ctx, parentId, child, state, { ...inherited, ...pickInherited(tokens) })
      continue
    }
    const frame = ctx.graph.createNode('FRAME', parentId, frameProps(child))
    const childInherited = { ...inherited, ...pickInherited(tokens) }
    // A text element with its own box (a filled counter, a padded button) is a frame
    // around its text, so the box tokens have somewhere to bind.
    if (isTextLeaf) textNode(ctx, frame.id, { ...child, tokens: {} }, state, childInherited)
    else buildChildren(ctx, frame.id, child, childPath, state, childInherited)
    applyBoxTokens(ctx, ctx.graph.getNode(frame.id) ?? frame, tokens)
    // An inline SVG paints with currentColor.
    if (frame.name === 'svg' && childInherited.color) {
      applyTextTokens(ctx, frame, { color: childInherited.color })
    }
  }
}

function slotIcon(
  ctx: BuildContext,
  parentId: string,
  plan: ComponentPlan,
  definitions: Map<string, ComponentPropertyDefinition>,
  side: 'before' | 'after',
  inherited: CSSTokens
): void {
  const label = side === 'before' ? 'Before' : 'After'
  const toggle = definitions.get(`Slot ${label}`)
  if (!toggle) return
  const swap = definitions.get(`Icon ${label}`)
  const iconName = plan.properties.find((p) => p.name === `Icon ${label}`)?.icon ?? 'placeholder'
  const iconId = ensureIconComponent(ctx, iconName)
  const references: ComponentPropertyReference[] = [{ propertyId: toggle.id, field: 'VISIBLE' }]
  if (swap) references.push({ propertyId: swap.id, field: 'INSTANCE_SWAP' })
  const instance = ctx.graph.createInstance(iconId, parentId, {
    name: `Icon ${label}`,
    visible: toggle.defaultValue === 'true',
    componentPropertyReferences: references
  })
  if (!instance) return
  if (side === 'before') ctx.graph.reorderChild(instance.id, parentId, 0)
  if (inherited.color) applyTextTokens(ctx, instance, { color: inherited.color })
}

function propertyDefinitions(plan: ComponentPlan): ComponentPropertyDefinition[] {
  const definitions: ComponentPropertyDefinition[] = plan.axes.map((axis) => ({
    id: propertyId(plan.tag, axis.name),
    name: axis.name,
    type: 'VARIANT',
    defaultValue: axis.default,
    variantOptions: [...axis.values]
  }))
  for (const property of plan.properties) {
    definitions.push({
      id: propertyId(plan.tag, property.name),
      name: property.name,
      type: property.type,
      defaultValue:
        property.type === 'INSTANCE_SWAP' ? iconKey(property.icon ?? '') : property.default
    })
  }
  return definitions
}

function buildVariant(
  ctx: BuildContext,
  setId: string,
  plan: ComponentPlan,
  variant: PlanVariant,
  definitions: Map<string, ComponentPropertyDefinition>
): SceneNode {
  const component = ctx.graph.createNode('COMPONENT', setId, {
    ...frameProps(variant.tree),
    name: variant.name,
    componentKey: `${componentSetKey(plan.tag)}/${slug(variant.name)}`,
    componentPropertyValues: { ...variant.values }
  })
  const state: TreeState = {
    plan,
    variant,
    definitions,
    textBound: false,
    appliedParts: new Set(),
    measuredRoot: pickInherited(tokenNames(variant.tree.tokens))
  }
  const rootTokens = { ...variant.rootTokens }
  layerTokens(rootTokens, partTokensFor(variant.tree, state))
  const inherited = pickInherited(rootTokens)
  buildChildren(ctx, component.id, variant.tree, '0', state, inherited)
  slotIcon(ctx, component.id, plan, definitions, 'before', inherited)
  slotIcon(ctx, component.id, plan, definitions, 'after', inherited)
  applyBoxTokens(ctx, ctx.graph.getNode(component.id) ?? component, rootTokens)
  for (const part of Object.keys(variant.partTokens)) {
    if (state.appliedParts.has(part)) continue
    for (const name of Object.values(variant.partTokens[part])) {
      if (!ctx.unbound.has(name))
        ctx.unbound.set(name, `part "${part}" names no node in the anatomy`)
    }
  }
  return component
}

export function buildComponentSet(ctx: BuildContext, plan: ComponentPlan): BuiltComponentSet {
  const definitionList = propertyDefinitions(plan)
  const definitions = new Map(definitionList.map((definition) => [definition.name, definition]))
  for (const property of plan.properties) {
    if (property.role === 'slot-icon' && property.icon) ensureIconComponent(ctx, property.icon)
  }
  const set = ctx.graph.createNode('COMPONENT_SET', ctx.pageId, {
    name: plan.name,
    componentKey: componentSetKey(plan.tag),
    codeBinding: plan.codeBinding,
    componentPropertyDefinitions: definitionList,
    isPublishable: true,
    layoutMode: 'HORIZONTAL',
    layoutWrap: 'WRAP',
    itemSpacing: 16,
    counterAxisSpacing: 16,
    paddingTop: 24,
    paddingRight: 24,
    paddingBottom: 24,
    paddingLeft: 24,
    primaryAxisSizing: 'FIXED',
    counterAxisSizing: 'HUG',
    width: SET_WIDTH,
    strokes: [{ color: COMPONENT_COLOR, weight: 1, opacity: 1, visible: true, align: 'INSIDE' }],
    dashPattern: [4, 4]
  })
  let defaultComponentId = ''
  for (const variant of plan.variants) {
    const component = buildVariant(ctx, set.id, plan, variant, definitions)
    if (variant.name === plan.defaultVariant || !defaultComponentId)
      defaultComponentId = component.id
  }
  const built = {
    tag: plan.tag,
    setId: set.id,
    defaultComponentId,
    variantCount: plan.variants.length
  }
  ctx.sets.set(plan.tag, built)
  return built
}

/** Stack component sets vertically, icons in a row above them. Call after layout. */
export function arrangeLibraryPage(graph: SceneGraph, pageId: string): void {
  let x = 0
  let y = 0
  let rowHeight = 0
  const children = graph.getChildren(pageId)
  for (const icon of children.filter((node) => node.type === 'COMPONENT')) {
    graph.updateNode(icon.id, { x, y })
    x += icon.width + 16
    rowHeight = Math.max(rowHeight, icon.height)
  }
  y += rowHeight ? rowHeight + 48 : 0
  for (const set of children.filter((node) => node.type === 'COMPONENT_SET')) {
    graph.updateNode(set.id, { x: 0, y })
    y += set.height + 64
  }
}
