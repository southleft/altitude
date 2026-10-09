import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'

import { resolveWorkspaceRoot } from '@open-pencil/package-artifacts'

import { readLintConfig } from './config'
import { formatAuditComment } from './report'
import { runDesignAudit } from './run'
import { writeSampleChange } from './sample'

/**
 * Run the whole design audit locally and print the PR comment it would post.
 *
 *   bun run design:audit:dry-run                         # synthetic sample change
 *   bun run design:audit:dry-run --base <dir> --head <dir> [--altitude <root>] [--out <dir>]
 *
 * `--base`/`--head` take document folders or documents-repository checkouts. Nothing is
 * posted; the renders and report.json land in `--out` (default `scratch/design-audit`).
 */

const { values } = parseArgs({
  options: {
    base: { type: 'string' },
    head: { type: 'string' },
    altitude: { type: 'string' },
    out: { type: 'string' },
    'no-render': { type: 'boolean' }
  }
})

const workspace = await resolveWorkspaceRoot(import.meta.dir)
const altitudeRoot = resolve(
  values.altitude ?? process.env.ALTITUDE_ROOT ?? join(workspace, '../..')
)
const outDir = resolve(values.out ?? join(workspace, 'scratch', 'design-audit'))

let base = values.base ? resolve(values.base) : null
let head = values.head ? resolve(values.head) : null
if (!head) {
  console.error(`Writing a sample change to ${join(outDir, 'sample')} …`)
  const sample = await writeSampleChange(altitudeRoot, join(outDir, 'sample'))
  base = sample.base
  head = sample.head
}

const report = await runDesignAudit({
  base,
  head,
  altitudeRoot,
  outDir: join(outDir, 'audit'),
  config: await readLintConfig(head),
  altitudeRef: 'local',
  render: !values['no-render']
})
console.log(formatAuditComment(report))
console.error(`\nconclusion: ${report.conclusion} — ${report.headline}`)
console.error(`report: ${join(outDir, 'audit', 'report.json')}`)
