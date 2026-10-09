/**
 * Font file validation for bytes from outside the app bundle. Every team font passes these
 * checks before the font manager hands it to CanvasKit or `FontFace`.
 */

/** Largest font file a team library may serve. */
export const TEAM_FONT_MAX_BYTES = 20 * 1024 * 1024

export const TEAM_FONT_EXTENSIONS = ['.woff2', '.woff', '.ttf', '.otf'] as const

export type FontFileFormat = 'truetype' | 'opentype' | 'woff' | 'woff2'

export type FontBytesProblem = 'empty' | 'too-large' | 'unknown-format'

export type FontBytesCheck =
  | { ok: true; format: FontFileFormat }
  | { ok: false; problem: FontBytesProblem }

function toBytes(data: ArrayBuffer | Uint8Array): Uint8Array {
  return data instanceof Uint8Array ? data : new Uint8Array(data)
}

/** The font container format from its leading magic bytes, or null when it is not a font. */
export function sniffFontFormat(data: ArrayBuffer | Uint8Array): FontFileFormat | null {
  const bytes = toBytes(data)
  if (bytes.byteLength < 12) return null
  const tag = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])
  if (bytes[0] === 0 && bytes[1] === 1 && bytes[2] === 0 && bytes[3] === 0) return 'truetype'
  if (tag === 'true') return 'truetype'
  if (tag === 'OTTO') return 'opentype'
  if (tag === 'wOFF') return 'woff'
  if (tag === 'wOF2') return 'woff2'
  return null
}

/** Size cap plus magic bytes; font collections (`ttcf`) and anything else are refused. */
export function checkFontBytes(
  data: ArrayBuffer | Uint8Array,
  maxBytes = TEAM_FONT_MAX_BYTES
): FontBytesCheck {
  const bytes = toBytes(data)
  if (bytes.byteLength === 0) return { ok: false, problem: 'empty' }
  if (bytes.byteLength > maxBytes) return { ok: false, problem: 'too-large' }
  const format = sniffFontFormat(bytes)
  return format ? { ok: true, format } : { ok: false, problem: 'unknown-format' }
}

export function hasTeamFontExtension(path: string): boolean {
  const lower = path.toLowerCase()
  return TEAM_FONT_EXTENSIONS.some((extension) => lower.endsWith(extension))
}
