import type { Paragraph } from 'canvaskit-wasm'

import type { NodeChange } from '@open-pencil/kiwi/fig/codec'
import type { SceneNode } from '@open-pencil/scene-graph'

import { buildParagraph } from '#core/canvas/text'
import { getCanvasKit } from '#core/canvaskit'
import { fontManager } from '#core/text/fonts'

export interface ClipboardShapedGlyph {
  glyphIndex: number
  firstCharacter: number
  x: number
  y: number
  advance: number
}

export interface ClipboardShapedText {
  lineHeight: number
  lineAscent: number
  lineWidth: number
  baseline: number
  baselines?: NonNullable<NodeChange['derivedTextData']>['baselines']
  glyphs: ClipboardShapedGlyph[]
  logicalIndexToCharacterOffsetMap: number[]
}

function addShapedRunGlyphs(
  run: ReturnType<Paragraph['getShapedLines']>[number]['runs'][number],
  glyphs: ClipboardShapedGlyph[],
  logicalIndexToCharacterOffsetMap: number[],
  fallbackLineY: number,
  fallbackLineWidth: number
): void {
  const positions = run.positions
  for (let index = 0; index < run.glyphs.length; index++) {
    const x = positions[index * 2] ?? 0
    const y = positions[index * 2 + 1] ?? fallbackLineY
    const nextX = positions[(index + 1) * 2] ?? x
    const glyphCharacter = run.offsets[index] ?? index
    glyphs.push({
      glyphIndex: index,
      firstCharacter: glyphCharacter,
      x,
      y,
      advance: nextX - x
    })
    if (glyphCharacter >= 0 && glyphCharacter < logicalIndexToCharacterOffsetMap.length) {
      logicalIndexToCharacterOffsetMap[glyphCharacter] = x
    }
  }

  const finalOffset = run.offsets[run.offsets.length - 1]
  const finalX = positions[positions.length - 2] ?? fallbackLineWidth
  if (finalOffset >= 0 && finalOffset < logicalIndexToCharacterOffsetMap.length) {
    logicalIndexToCharacterOffsetMap[finalOffset] = finalX
  }
}

function addLineBaseline(
  metrics: ReturnType<Paragraph['getLineMetrics']>[number],
  textLength: number,
  baselines: NonNullable<ClipboardShapedText['baselines']>
): void {
  if (metrics.startIndex >= textLength) return
  baselines.push({
    firstCharacter: metrics.startIndex,
    endCharacter: metrics.endIndex,
    position: { x: 0, y: metrics.baseline },
    width: metrics.width,
    lineY: metrics.startIndex === 0 ? 0 : metrics.baseline - Math.abs(metrics.ascent),
    lineHeight: metrics.height,
    lineAscent: Math.abs(metrics.ascent)
  })
}

export async function shapeTextForClipboard(node: SceneNode): Promise<ClipboardShapedText | null> {
  const ck = await getCanvasKit()
  const fontProvider = fontManager.provider()
  if (!fontProvider) return null

  const paragraph = buildParagraph({ ck, fontProvider, fontsLoaded: true }, node)
  paragraph.layout(node.textAutoResize === 'WIDTH_AND_HEIGHT' ? 1e6 : node.width)
  const shapedLines = paragraph.getShapedLines()
  const lineMetrics = paragraph.getLineMetrics()
  if (shapedLines.length === 0 || lineMetrics.length === 0) {
    paragraph.delete()
    return null
  }
  const firstMetrics = lineMetrics[0]

  const glyphs: ClipboardShapedGlyph[] = []
  const baselines: NonNullable<ClipboardShapedText['baselines']> = []
  const logicalIndexToCharacterOffsetMap = Array.from({ length: node.text.length + 1 }, () => 0)

  for (let lineIndex = 0; lineIndex < shapedLines.length; lineIndex++) {
    const line = shapedLines[lineIndex]
    const metrics = lineMetrics[lineIndex] ?? firstMetrics
    for (const run of line.runs) {
      addShapedRunGlyphs(
        run,
        glyphs,
        logicalIndexToCharacterOffsetMap,
        metrics.baseline,
        metrics.width
      )
    }
    addLineBaseline(metrics, node.text.length, baselines)
  }

  for (let index = 1; index < logicalIndexToCharacterOffsetMap.length; index++) {
    if (logicalIndexToCharacterOffsetMap[index] === 0) {
      logicalIndexToCharacterOffsetMap[index] = logicalIndexToCharacterOffsetMap[index - 1]
    }
  }

  paragraph.delete()
  return {
    lineHeight: firstMetrics.height,
    lineAscent: Math.abs(firstMetrics.ascent),
    lineWidth: firstMetrics.width,
    baseline: firstMetrics.baseline,
    baselines,
    glyphs,
    logicalIndexToCharacterOffsetMap
  }
}
