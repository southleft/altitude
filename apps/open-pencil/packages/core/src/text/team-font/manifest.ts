import * as v from 'valibot'

import { styleToWeight, weightToStyle } from '#core/text/font/style'

/** Library-relative manifest file name: `fonts/fonts.json` in a repository library. */
export const TEAM_FONT_MANIFEST_FILE = 'fonts.json'

const ManifestEntrySchema = v.object({
  family: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(200)),
  style: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(100))),
  weight: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(1000))),
  italic: v.optional(v.boolean()),
  /** File name relative to the manifest's folder. */
  file: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(500)),
  license: v.optional(v.pipe(v.string(), v.maxLength(1000)))
})

const ManifestSchema = v.union([v.object({ fonts: v.array(v.unknown()) }), v.array(v.unknown())])

export interface TeamFontManifestEntry {
  family: string
  style: string
  weight: number
  italic: boolean
  file: string
  license?: string
}

export interface TeamFontManifest {
  entries: TeamFontManifestEntry[]
  /** Indexes of entries that failed validation; they are ignored. */
  invalid: number[]
}

function normalizeEntry(entry: v.InferOutput<typeof ManifestEntrySchema>): TeamFontManifestEntry {
  const italic = entry.italic ?? /italic|oblique/i.test(entry.style ?? '')
  const weight = entry.weight ?? styleToWeight(entry.style ?? 'Regular')
  return {
    family: entry.family,
    style: weightToStyle(weight, italic),
    weight,
    italic,
    file: entry.file.replace(/^\.?\/+/, ''),
    ...(entry.license ? { license: entry.license } : {})
  }
}

/**
 * `fonts.json`: `{ "fonts": [{ "family", "style"?, "weight"?, "italic"?, "file", "license"? }] }`
 * or the bare array. Style names are canonicalised from weight and slant so they match the
 * styles text nodes ask for. Null when the document is not a manifest at all.
 */
export function parseTeamFontManifest(json: unknown): TeamFontManifest | null {
  const parsed = v.safeParse(ManifestSchema, json)
  if (!parsed.success) return null
  const items = Array.isArray(parsed.output) ? parsed.output : parsed.output.fonts
  const entries: TeamFontManifestEntry[] = []
  const invalid: number[] = []
  items.forEach((item, index) => {
    const entry = v.safeParse(ManifestEntrySchema, item)
    if (entry.success) entries.push(normalizeEntry(entry.output))
    else invalid.push(index)
  })
  return { entries, invalid }
}
