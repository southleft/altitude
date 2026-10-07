<script setup lang="ts">
import { computed } from 'vue'

import {
  MOTION_PROPERTIES,
  MOTION_TRIGGERS,
  MOTION_USE_CASES,
  type MotionProperty,
  type MotionTrigger,
  type MotionUseCase
} from '@open-pencil/scene-graph'
import { useI18n } from '@open-pencil/vue'
import type { MotionTransitionControl, MotionVariableOption } from '@open-pencil/vue'

import IconButton from '@/components/ui/button/IconButton.vue'
import PanelFieldGroup from '@/components/ui/panel/PanelFieldGroup.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'

const {
  transitions,
  editable = true,
  canPlay = false,
  playing = null,
  variants = {},
  durationVariables = [],
  easingVariables = []
} = defineProps<{
  transitions: MotionTransitionControl[]
  editable?: boolean
  canPlay?: boolean
  playing?: string | null
  variants?: Record<string, string[]>
  durationVariables?: MotionVariableOption[]
  easingVariables?: MotionVariableOption[]
}>()

const emit = defineEmits<{
  setTrigger: [id: string, trigger: MotionTrigger]
  setUse: [id: string, use: MotionUseCase]
  toggleProperty: [id: string, property: MotionProperty]
  setDuration: [id: string, variableId: string | null]
  setEasing: [id: string, variableId: string | null]
  setTarget: [id: string, property: string, value: string | null]
  remove: [id: string]
  play: [id: string]
}>()

const { panels } = useI18n()

/** Reka selects reject empty values, so "follow the role token" uses a sentinel. */
const ROLE = '__role'
const AUTO = '__auto'

const triggerLabels = computed<Record<MotionTrigger, string>>(() => ({
  hover: panels.value.motionTriggerHover,
  press: panels.value.motionTriggerPress,
  focus: panels.value.motionTriggerFocus,
  expand: panels.value.motionTriggerExpand,
  enter: panels.value.motionTriggerEnter,
  exit: panels.value.motionTriggerExit,
  'variant-change': panels.value.motionTriggerVariantChange
}))
const useLabels = computed<Record<MotionUseCase, string>>(() => ({
  hover: panels.value.motionUseHover,
  expand: panels.value.motionUseExpand,
  overlay: panels.value.motionUseOverlay,
  emphasis: panels.value.motionUseEmphasis
}))
const triggerOptions = computed(() =>
  MOTION_TRIGGERS.map((value) => ({ value, label: triggerLabels.value[value] }))
)
const useOptions = computed(() =>
  MOTION_USE_CASES.map((value) => ({ value, label: useLabels.value[value] }))
)
const properties = MOTION_PROPERTIES.filter((property) => property !== 'all')
const durationOptions = computed(() => [
  { value: ROLE, label: panels.value.motionRoleToken },
  ...durationVariables.map((variable) => ({ value: variable.id, label: variable.name }))
])
const easingOptions = computed(() => [
  { value: ROLE, label: panels.value.motionRoleToken },
  ...easingVariables.map((variable) => ({ value: variable.id, label: variable.name }))
])
const variantEntries = computed(() => Object.entries(variants))

function durationValue(transition: MotionTransitionControl) {
  return transition.durationBound && transition.durationVariable
    ? transition.durationVariable.id
    : ROLE
}

function easingValue(transition: MotionTransitionControl) {
  return transition.easingBound && transition.easingVariable ? transition.easingVariable.id : ROLE
}

function timingSummary(transition: MotionTransitionControl) {
  const duration =
    transition.durationMs === 0 ? panels.value.motionInstant : `${transition.durationMs} ms`
  const token = transition.durationVariable?.name.split('/').at(-1)
  return token ? `${duration} · ${token}` : duration
}

function targetOptions(values: string[]) {
  return [
    { value: AUTO, label: panels.value.motionAutomatic },
    ...values.map((value) => ({ value, label: value }))
  ]
}

function onSelect(value: string | number, apply: (value: string | null) => void) {
  const text = String(value)
  apply(text === ROLE || text === AUTO ? null : text)
}
</script>

<template>
  <ul class="flex flex-col gap-2" data-slot="motion-transitions">
    <li
      v-for="transition in transitions"
      :key="transition.id"
      class="flex flex-col gap-1.5 rounded border border-border p-1.5"
      :data-transition="transition.id"
    >
      <div class="flex items-center gap-1">
        <AppSelect
          class="flex-1"
          :label="panels.motionTrigger"
          :options="triggerOptions"
          :model-value="transition.trigger"
          :disabled="!editable"
          @update:model-value="emit('setTrigger', transition.id, $event as MotionTrigger)"
        />
        <IconButton
          v-if="canPlay"
          :label="panels.playTransition"
          :active="playing === transition.id"
          @click="emit('play', transition.id)"
        >
          <icon-lucide-play class="size-3.5" />
        </IconButton>
        <IconButton
          v-if="editable"
          :label="panels.removeTransition"
          @click="emit('remove', transition.id)"
        >
          <icon-lucide-trash-2 class="size-3.5" />
        </IconButton>
      </div>

      <PanelFieldGroup :label="panels.motionUseCase">
        <AppSelect
          :label="panels.motionUseCase"
          :options="useOptions"
          :model-value="transition.use"
          :disabled="!editable"
          @update:model-value="emit('setUse', transition.id, $event as MotionUseCase)"
        />
      </PanelFieldGroup>

      <PanelFieldGroup :label="panels.motionDuration">
        <AppSelect
          :label="panels.motionDuration"
          :options="durationOptions"
          :model-value="durationValue(transition)"
          :disabled="!editable"
          @update:model-value="onSelect($event, (id) => emit('setDuration', transition.id, id))"
        />
      </PanelFieldGroup>
      <p class="text-[10px] text-muted" data-slot="motion-timing">
        {{ timingSummary(transition) }}
      </p>

      <PanelFieldGroup :label="panels.motionEasing">
        <AppSelect
          :label="panels.motionEasing"
          :options="easingOptions"
          :model-value="easingValue(transition)"
          :disabled="!editable"
          @update:model-value="onSelect($event, (id) => emit('setEasing', transition.id, id))"
        />
      </PanelFieldGroup>

      <PanelFieldGroup
        v-for="[property, values] in variantEntries"
        :key="property"
        :label="`${panels.motionTargetVariant}: ${property}`"
      >
        <AppSelect
          :label="`${panels.motionTargetVariant}: ${property}`"
          :options="targetOptions(values)"
          :model-value="transition.to?.[property] ?? AUTO"
          :disabled="!editable"
          @update:model-value="
            onSelect($event, (value) => emit('setTarget', transition.id, property, value))
          "
        />
      </PanelFieldGroup>

      <div
        role="group"
        :aria-label="panels.motionProperties"
        class="flex flex-wrap gap-1"
        data-slot="motion-properties"
      >
        <button
          v-for="property in properties"
          :key="property"
          type="button"
          :aria-pressed="transition.properties.includes(property)"
          :data-state="transition.properties.includes(property) ? 'on' : 'off'"
          :disabled="!editable"
          class="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted hover:bg-hover disabled:cursor-default disabled:hover:bg-transparent data-[state=on]:border-accent data-[state=on]:bg-accent/10 data-[state=on]:text-accent"
          @click="emit('toggleProperty', transition.id, property)"
        >
          {{ property }}
        </button>
      </div>
    </li>
  </ul>
</template>
