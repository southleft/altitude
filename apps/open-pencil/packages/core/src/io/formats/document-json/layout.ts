/** File layout of an OpenPencil JSON document folder. Paths are relative to that folder. */

export const DOCUMENT_JSON_FORMAT = 'openpencil.document'
/** The newest format version this build reads. */
export const DOCUMENT_JSON_VERSION = 2
/** Written unless a page is split into parts. */
export const DOCUMENT_JSON_BASE_VERSION = 1
/**
 * Written when a page is split into parts, so that readers which do not know parts refuse
 * the document instead of loading part of a page.
 */
export const DOCUMENT_JSON_PARTS_VERSION = 2
/**
 * Page files (and their provenance sidecars) above this size are split into parts. GitHub
 * warns above 50 MB per file and refuses files above 100 MB.
 */
export const DOCUMENT_JSON_MAX_FILE_BYTES = 50 * 1024 * 1024

export const MANIFEST_PATH = 'document.json'
export const VARIABLES_PATH = 'variables.json'
export const STYLES_PATH = 'styles.json'
export const FIG_SCHEMA_PATH = 'fig-schema.bin'
export const PAGES_DIRECTORY = 'pages'
export const IMAGES_DIRECTORY = 'images'

const MAX_SLUG_LENGTH = 60

/** A readable, path-safe name: lowercase ASCII letters, digits and single hyphens. */
export function slugify(name: string, fallback: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '')
  return slug || fallback
}

/** Slugs made unique in order: the second "Cover" becomes `cover-2`. */
export function uniqueSlugs(names: readonly string[], fallback: string): string[] {
  const used = new Set<string>()
  return names.map((name) => {
    const base = slugify(name, fallback)
    let slug = base
    for (let suffix = 2; used.has(slug); suffix++) slug = `${base}-${suffix}`
    used.add(slug)
    return slug
  })
}

/** The file of part `part` (2 and up) of a page: `pages/cover.json` → `pages/cover.part-2.json`. */
export function pagePartPath(path: string, part: number): string {
  return path.replace(/\.json$/, `.part-${part}.json`)
}

/**
 * The page file a document file belongs to: its provenance sidecar and its parts map back to
 * `pages/cover.json`. Other paths are returned unchanged.
 */
export function pageFilePath(path: string): string {
  return path.replace(/(?:\.part-\d+)?(?:\.source)?\.json$/, '.json')
}

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte)
}

/** File extension from an image's leading bytes; `bin` when the type is unknown. */
export function imageExtension(bytes: Uint8Array): string {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return 'png'
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'jpg'
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return 'gif'
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8))
    return 'webp'
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) return 'pdf'
  const head = new TextDecoder().decode(bytes.subarray(0, 256)).trimStart()
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) return 'svg'
  return 'bin'
}

/** Image path for a graph image key; unsafe characters never reach the path. */
export function imagePath(hash: string, bytes: Uint8Array): string {
  const safe = hash.replace(/[^A-Za-z0-9_-]/g, '_') || 'image'
  return `${IMAGES_DIRECTORY}/${safe}.${imageExtension(bytes)}`
}
