import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { extname, resolve } from 'node:path'

import { defineCommand } from 'citty'

import { BUILTIN_IO_FORMATS, IORegistry } from '@open-pencil/core/io'
import { importDesignTokens, type TokenImportResult } from '@open-pencil/core/io/formats/dtcg'
import { SceneGraph } from '@open-pencil/scene-graph'

import { bold, dim, entity, fmtList, fmtSummary, ok, printError } from '#cli/format'
import { loadDocument, populateWholeDocument } from '#cli/headless'

import { readTokenPreset, readTokenSource } from './sources'

const io = new IORegistry(BUILTIN_IO_FORMATS)
const ISSUE_SAMPLE = 5

function issueGroups(result: TokenImportResult): Array<{ code: string; tokens: string[] }> {
  const groups = new Map<string, string[]>()
  for (const issue of result.issues) {
    const list = groups.get(issue.code) ?? []
    list.push(issue.token ?? issue.file ?? issue.message)
    groups.set(issue.code, list)
  }
  return [...groups].map(([code, tokens]) => ({ code, tokens }))
}

function printResult(result: TokenImportResult, target: string | null): void {
  console.log('')
  console.log(
    fmtList(
      result.collections.map((collection) => ({
        header: entity(collection.name, collection.modes.join(', ')),
        details: { variables: collection.variables }
      })),
      { compact: true }
    )
  )
  console.log('')
  console.log(
    fmtSummary({
      created: result.created.length,
      updated: result.updated.length,
      unchanged: result.unchanged.length,
      moved: result.moved.length,
      removed: result.removed.length
    })
  )
  const groups = issueGroups(result)
  if (groups.length) {
    console.log('')
    console.log(bold('Named degradations'))
    console.log(
      fmtList(
        groups.map(({ code, tokens }) => ({
          header: `${code} (${tokens.length})`,
          details: {
            tokens:
              tokens.slice(0, ISSUE_SAMPLE).join(', ') +
              (tokens.length > ISSUE_SAMPLE ? `, … +${tokens.length - ISSUE_SAMPLE}` : '')
          }
        })),
        { compact: true }
      )
    )
  }
  if (result.removed.length && !result.pruned) {
    console.log(
      dim(
        `\n${result.removed.length} variable(s) no longer in the tokens were kept; pass --prune to delete them.`
      )
    )
  }
  console.log('')
  console.log(
    target ? ok(`Wrote ${target}`) : dim('Dry run: pass --into <file.fig> to save the variables.')
  )
}

export default defineCommand({
  meta: { description: 'Import DTCG design tokens as variable collections and modes' },
  args: {
    source: {
      type: 'positional',
      description: 'DTCG token directory or JSON file',
      required: true
    },
    preset: {
      type: 'string',
      description: `Mapping preset: a JSON file, or a name found in $OPENPENCIL_TOKEN_PRESETS (e.g. altitude)`
    },
    into: {
      type: 'string',
      description: 'Document to update (.fig); created when missing. Omit for a dry run'
    },
    output: {
      type: 'string',
      alias: 'o',
      description: 'Write the updated document here instead of overwriting --into'
    },
    prune: {
      type: 'boolean',
      description: 'Delete variables from an earlier import that the tokens no longer define'
    },
    json: { type: 'boolean', description: 'Output as JSON' }
  },
  async run({ args }) {
    try {
      if (args.into && extname(args.into).toLowerCase() !== '.fig') {
        throw new Error(`--into must be a .fig document (got ${args.into})`)
      }
      const files = await readTokenSource(args.source)
      const mapping = args.preset ? await readTokenPreset(args.preset) : {}
      const into = args.into ? resolve(args.into) : null
      const graph = into && existsSync(into) ? await loadDocument(into) : new SceneGraph()
      if (into && existsSync(into)) populateWholeDocument(graph)

      const result = importDesignTokens(graph, files, mapping, { prune: args.prune })
      let target: string | null = null
      if (into) {
        target = args.output ? resolve(args.output) : into
        const written = await io.writeDocument('fig', graph)
        await writeFile(target, written.data as Uint8Array)
      }

      if (args.json) {
        console.log(JSON.stringify({ ...result, output: target }, null, 2))
        return
      }
      printResult(result, target)
    } catch (error) {
      printError(error)
      process.exit(1)
    }
  }
})
