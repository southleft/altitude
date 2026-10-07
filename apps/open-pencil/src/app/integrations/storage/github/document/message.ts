import {
  IMAGES_DIRECTORY,
  MANIFEST_PATH,
  STYLES_PATH,
  VARIABLES_PATH,
  type DocumentJSONPage
} from '@open-pencil/core/io/formats/document-json'

/** What a changed file stands for, in a commit summary. */
function areaOf(path: string, pageNames: ReadonlyMap<string, string>): string {
  const page = pageNames.get(path.replace(/\.source\.json$/, '.json'))
  if (page !== undefined) return `page:${page}`
  if (path === VARIABLES_PATH) return 'Variables'
  if (path.startsWith(STYLES_PATH.replace(/\.json$/, ''))) return 'Styles'
  if (path.startsWith(`${IMAGES_DIRECTORY}/`)) return 'Images'
  if (path === MANIFEST_PATH) return 'Document'
  return 'Other files'
}

/**
 * Default commit message: `Update <name>` (or `Add <name>`) and a body naming the changed
 * pages and other areas. Commit messages are repository content, so they stay in English.
 */
export function defaultCommitMessage(
  documentName: string,
  pages: readonly DocumentJSONPage[],
  changedPaths: readonly string[],
  created: boolean
): string {
  const subject = `${created ? 'Add' : 'Update'} ${documentName.trim() || 'Untitled'}`
  const pageNames = new Map(pages.map((page) => [page.path, page.name]))
  const areas = [...new Set(changedPaths.map((path) => areaOf(path, pageNames)))]
  const changedPages = areas.filter((area) => area.startsWith('page:')).map((area) => area.slice(5))
  const others = areas.filter((area) => !area.startsWith('page:'))
  const lines = [
    changedPages.length > 0 ? `Pages: ${changedPages.join(', ')}` : null,
    others.length > 0 ? `Also: ${others.join(', ')}` : null
  ].filter((line): line is string => line !== null)
  return lines.length > 0 ? `${subject}\n\n${lines.join('\n')}` : subject
}

/** A user message wins; an empty one falls back to the generated message. */
export function commitMessage(custom: string | undefined, generated: string): string {
  const trimmed = custom?.trim()
  return trimmed ? trimmed : generated
}
