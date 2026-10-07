import * as v from 'valibot'

/**
 * Token import mapping.
 *
 * A mapping is plain JSON so a preset can live beside a design system, travel through
 * MCP, and be validated in one place. It answers four questions:
 *
 * - `layers`: which files make up the token set, in override order. A file pattern may
 *   name an axis (`theme/{mode}/*.json`), which makes that layer depend on the axis.
 * - `axes`: the independent dials (mode, brand, density, …) and their values.
 * - `collections`: where each token lands. A token goes to the first collection whose
 *   axes cover every axis the token varies over and whose filters accept it.
 * - `naming` / `cssVar`: how a token path becomes a variable name and a CSS name.
 */

const NonEmptyString = v.pipe(v.string(), v.minLength(1))

export const CompositeStrategySchema = v.picklist(['string', 'skip'])
export type CompositeStrategy = v.InferOutput<typeof CompositeStrategySchema>

const AxisModeSchema = v.union([
  NonEmptyString,
  v.object({
    name: NonEmptyString,
    label: v.optional(NonEmptyString)
  })
])

export const TokenAxisSchema = v.object({
  name: v.pipe(NonEmptyString, v.regex(/^[A-Za-z][\w-]*$/, 'Axis names are identifiers')),
  label: v.optional(NonEmptyString),
  modes: v.pipe(v.array(AxisModeSchema), v.minLength(1)),
  /** Mode used when a collection does not vary over this axis. Defaults to the first. */
  default: v.optional(NonEmptyString)
})

export const TokenLayerSchema = v.object({
  /** File globs relative to the token root. `{axis}` expands to the context's mode. */
  files: v.pipe(v.array(NonEmptyString), v.minLength(1)),
  /** Apply only when every listed axis is at one of the given modes. */
  when: v.optional(v.record(NonEmptyString, v.union([NonEmptyString, v.array(NonEmptyString)])))
})

export const TokenCollectionSchema = v.object({
  name: NonEmptyString,
  /** Axes this collection has modes for; their cartesian product becomes its modes. */
  axes: v.optional(v.array(NonEmptyString)),
  /** Accept tokens whose defining file matches one of these globs. */
  files: v.optional(v.array(NonEmptyString)),
  /** Accept tokens whose dot path matches one of these globs (`theme.color.**`). */
  tokens: v.optional(v.array(NonEmptyString)),
  hiddenFromPublishing: v.optional(v.boolean()),
  description: v.optional(v.string())
})

export const TokenImportConfigSchema = v.object({
  /** Stable source id used to recognise this import's variables on re-import. */
  name: v.optional(NonEmptyString),
  description: v.optional(v.string()),
  layers: v.optional(v.array(TokenLayerSchema)),
  axes: v.optional(v.array(TokenAxisSchema)),
  collections: v.optional(v.array(TokenCollectionSchema)),
  /** Token path globs to leave out entirely. */
  exclude: v.optional(v.array(NonEmptyString)),
  naming: v.optional(
    v.object({
      /** Separator between variable name segments. Default `/`. */
      separator: v.optional(v.string()),
      /** Path segments dropped from the variable name. Default `["$root"]`. */
      dropSegments: v.optional(v.array(v.string())),
      /** Dot-path prefix rewrites applied before joining, first match wins. */
      rename: v.optional(v.array(v.object({ from: NonEmptyString, to: v.string() })))
    })
  ),
  /** When present, each variable records `codeSyntax.WEB = var(--<prefix>-<path>)`. */
  cssVar: v.optional(
    v.object({
      prefix: v.optional(v.string()),
      /** Path segments dropped from the CSS name. Default `["$root"]`. */
      dropSegments: v.optional(v.array(v.string()))
    })
  ),
  /** How composite types without a variable type are carried. Default `string`. */
  composites: v.optional(
    v.object({
      typography: v.optional(CompositeStrategySchema),
      shadow: v.optional(CompositeStrategySchema),
      border: v.optional(CompositeStrategySchema),
      transition: v.optional(CompositeStrategySchema),
      gradient: v.optional(CompositeStrategySchema),
      strokeStyle: v.optional(CompositeStrategySchema)
    })
  ),
  /** Pixels per `rem`, used to store rem dimensions as canvas pixels. Default 16. */
  remBase: v.optional(v.pipe(v.number(), v.minValue(1))),
  /** `$extensions` namespaces copied into variable metadata, e.g. `org.altitude.token`. */
  keepExtensions: v.optional(v.array(NonEmptyString)),
  /**
   * Keep a token's value but leave it out of CSS in modes whose definition carries this
   * extension value, e.g. an axis default that a stylesheet resets to `initial`.
   */
  omitFromCSSWhen: v.optional(
    v.object({
      extension: NonEmptyString,
      property: NonEmptyString,
      values: v.array(v.string())
    })
  )
})

export type TokenImportConfig = v.InferOutput<typeof TokenImportConfigSchema>
export type TokenAxisConfig = v.InferOutput<typeof TokenAxisSchema>
export type TokenLayerConfig = v.InferOutput<typeof TokenLayerSchema>
export type TokenCollectionConfig = v.InferOutput<typeof TokenCollectionSchema>
export type CompositeKind = keyof NonNullable<TokenImportConfig['composites']>

