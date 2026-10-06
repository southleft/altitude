export interface FontFamilyStyle {
  family: string
  style: string
}

export interface ParsedFontStyle {
  weight: number
  italic: boolean
}

export const FONT_WEIGHT_NAMES: Record<number, string> = {
  100: 'Thin',
  200: 'Extra Light',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'Semi Bold',
  700: 'Bold',
  800: 'Extra Bold',
  900: 'Black'
}

const FONT_WEIGHT_ALIASES = [
  { weight: 100, names: ['thin', 'hairline', 'extrathin', 'ultrathin'] },
  { weight: 200, names: ['extralight', 'ultralight'] },
  { weight: 300, names: ['light'] },
  { weight: 400, names: ['regular', 'normal', 'book', 'roman', 'plain'] },
  { weight: 500, names: ['medium'] },
  { weight: 600, names: ['semibold', 'demibold'] },
  { weight: 700, names: ['bold'] },
  { weight: 800, names: ['extrabold', 'ultrabold'] },
  { weight: 900, names: ['black', 'heavy'] }
] as const

const FONT_WEIGHT_BY_STYLE: ReadonlyMap<string, number> = new Map(
  FONT_WEIGHT_ALIASES.flatMap(({ names, weight }) => names.map((name) => [name, weight] as const))
)

export function normalizeFontStyleName(style: string): string {
  return style
    .toLowerCase()
    .replace(/italic|oblique/u, '')
    .replace(/[^a-z0-9]+/gu, '')
}

export function parseFontStyle(style: string | undefined): ParsedFontStyle {
  const raw = style ?? ''
  const italic = /(?:italic|oblique)/iu.test(raw)
  const normalized = normalizeFontStyleName(raw)
  const numericWeight = normalized.match(/(?:^|[^0-9])([1-9]00)(?:[^0-9]|$)/u)?.[1]
  return {
    weight: numericWeight ? Number(numericWeight) : (FONT_WEIGHT_BY_STYLE.get(normalized) ?? 400),
    italic
  }
}

export function styleToWeight(style: string | undefined): number {
  return parseFontStyle(style).weight
}

export function normalizeFontFamily(family: string): string {
  return family.replace(/\s+(Variable|\d+(?:pt|px|em))$/i, '')
}

export function styleToVariant(style: string): string {
  const weight = styleToWeight(style)
  const italic = style.toLowerCase().includes('italic')
  if (weight === 400 && !italic) return 'regular'
  if (weight === 400 && italic) return 'italic'
  return italic ? `${weight}italic` : `${weight}`
}

export function weightToStyle(weight: number, italic = false): string {
  const rounded = Math.round(weight / 100) * 100
  const label = (FONT_WEIGHT_NAMES[rounded] ?? 'Regular').replace(/ /g, '')
  return italic ? `${label} Italic` : label
}
