import { existsSync, readFileSync } from 'node:fs'

import { parseFigFile } from '@open-pencil/core/io/formats/fig'
import type { SceneGraph } from '@open-pencil/scene-graph'

/** Parse a real `.fig` with every page populated, as the measurement scripts need. */
export async function loadFigGraph(path: string): Promise<SceneGraph> {
  const bytes = readFileSync(path)
  return parseFigFile(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), {
    populate: 'all'
  })
}

/** The positional `.fig` argument of a measurement script, or exit with its usage line. */
export function requireFigArgument(usage: string): string {
  const file = process.argv.slice(2).find((arg) => !arg.startsWith('--'))
  if (!file) {
    console.error(`usage: ${usage}`)
    process.exit(2)
  }
  if (!existsSync(file)) {
    console.error(`No such fixture: ${file}`)
    process.exit(2)
  }
  return file
}
