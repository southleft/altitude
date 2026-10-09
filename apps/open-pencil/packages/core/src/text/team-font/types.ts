/**
 * A team font library: font files a team shares, such as `fonts/` in a design repository.
 *
 * Core only consumes this contract. Hosts own transport, credentials and caching, so the
 * font manager can load team faces without knowing where they live.
 */

/** One font file in the library, before its family and style are known. */
export interface TeamFontFile {
  /** Library path, such as `fonts/Agrandir-Bold.otf`. */
  path: string
  /** File size in bytes, when the listing reports it. */
  size?: number
  /** Content version (a Git blob SHA for repository libraries); cache keys use it. */
  version: string
}

/** One face a library provides. */
export interface TeamFontFace {
  family: string
  /** Canonical style name, such as `Regular`, `SemiBold` or `Bold Italic`. */
  style: string
  weight: number
  italic: boolean
  file: TeamFontFile
  /** Licence note from the manifest or the font's name table. */
  license?: string
}

export type TeamFontSkipReason = 'unsupported-extension' | 'too-large' | 'unreadable' | 'invalid'

/** A file the library lists but cannot offer, with the reason. */
export interface TeamFontSkippedFile {
  path: string
  reason: TeamFontSkipReason
}

export interface TeamFontCatalog {
  faces: TeamFontFace[]
  skipped: TeamFontSkippedFile[]
}

export interface TeamFontLibrary {
  /** Short name shown next to team fonts, such as `altitude-designs`. */
  readonly label: string
  /** Every face the library offers now; implementations cache and never throw. */
  listFaces(signal?: AbortSignal): Promise<TeamFontFace[]>
  /** The face's validated font bytes, or null when unavailable. */
  loadFace(face: TeamFontFace, signal?: AbortSignal): Promise<ArrayBuffer | null>
}
