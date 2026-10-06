import * as v from 'valibot'

import { importDesignTokens } from '#core/io/formats/dtcg/index'
import { defineTool } from '#core/tools/schema'

const ISSUE_SAMPLE = 50

export const importDesignTokensTool = defineTool({
  name: 'import_design_tokens',
  description: [
    'Import DTCG design tokens ($value/$type JSON) into variable collections, or update an earlier import of the same source.',
    'Pass one document as `tokens`, or several as `files` keyed by relative path.',
    '`mapping` declares override layers, axes (mode, brand, density, …) whose values become collection modes, collections, naming and a CSS prefix;',
    'layer file patterns may use {axis} placeholders such as "theme/{mode}/*.json".',
    'Variables are matched by token path, so re-importing updates values in place, keeps node bindings, and reports removed tokens (deleted only with prune).',
    'Every token that cannot become an exact variable is reported in `issues` by name.'
  ].join(' '),
  execution: { kind: 'sync', mutation: 'document' },
  input: v.object({
    tokens: v.optional(
      v.pipe(v.record(v.string(), v.unknown()), v.description('A single DTCG token document'))
    ),
    files: v.optional(
      v.pipe(
        v.record(v.string(), v.unknown()),
        v.description(
          'DTCG documents keyed by path relative to the token root, e.g. "tier-1/colors.json"'
        )
      )
    ),
    mapping: v.optional(
      v.pipe(
        v.record(v.string(), v.unknown()),
        v.description(
          'Token import mapping: { name, layers: [{ files, when }], axes: [{ name, modes, default }], collections: [{ name, axes, files, tokens }], naming: { separator, dropSegments, rename }, cssVar: { prefix, dropSegments }, composites, exclude, keepExtensions, remBase }'
        )
      )
    ),
    prune: v.optional(
      v.pipe(
        v.boolean(),
        v.description('Delete variables of this source that the tokens no longer define')
      )
    )
  }),
  execute: (figma, args) => {
    const files: Record<string, unknown> = { ...args.files }
    if (args.tokens) files['tokens.json'] = args.tokens
    if (Object.keys(files).length === 0) return { error: 'Pass `tokens` or `files`' }
    try {
      const result = importDesignTokens(figma.graph, files, args.mapping ?? {}, {
        prune: args.prune
      })
      const counts: Record<string, number> = {}
      for (const issue of result.issues) counts[issue.code] = (counts[issue.code] ?? 0) + 1
      return {
        source: result.source,
        collections: result.collections,
        created: result.created.length,
        updated: result.updated.length,
        unchanged: result.unchanged.length,
        moved: result.moved,
        removed: result.removed,
        pruned: result.pruned,
        stats: result.stats,
        issueCounts: counts,
        issues: result.issues.slice(0, ISSUE_SAMPLE),
        issuesTruncated: result.issues.length > ISSUE_SAMPLE
      }
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) }
    }
  }
})
