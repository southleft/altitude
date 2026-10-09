import { weightToStyle } from '#core/text/font/style'

/** Family and style a font file names itself, normalised to document style names. */
export interface FontFileNames {
  family: string
  style: string
  weight: number
  italic: boolean
  license?: string
}

type LocalizedName = Partial<Record<string, string>> | undefined

interface NameRecords {
  fontFamily?: LocalizedName
  fontSubfamily?: LocalizedName
  preferredFamily?: LocalizedName
  preferredSubfamily?: LocalizedName
  typographicFamily?: LocalizedName
  typographicSubfamily?: LocalizedName
  license?: LocalizedName
}

interface ParsedNamesFont {
  names: { windows?: NameRecords; macintosh?: NameRecords; unicode?: NameRecords } & NameRecords
  tables: { os2?: { usWeightClass?: number; fsSelection?: number } }
}

interface OpenTypeNamesModule {
  parse(buffer: ArrayBuffer): ParsedNamesFont
}

let openTypePromise: Promise<OpenTypeNamesModule> | null = null

/** opentype.js is loaded on first use; name parsing is rare and off the startup path. */
function loadOpenType(): Promise<OpenTypeNamesModule> {
  openTypePromise ??= import('opentype.js').then((module): OpenTypeNamesModule => module)
  return openTypePromise
}

function english(name: LocalizedName): string | undefined {
  if (!name) return undefined
  const value = name.en ?? Object.values(name)[0]
  const trimmed = value?.trim()
  return trimmed || undefined
}

function pick(records: NameRecords[], ...keys: Array<keyof NameRecords>): string | undefined {
  for (const key of keys) {
    for (const record of records) {
      const value = english(record[key])
      if (value) return value
    }
  }
  return undefined
}

const ITALIC_PATTERN = /italic|oblique/i
const FS_SELECTION_ITALIC = 1

/** Weight words in a subfamily such as `SemiBold Italic`, for fonts without OS/2. */
const SUBFAMILY_WEIGHTS: Array<[RegExp, number]> = [
  [/thin|hairline/i, 100],
  [/extra\s*light|ultra\s*light/i, 200],
  [/light/i, 300],
  [/medium/i, 500],
  [/semi\s*bold|demi\s*bold/i, 600],
  [/extra\s*bold|ultra\s*bold/i, 800],
  [/black|heavy/i, 900],
  [/bold/i, 700]
]

export function weightFromStyleWords(style: string): number {
  for (const [pattern, weight] of SUBFAMILY_WEIGHTS) if (pattern.test(style)) return weight
  return 400
}

/**
 * Family and style from the font's `name` table (typographic names first, then legacy
 * ones), with weight from OS/2. Null when opentype.js cannot read the file, as with WOFF2.
 */
export async function readFontFileNames(bytes: ArrayBuffer): Promise<FontFileNames | null> {
  try {
    const opentype = await loadOpenType()
    const font = opentype.parse(bytes)
    const { windows, macintosh, unicode } = font.names
    const records = [windows, macintosh, unicode, font.names].filter(
      (record): record is NameRecords => record !== undefined
    )
    const family = pick(records, 'typographicFamily', 'preferredFamily', 'fontFamily')
    if (!family) return null
    const subfamily =
      pick(records, 'typographicSubfamily', 'preferredSubfamily', 'fontSubfamily') ?? 'Regular'
    const os2 = font.tables.os2
    const italic =
      ITALIC_PATTERN.test(subfamily) || ((os2?.fsSelection ?? 0) & FS_SELECTION_ITALIC) !== 0
    const weight =
      os2?.usWeightClass && os2.usWeightClass >= 1 && os2.usWeightClass <= 1000
        ? os2.usWeightClass
        : weightFromStyleWords(subfamily)
    const license = pick(records, 'license')
    return {
      family,
      style: weightToStyle(weight, italic),
      weight,
      italic,
      ...(license ? { license } : {})
    }
  } catch {
    return null
  }
}

/**
 * Last resort for files nothing can parse: `Agrandir-GrandHeavy.woff2` gives `Agrandir` and
 * a style from its weight words; `PublicSans-BoldItalic.woff2` gives `Public Sans`.
 */
export function fontNamesFromFileName(path: string): FontFileNames | null {
  const base = (path.split('/').at(-1) ?? path).replace(/\.(woff2?|ttf|otf)$/i, '')
  const separator = base.lastIndexOf('-')
  const familyPart = separator > 0 ? base.slice(0, separator) : base
  const stylePart = separator > 0 ? base.slice(separator + 1) : 'Regular'
  const family = familyPart
    .replace(/[_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
  if (!family) return null
  const italic = ITALIC_PATTERN.test(stylePart)
  const weight = weightFromStyleWords(stylePart)
  return { family, style: weightToStyle(weight, italic), weight, italic }
}
