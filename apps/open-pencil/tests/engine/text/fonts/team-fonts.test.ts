import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

import {
  buildTeamFontCatalog,
  checkFontBytes,
  FontManager,
  fontNamesFromFileName,
  parseTeamFontManifest,
  readFontFileNames,
  sniffFontFormat,
  TEAM_FONT_MAX_BYTES,
  type TeamFontFace,
  type TeamFontFile,
  type TeamFontLibrary
} from '@open-pencil/core/text'

import { repoPath, testPath } from '#tests/helpers/paths'

function fixture(path: string): ArrayBuffer {
  const bytes = readFileSync(path)
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

const OTF = fixture(testPath('fixtures/fonts/NotoSansCJK-Test.otf'))
const TTF = fixture(testPath('fixtures/fonts/NotoNaskhArabic-Regular.ttf'))
const INTER_SEMIBOLD = fixture(repoPath('packages/core/assets/Inter-SemiBold.ttf'))

function file(path: string, size = 1000, version = path): TeamFontFile {
  return { path, size, version }
}

describe('team font file validation', () => {
  test('recognises font containers by their magic bytes', () => {
    expect(sniffFontFormat(TTF)).toBe('truetype')
    expect(sniffFontFormat(OTF)).toBe('opentype')
    expect(sniffFontFormat(new TextEncoder().encode('wOF2 pretend woff2 body'))).toBe('woff2')
    expect(sniffFontFormat(new TextEncoder().encode('wOFF pretend woff body'))).toBe('woff')
    expect(sniffFontFormat(new TextEncoder().encode('<html>not a font</html>'))).toBeNull()
  })

  test('refuses empty, oversized and non-font bytes', () => {
    expect(checkFontBytes(TTF)).toEqual({ ok: true, format: 'truetype' })
    expect(checkFontBytes(new ArrayBuffer(0))).toEqual({ ok: false, problem: 'empty' })
    expect(checkFontBytes(TTF, 100)).toEqual({ ok: false, problem: 'too-large' })
    expect(checkFontBytes(new TextEncoder().encode('ttcf collection header'))).toEqual({
      ok: false,
      problem: 'unknown-format'
    })
    expect(TEAM_FONT_MAX_BYTES).toBe(20 * 1024 * 1024)
  })
})

describe('fonts.json manifest', () => {
  test('canonicalises styles from weight and slant and keeps licence notes', () => {
    const manifest = parseTeamFontManifest({
      fonts: [
        { family: 'Agrandir', weight: 700, file: 'Agrandir-Bold.otf', license: 'Desktop + web' },
        { family: 'Agrandir', style: 'Medium Italic', file: './Agrandir-MediumItalic.otf' },
        { family: '', file: 'broken.otf' },
        'not an entry'
      ]
    })
    expect(manifest?.entries).toEqual([
      {
        family: 'Agrandir',
        style: 'Bold',
        weight: 700,
        italic: false,
        file: 'Agrandir-Bold.otf',
        license: 'Desktop + web'
      },
      {
        family: 'Agrandir',
        style: 'Medium Italic',
        weight: 500,
        italic: true,
        file: 'Agrandir-MediumItalic.otf'
      }
    ])
    expect(manifest?.invalid).toEqual([2, 3])
  })

  test('accepts a bare array and rejects other documents', () => {
    expect(parseTeamFontManifest([{ family: 'Agrandir', file: 'a.otf' }])?.entries).toHaveLength(1)
    expect(parseTeamFontManifest({ version: 1 })).toBeNull()
    expect(parseTeamFontManifest('fonts')).toBeNull()
  })
})

describe('font names', () => {
  test('reads family and style from the name table', async () => {
    expect(await readFontFileNames(OTF)).toMatchObject({
      family: 'Noto Sans CJK SC',
      style: 'Regular',
      weight: 400,
      italic: false
    })
    expect(await readFontFileNames(TTF)).toMatchObject({
      family: 'Noto Naskh Arabic',
      style: 'Regular'
    })
  })

  test('prefers typographic names and OS/2 weight over legacy names', async () => {
    // Legacy name table says "Inter SemiBold" / "Regular"; typographic says "Inter".
    expect(await readFontFileNames(INTER_SEMIBOLD)).toMatchObject({
      family: 'Inter',
      style: 'SemiBold',
      weight: 600
    })
  })

  test('returns null for bytes it cannot parse', async () => {
    expect(await readFontFileNames(new TextEncoder().encode('wOF2 nothing here').buffer)).toBeNull()
  })

  test('falls back to the file name', () => {
    expect(fontNamesFromFileName('fonts/Agrandir-GrandHeavy.woff2')).toEqual({
      family: 'Agrandir',
      style: 'Black',
      weight: 900,
      italic: false
    })
    expect(fontNamesFromFileName('fonts/PublicSans-SemiBoldItalic.woff2')).toEqual({
      family: 'Public Sans',
      style: 'SemiBold Italic',
      weight: 600,
      italic: true
    })
    expect(fontNamesFromFileName('fonts/Sora.ttf')?.style).toBe('Regular')
  })
})

describe('team font catalog', () => {
  test('combines manifest entries, name tables and file names', async () => {
    const read: string[] = []
    const catalog = await buildTeamFontCatalog({
      files: [
        file('fonts/fonts.json'),
        file('fonts/README.md'),
        file('fonts/Agrandir-Bold.otf'),
        file('fonts/Noto.otf'),
        file('fonts/PublicSans-Bold.woff2'),
        file('fonts/Huge.ttf', TEAM_FONT_MAX_BYTES + 1)
      ],
      manifest: parseTeamFontManifest({
        fonts: [
          { family: 'Agrandir', weight: 700, file: 'Agrandir-Bold.otf' },
          { family: 'Ghost', file: 'missing.otf' }
        ]
      }),
      async readNames(entry) {
        read.push(entry.path)
        return entry.path.endsWith('Noto.otf') ? readFontFileNames(OTF) : null
      }
    })

    expect(read).toEqual(['fonts/Noto.otf', 'fonts/PublicSans-Bold.woff2'])
    expect(catalog.faces.map((face) => [face.family, face.style, face.file.path])).toEqual([
      ['Agrandir', 'Bold', 'fonts/Agrandir-Bold.otf'],
      ['Noto Sans CJK SC', 'Regular', 'fonts/Noto.otf'],
      ['Public Sans', 'Bold', 'fonts/PublicSans-Bold.woff2']
    ])
    expect(catalog.skipped).toEqual([{ path: 'fonts/Huge.ttf', reason: 'too-large' }])
  })

  test('keeps the first face for a family and style', async () => {
    const catalog = await buildTeamFontCatalog({
      files: [file('fonts/Sora-Regular.ttf'), file('fonts/Sora-Regular.woff2')],
      readNames: async () => null
    })
    expect(catalog.faces.map((face) => face.file.path)).toEqual(['fonts/Sora-Regular.ttf'])
  })
})

function teamLibrary(faces: TeamFontFace[], bytes: Record<string, ArrayBuffer>) {
  const loads: string[] = []
  const library: TeamFontLibrary = {
    label: 'altitude-designs',
    listFaces: async () => faces,
    loadFace: async (face) => {
      loads.push(face.file.path)
      return bytes[face.file.path] ?? null
    }
  }
  return { library, loads }
}

function face(family: string, style: string, path: string): TeamFontFace {
  return { family, style, weight: 400, italic: false, file: file(path) }
}

describe('FontManager team font library', () => {
  function manager() {
    const fonts = new FontManager()
    fonts.setOnlineFontProviders({})
    return fonts
  }

  test('loads team faces after local fonts and records the team source', async () => {
    const fonts = manager()
    const { library, loads } = teamLibrary([face('Agrandir', 'Regular', 'fonts/A.ttf')], {
      'fonts/A.ttf': TTF
    })
    fonts.setTeamFontLibrary(library)

    expect(await fonts.loadFont('Agrandir', 'Regular')).toBe(TTF)
    expect(fonts.loadedFontSource('Agrandir', 'Regular')).toBe('team')
    expect(loads).toEqual(['fonts/A.ttf'])
    // Loaded faces are served from memory.
    await fonts.loadFont('Agrandir', 'Regular')
    expect(loads).toHaveLength(1)
  })

  test('ignores faces the library does not have and bytes that are not fonts', async () => {
    const fonts = manager()
    const { library } = teamLibrary([face('Agrandir', 'Regular', 'fonts/A.ttf')], {
      'fonts/A.ttf': new TextEncoder().encode('<html>login page</html>').buffer
    })
    fonts.setTeamFontLibrary(library)

    expect(await fonts.loadFont('Agrandir', 'Bold')).toBeNull()
    expect(await fonts.loadFont('Agrandir', 'Regular')).toBeNull()
    expect(fonts.loadedFontSource('Agrandir', 'Regular')).toBeNull()
  })

  test('lists team families with the team source', async () => {
    const fonts = manager()
    const { library } = teamLibrary([face('Agrandir', 'Regular', 'fonts/A.ttf')], {})
    fonts.setTeamFontLibrary(library)

    expect(fonts.teamFontLibraryLabel()).toBe('altitude-designs')
    expect(await fonts.listFamilyOptions()).toContainEqual({ family: 'Agrandir', source: 'team' })
    fonts.setTeamFontLibrary(null)
    expect(await fonts.listFamilyOptions()).not.toContainEqual({
      family: 'Agrandir',
      source: 'team'
    })
  })

  test('a failing library never breaks font loading', async () => {
    const fonts = manager()
    fonts.setTeamFontLibrary({
      label: 'broken',
      listFaces: () => Promise.reject(new Error('offline')),
      loadFace: () => Promise.reject(new Error('offline'))
    })
    expect(await fonts.loadFont('Agrandir', 'Regular')).toBeNull()
    expect(await fonts.listTeamFontFaces()).toEqual([])
  })
})
