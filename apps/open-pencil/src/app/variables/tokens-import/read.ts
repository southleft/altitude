import { unzipSync } from 'fflate'

/**
 * Token sources picked in the browser: a folder (File System Access handle or a
 * `webkitdirectory` file list), loose JSON files, or ZIP archives. Every `*.json` becomes
 * one entry keyed by its path below the picked root, which is what mapping layer globs
 * (`tier-2/theme/{mode}/*.json`) match against.
 */

export interface TokenSource {
  label: string
  /** Parsed JSON by path; a `TokenFiles` map for the importer. */
  files: Record<string, unknown>
  /** Files that were not valid JSON, by path. */
  unreadable: string[]
}

const MAX_TOKEN_SOURCE_BYTES = 32 * 1024 * 1024
const decoder = new TextDecoder()

function isJSONPath(path: string): boolean {
  return path.toLowerCase().endsWith('.json')
}

function isHiddenPath(path: string): boolean {
  return path
    .split('/')
    .some(
      (segment) => segment.startsWith('.') || segment === 'node_modules' || segment === '__MACOSX'
    )
}

/** Drop a leading folder every path shares (the picked folder's own name, a ZIP's root). */
export function stripSharedRoot(paths: readonly string[]): (path: string) => string {
  const first = paths.at(0)?.split('/')
  if (!first || first.length < 2) return (path) => path
  const root = `${first[0]}/`
  return paths.every((path) => path.startsWith(root))
    ? (path) => path.slice(root.length)
    : (path) => path
}

function addJSON(source: TokenSource, path: string, text: string): void {
  try {
    source.files[path] = JSON.parse(text) as unknown
  } catch {
    source.unreadable.push(path)
  }
}

function emptySource(label: string): TokenSource {
  return { label, files: {}, unreadable: [] }
}

function guardSize(total: number): void {
  if (total > MAX_TOKEN_SOURCE_BYTES) {
    throw new Error(`Token source exceeds ${MAX_TOKEN_SOURCE_BYTES / (1024 * 1024)} MB`)
  }
}

function readZip(source: TokenSource, bytes: Uint8Array): void {
  const entries = unzipSync(bytes, {
    filter: (file) => isJSONPath(file.name) && !isHiddenPath(file.name)
  })
  const names = Object.keys(entries)
  const strip = stripSharedRoot(names)
  let total = 0
  for (const name of names) {
    total += entries[name].byteLength
    guardSize(total)
    addJSON(source, strip(name), decoder.decode(entries[name]))
  }
}

/** Loose files: JSON documents and ZIP archives, or a `webkitdirectory` listing. */
export async function readTokenFileList(files: readonly File[]): Promise<TokenSource> {
  const relative = files.map((file) => file.webkitRelativePath || file.name)
  const strip = stripSharedRoot(relative)
  const rootName = relative[0]?.includes('/') ? relative[0].split('/')[0] : undefined
  const source = emptySource(rootName ?? files.map((file) => file.name).join(', '))
  let total = 0
  for (const [index, file] of files.entries()) {
    total += file.size
    guardSize(total)
    const path = strip(relative[index])
    if (isHiddenPath(path)) continue
    if (file.name.toLowerCase().endsWith('.zip')) {
      readZip(source, new Uint8Array(await file.arrayBuffer()))
    } else if (isJSONPath(file.name)) {
      addJSON(source, path, await file.text())
    }
  }
  return source
}

interface DirectoryEntries {
  values(): AsyncIterable<FileSystemDirectoryHandle | FileSystemFileHandle>
}

function hasEntries(
  handle: FileSystemDirectoryHandle
): handle is FileSystemDirectoryHandle & DirectoryEntries {
  return 'values' in handle
}

/** A folder picked with `showDirectoryPicker()`. */
export async function readTokenDirectory(root: FileSystemDirectoryHandle): Promise<TokenSource> {
  const source = emptySource(root.name)
  let total = 0
  async function walk(dir: FileSystemDirectoryHandle, prefix: string): Promise<void> {
    if (!hasEntries(dir)) return
    for await (const entry of dir.values()) {
      const path = `${prefix}${entry.name}`
      if (isHiddenPath(path)) continue
      if (entry.kind === 'directory') {
        await walk(entry, `${path}/`)
      } else if (isJSONPath(entry.name)) {
        const file = await entry.getFile()
        total += file.size
        guardSize(total)
        addJSON(source, path, await file.text())
      }
    }
  }
  await walk(root, '')
  return source
}

/** A mapping preset picked as a JSON file. */
export async function readTokenPresetFile(
  file: File
): Promise<{ label: string; mapping: unknown }> {
  try {
    return { label: file.name, mapping: JSON.parse(await file.text()) as unknown }
  } catch (error) {
    throw new Error(`${file.name}: ${error instanceof Error ? error.message : String(error)}`, {
      cause: error
    })
  }
}