export interface ResolvedAxis {
  name: string
  label: string
  modes: Array<{ name: string; label: string }>
  defaultMode: string
}

export interface ResolvedTokenImportConfig {
  name: string
  layers: TokenLayerConfig[]
  axes: ResolvedAxis[]
  collections: Array<Required<Pick<TokenCollectionConfig, 'name' | 'axes'>> & TokenCollectionConfig>
  exclude: string[]
  naming: { separator: string; dropSegments: string[]; rename: Array<{ from: string; to: string }> }
  cssVar: { prefix: string; dropSegments: string[] } | null
  composites: Record<CompositeKind, CompositeStrategy>
  remBase: number
  keepExtensions: string[]
  omitFromCSSWhen: { extension: string; property: string; values: string[] } | null
}

const DEFAULT_SOURCE = 'tokens'

function titleCase(value: string): string {
  return value.replace(
    /(^|[-_\s])([a-z])/g,
    (_, gap: string, ch: string) => `${gap === '' ? '' : ' '}${ch.toUpperCase()}`
  )
}

function mappingError(message: string): Error {
  return new Error(`Invalid token import mapping: ${message}`)
}

function fail(message: string): never {
  throw mappingError(message)
}

function parseConfig(input: unknown): TokenImportConfig {
  const result = v.safeParse(TokenImportConfigSchema, input ?? {})
  if (result.success) return result.output
  throw mappingError(
    result.issues
      .map((issue) => {
        const path = issue.path?.map((item) => String(item.key)).join('.') ?? ''
        return path ? `${path}: ${issue.message}` : issue.message
      })
      .join('; ')
  )
}

function resolveAxis(axis: TokenAxisConfig): ResolvedAxis {
  const modes = axis.modes.map((mode) =>
    typeof mode === 'string'
      ? { name: mode, label: titleCase(mode) }
      : { name: mode.name, label: mode.label ?? titleCase(mode.name) }
  )
  const defaultMode = axis.default ?? modes[0].name
  if (!modes.some((mode) => mode.name === defaultMode)) {
    fail(`axis "${axis.name}" default "${defaultMode}" is not one of its modes`)
  }
  return { name: axis.name, label: axis.label ?? titleCase(axis.name), modes, defaultMode }
}

function resolveAxes(config: TokenImportConfig): ResolvedAxis[] {
  const axes = (config.axes ?? []).map(resolveAxis)
  if (new Set(axes.map((axis) => axis.name)).size !== axes.length) fail('duplicate axis name')
  return axes
}

function resolveCollections(
  config: TokenImportConfig,
  axes: readonly ResolvedAxis[]
): ResolvedTokenImportConfig['collections'] {
  const axisNames = new Set(axes.map((axis) => axis.name))
  const collections = (config.collections ?? [{ name: 'Tokens' }]).map((collection) => {
    const unknown = (collection.axes ?? []).find((axis) => !axisNames.has(axis))
    if (unknown) fail(`collection "${collection.name}" uses unknown axis "${unknown}"`)
    return { ...collection, axes: collection.axes ?? [] }
  })
  if (new Set(collections.map((collection) => collection.name)).size !== collections.length) {
    fail('duplicate collection name')
  }
  return collections
}

function resolveNaming(config: TokenImportConfig): ResolvedTokenImportConfig['naming'] {
  const naming = config.naming ?? {}
  return {
    separator: naming.separator ?? '/',
    dropSegments: naming.dropSegments ?? ['$root'],
    rename: naming.rename ?? []
  }
}

function resolveCSSVar(config: TokenImportConfig): ResolvedTokenImportConfig['cssVar'] {
  if (!config.cssVar) return null
  return {
    prefix: config.cssVar.prefix ?? '',
    dropSegments: config.cssVar.dropSegments ?? ['$root']
  }
}

const COMPOSITE_KINDS: readonly CompositeKind[] = [
  'typography',
  'shadow',
  'border',
  'transition',
  'gradient',
  'strokeStyle'
]

function resolveComposites(config: TokenImportConfig): Record<CompositeKind, CompositeStrategy> {
  const composites = config.composites ?? {}
  return Object.fromEntries(
    COMPOSITE_KINDS.map((kind) => [kind, composites[kind] ?? 'string'])
  ) as Record<CompositeKind, CompositeStrategy>
}

/** Validate a mapping and fill defaults. Throws a readable error for invalid input. */
export function resolveTokenImportConfig(input: unknown = {}): ResolvedTokenImportConfig {
  const config = parseConfig(input)
  const axes = resolveAxes(config)
  return {
    name: config.name ?? DEFAULT_SOURCE,
    layers: config.layers ?? [{ files: ['**/*.json'] }],
    axes,
    collections: resolveCollections(config, axes),
    exclude: config.exclude ?? [],
    naming: resolveNaming(config),
    cssVar: resolveCSSVar(config),
    composites: resolveComposites(config),
    remBase: config.remBase ?? 16,
    keepExtensions: config.keepExtensions ?? [],
    omitFromCSSWhen: config.omitFromCSSWhen ?? null
  }
}
