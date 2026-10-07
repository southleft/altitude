import { useEventListener } from '@vueuse/core'
import { onScopeDispose, type Ref } from 'vue'

import type { Editor } from '@open-pencil/core/editor'

type PointerCoords = (event: MouseEvent) => { cx: number; cy: number }

/**
 * Motion preview pointer input.
 *
 * While the Motion preview mode is on, hovering an instance whose component set has motion
 * plays its `hover` transition, holding the primary button plays `press`, and a click toggles
 * `expand` (or `enter`). Primary-button presses are consumed in the capture phase so the
 * canvas does not select or drag while previewing; panning and zooming keep working.
 */
export function useMotionPreviewInput(
  canvasRef: Ref<HTMLCanvasElement | null>,
  editor: Editor,
  getCoords: PointerCoords,
  isEnabled: () => boolean = () => true
) {
  let hovered: string | null = null
  let pressed: string | null = null

  const previewing = () => isEnabled() && editor.isMotionPreviewEnabled()

  function targetAt(event: MouseEvent): string | null {
    const { cx, cy } = getCoords(event)
    const hit = editor.graph.hitTestDeep(cx, cy, editor.state.currentPageId)
    return editor.findMotionTarget(hit?.id ?? null)
  }

  function setHovered(next: string | null) {
    if (next === hovered) return
    if (hovered) editor.reverseMotion(hovered, 'hover')
    hovered = next
    if (next) editor.playMotion(next, 'hover')
  }

  function reset() {
    hovered = null
    pressed = null
  }

  function onMove(event: MouseEvent) {
    if (!previewing()) return
    setHovered(targetAt(event))
  }

  function onDown(event: MouseEvent) {
    if (!previewing() || event.button !== 0 || editor.state.activeTool === 'HAND') return
    event.preventDefault()
    event.stopImmediatePropagation()
    const target = targetAt(event)
    setHovered(target)
    if (!target) return
    pressed = target
    editor.playMotion(target, 'press')
  }

  function onUp(event: MouseEvent) {
    if (!previewing() || event.button !== 0 || !pressed) return
    event.stopImmediatePropagation()
    const target = pressed
    pressed = null
    editor.reverseMotion(target, 'press')
    if (targetAt(event) !== target) return
    if (editor.toggleMotion(target, 'expand').status === 'none') {
      editor.toggleMotion(target, 'enter')
    }
  }

  useEventListener(canvasRef, 'mousemove', onMove)
  useEventListener(canvasRef, 'mousedown', onDown, { capture: true })
  useEventListener(canvasRef, 'mouseup', onUp, { capture: true })
  useEventListener(canvasRef, 'mouseleave', () => {
    if (previewing()) setHovered(null)
  })

  const stop = editor.onEditorEvent('motion:preview-changed', reset)
  onScopeDispose(stop)
}
