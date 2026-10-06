/**
 * Path matching for token files and token paths.
 *
 * File globs use `/` segments: `*` matches within a segment, `**` spans segments.
 * Token globs use the same rules over dot-path segments (`theme.color.**`).
 */

function escapeRegExp(value: string): string {
  return value.replace(/[.+^${}()|[\]\\]/g, '\\$&')
}

const fileGlobCache = new Map<string, RegExp>()

export function fileGlobToRegExp(glob: string): RegExp {
  const cached = fileGlobCache.get(glob)
  if (cached) return cached
  let source = ''
  for (let index = 0; index < glob.length; index++) {
    const char = glob[index]
    if (char === '*') {
      if (glob[index + 1] === '*') {
        const slash = glob[index + 2] === '/'
        source += slash ? '(?:.*/)?' : '.*'
        index += slash ? 2 : 1
      } else {
        source += '[^/]*'
      }
    } else if (char === '?') {
      source += '[^/]'
    } else {
      source += escapeRegExp(char)
    }
  }
  const regExp = new RegExp(`^${source}$`)
  fileGlobCache.set(glob, regExp)
  return regExp
}

export function normalizeFilePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '')
}

export function matchesFileGlob(path: string, globs: readonly string[]): boolean {
  const normalized = normalizeFilePath(path)
  return globs.some((glob) => fileGlobToRegExp(normalizeFilePath(glob)).test(normalized))
}

function segmentMatches(pattern: string, segment: string): boolean {
  if (pattern === '*') return true
  if (!pattern.includes('*')) return pattern === segment
  return new RegExp(`^${pattern.split('*').map(escapeRegExp).join('.*')}$`).test(segment)
}

function matchSegments(pattern: readonly string[], path: readonly string[]): boolean {
  if (pattern.length === 0) return path.length === 0
  const [head, ...rest] = pattern
  if (head === '**') {
    for (let skip = 0; skip <= path.length; skip++) {
      if (matchSegments(rest, path.slice(skip))) return true
    }
    return false
  }
  if (path.length === 0) return false
  return segmentMatches(head, path[0]) && matchSegments(rest, path.slice(1))
}

export function matchesTokenGlob(path: readonly string[], globs: readonly string[]): boolean {
  return globs.some((glob) => matchSegments(glob.split('.'), path))
}

/**
 * Expand `{axis}` placeholders. Returns null when the pattern names an axis the
 * context does not define, so a typo cannot silently match nothing.
 */
export function expandAxisTemplate(
  pattern: string,
  context: Readonly<Record<string, string>>
): string | null {
  if (templateAxes(pattern).some((axis) => !Object.hasOwn(context, axis))) return null
  return pattern.replace(/\{([A-Za-z][\w-]*)\}/g, (_, axis: string) => context[axis])
}

/** Axis names a pattern depends on. */
export function templateAxes(pattern: string): string[] {
  return [...pattern.matchAll(/\{([A-Za-z][\w-]*)\}/g)].map((match) => match[1])
}
