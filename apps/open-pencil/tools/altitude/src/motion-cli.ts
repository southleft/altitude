import { readFile, writeFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'

import { exportFigFile, parseFigFile } from '@open-pencil/core/io'

import { altitudeMotionSpec, applyAltitudeMotion, readAltitudeContracts } from './motion'

/**
 * bun run motion:defaults <path-to-altitude> [--into <file.fig>] [--overwrite] [--json]
 *
 * Prints the default motion each Altitude contract implies. With --into, gives matching
 * component sets in that document their default motion (authored specs are kept unless
 * --overwrite) and writes the document back.
 */

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: {
    into: { type: 'string' },
    overwrite: { type: 'boolean', default: false },
    json: { type: 'boolean', default: false }
  }
})

const root = positionals[0]
if (!root) {
  console.error(
    'Usage: bun run motion:defaults <path-to-altitude> [--into <file.fig>] [--overwrite] [--json]'
  )
  process.exit(2)
}

try {
  const contracts = await readAltitudeContracts(root)
  if (values.into) {
    const bytes = await readFile(values.into)
    const graph = await parseFigFile(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      {
        populate: 'all'
      }
    )
    const applied = applyAltitudeMotion(graph, contracts, { overwrite: values.overwrite })
    await writeFile(values.into, await exportFigFile(graph))
    if (values.json) console.log(JSON.stringify(applied, null, 2))
    else {
      for (const entry of applied) {
        console.log(
          `  ${entry.name.padEnd(28)} ${entry.contract.padEnd(24)} ${entry.transitions} transition(s)`
        )
      }
      console.log(`\n${applied.length} component set(s) updated in ${values.into}`)
    }
  } else {
    const specs = contracts.flatMap((contract) => {
      const spec = altitudeMotionSpec(contract)
      return spec ? [{ contract: contract.id, transitions: spec.transitions }] : []
    })
    if (values.json) console.log(JSON.stringify(specs, null, 2))
    else {
      for (const { contract, transitions } of specs) {
        const summary = transitions
          .map((t) => `${t.trigger}→${t.use} (${t.properties.join(' ')})`)
          .join('; ')
        console.log(`  ${contract.padEnd(26)} ${summary}`)
      }
      console.log(`\n${specs.length} of ${contracts.length} contracts imply motion`)
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
