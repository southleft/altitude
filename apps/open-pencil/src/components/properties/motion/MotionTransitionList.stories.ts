import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'

import type { MotionTransitionControl } from '@open-pencil/vue'

import MotionTransitionList from './MotionTransitionList.vue'

const fast = { id: 'var:fast', name: 'theme/animation/duration/role/fast' }
const slow = { id: 'var:slow', name: 'theme/animation/duration/role/slow' }
const standard = { id: 'var:standard', name: 'theme/animation/timing/role/standard' }

const hover: MotionTransitionControl = {
  id: 'hover',
  trigger: 'hover',
  use: 'hover',
  properties: ['background-color', 'color'],
  to: { State: 'Hover' },
  durationMs: 200,
  easing: 'cubic-bezier(0.15, 0.99, 0.18, 0.99)',
  durationVariable: fast,
  easingVariable: standard,
  durationBound: false,
  easingBound: false
}

const overlay: MotionTransitionControl = {
  ...hover,
  id: 'enter',
  trigger: 'enter',
  use: 'overlay',
  properties: ['opacity', 'transform'],
  to: null,
  durationMs: 400,
  durationVariable: slow,
  durationBound: true
}

const variants = { State: ['Default', 'Hover', 'Pressed'], Size: ['Small', 'Large'] }

function story(
  transitions: MotionTransitionControl[],
  options: { editable?: boolean; canPlay?: boolean } = {}
) {
  return {
    render: () => ({
      components: { MotionTransitionList },
      setup() {
        const playing = ref<string | null>(null)
        function play(id: string) {
          playing.value = id
          setTimeout(() => {
            playing.value = null
          }, 600)
        }
        return {
          transitions,
          variants,
          playing,
          play,
          durations: [fast, slow],
          easings: [standard],
          editable: options.editable ?? true,
          canPlay: options.canPlay ?? false
        }
      },
      template: `<div class="w-60 bg-panel p-3">
        <MotionTransitionList
          :transitions="transitions"
          :editable="editable"
          :can-play="canPlay"
          :playing="playing"
          :variants="variants"
          :duration-variables="durations"
          :easing-variables="easings"
          @play="play"
        />
      </div>`
    })
  } satisfies StoryObj
}

const meta = {
  title: 'Editor/Properties/Motion Transitions'
} satisfies Meta
export default meta

/** A component set: transitions follow role tokens and stay editable. */
export const ComponentSet: StoryObj<typeof meta> = story([hover, overlay])

/** An instance: read-only, with a play button per transition. */
export const Instance: StoryObj<typeof meta> = story([hover], { editable: false, canPlay: true })

/** The Motion collection in its reduced mode: every role duration resolves to 0 ms. */
export const ReducedMotion: StoryObj<typeof meta> = story([
  { ...hover, durationMs: 0 },
  { ...overlay, durationMs: 0 }
])
