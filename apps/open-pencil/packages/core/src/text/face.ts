import { parseFontStyle } from '@open-pencil/scene-graph'
import type { ParsedFontStyle } from '@open-pencil/scene-graph'

export { normalizeFontStyleName, parseFontStyle, styleToWeight } from '@open-pencil/scene-graph'
export type { ParsedFontStyle } from '@open-pencil/scene-graph'

export interface FontFaceRef extends ParsedFontStyle {
  family: string
  style: string
  postscriptName?: string
}

export function fontFaceFromFigmaFontName(fontName: {
  family?: string
  style?: string
  postscript?: string
}): FontFaceRef {
  const style = fontName.style ?? 'Regular'
  return {
    family: fontName.family ?? 'Inter',
    style,
    postscriptName: fontName.postscript,
    ...parseFontStyle(style)
  }
}

export function fontFaceRenderFamily(family: string, style: string): string {
  return `__op_font__${family.replace(/[^a-z0-9_-]+/giu, '_')}__${style.replace(/[^a-z0-9_-]+/giu, '_')}`
}
