import type { SceneGraph, Variable } from '@open-pencil/scene-graph'

import type { FontLoadedSource } from '#core/text/font/sources'
import { documentFontStatus, type DocumentFontFaceStatus } from '#core/text/font/status'
import { fontManager, type FontManager } from '#core/text/fonts'
import { WEB_FONT_PROVIDER_IDS, type WebFontProviderId } from '#core/text/web-fonts'

/** Where a face resolved from, in the report's vocabulary. */
export type FontReportOrigin =
  | 'bundled'
  | 'local'
  | 'team'
  | 'web'
  | 'fallback'
  | 'document'
  | 'substituted'
  | 'missing'

export interface FontReportFace {
  family: string
  style: string
  origin: FontReportOrigin
  /** Exact loader source when the face is available. */
  source: FontLoadedSource | null
  substituteFamily: string | null
  nodeIds: string[]
  nodeNames: string[]
}

export interface FontReportFamily {
  family: string
  /** Null when no sanctioned list applies to this document. */
  sanctioned: boolean | null
  faces: FontReportFace[]
  /** Text layers using any face of the family. */
  usageCount: number
  /** True when at least one face is substituted or unresolved. */
  missing: boolean
}

export interface DocumentFontReport {
  families: FontReportFamily[]
  faceCount: number
  missingFaceCount: number
  /** Page ids the report covers. */
  pageIds: string[]
}

export interface DocumentFontReportOptions {
  manager?: FontManager
  /** Families the document's design system sanctions; null when none applies. */
  sanctionedFamilies?: Iterable<string> | null
  /** Pages to scan; every page by default. */
  pageIds?: readonly string[]
}

function isWebProvider(source: FontLoadedSource): source is WebFontProviderId {
  return (WEB_FONT_PROVIDER_IDS as readonly string[]).includes(source)
}

export function fontReportOrigin(face: DocumentFontFaceStatus): FontReportOrigin {
  if (face.status === 'substituted') return 'substituted'
  if (face.status === 'unresolved' || !face.source) return 'missing'
  if (face.source === 'cache' || isWebProvider(face.source)) return 'web'
  if (face.source === 'registered') return 'document'
  return face.source
}

/** Lower-cased family key used to compare families from different sources. */
export function fontFamilyKey(family: string): string {
  return family.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}

/**
 * Every family and style the document's text uses, where each resolved from, how many
 * layers use it, and whether the family is sanctioned. Families with problems sort first.
 */
export function buildDocumentFontReport(
  graph: SceneGraph,
  options: DocumentFontReportOptions = {}
): DocumentFontReport {
  const manager = options.manager ?? fontManager
  const pageIds = options.pageIds ?? graph.getPages().map((page) => page.id)
  const sanctioned = options.sanctionedFamilies
    ? new Set([...options.sanctionedFamilies].map(fontFamilyKey))
    : null
  const status = documentFontStatus(graph, pageIds, manager)
  const families = new Map<string, FontReportFamily>()
  const layers = new Map<string, Set<string>>()

  for (const face of status.faces) {
    const key = fontFamilyKey(face.family)
    const family = families.get(key) ?? {
      family: face.family,
      sanctioned: sanctioned ? sanctioned.has(key) : null,
      faces: [],
      usageCount: 0,
      missing: false
    }
    const origin = fontReportOrigin(face)
    family.faces.push({
      family: face.family,
      style: face.style,
      origin,
      source: face.source,
      substituteFamily: face.substituteFamily,
      nodeIds: face.nodeIds,
      nodeNames: face.nodeNames
    })
    family.missing ||= origin === 'missing' || origin === 'substituted'
    const familyLayers = layers.get(key) ?? new Set<string>()
    for (const id of face.nodeIds) familyLayers.add(id)
    layers.set(key, familyLayers)
    family.usageCount = familyLayers.size
    families.set(key, family)
  }

  const sorted = [...families.values()].sort(
    (a, b) => Number(b.missing) - Number(a.missing) || a.family.localeCompare(b.family)
  )
  return {
    families: sorted,
    faceCount: status.faces.length,
    missingFaceCount: status.issues.length,
    pageIds: [...pageIds]
  }
}

const GENERIC_FAMILIES = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  'emoji',
  'math',
  'fangsong'
])

/** The first named family of a CSS font stack: `"IBM Plex Mono", monospace` → `IBM Plex Mono`. */
export function primaryFontFamily(stack: string): string | null {
  for (const part of stack.split(',')) {
    const family = part
      .trim()
      .replace(/^['"]|['"]$/g, '')
      .trim()
    if (family && !GENERIC_FAMILIES.has(family.toLowerCase())) return family
  }
  return null
}

/**
 * Families named by the document's string variables that `matches` selects, such as
 * imported font-family tokens, in variable order (a system's primary family usually comes
 * first). Each value may be a CSS font stack; its first family counts.
 */
export function fontFamiliesFromVariables(
  graph: SceneGraph,
  matches: (variable: Variable) => boolean
): string[] {
  const families = new Map<string, string>()
  const stringValues = (variable: Variable, depth: number): string[] =>
    Object.values(variable.valuesByMode).flatMap((value) => {
      if (typeof value === 'string') return [value]
      if (typeof value !== 'object' || !('aliasId' in value) || depth > 8) return []
      const target = graph.variables.get(value.aliasId)
      return target ? stringValues(target, depth + 1) : []
    })
  for (const variable of graph.variables.values()) {
    if (variable.type !== 'STRING' || variable.deleted || !matches(variable)) continue
    for (const value of stringValues(variable, 0)) {
      const family = primaryFontFamily(value)
      if (family) families.set(fontFamilyKey(family), family)
    }
  }
  return [...families.values()]
}
