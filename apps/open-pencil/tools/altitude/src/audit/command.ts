import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

import { bold, dim, fail, list as fmtList, ok } from 'agentfmt'
import { defineCommand } from 'citty'

import { readDocumentJSON } from '@open-pencil/core/io/formats/document-json'

import { applyLintConfig, readLintConfig } from './config'
import { loadAltitudeFacts } from './facts'
import { ALTITUDE_RULES, lintAltitudeDocument } from './lint'
import { formatAuditComment } from './report'
import { REPORT_FILE, discoverDocuments, runDesignAudit } from './run'

/** `open-pencil altitude lint|audit` — the design-audit commands of the Altitude extension. */

function errorExit(error: unknown): never {
  console.error(fail(error instanceof Error ? error.message : String(error)))
  process.exit(1)
}

/** The repository root holding `.openpencil-lint.json`: the folder itself or two levels up. */
function configRoot(path: string, explicit: string | undefined): string {
  if (explicit) return resolve(explicit)
  const absolute = resolve(path)
  return /[\\/]documents[\\/][^\\/]+[\\/]?$/.test(absolute) ? dirname(dirname(absolute)) : absolute
}

export const lintCommand = defineCommand({
  meta: { description: 'Lint document folders against the Altitude design system' },
  args: {
    path: {
      type: 'positional',
      required: true,
      description: 'A document folder, or a repository with documents/<slug>/'
    },
    altitude: { type: 'string', required: true, description: 'Altitude checkout root' },
    config: {
      type: 'string',
      description: 'Folder with .openpencil-lint.json (default: the repository)'
    },
    json: { type: 'boolean', description: 'Output as JSON' },
    'list-rules': { type: 'boolean', description: 'List the rules and exit' }
  },
  async run({ args }) {
    try {
      if (args['list-rules']) {
        for (const [id, rule] of Object.entries(ALTITUDE_RULES))
          console.log(`${bold(id)} ${dim(rule.severity)}  ${rule.description}`)
        return
      }
      const facts = await loadAltitudeFacts(resolve(args.altitude))
      const config = await readLintConfig(configRoot(args.path, args.config))
      const results = []
      for (const [slug, dir] of await discoverDocuments(resolve(args.path))) {
        const { graph } = await readDocumentJSON({
          read: async (path) => new Uint8Array(await readFile(join(dir, ...path.split('/'))))
        })
        const raw = lintAltitudeDocument(graph, facts).map((row) => ({ ...row, document: slug }))
        results.push(applyLintConfig(raw, config))
      }
      const findings = results.flatMap((result) => result.findings)
      if (args.json) {
        console.log(
          JSON.stringify({ findings, allowed: results.reduce((n, r) => n + r.allowed, 0) }, null, 2)
        )
      } else if (findings.length === 0) {
        console.log(ok('No Altitude lint findings.'))
      } else {
        console.log(
          fmtList(
            findings.map((row) => ({
              header: `${row.severity === 'info' ? ok('info') : fail(row.severity)} ${bold(row.ruleId)} ${dim(`${row.document} › ${row.page} › ${row.nodePath.join(' / ')}`)}`,
              details: { message: row.message, node: row.nodeId, suggest: row.suggest }
            }))
          )
        )
      }
      if (findings.some((row) => row.severity === 'error')) process.exit(1)
    } catch (error) {
      errorExit(error)
    }
  }
})

export const auditCommand = defineCommand({
  meta: {
    description:
      'Audit a design change: diff, Altitude lint, code ↔ canvas parity and renders, as a PR comment'
  },
  args: {
    base: {
      type: 'positional',
      required: true,
      description:
        'Base: a document folder or a repository with documents/ (missing = everything is new)'
    },
    head: { type: 'positional', required: true, description: 'Head: same shape as base' },
    altitude: {
      type: 'string',
      required: true,
      description: 'Altitude checkout root (target version)'
    },
    out: {
      type: 'string',
      required: true,
      description: 'Output folder for report.json, comment.md and renders'
    },
    'altitude-ref': { type: 'string', description: 'Altitude ref to name in the comment' },
    'repo-url': {
      type: 'string',
      description: 'https://github.com/<owner>/<repo>, for layer links'
    },
    'head-sha': { type: 'string', description: 'Head commit, for layer links' },
    'assets-base-url': { type: 'string', description: 'URL prefix that serves the renders' },
    'artifacts-url': {
      type: 'string',
      description: 'Workflow run URL, linked when renders are not inlined'
    },
    config: { type: 'string', description: 'Folder with .openpencil-lint.json (default: head)' },
    top: { type: 'string', default: '10', description: 'Findings shown before the full list' },
    'no-render': { type: 'boolean', description: 'Skip before/after renders' },
    json: { type: 'boolean', description: 'Print report.json instead of the comment' }
  },
  async run({ args }) {
    try {
      const outDir = resolve(args.out)
      const report = await runDesignAudit({
        base: resolve(args.base),
        head: resolve(args.head),
        altitudeRoot: resolve(args.altitude),
        outDir,
        config: await readLintConfig(configRoot(args.head, args.config)),
        altitudeRef: args['altitude-ref'] ?? null,
        repoURL: args['repo-url'] ?? null,
        headSha: args['head-sha'] ?? null,
        render: !args['no-render']
      })
      const comment = formatAuditComment(report, {
        top: Number(args.top),
        assetsBaseURL: args['assets-base-url'] ?? null,
        artifactsURL: args['artifacts-url'] ?? null
      })
      await writeFile(join(outDir, 'comment.md'), `${comment}\n`)
      console.log(args.json ? JSON.stringify(report, null, 2) : comment)
      console.error(
        dim(`\nWrote ${join(outDir, REPORT_FILE)} and comment.md (${report.conclusion})`)
      )
    } catch (error) {
      errorExit(error)
    }
  }
})
