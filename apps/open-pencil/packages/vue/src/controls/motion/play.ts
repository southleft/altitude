import { useTimeoutFn } from '@vueuse/core'
import { onScopeDispose, ref, type Ref } from 'vue'

import type { Editor } from '@open-pencil/core/editor'
import type { MotionTrigger, SceneNode } from '@open-pencil/scene-graph'

import type { MotionTransitionControl } from './use'

/** Hold the destination briefly before reversing, so the end state can be seen. */
const PLAY_HOLD_MS = 600

/**
 * The Motion section's play button: plays a transition on the selected instance, holds the
 * destination variant, then reverses. Stopping the scope restores the instance.
 */
export function useMotionPlay(
  editor: Editor,
  selected: Ref<SceneNode | null>,
  transitions: Ref<MotionTransitionControl[]>
) {
  const playing = ref<string | null>(null)
  const reverseDelay = ref(0)
  const settleDelay = ref(0)
  let current: { nodeId: string; trigger: MotionTrigger } | null = null

  const settle = useTimeoutFn(
    () => {
      playing.value = null
      current = null
    },
    settleDelay,
    { immediate: false }
  )
  const reverse = useTimeoutFn(
    () => {
      if (!current) return
      editor.reverseMotion(current.nodeId, current.trigger)
      settle.start()
    },
    reverseDelay,
    { immediate: false }
  )

  function play(id: string): boolean {
    const node = selected.value
    const transition = transitions.value.find((candidate) => candidate.id === id)
    if (node?.type !== 'INSTANCE' || !transition) return false
    reverse.stop()
    settle.stop()
    editor.stopMotion(node.id)
    const result = editor.playMotion(node.id, transition.trigger)
    if (result.status === 'none') return false
    const total = (result.timing?.durationMs ?? 0) + (result.timing?.delayMs ?? 0)
    current = { nodeId: node.id, trigger: transition.trigger }
    playing.value = id
    reverseDelay.value = total + PLAY_HOLD_MS
    settleDelay.value = total
    reverse.start()
    return true
  }

  onScopeDispose(() => {
    if (current) editor.stopMotion(current.nodeId)
  })

  return { playing, play }
}
