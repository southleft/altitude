import { pick } from 'es-toolkit/object'

import type { SceneNode, StyleRun } from '@open-pencil/scene-graph'

import { DEFAULT_FONT_FAMILY } from '#core/constants'
import { getNodeEditCapability } from '#core/editor/capabilities'
import type { EditorContext } from '#core/editor/types'
import { fontFamilyKey } from '#core/text/font/report'
import { styleToWeight, weightToStyle } from '#core/text/font/style'

import { textAutoResizeChanges } from './auto-resize'
import { pathTextEditChanges } from './path-edit'

/** Faces to replace: one style of a family, or every style when `style` is omitted. */
export interface FontFaceSelector {
  family: string
  style?: string
}

/** The replacement: a family, and optionally one style for every use (omit to keep each). */
export type FontReplacement = FontFaceSelector

export interface FontReplacementResult {
  /** Text layers that changed. */
  nodeIds: string[]
}

function weightAndSlant(style: string): { fontWeight: number; italic: boolean } {
  return { fontWeight: styleToWeight(style), italic: /italic|oblique/i.test(style) }
}

function matchesFace(
  family: string,
  weight: number,
  italic: boolean,
  from: FontFaceSelector
): boolean {
  if (fontFamilyKey(family) !== fontFamilyKey(from.family)) return false
  return from.style === undefined || weightToStyle(weight, italic) === from.style
}

/** The text changes that replace `from` in one node, or null when it does not use it. */
export function fontReplacementChanges(
  node: SceneNode,
  from: FontFaceSelector,
  to: FontReplacement
): Partial<SceneNode> | null {
  if (node.type !== 'TEXT') return null
  const nodeFamily = node.fontFamily || DEFAULT_FONT_FAMILY
  const target = to.style ? weightAndSlant(to.style) : null
  const changes: Partial<SceneNode> = {}
  const replaceNode = matchesFace(nodeFamily, node.fontWeight || 400, node.italic, from)
  if (replaceNode) {
    changes.fontFamily = to.family
    if (target) Object.assign(changes, target)
  }

  const styleRuns = node.styleRuns.map((run): StyleRun => {
    const runFamily = run.style.fontFamily ?? nodeFamily
    const runWeight = run.style.fontWeight ?? node.fontWeight
    const runItalic = run.style.italic ?? node.italic
    if (!matchesFace(runFamily, runWeight, runItalic, from)) return run
    const style = { ...run.style }
    // A run that inherits the family follows the node when the node itself is replaced.
    if (run.style.fontFamily !== undefined || !replaceNode) style.fontFamily = to.family
    if (target && (!replaceNode || run.style.fontWeight !== undefined)) {
      style.fontWeight = target.fontWeight
    }
    if (target && (!replaceNode || run.style.italic !== undefined)) style.italic = target.italic
    return { ...run, style }
  })
  if (styleRuns.some((run, index) => run !== node.styleRuns[index])) changes.styleRuns = styleRuns
  if (Object.keys(changes).length === 0) return null
  // Keep text style bindings: the style definitions are replaced in the same action.
  return { ...changes, textStyleId: node.textStyleId }
}

export function createFontReplacementActions(ctx: EditorContext) {
  /**
   * Replace a family (or one face of it) in every editable text layer of the document,
   * text style definitions included, as one undoable action. Read-only library
   * definitions are left alone. Load the replacement font before calling.
   */
  function replaceFontFace(from: FontFaceSelector, to: FontReplacement): FontReplacementResult {
    const planned: Array<{ node: SceneNode; changes: Partial<SceneNode> }> = []
    for (const node of ctx.graph.getAllNodes()) {
      if (node.type !== 'TEXT') continue
      const changes = fontReplacementChanges(node, from, to)
      if (!changes || !getNodeEditCapability(ctx.graph, node.id).editable) continue
      planned.push({ node, changes })
    }
    if (planned.length === 0) return { nodeIds: [] }

    ctx.undo.runBatch('Replace font', () => {
      for (const { node, changes } of planned) {
        const id = node.id
        const next = {
          ...changes,
          ...textAutoResizeChanges(node, changes),
          ...pathTextEditChanges(node, changes)
        }
        const previous = pick(node, Object.keys(next) as (keyof SceneNode)[]) as Partial<SceneNode>
        ctx.graph.updateNode(id, next)
        ctx.runLayoutForNode(id)
        ctx.undo.push({
          label: 'Replace font',
          forward: () => {
            ctx.graph.updateNode(id, next)
            ctx.runLayoutForNode(id)
          },
          inverse: () => {
            ctx.graph.updateNode(id, previous)
            ctx.runLayoutForNode(id)
          }
        })
      }
    })
    ctx.requestRender()
    return { nodeIds: planned.map(({ node }) => node.id) }
  }

  return { replaceFontFace }
}
