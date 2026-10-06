import { delimiter, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import type { CommandDef } from 'citty'

/**
 * Workspace command extensions.
 *
 * `OPENPENCIL_CLI_EXTENSIONS` lists modules (separated by the platform path delimiter or
 * commas) whose default export is `{ name, command }`. Each adds one top-level subcommand,
 * so a checkout can ship project-specific commands — such as the Altitude library builder
 * under `tools/altitude` — without the published CLI depending on private tooling.
 * Extensions never replace a built-in command.
 */

export const CLI_EXTENSIONS_ENV = 'OPENPENCIL_CLI_EXTENSIONS'

export interface CommandExtension {
  name: string
  command: CommandDef
}

function isCommandExtension(value: unknown): value is CommandExtension {
  if (!value || typeof value !== 'object') return false
  const name: unknown = Reflect.get(value, 'name')
  const command: unknown = Reflect.get(value, 'command')
  return (
    typeof name === 'string' &&
    /^[a-z][a-z0-9-]*$/.test(name) &&
    typeof command === 'object' &&
    command !== null
  )
}

export async function loadCommandExtensions(
  builtIns: ReadonlySet<string>,
  value = process.env[CLI_EXTENSIONS_ENV],
  cwd = process.cwd()
): Promise<Record<string, CommandDef>> {
  const commands: Record<string, CommandDef> = {}
  const paths = (value ?? '')
    .split(new RegExp(`[${delimiter === ';' ? ';' : ':'},]`))
    .map((path) => path.trim())
    .filter(Boolean)
  for (const path of paths) {
    const module: unknown = await import(pathToFileURL(resolve(cwd, path)).href)
    const extension = module && typeof module === 'object' ? Reflect.get(module, 'default') : null
    if (!isCommandExtension(extension)) {
      throw new Error(
        `${path}: default export must be { name, command } (see ${CLI_EXTENSIONS_ENV})`
      )
    }
    if (builtIns.has(extension.name) || extension.name in commands) {
      throw new Error(`${path}: command "${extension.name}" is already defined`)
    }
    commands[extension.name] = extension.command
  }
  return commands
}
