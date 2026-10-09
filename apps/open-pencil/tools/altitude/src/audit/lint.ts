import {
  codeBindingOwner,
  resolveInstanceCodeElement,
  type Color,
  type SceneGraph,
  type SceneNode
} from '@open-pencil/scene-graph'

import {
  colorKey,
  firstFontFamily,
  normalizeComponentName,
  type AltitudeFacts,
  type AttributeFact,
  type NumericTokenKind,
  type TokenRef
} from './facts'

/**
 * Altitude design-system lint over a document's scene graph.
 *
 * Checks what a designer can get wrong against Altitude: values typed by hand where a token
 * exists, layers that look like Altitude components but are not instances of them,
 * instances of components that are not Altitude's, fonts outside the typography tokens,
 * text without a style, and code-bound attribute values the element does not accept.
 *
 * Only pages a designer sees are linted (internal library-definition pages are not), and
 * layers inside an instance are the component's own, so they are skipped.
 */

export type AuditSeverity = 'error' | 'warning' | 'info'

export const ALTITUDE_RULES = {
  'altitude/hardcoded-color': {
    severity: 'warning',
    description: 'A solid colour equals an Altitude colour token but is not bound to it'
  },
  'altitude/off-palette-color': {
    severity: 'info',
    description: 'A solid colour matches no Altitude colour token'
  },
  'altitude/hardcoded-spacing': {
    severity: 'warning',
    description: 'Auto-layout gap or padding equals an Altitude space token but is not bound'
  },
  'altitude/hardcoded-radius': {
    severity: 'warning',
    description: 'Corner radius equals an Altitude radius token but is not bound'
  },
  'altitude/hardcoded-typography': {
    severity: 'warning',
    description: 'Font size or line height equals an Altitude typography token but is not bound'
  },
  'altitude/text-style-required': {
    severity: 'info',
    description: 'Text uses neither a text style nor typography variables'
  },
  'altitude/unknown-font': {
    severity: 'warning',
    description: "Font family is not one of Altitude's typography tokens"
  },
  'altitude/detached-component': {
    severity: 'warning',
    description: 'A layer is named like an Altitude component but is not an instance of it'
  },
  'altitude/foreign-component': {
    severity: 'warning',
    description: 'An instance of a component that is not an Altitude component'
  },
  'altitude/invalid-attribute': {
    severity: 'error',
    description: "A code-bound attribute or value the element's Custom Elements Manifest lacks"
  }
} as const satisfies Record<string, { severity: AuditSeverity; description: string }>

export type AltitudeRuleId = keyof typeof ALTITUDE_RULES

export interface AuditFinding {
  ruleId: AltitudeRuleId
  severity: AuditSeverity
  message: string
  pageId: string
  page: string
  nodeId: string
  nodeName: string
  /** Layer names from the page (exclusive) to the node (inclusive). */
  nodePath: string[]
  /** The offending value as text (`#2e5ce6ff`, `12`, `Inter`, `size="xl"`). */
  value?: string
  /** Suggested replacement, usually a token. */
  suggest?: string
}

const PAINTED_TYPES = new Set([
  'RECTANGLE',
  'ELLIPSE',
  'FRAME',
  'TEXT',
  'VECTOR',
  'LINE',
  'POLYGON',
  'STAR',
  'COMPONENT',
  'INSTANCE',
  'SECTION'
])
const LOOKALIKE_TYPES = new Set(['FRAME', 'GROUP', 'RECTANGLE'])
const SPACING_FIELDS = [
  'itemSpacing',
  'counterAxisSpacing',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft'
] as const
const RADIUS_FIELDS = [
  'cornerRadius',
  'topLeftRadius',
  'topRightRadius',
  'bottomRightRadius',
  'bottomLeftRadius'
] as const
const TYPOGRAPHY_BINDINGS = ['fontSize', 'lineHeight', 'fontFamily', 'letterSpacing', 'fontWeight']
const MAX_SUGGESTIONS = 2

type ColorRole = 'content' | 'border' | 'background'

interface SolidPaint {
  field: 'fills' | 'strokes'
  index: number
  color: Color
  opacity: number
  role: ColorRole
  what: string
}

