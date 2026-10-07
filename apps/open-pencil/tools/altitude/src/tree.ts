import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'

import { resolveWorkspaceRoot } from '@open-pencil/package-artifacts'

/** Where Altitude keeps its DTCG source and built CSS, relative to the Altitude root. */
export const ALTITUDE_TOKENS_DIR = 'libs/al-web-components/styles/tokens-dtcg'
export const ALTITUDE_DIST_DIR = 'libs/al-web-components/styles/dist-v5'

export interface AltitudePaths {
  root: string
  tokens: string
  dist: string
}

export function altitudePaths(root: string, dist?: string): AltitudePaths {
  const absolute = resolve(root)
  return {
    root: absolute,
    tokens: join(absolute, ALTITUDE_TOKENS_DIR),
    dist: dist ? resolve(dist) : join(absolute, ALTITUDE_DIST_DIR)
  }
}

/** Every `*.json` under `dir`, parsed, keyed by `/`-separated relative path. */
export async function readTokenTree(dir: string): Promise<Record<string, unknown>> {
  const files: Record<string, unknown> = {}
  async function walk(current: string): Promise<void> {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name)
      if (entry.isDirectory()) await walk(path)
      else if (entry.name.endsWith('.json')) {
        files[relative(dir, path).split(sep).join('/')] = JSON.parse(await readFile(path, 'utf8'))
      }
    }
  }
  if (!existsSync(dir)) throw new Error(`Token directory not found: ${dir}`)
  await walk(dir)
  return files
}

/** The committed Altitude mapping preset (`tools/altitude/presets/altitude.json`). */
export async function readAltitudePreset(): Promise<unknown> {
  const root = await resolveWorkspaceRoot(import.meta.dir)
  return JSON.parse(await readFile(join(root, 'tools/altitude/presets/altitude.json'), 'utf8'))
}
