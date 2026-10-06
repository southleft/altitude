import type { VariableType } from '@open-pencil/scene-graph'

import type { CompositeKind, ResolvedTokenImportConfig } from './config'
import { isRecord } from './parse'
import { contextKey, type ContextResolver, type ResolvedToken, type TokenContext } from './resolve'
import type { TokenDefinition, TokenIssue, TokenIssueCode } from './types'
import { convertTokenValue, type ConvertedValue } from './values'

export interface ResolvedContexts {
  contexts: TokenContext[]
  /** Default context first, so first-seen order follows the default token set. */
  ordered: TokenContext[]
  base: TokenContext
  resolvers: Map<string, ContextResolver>
  fileCount: number
}

export class IssueLog {
  readonly issues: TokenIssue[] = []
  private readonly seen = new Set<string>()

  add(code: TokenIssueCode, token: string | undefined, message: string, file?: string): void {
    const id = `${code}:${token ?? ''}:${token ? '' : message}`
    if (this.seen.has(id)) return
    this.seen.add(id)
    this.issues.push({ code, token, file, message })
  }
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`
  }
  return String(JSON.stringify(value))
}

/** One token across every context: its resolution, conversion and variable type. */
export class TokenState {
  readonly byContext = new Map<string, ResolvedToken | null>()
  readonly converted = new Map<string, ConvertedValue>()
  type?: VariableType
  origin?: TokenDefinition
  compositeKind?: CompositeKind
  lossy?: string

  constructor(
    readonly key: string,
    readonly path: string[]
  ) {}

  /**
   * Resolve and convert in every context. False when the token cannot become a variable.
   * A value that fails to convert in only some contexts (Altitude's contrast="more" border
   * is `currentColor`) leaves the token absent there instead of dropping it everywhere.
   */
  convert(resolved: ResolvedContexts, config: ResolvedTokenImportConfig, log: IssueLog): boolean {
    for (const context of resolved.contexts) {
      const ctxKey = contextKey(context)
      const token = resolved.resolvers.get(ctxKey)?.resolve(this.key) ?? null
      this.byContext.set(ctxKey, token)
      if (!token) continue
      const outcome = this.accept(ctxKey, token, config, log)
      if (outcome === 'fatal') return false
      if (outcome === 'skip') this.byContext.set(ctxKey, null)
    }
    return this.type !== undefined
  }

  private accept(
    ctxKey: string,
    token: ResolvedToken,
    config: ResolvedTokenImportConfig,
    log: IssueLog
  ): 'ok' | 'skip' | 'fatal' {
    this.origin ??= token.def
    const result = convertTokenValue(token.type, token.value, config)
    if (!result.ok) {
      log.add(result.code, this.key, result.message, token.def.file)
      return result.code === 'invalid-value' ? 'skip' : 'fatal'
    }
    if (this.type && this.type !== result.converted.type) {
      log.add(
        'type-conflict',
        this.key,
        `Resolves to ${this.type} in one context and ${result.converted.type} in another`
      )
      return 'fatal'
    }
    this.type = result.converted.type
    const firstUnit = [...this.converted.values()].at(0)?.unit
    if (firstUnit !== undefined && result.converted.unit !== firstUnit) {
      this.lossy ??= `Unit differs between modes (${firstUnit} and ${result.converted.unit}); a variable carries one unit, so CSS uses ${firstUnit}`
    }
    this.converted.set(ctxKey, result.converted)
    this.compositeKind ??= result.compositeKind
    this.lossy ??= result.converted.lossy
    return 'ok'
  }
}

/**
 * The key a token aliases when the alias can stay live: the target becomes a variable
 * of the same type. Otherwise the token is imported as its resolved value.
 */
export function liveAliasTarget(
  state: TokenState,
  token: ResolvedToken,
  states: ReadonlyMap<string, TokenState>,
  plannable: ReadonlySet<string>
): string | null {
  const target = token.aliasOf ? states.get(token.aliasOf) : undefined
  return target && plannable.has(target.key) && target.type === state.type ? target.key : null
}
