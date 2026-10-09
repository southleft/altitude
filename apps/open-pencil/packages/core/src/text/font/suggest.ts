import { fontFamilyKey } from '#core/text/font/report'
import type { FontFamilyOption, FontFamilySource } from '#core/text/font/sources'

export type FontCategory = 'mono' | 'serif' | 'display' | 'sans'

const CATEGORY_PATTERNS: Array<[FontCategory, RegExp]> = [
  ['mono', /\b(mono|code|courier|consol|menlo|typewriter)/i],
  [
    'serif',
    /\b(serif|georgia|times|garamond|baskerville|merriweather|playfair|cambria|lora|caslon|bodoni|didot|slab)\b/i
  ],
  ['display', /\b(display|grand|poster|headline|title|condensed|compressed|black)\b/i]
]

/** A coarse category from the family name alone: enough to rank substitutes. */
export function fontCategoryFromName(family: string): FontCategory {
  // "Sans Serif" names a sans family.
  if (/\bsans\b/i.test(family) && !/\bmono\b/i.test(family)) {
    return /\b(display|condensed)\b/i.test(family) ? 'display' : 'sans'
  }
  for (const [category, pattern] of CATEGORY_PATTERNS) if (pattern.test(family)) return category
  return 'sans'
}

function nameTokens(family: string): string[] {
  return family
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !['pro', 'std', 'var', 'variable'].includes(token))
}

export interface FontReplacementSuggestion {
  family: string
  source: FontFamilySource | null
  sanctioned: boolean
  /** Higher ranks first. */
  score: number
}

export interface SuggestFontReplacementsOptions {
  /** Families to rank first, such as the design system's sanctioned families. */
  sanctionedFamilies?: Iterable<string> | null
  limit?: number
}

/**
 * Candidate families to replace `missingFamily` with: sanctioned families first (in their
 * given order within a category), then
 * families of the same category whose names share words (`Source Sans Pro` →
 * `Source Sans 3`). Unavailable or identical families are never suggested.
 */
export function suggestFontReplacements(
  missingFamily: string,
  available: ReadonlyArray<FontFamilyOption | string>,
  options: SuggestFontReplacementsOptions = {}
): FontReplacementSuggestion[] {
  // Earlier sanctioned families (a system's primary family first) rank slightly higher.
  const sanctionedOrder = [...(options.sanctionedFamilies ?? [])].map(fontFamilyKey)
  const sanctioned = new Map(
    sanctionedOrder.map((key, index) => [key, 10 * (1 - index / sanctionedOrder.length)])
  )
  const missingKey = fontFamilyKey(missingFamily)
  const missingCategory = fontCategoryFromName(missingFamily)
  const missingTokens = new Set(nameTokens(missingFamily))
  const seen = new Set<string>()
  const suggestions: FontReplacementSuggestion[] = []

  for (const item of available) {
    const option = typeof item === 'string' ? { family: item, source: null } : item
    const key = fontFamilyKey(option.family)
    if (key === missingKey || seen.has(key)) continue
    seen.add(key)
    const sanctionedRank = sanctioned.get(key)
    const isSanctioned = sanctionedRank !== undefined
    const shared = nameTokens(option.family).filter((token) => missingTokens.has(token)).length
    const sameCategory = fontCategoryFromName(option.family) === missingCategory
    const score =
      (isSanctioned ? 100 + sanctionedRank : 0) +
      (sameCategory ? 30 : 0) +
      shared * 20 +
      (option.source === 'team' ? 5 : 0) +
      (option.source === 'bundled' ? 1 : 0)
    if (score === 0) continue
    suggestions.push({
      family: option.family,
      source: option.source,
      sanctioned: isSanctioned,
      score
    })
  }

  return suggestions
    .sort((a, b) => b.score - a.score || a.family.localeCompare(b.family))
    .slice(0, options.limit ?? 8)
}
