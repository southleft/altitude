import { defineCommand } from 'citty'

import {
  diffDocuments,
  type DiffNodeRef,
  type DocumentDiff,
  type PageDiff
} from '@open-pencil/core/io/formats/document-json'

import { bold, dim, fail, fmtList, fmtSummary, ok, printError } from '#cli/format'
import { isDocumentFolder, readDocumentFolder } from '#cli/headless'

const MAX_ROWS = 20

function label(node: DiffNodeRef): string {
  return `${node.path.join(' / ') || node.name} ${dim(`(${node.type} ${node.id})`)}`
}

function rows<T>(items: T[], format: (item: T) => string): string[] {
  const shown = items.slice(0, MAX_ROWS).map(format)
  if (items.length > MAX_ROWS) shown.push(dim(`… ${items.length - MAX_ROWS} more (use --json)`))
  return shown
}

function pageDetails(page: PageDiff): Record<string, string> {
  const details: Record<string, string> = {}
  const add = (key: string, lines: string[]) => {
    if (lines.length) details[key] = lines.join('\n      ')
  }
  add(
    'added',
    rows(page.nodes.added, (node) => `${ok('+')} ${label(node)}`)
  )
  add(
    'removed',
    rows(page.nodes.removed, (node) => `${fail('-')} ${label(node)}`)
  )
  add(
    'changed',
    rows(
      page.nodes.changed,
      (node) =>
        `~ ${label(node)} ${dim(
          [
            node.typeBefore ? `type ${node.typeBefore}→${node.type}` : null,
            ...node.changes.map((change) => change.field)
          ]
            .filter(Boolean)
            .join(', ')
        )}`
    )
  )
  add(
    'tokens bound',
    rows(page.tokenBindings.added, (b) => `${label(b)} ${b.field} → ${b.variable}`)
  )
  add(
    'tokens unbound',
    rows(page.tokenBindings.removed, (b) => `${label(b)} ${b.field} ✕ ${b.variable}`)
  )
  add(
    'instances added',
    rows(page.instances.added, (i) => `${label(i)} ${dim(i.component)}`)
  )
  add(
    'instances removed',
    rows(page.instances.removed, (i) => `${label(i)} ${dim(i.component)}`)
  )
  add(
    'detached',
    rows(page.instances.detached, (i) => `${label(i)} ${dim(i.component)}`)
  )
  return details
}

function printDiff(diff: DocumentDiff): void {
  if (!diff.changed) {
    console.log(ok('No design changes.'))
    return
  }
  console.log('')
  console.log(
    fmtList(
      diff.pages.map((page) => ({
        header: `${bold(page.name)} ${dim(`${page.status}${page.internal ? ', internal' : ''}`)}`,
        details: pageDetails(page)
      }))
    )
  )
  const { variables } = diff
  const variableDetails: Record<string, string> = {}
  if (variables.added.length) variableDetails.added = variables.added.join(', ')
  if (variables.removed.length) variableDetails.removed = variables.removed.join(', ')
  if (variables.changed.length) variableDetails.changed = variables.changed.join(', ')
  if (Object.keys(variableDetails).length > 0) {
    console.log('')
    console.log(fmtList([{ header: bold('Variables'), details: variableDetails }]))
  }
  console.log('')
  console.log(fmtSummary({ ...diff.summary }))
}

async function readSide(path: string) {
  if (!(await isDocumentFolder(path))) {
    throw new Error(`${path} is not a document folder (expected ${path}/document.json)`)
  }
  return readDocumentFolder(path)
}

export default defineCommand({
  meta: {
    description:
      'Compare two document-json folders by node id: pages, nodes, properties, token bindings, instances'
  },
  args: {
    base: { type: 'positional', required: true, description: 'Document folder before the change' },
    head: { type: 'positional', required: true, description: 'Document folder after the change' },
    json: { type: 'boolean', default: false, description: 'Output as JSON' }
  },
  async run({ args }) {
    try {
      const [base, head] = await Promise.all([readSide(args.base), readSide(args.head)])
      const diff = diffDocuments(base, head)
      if (args.json) console.log(JSON.stringify(diff, null, 2))
      else printDiff(diff)
    } catch (error) {
      printError(error)
      process.exit(1)
    }
  }
})
