import type { TeamFontManifest } from './manifest'
import { fontNamesFromFileName, type FontFileNames } from './names'
import type { TeamFontCatalog, TeamFontFace, TeamFontFile, TeamFontSkippedFile } from './types'
import { hasTeamFontExtension, TEAM_FONT_MAX_BYTES } from './validate'

export interface TeamFontCatalogInput {
  /** Every file in the library folder, manifest included or not. */
  files: readonly TeamFontFile[]
  /** Parsed manifest, when the library has one. */
  manifest?: TeamFontManifest | null
  /** Names from the file itself; called only for files the manifest does not describe. */
  readNames(file: TeamFontFile): Promise<FontFileNames | null>
  maxBytes?: number
}

function fileName(path: string): string {
  return path.split('/').at(-1) ?? path
}

function faceKey(family: string, style: string): string {
  return `${family.toLocaleLowerCase()}\0${style.toLocaleLowerCase()}`
}

/**
 * Faces a library offers. Manifest entries describe their files; every other font file is
 * described by its name table, then by its file name. Oversized files are skipped with a
 * reason; files without a font extension are ignored. The first face for a family and
 * style wins, manifest entries first.
 */
export async function buildTeamFontCatalog(input: TeamFontCatalogInput): Promise<TeamFontCatalog> {
  const maxBytes = input.maxBytes ?? TEAM_FONT_MAX_BYTES
  const skipped: TeamFontSkippedFile[] = []
  const usable: TeamFontFile[] = []
  for (const file of input.files) {
    if (!hasTeamFontExtension(file.path)) continue
    if (file.size !== undefined && file.size > maxBytes) {
      skipped.push({ path: file.path, reason: 'too-large' })
      continue
    }
    usable.push(file)
  }

  const byName = new Map(usable.map((file) => [fileName(file.path), file]))
  const byPath = new Map(usable.map((file) => [file.path, file]))
  const faces: TeamFontFace[] = []
  const seen = new Set<string>()
  const described = new Set<string>()
  const add = (face: TeamFontFace) => {
    const key = faceKey(face.family, face.style)
    if (seen.has(key)) return
    seen.add(key)
    faces.push(face)
  }

  for (const entry of input.manifest?.entries ?? []) {
    const file = byPath.get(entry.file) ?? byName.get(fileName(entry.file))
    if (!file) continue
    described.add(file.path)
    add({
      family: entry.family,
      style: entry.style,
      weight: entry.weight,
      italic: entry.italic,
      file,
      ...(entry.license ? { license: entry.license } : {})
    })
  }

  for (const file of usable) {
    if (described.has(file.path)) continue
    const names =
      (await input.readNames(file).catch(() => null)) ?? fontNamesFromFileName(file.path)
    if (!names) {
      skipped.push({ path: file.path, reason: 'unreadable' })
      continue
    }
    add({ ...names, file })
  }

  faces.sort((a, b) => a.family.localeCompare(b.family) || a.weight - b.weight)
  return { faces, skipped }
}
