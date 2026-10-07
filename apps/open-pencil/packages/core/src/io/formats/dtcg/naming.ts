import type { ResolvedTokenImportConfig } from './config'

/**
 * Token path -> variable name and CSS custom property.
 *
 * `rename` rewrites a dot-path prefix (`font-size.` -> `typography/font-size/`) so a
 * design-tool folder layout can differ from the code path, the way Figma libraries often
 * group primitives. The CSS name always follows the code path, so `codeSyntax.WEB`
 * stays the name code actually reads.
 */

export function tokenVariableName(
  path: readonly string[],
  naming: ResolvedTokenImportConfig['naming']
): string {
  const kept = path.filter((segment) => !naming.dropSegments.includes(segment))
  const dotted = kept.join('.')
  for (const { from, to } of naming.rename) {
    if (dotted === from || dotted.startsWith(from)) {
      const rest = dotted.slice(from.length)
      return `${to}${rest.split('.').join(naming.separator)}`
    }
  }
  return kept.join(naming.separator)
}

function cssSegment(segment: string): string {
  return segment
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function tokenCSSName(
  path: readonly string[],
  cssVar: NonNullable<ResolvedTokenImportConfig['cssVar']>
): string {
  const body = path
    .filter((segment) => !cssVar.dropSegments.includes(segment))
    .map(cssSegment)
    .filter(Boolean)
    .join('-')
  return `--${cssVar.prefix ? `${cssVar.prefix}-` : ''}${body}`
}

function idSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9.@$_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function tokenVariableId(source: string, key: string): string {
  return `dtcg:${idSegment(source)}:${key}`
}

export function tokenCollectionId(source: string, collection: string): string {
  return `dtcg:${idSegment(source)}:collection:${idSegment(collection)}`
}

export function tokenModeId(source: string, collection: string, mode: string): string {
  return `dtcg:${idSegment(source)}:mode:${idSegment(collection)}:${idSegment(mode)}`
}
