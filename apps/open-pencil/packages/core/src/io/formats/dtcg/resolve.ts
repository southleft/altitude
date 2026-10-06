import type { ResolvedAxis, ResolvedTokenImportConfig } from './config'
import { aliasTarget, isRecord, parseTokenDocument } from './parse'
import { expandAxisTemplate, matchesFileGlob, normalizeFilePath } from './paths'
import type { TokenDefinition, TokenFiles, TokenIssue } from './types'

/**
 * Contexts and alias resolution.
 *
 * A context is one mode per axis (`{ brand: "southleft", mode: "dark" }`). Its token set
 * is every layer that applies to it, merged in order with later definitions winning.
 */

export type TokenContext = Record<string, string>

/** Types defined by the DTCG Format Module. */
export const DTCG_TYPES: ReadonlySet<string> = new Set([
  'color',
  'dimension',
  'fontFamily',
  'fontWeight',
  'duration',
  'cubicBezier',
  'number',
  'strokeStyle',
  'border',
  'transition',
  'shadow',
  'gradient',
  'typography'
])

export interface ResolvedToken {
  def: TokenDefinition
  type?: string
  /** Key of the token this one aliases with a whole-value `{reference}`. */
  aliasOf?: string
  /** Value with every reference replaced by its target's resolved value. */
  value: unknown
}

export function contextKey(context: TokenContext): string {
  return Object.keys(context)
    .sort()
    .map((axis) => `${axis}=${context[axis]}`)
    .join('&')
}

export function enumerateContexts(axes: readonly ResolvedAxis[]): TokenContext[] {
  let contexts: TokenContext[] = [{}]
  for (const axis of axes) {
    contexts = contexts.flatMap((context) =>
      axis.modes.map((mode) => ({ ...context, [axis.name]: mode.name }))
    )
  }
  return contexts
}

export function defaultContext(axes: readonly ResolvedAxis[]): TokenContext {
  return Object.fromEntries(axes.map((axis) => [axis.name, axis.defaultMode]))
}

function layerApplies(when: Record<string, string | string[]> | undefined, context: TokenContext) {
  if (!when) return true
  return Object.entries(when).every(([axis, modes]) =>
    (Array.isArray(modes) ? modes : [modes]).includes(context[axis] ?? '')
  )
}

export interface ParsedTokenFiles {
  fileNames: string[]
  definitions: Map<string, TokenDefinition[]>
}

export function parseTokenFiles(files: TokenFiles, issues: TokenIssue[]): ParsedTokenFiles {
  const definitions = new Map<string, TokenDefinition[]>()
  for (const [rawName, json] of Object.entries(files)) {
    const name = normalizeFilePath(rawName)
    definitions.set(name, parseTokenDocument(name, json, issues))
  }
  return { fileNames: [...definitions.keys()].sort(), definitions }
}

/** Files that make up a context, in override order (later wins). */
export function filesForContext(
  config: ResolvedTokenImportConfig,
  fileNames: readonly string[],
  context: TokenContext,
  issues: TokenIssue[]
): string[][] {
  const layers: string[][] = []
  const seen = new Set<string>()
  for (const layer of config.layers) {
    if (!layerApplies(layer.when, context)) continue
    const files: string[] = []
    for (const pattern of layer.files) {
      const expanded = expandAxisTemplate(pattern, context)
      if (expanded === null) {
        const message = `File pattern "${pattern}" names an axis the mapping does not define`
        if (!issues.some((issue) => issue.message === message)) {
          issues.push({ code: 'invalid-document', message })
        }
        continue
      }
      for (const name of fileNames) {
        if (seen.has(name) || !matchesFileGlob(name, [expanded])) continue
        seen.add(name)
        files.push(name)
      }
    }
    layers.push(files)
  }
  return layers
}

