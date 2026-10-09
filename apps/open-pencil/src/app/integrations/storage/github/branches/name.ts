import { slugify } from '@open-pencil/core/io/formats/document-json'
import { randomIndex } from '@open-pencil/core/random'

/** Characters of the random suffix in suggested branch names. */
const SUFFIX_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'
const SUFFIX_LENGTH = 4
/** GitHub accepts long ref names; keep typed ones readable. */
export const MAX_BRANCH_NAME_LENGTH = 100

/** `git check-ref-format --branch`, for a name typed into the editor. */
export function validBranchName(name: string): boolean {
  const branch = name.trim()
  if (!branch || branch.length > MAX_BRANCH_NAME_LENGTH || branch === '@') return false
  if (branch.startsWith('/') || branch.endsWith('/') || branch.endsWith('.')) return false
  if (branch.startsWith('-') || branch.endsWith('.lock')) return false
  if (branch.includes('//') || branch.includes('..') || branch.includes('@{')) return false
  if (branch.split('/').some((part) => part.startsWith('.') || part.endsWith('.lock'))) {
    return false
  }
  for (let index = 0; index < branch.length; index++) {
    const code = branch.charCodeAt(index)
    if (code <= 0x20 || code === 0x7f || '~^:?*[\\'.includes(branch[index])) return false
  }
  return true
}

/** The last segment of a document folder, such as `landing-page`. */
export function documentSlug(path: string): string {
  const segments = path.split('/').filter(Boolean)
  return segments.at(-1) ?? 'document'
}

/** `design/<doc-slug>-<short>`, the default name offered for a new branch. */
export function suggestedBranchName(documentPath: string): string {
  let suffix = ''
  for (let index = 0; index < SUFFIX_LENGTH; index++) {
    suffix += SUFFIX_CHARS[randomIndex(SUFFIX_CHARS.length)]
  }
  return `design/${slugify(documentSlug(documentPath), 'document').slice(0, 60)}-${suffix}`
}
