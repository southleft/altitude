import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { bold, dim, fail, list as fmtList, ok, summary as fmtSummary } from 'agentfmt'
import { defineCommand } from 'citty'

import { FileSystemLibraryCatalog } from '@open-pencil/cli/library'
import { BUILTIN_IO_FORMATS, IORegistry } from '@open-pencil/core/io'
import { computeAllLayouts } from '@open-pencil/core/layout'
import { createLibraryRevision, diffLibraryManifests } from '@open-pencil/core/library'
import type { SceneGraph } from '@open-pencil/scene-graph'

import {
  arrangeLibraryPage,
  buildAltitudeLibrary,
  emitCanvasContracts,
  type LibraryBuildResult
} from './library/index'

/**
 * `open-pencil altitude …` — registered through `OPENPENCIL_CLI_EXTENSIONS` by the root
 * `open-pencil` script, so the published CLI stays free of Altitude-specific tooling.
 */

const io = new IORegistry(BUILTIN_IO_FORMATS)

function onlyTags(value: string | undefined): string[] | undefined {
  const tags = value
    ?.split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
  return tags?.length ? tags : undefined
}

function printBuild(result: LibraryBuildResult): void {
  console.log('')
  console.log(
    bold(`  ${result.built.length} component sets built, ${result.skipped.length} skipped`)
  )
  console.log('')
  console.log(
    fmtList(
      result.built.map((item) => ({
        header: `${item.name} (${item.tag})`,
        details: {
          variants: item.variants,
          axes:
            item.axes.map((axis) => `${axis.name}[${axis.values.length}]`).join(' × ') || 'none',
          unbound: Object.keys(item.unbound).length
        }
      })),
      { compact: true }
    )
  )
  if (result.skipped.length) {
    console.log('')
    console.log(bold('  Skipped'))
    console.log(
      fmtList(
        result.skipped.map((item) => ({ header: item.tag, details: { reason: item.reason } })),
        { compact: true }
      )
    )
  }
  console.log('')
}

async function publishIfChanged(
  graph: SceneGraph,
  catalogRoot: string,
  libraryId: string,
  name: string
): Promise<{ status: 'published' | 'unchanged'; revisionId: string; changes: number }> {
  const catalog = new FileSystemLibraryCatalog(catalogRoot)
  const latest = (await catalog.listLibraries()).find((item) => item.libraryId === libraryId)
  const previousRevisionId = latest?.latestRevisionId ?? null
  if (latest) {
    const previous = await catalog.getRevision(libraryId, latest.latestRevisionId)
    const next = await createLibraryRevision({ libraryId, name, graph, previousRevisionId })
    const changes = diffLibraryManifests(previous.manifest, next.manifest)
    if (changes.length === 0)
      return { status: 'unchanged', revisionId: latest.latestRevisionId, changes: 0 }
  }
  const revision = await catalog.publishRevision({
    libraryId,
    name,
    graph,
    previousRevisionId,
    description: 'Generated from Altitude code contracts'
  })
  return {
    status: 'published',
    revisionId: revision.manifest.revisionId,
    changes: revision.manifest.assets.length
  }
}

const buildLibrary = defineCommand({
  meta: { description: 'Build the Altitude component library from code contracts and tokens' },
  args: {
    root: { type: 'positional', description: 'Altitude checkout root', required: true },
    out: { type: 'string', description: 'Write the library document here (.fig)' },
    publish: { type: 'boolean', description: 'Publish a library revision when assets changed' },
    catalog: { type: 'string', description: 'Library catalog directory for --publish' },
    id: { type: 'string', description: 'Library ID', default: 'altitude' },
    name: { type: 'string', description: 'Library name', default: 'Altitude' },
    only: { type: 'string', description: 'Comma-separated tags to build (plus what they nest)' },
    json: { type: 'boolean', description: 'Output as JSON' }
  },
  async run({ args }) {
    try {
      if (!args.out && !args.publish) throw new Error('Pass --out <file.fig>, --publish, or both')
      if (args.publish && !args.catalog) throw new Error('--publish needs --catalog <dir>')
      const result = await buildAltitudeLibrary(resolve(args.root), { only: onlyTags(args.only) })
      computeAllLayouts(result.graph)
      arrangeLibraryPage(result.graph, result.pageId)
      let output: string | null = null
      if (args.out) {
        output = resolve(args.out)
        const written = await io.writeDocument('fig', result.graph)
        await writeFile(output, written.data as Uint8Array)
      }
      const publication =
        args.publish && args.catalog
          ? await publishIfChanged(result.graph, resolve(args.catalog), args.id, args.name)
          : null
      if (args.json) {
        const { graph: _graph, ...report } = result
        console.log(JSON.stringify({ ...report, output, publication }, null, 2))
        return
      }
      printBuild(result)
      console.log(
        fmtSummary({
          built: result.built.length,
          skipped: result.skipped.length,
          variants: result.built.reduce((n, item) => n + item.variants, 0)
        })
      )
      if (output) console.log(ok(`Wrote ${output}`))
      if (publication?.status === 'published') {
        console.log(ok(`Published ${args.id} @ ${publication.revisionId}`))
      } else if (publication) {
        console.log(dim(`No asset changes since ${publication.revisionId}; nothing published.`))
      }
    } catch (error) {
      console.error(fail(error instanceof Error ? error.message : String(error)))
      process.exit(1)
    }
  }
})

const canvasContracts = defineCommand({
  meta: { description: 'Build the library headlessly and emit Altitude canvas contracts' },
  args: {
    root: { type: 'positional', description: 'Altitude checkout root', required: true },
    out: {
      type: 'string',
      description: 'Directory for <tag>.canvas.json and build-report.json',
      required: true
    },
    id: {
      type: 'string',
      description: 'Library ID recorded in figma.fileKey',
      default: 'altitude'
    },
    only: { type: 'string', description: 'Comma-separated tags to build (plus what they nest)' },
    json: { type: 'boolean', description: 'Output the build report as JSON' }
  },
  async run({ args }) {
    try {
      const result = await buildAltitudeLibrary(resolve(args.root), { only: onlyTags(args.only) })
      const outDir = resolve(args.out)
      await mkdir(outDir, { recursive: true })
      const contracts = emitCanvasContracts(result.graph, { libraryId: args.id })
      for (const contract of contracts) {
        await writeFile(
          join(outDir, `${contract.component}.canvas.json`),
          `${JSON.stringify(contract, null, 2)}\n`
        )
      }
      const { graph: _graph, ...report } = result
      await writeFile(join(outDir, 'build-report.json'), `${JSON.stringify(report, null, 2)}\n`)
      if (args.json) {
        console.log(
          JSON.stringify({ ...report, canvasContracts: contracts.length, outDir }, null, 2)
        )
        return
      }
      printBuild(result)
      console.log(ok(`Wrote ${contracts.length} canvas contracts to ${outDir}`))
    } catch (error) {
      console.error(fail(error instanceof Error ? error.message : String(error)))
      process.exit(1)
    }
  }
})

export default {
  name: 'altitude',
  command: defineCommand({
    meta: { description: 'Altitude design system: build the canvas library from code' },
    subCommands: { 'build-library': buildLibrary, 'canvas-contracts': canvasContracts }
  })
}
