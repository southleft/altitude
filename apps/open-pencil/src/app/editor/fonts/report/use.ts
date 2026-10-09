import { computed, ref, shallowRef, watch, type Ref } from 'vue'

import type { FontFaceSelector, FontReplacement } from '@open-pencil/core/editor'
import {
  buildDocumentFontReport,
  suggestFontReplacements,
  type DocumentFontReport,
  type FontFamilyOption,
  type FontReplacementSuggestion
} from '@open-pencil/core/text'
import { useEditorEvent } from '@open-pencil/vue'

import { useEditorStore } from '@/app/editor/active-store'
import { listFamilies, loadFont } from '@/app/editor/fonts'
import { altitudeFontPolicy } from '@/app/editor/fonts/policy'
import { teamFontStatus } from '@/app/editor/fonts/team'

import { pageIdOfNode } from './navigation'

export type FontReplacementOutcome =
  | { status: 'replaced'; count: number }
  | { status: 'unchanged' }
  | { status: 'failed'; message: string }

const EMPTY_REPORT: DocumentFontReport = {
  families: [],
  faceCount: 0,
  missingFaceCount: 0,
  pageIds: []
}

/**
 * The document font report while `active`: every family and style in use, where each
 * resolved from, Altitude sanctioning, replacement suggestions and the replace action.
 */
export function useDocumentFontReport(active: Ref<boolean>) {
  const editor = useEditorStore()
  const revision = ref(0)
  const available = shallowRef<FontFamilyOption[]>([])
  const replacing = ref(false)
  let listVersion = 0

  const refresh = () => {
    revision.value++
  }
  useEditorEvent('font:resolution-changed', refresh)
  useEditorEvent('graph:replaced', refresh)
  useEditorEvent('node:created', refresh)
  useEditorEvent('node:updated', refresh)
  useEditorEvent('node:deleted', refresh)
  useEditorEvent('history:changed', refresh)
  watch(teamFontStatus, refresh)

  const policy = computed(() => {
    void revision.value
    return altitudeFontPolicy(editor.graph)
  })

  const report = computed(() => {
    void revision.value
    if (!active.value) return EMPTY_REPORT
    return buildDocumentFontReport(editor.graph, { sanctionedFamilies: policy.value.families })
  })

  watch(
    active,
    async (open) => {
      if (!open) {
        listVersion++
        return
      }
      const version = ++listVersion
      const families = await listFamilies().catch(() => [])
      if (version === listVersion) available.value = families
    },
    { immediate: true }
  )

  /** Families that load, sanctioned first; families the document already renders count. */
  function suggestionsFor(family: string): FontReplacementSuggestion[] {
    const rendered = report.value.families
      .filter((item) => !item.missing)
      .map((item) => item.family)
    return suggestFontReplacements(family, [...available.value, ...rendered], {
      sanctionedFamilies: policy.value.families
    })
  }

  async function replace(
    from: FontFaceSelector,
    to: FontReplacement
  ): Promise<FontReplacementOutcome> {
    if (replacing.value) return { status: 'unchanged' }
    replacing.value = true
    try {
      const family = report.value.families.find((item) => item.family === from.family)
      const styles = to.style
        ? [to.style]
        : [
            ...new Set(
              (family?.faces ?? [])
                .filter((face) => from.style === undefined || face.style === from.style)
                .map((face) => face.style)
            )
          ]
      await Promise.all(
        (styles.length > 0 ? styles : ['Regular']).map((style) => loadFont(to.family, style))
      )
      const result = editor.replaceFontFace(from, to)
      editor.renderer?.invalidateAllPictures()
      refresh()
      return result.nodeIds.length > 0
        ? { status: 'replaced', count: result.nodeIds.length }
        : { status: 'unchanged' }
    } catch (error) {
      return { status: 'failed', message: error instanceof Error ? error.message : String(error) }
    } finally {
      replacing.value = false
    }
  }

  /** Show the layers: switch to the first one's page, then select those on it and zoom. */
  async function revealLayers(nodeIds: readonly string[]): Promise<boolean> {
    const first = nodeIds.find((id) => editor.graph.getNode(id))
    if (!first) return false
    const pageId = pageIdOfNode(editor.graph, first)
    if (pageId && pageId !== editor.state.currentPageId) await editor.switchPage(pageId)
    const onPage = nodeIds.filter(
      (id) => editor.graph.getNode(id) && pageIdOfNode(editor.graph, id) === pageId
    )
    editor.select(onPage)
    editor.zoomToSelection()
    return true
  }

  return { report, policy, teamFontStatus, replacing, suggestionsFor, replace, revealLayers }
}