function tokenList(tokens: TokenRef[]): string {
  return tokens
    .slice(0, MAX_SUGGESTIONS)
    .map((token) => `\`${token.name}\`${token.css ? ` (\`${token.css}\`)` : ''}`)
    .join(' or ')
}

function lookup(map: Map<number, TokenRef[]>, value: number): TokenRef[] | undefined {
  for (const [candidate, tokens] of map) if (Math.abs(candidate - value) < 0.01) return tokens
  return undefined
}

/** Colour tokens for a paint role, semantic role tokens first. */
function colorTokens(facts: AltitudeFacts, key: string, role: ColorRole): TokenRef[] | undefined {
  const tokens = facts.colors.get(key)
  if (!tokens) return undefined
  const inRole = tokens.filter((token) => token.name.startsWith(`theme/color/${role}/`))
  return inRole.length > 0 ? [...inRole, ...tokens.filter((t) => !inRole.includes(t))] : tokens
}

function lookalikeComponent(facts: AltitudeFacts, name: string) {
  // `Button`, `al-button`, `Button / Primary`, `Size=Md, State=Hover`, `Button 2`.
  const stem = name.split(/[/,=]/)[0]?.replace(/\s+\d+$/, '') ?? ''
  const key = normalizeComponentName(stem)
  return key ? facts.components.get(key) : undefined
}

/** Why `attribute="value"` is not valid on `<tag>` per its CEM attributes, or null. */
function attributeProblem(
  tag: string,
  attribute: string,
  value: string,
  known: Map<string, AttributeFact>
): { message: string; suggest?: string } | null {
  const fact = known.get(attribute)
  if (!fact) {
    return {
      message: `\`<${tag}>\` has no attribute \`${attribute}\``,
      suggest: `Known attributes: ${[...known.keys()].sort().join(', ')}`
    }
  }
  if (fact.values && !fact.values.includes(value)) {
    return {
      message: `\`<${tag} ${attribute}="${value}">\` is not a value the element accepts`,
      suggest: `One of: ${fact.values.map((option) => `"${option}"`).join(', ')}`
    }
  }
  if (fact.type === 'boolean' && value !== 'true' && value !== 'false') {
    return { message: `\`${attribute}\` is boolean on \`<${tag}>\`, got "${value}"` }
  }
  if (fact.type === 'number' && !Number.isFinite(Number(value))) {
    return { message: `\`${attribute}\` is a number on \`<${tag}>\`, got "${value}"` }
  }
  return null
}

class AltitudeLinter {
  readonly findings: AuditFinding[] = []
  private page: SceneNode | null = null

  constructor(
    private readonly graph: SceneGraph,
    private readonly facts: AltitudeFacts
  ) {}

  run(): AuditFinding[] {
    for (const page of this.graph.getPages()) {
      this.page = page
      for (const child of this.graph.getChildren(page.id)) this.visit(child, [])
    }
    return this.findings
  }

  private report(
    ruleId: AltitudeRuleId,
    node: SceneNode,
    path: string[],
    finding: { message: string; value?: string; suggest?: string }
  ): void {
    const page = this.page
    if (!page) return
    this.findings.push({
      ruleId,
      severity: ALTITUDE_RULES[ruleId].severity,
      pageId: page.id,
      page: page.name,
      nodeId: node.id,
      nodeName: node.name,
      nodePath: path,
      ...finding
    })
  }

  private visit(node: SceneNode, parentPath: string[]): void {
    const path = [...parentPath, node.name]
    if (!node.visible) return
    if (node.type === 'INSTANCE') {
      this.checkInstance(node, path)
      this.checkPaints(node, path)
      return // the instance's layers belong to its component
    }
    this.checkLookalike(node, path)
    this.checkPaints(node, path)
    this.checkSpacing(node, path)
    this.checkRadius(node, path)
    if (node.type === 'TEXT') this.checkText(node, path)
    for (const child of this.graph.getChildren(node.id)) this.visit(child, path)
  }

  private checkInstance(node: SceneNode, path: string[]): void {
    const tag = codeBindingOwner(this.graph, node)?.codeBinding?.tagName
    if (!tag?.startsWith('al-')) {
      this.reportForeign(node, path)
      return
    }
    const known = this.facts.attributes.get(tag)
    if (!known) {
      this.report('altitude/invalid-attribute', node, path, {
        message: `\`<${tag}>\` is not in the Custom Elements Manifest of the target Altitude version`,
        value: tag
      })
      return
    }
    for (const [attribute, value] of resolveInstanceCodeElement(this.graph, node)?.attributes ??
      []) {
      const problem = attributeProblem(tag, attribute, value, known)
      if (problem) {
        this.report('altitude/invalid-attribute', node, path, {
          ...problem,
          value: `${attribute}="${value}"`
        })
      }
    }
  }

  private reportForeign(node: SceneNode, path: string[]): void {
    const main = node.componentId ? this.graph.getNode(node.componentId) : undefined
    const set = main?.parentId ? this.graph.getNode(main.parentId) : undefined
    const component = set?.type === 'COMPONENT_SET' ? set.name : (main?.name ?? node.name)
    const lookalike = lookalikeComponent(this.facts, component)
    this.report('altitude/foreign-component', node, path, {
      message: `Instance of "${component}", which is not an Altitude component`,
      value: component,
      suggest: lookalike
        ? `Use the Altitude ${lookalike.name} (\`<${lookalike.tag}>\`) from the Altitude library`
        : 'Use an Altitude component, or add this one to Altitude first'
    })
  }

