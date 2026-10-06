import type { Font } from 'canvaskit-wasm'

export function measureLabelText(font: Font, text: string): number {
  const glyphIds = font.getGlyphIDs(text)
  const widths = font.getGlyphWidths(glyphIds)
  let result = 0
  for (const width of widths) result += width
  return result
}

export function ellipsizeLabelText(font: Font, text: string, maxWidth: number): string {
  if (maxWidth <= 0) return ''
  if (measureLabelText(font, text) <= maxWidth) return text

  const ellipsis = '…'
  const ellipsisWidth = measureLabelText(font, ellipsis)
  if (maxWidth <= ellipsisWidth) return ellipsis

  let width = 0
  let end = 0
  const glyphIds = font.getGlyphIDs(text)
  const widths = font.getGlyphWidths(glyphIds)
  for (let index = 0; index < widths.length; index++) {
    if (width + widths[index] + ellipsisWidth > maxWidth) break
    width += widths[index]
    end = index + 1
  }
  return text.slice(0, end) + ellipsis
}
