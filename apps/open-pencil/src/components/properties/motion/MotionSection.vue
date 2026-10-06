<script setup lang="ts">
import { computed } from 'vue'

import { useI18n, useMotionSpec } from '@open-pencil/vue'

import IconButton from '@/components/ui/button/IconButton.vue'
import PanelFieldGroup from '@/components/ui/panel/PanelFieldGroup.vue'
import PanelSection from '@/components/ui/panel/PanelSection.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'

import MotionTransitionList from './MotionTransitionList.vue'

const {
  active,
  editable,
  isInstance,
  owner,
  transitions,
  variants,
  motionMode,
  durationVariables,
  easingVariables,
  playing,
  addTransition,
  removeTransition,
  setTrigger,
  setUse,
  toggleProperty,
  setDurationVariable,
  setEasingVariable,
  setTarget,
  suggestFromVariants,
  setMotionMode,
  play
} = useMotionSpec()
const { panels } = useI18n()

const canEdit = computed(() => editable.value && !isInstance.value)
const modeOptions = computed(
  () => motionMode.value?.modes.map((mode) => ({ value: mode.modeId, label: mode.name })) ?? []
)
const hasVariants = computed(() => Object.keys(variants.value).length > 0)
</script>

<template>
  <PanelSection
    v-if="active && (!isInstance || transitions.length > 0)"
    :label="panels.motion"
    :empty="transitions.length === 0"
  >
    <template v-if="canEdit" #actions>
      <IconButton
        v-if="hasVariants && transitions.length === 0"
        :label="panels.suggestMotion"
        @click="suggestFromVariants"
      >
        <icon-lucide-wand-sparkles class="size-3.5" />
      </IconButton>
      <IconButton :label="panels.addTransition" @click="addTransition()">
        <icon-lucide-plus class="size-3.5" />
      </IconButton>
    </template>

    <div class="flex flex-col gap-2">
      <PanelFieldGroup v-if="motionMode && transitions.length" :label="panels.motionMode">
        <AppSelect
          :label="panels.motionMode"
          :options="modeOptions"
          :model-value="motionMode.activeModeId"
          @update:model-value="setMotionMode(String($event))"
        />
      </PanelFieldGroup>

      <p v-if="isInstance && owner && transitions.length" class="text-[10px] text-muted">
        {{ panels.motionFromOwner({ name: owner.name }) }} · {{ panels.motionReadOnly }}
      </p>

      <MotionTransitionList
        v-if="transitions.length"
        :transitions="transitions"
        :editable="canEdit"
        :can-play="isInstance"
        :playing="playing"
        :variants="variants"
        :duration-variables="durationVariables"
        :easing-variables="easingVariables"
        @set-trigger="setTrigger"
        @set-use="setUse"
        @toggle-property="toggleProperty"
        @set-duration="setDurationVariable"
        @set-easing="setEasingVariable"
        @set-target="setTarget"
        @remove="removeTransition"
        @play="play"
      />
      <p v-else class="py-1 text-[10px] text-muted">{{ panels.noTransitions }}</p>
    </div>
  </PanelSection>
</template>