  private checkLookalike(node: SceneNode, path: string[]): void {
    if (!LOOKALIKE_TYPES.has(node.type)) return
    const component = lookalikeComponent(this.facts, node.name)
    if (!component) return
    this.report('altitude/detached-component', node, path, {
      message: `"${node.name}" looks like the Altitude ${component.name} but is a ${node.type.toLowerCase()}, not an instance (detached or rebuilt by hand)`,
      value: component.tag,
      suggest: `Replace it with an instance of ${component.name} (\`<${component.tag}>\`)`
    })
  }

  private checkPaints(node: SceneNode, path: string[]): void {
    if (!PAINTED_TYPES.has(node.type)) return
    const fillRole = node.type === 'TEXT' ? 'content' : 'background'
    const fillName = node.type === 'TEXT' ? 'Text colour' : 'Fill'
    const paints: SolidPaint[] = [
      ...node.fills.flatMap((fill, index): SolidPaint[] =>
        fill.type === 'SOLID' && fill.visible
          ? [
              {
                field: 'fills',
                index,
                color: fill.color,
                opacity: fill.opacity,
                role: fillRole,
                what: fillName
              }
            ]
          : []
      ),
      ...node.strokes.flatMap((stroke, index): SolidPaint[] =>
        stroke.visible
          ? [
              {
                field: 'strokes',
                index,
                color: stroke.color,
                opacity: stroke.opacity,
                role: 'border',
                what: 'Stroke'
              }
            ]
          : []
      )
    ]
    for (const paint of paints) {
      const { boundVariables } = node
      if (boundVariables[`${paint.field}/${paint.index}/color`] || boundVariables[paint.field])
        continue
      const key = colorKey(paint.color, paint.opacity)
      const tokens = colorTokens(this.facts, key, paint.role)
      if (tokens) {
        this.report('altitude/hardcoded-color', node, path, {
          message: `${paint.what} ${key} is hard-coded`,
          value: key,
          suggest: `Bind ${tokenList(tokens)}`
        })
      } else {
        this.report('altitude/off-palette-color', node, path, {
          message: `${paint.what} ${key} is not an Altitude colour`,
          value: key,
          suggest: `Use a \`theme/color/${paint.role}/…\` token`
        })
      }
    }
  }

  private checkNumber(
    node: SceneNode,
    path: string[],
    rule: AltitudeRuleId,
    kind: NumericTokenKind,
    field: string,
    value: number | null
  ): void {
    if (value === null || value <= 0 || node.boundVariables[field]) return
    const tokens = lookup(this.facts.numbers[kind], value)
    if (!tokens) return
    this.report(rule, node, path, {
      message: `${field} ${value} is hard-coded`,
      value: String(value),
      suggest: `Bind ${tokenList(tokens)}`
    })
  }

  private checkSpacing(node: SceneNode, path: string[]): void {
    if (node.layoutMode === 'NONE') return
    for (const field of SPACING_FIELDS) {
      if (field === 'counterAxisSpacing' && node.layoutWrap !== 'WRAP') continue
      this.checkNumber(node, path, 'altitude/hardcoded-spacing', 'spacing', field, node[field])
    }
  }

  private checkRadius(node: SceneNode, path: string[]): void {
    if (node.type === 'TEXT' || node.type === 'LINE') return
    const independent = node.independentCorners
    for (const field of RADIUS_FIELDS) {
      if ((field === 'cornerRadius') === independent) continue
      this.checkNumber(node, path, 'altitude/hardcoded-radius', 'radius', field, node[field])
    }
  }

  private checkText(node: SceneNode, path: string[]): void {
    const families = new Set([node.fontFamily])
    for (const run of node.styleRuns) if (run.style.fontFamily) families.add(run.style.fontFamily)
    for (const family of families) {
      if (!family || this.facts.fontFamilies.has(firstFontFamily(family).toLowerCase())) continue
      this.report('altitude/unknown-font', node, path, {
        message: `Font "${family}" is not an Altitude typography font`,
        value: family,
        suggest: `Use ${[...this.facts.fontFamilies.values()].map((name) => `"${name}"`).join(', ')}`
      })
    }
    const styled =
      node.textStyleId !== null || TYPOGRAPHY_BINDINGS.some((field) => node.boundVariables[field])
    if (!styled) {
      this.report('altitude/text-style-required', node, path, {
        message: 'Text has no text style and no typography variables',
        suggest: 'Apply an Altitude text style or bind font size and line height tokens'
      })
    }
    if (node.textStyleId !== null) return
    this.checkNumber(
      node,
      path,
      'altitude/hardcoded-typography',
      'fontSize',
      'fontSize',
      node.fontSize
    )
    this.checkNumber(
      node,
      path,
      'altitude/hardcoded-typography',
      'lineHeight',
      'lineHeight',
      node.lineHeight
    )
  }
}

/** Lint every page a designer sees. Findings follow tree order. */
export function lintAltitudeDocument(graph: SceneGraph, facts: AltitudeFacts): AuditFinding[] {
  return new AltitudeLinter(graph, facts).run()
}
