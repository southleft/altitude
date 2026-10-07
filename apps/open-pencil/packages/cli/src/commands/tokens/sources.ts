import { existsSync } from 'node:fs'
import { readdir, readFile, stat } from 'node:fs/promises'
import { basename, delimiter, extname, join, relative, resolve, sep } from 'node:path'

/** Environment variable listing directories that hold named token presets. */
export const TOKEN_PRESETS_ENV = 'OPENPENCIL_TOKEN_PRESETS'

async function readJSON(path: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    throw new Error(`${path}: ${error instanceof Error ? error.message : String(error)}`, {
      cause: error
    })
  }
}

/** A token directory (every `*.json`, keyed by relative path) or a single JSON file. */
export async function readTokenSource(input: string): Promise<Record<string, unknown>> {
  const root = resolve(input)
  if (!existsSync(root)) throw new Error(`Token source not found: ${input}`)
  if (!(await stat(root)).isDirectory()) return { [basename(root)]: await readJSON(root) }
  const files: Record<string, unknown> = {}
  async function walk(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) await walk(path)
      } else if (extname(entry.name) === '.json') {
        files[relative(root, path).split(sep).join('/')] = await readJSON(path)
      }
    }
  }
  await walk(root)
  return files
}

/**
 * A mapping preset: a path to a JSON file, or a name looked up as `<name>.json` in the
 * directories listed in OPENPENCIL_TOKEN_PRESETS.
 */
export async function readTokenPreset(preset: string): Promise<unknown> {
  const direct = resolve(preset)
  if (existsSync(direct)) return readJSON(direct)
  const dirs = (process.env[TOKEN_PRESETS_ENV] ?? '').split(delimiter).filter(Boolean)
  for (const dir of dirs) {
    const candidate = resolve(dir, `${preset}.json`)
    if (existsSync(candidate)) return readJSON(candidate)
  }
  const searched = dirs.length
    ? ` (searched ${dirs.join(', ')})`
    : ` (set ${TOKEN_PRESETS_ENV} to a presets directory)`
  throw new Error(`Token preset "${preset}" not found${searched}`)
}