export function mergeContext(
  layers: readonly string[][],
  parsed: ParsedTokenFiles,
  issues: TokenIssue[],
  reported: Set<string>
): Map<string, TokenDefinition> {
  const tokens = new Map<string, TokenDefinition>()
  for (const files of layers) {
    const inLayer = new Map<string, string>()
    for (const file of files) {
      for (const def of parsed.definitions.get(file) ?? []) {
        const earlier = inLayer.get(def.key)
        if (earlier && earlier !== file && !reported.has(def.key)) {
          reported.add(def.key)
          issues.push({
            code: 'conflicting-definition',
            token: def.key,
            file,
            message: `Defined in both ${earlier} and ${file} within one layer; ${file} wins. Use a mapping layer or axis to make the override explicit`
          })
        }
        inLayer.set(def.key, file)
        tokens.set(def.key, def)
      }
    }
  }
  return tokens
}

function primitiveText(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return null
}

export class ContextResolver {
  private readonly cache = new Map<string, ResolvedToken | null>()
  private readonly groupDefaults: string[]

  constructor(
    private readonly tokens: Map<string, TokenDefinition>,
    groupDefaultKeys: readonly string[],
    private readonly issues: TokenIssue[],
    private readonly reported: Set<string>
  ) {
    this.groupDefaults = [...new Set(['$root', ...groupDefaultKeys])]
  }

  keys(): string[] {
    return [...this.tokens.keys()]
  }

  has(key: string): boolean {
    return this.tokens.has(key)
  }

  private lookup(key: string): string | null {
    if (this.tokens.has(key)) return key
    for (const segment of this.groupDefaults) {
      if (this.tokens.has(`${key}.${segment}`)) return `${key}.${segment}`
    }
    return null
  }

  private report(issue: TokenIssue): void {
    const id = `${issue.code}:${issue.token}`
    if (this.reported.has(id)) return
    this.reported.add(id)
    this.issues.push(issue)
  }

  resolve(key: string, stack: string[] = []): ResolvedToken | null {
    if (this.cache.has(key)) return this.cache.get(key) ?? null
    const def = this.tokens.get(key)
    if (!def) return null
    if (stack.includes(key)) {
      this.report({
        code: 'circular-alias',
        token: key,
        file: def.file,
        message: `Circular alias: ${[...stack, key].join(' -> ')}`
      })
      return null
    }
    const result = this.resolveDefinition(def, [...stack, key])
    this.cache.set(key, result)
    return result
  }

  private resolveDefinition(def: TokenDefinition, stack: string[]): ResolvedToken | null {
    const target = aliasTarget(def.value)
    if (target !== null) {
      const found = this.lookup(target)
      const resolved = found ? this.resolve(found, stack) : null
      if (!resolved) {
        if (!found) {
          this.report({
            code: 'unresolved-alias',
            token: def.key,
            file: def.file,
            message: `Alias {${target}} does not resolve to a token`
          })
        }
        return null
      }
      // An alias declared with a non-standard type (Altitude's `other` on a duration alias)
      // takes its target's type, which is what the alias actually holds.
      const type = def.type && DTCG_TYPES.has(def.type) ? def.type : (resolved.type ?? def.type)
      return { def, type, aliasOf: found ?? undefined, value: resolved.value }
    }
    const state = { failed: false }
    const substitute = (value: unknown): unknown => {
      if (typeof value === 'string') {
        const whole = aliasTarget(value)
        if (whole !== null) {
          const found = this.lookup(whole)
          const resolved = found ? this.resolve(found, stack) : null
          if (!resolved) {
            state.failed = true
            if (!found) {
              this.report({
                code: 'unresolved-alias',
                token: def.key,
                file: def.file,
                message: `Alias {${whole}} does not resolve to a token`
              })
            }
            return value
          }
          return resolved.value
        }
        return value.replace(/\{([^{}]+)\}/g, (match, ref: string) => {
          const found = this.lookup(ref)
          const resolved = found ? this.resolve(found, stack) : null
          const text = resolved ? primitiveText(resolved.value) : null
          if (text === null) {
            state.failed = true
            return match
          }
          return text
        })
      }
      if (Array.isArray(value)) return value.map(substitute)
      if (isRecord(value)) {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, substitute(v)]))
      }
      return value
    }
    const value = substitute(def.value)
    if (state.failed) return null
    return { def, type: def.type, value }
  }
}
