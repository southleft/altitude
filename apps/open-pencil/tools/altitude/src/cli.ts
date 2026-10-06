import { parseArgs } from 'node:util'

import { runTokenParity, type ParityEntry, type ParityReport } from './parity'

/**
 * bun run tokens:parity <path-to-altitude> [--dist <dir>] [--floor <percent>] [--json] [--verbose]
 *
 * Exits 1 when the non-composite match rate is below the floor (default 100).
 */

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: {
    dist: { type: 'string' },
    floor: { type: 'string', default: '100' },
    json: { type: 'boolean', default: false },
    verbose: { type: 'boolean', default: false }
  }
})

const root = positionals[0]
if (!root) {
  console.error(
    'Usage: bun run tokens:parity <path-to-altitude> [--dist <dir>] [--floor <percent>] [--json] [--verbose]'
  )
  process.exit(2)
}
const floor = Number(values.floor)

function groupGaps(report: ParityReport): Map<string, Set<string>> {
  const groups = new Map<string, Set<string>>()
  for (const combination of report.combinations) {
    for (const entry of combination.entries) {
      if (entry.status === 'match' || entry.status === 'extra') continue
      const key = `${entry.composite ? 'composite' : 'NON-COMPOSITE'} ${entry.status}: ${entry.reason ?? 'value differs'}`
      const names = groups.get(key) ?? new Set<string>()
      names.add(entry.name)
      groups.set(key, names)
    }
  }
  return groups
}

function describe(entry: ParityEntry): string {
  return `${entry.name}  expected ${entry.expected ?? '∅'}  got ${entry.actual ?? '∅'}`
}

try {
  const report = await runTokenParity(root, { dist: values.dist })
  if (values.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log(`Token parity — ${report.altitudeRoot}\n`)
    for (const c of report.combinations) {
      console.log(
        `  ${`${c.brand} × ${c.mode}`.padEnd(22)} non-composite ${c.nonComposite.matched}/${c.nonComposite.total}` +
          `  composite ${c.composite.matched}/${c.composite.total}` +
          `  (match ${c.counts.match}, mismatch ${c.counts.mismatch}, missing ${c.counts.missing}, extra ${c.counts.extra})`
      )
    }
    console.log('')
    console.log(
      `  non-composite  ${report.nonComposite.matched}/${report.nonComposite.total}  ${report.nonComposite.percent}%`
    )
    console.log(
      `  composite      ${report.composite.matched}/${report.composite.total}  ${report.composite.percent}%`
    )
    console.log(
      `  overall        ${report.overall.matched}/${report.overall.total}  ${report.overall.percent}%`
    )
    const gaps = groupGaps(report)
    if (gaps.size) {
      console.log('\nNamed gaps (unique names across brand × mode):')
      for (const [reason, names] of [...gaps].sort(([a], [b]) => a.localeCompare(b))) {
        const list = [...names].sort()
        const shown = values.verbose ? list : list.slice(0, 6)
        console.log(`  ${reason} — ${names.size}`)
        console.log(
          `    ${shown.join(', ')}${list.length > shown.length ? `, … (+${list.length - shown.length})` : ''}`
        )
      }
    }
    const extras = new Set(
      report.combinations.flatMap((c) =>
        c.entries.filter((e) => e.status === 'extra').map((e) => e.name)
      )
    )
    if (extras.size) {
      console.log(
        `\nExtra in OpenPencil (not emitted by Altitude's CSS; informational) — ${extras.size}`
      )
      console.log(
        `  ${[...extras]
          .sort()
          .slice(0, values.verbose ? undefined : 8)
          .join(', ')}${!values.verbose && extras.size > 8 ? ', …' : ''}`
      )
    }
    if (values.verbose) {
      console.log('\nMismatches:')
      for (const c of report.combinations) {
        for (const entry of c.entries.filter((e) => e.status === 'mismatch'))
          console.log(`  [${c.brand}/${c.mode}] ${describe(entry)}`)
      }
    }
  }
  if (report.nonComposite.percent < floor) {
    console.error(
      `\nNon-composite parity ${report.nonComposite.percent}% is below the ${floor}% floor.`
    )
    process.exit(1)
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(2)
}
