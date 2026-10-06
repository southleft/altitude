<script setup lang="ts">
import { computed } from 'vue'

import { useI18n, useSceneComputed, useVariableMessages } from '@open-pencil/vue'

import { useEditorStore } from '@/app/editor/active-store'
import IconButton from '@/components/ui/button/IconButton.vue'
import Tip from '@/components/ui/overlay/Tip.vue'
import PanelSection from '@/components/ui/panel/PanelSection.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'

const emit = defineEmits<{ openDialog: []; importTokens: [] }>()

const editor = useEditorStore()
const collectionCount = useSceneComputed(() => {
  void editor.state.sceneVersion
  return editor.getCollectionCount()
})
const variableCount = useSceneComputed(() => {
  void editor.state.sceneVersion
  return editor.getVariableCount()
})

/**
 * Collections that actually have something to switch between.
 *
 * The engine has supported variable modes all along — `setActiveMode`, `activeMode`, and
 * per-node `variableModes` resolution — but nothing in the UI ever called them, so a file
 * with Light/Dark or Altitude/Southleft modes had no way to show either. Single-mode
 * collections are filtered out because a picker with one option is noise.
 */
const switchable = useSceneComputed(() => {
  void editor.state.sceneVersion
  return (
    editor
      .getCollections()
      // `modes` is optional-in-practice: a collection added through the API without one
      // would otherwise throw here and take the whole properties panel down with it.
      .filter((collection) => (collection.modes?.length ?? 0) > 1)
      .map((collection) => ({
        id: collection.id,
        name: collection.name || 'Untitled collection',
        activeModeId: editor.graph.activeMode.get(collection.id) ?? collection.defaultModeId,
        options: collection.modes.map((mode) => ({ value: mode.modeId, label: mode.name }))
      }))
  )
})

const hasVariables = computed(() => variableCount.value > 0)
const { panels } = useI18n()
const variableMessages = useVariableMessages()

function selectMode(collectionId: string, modeId: string): void {
  editor.setActiveMode(collectionId, modeId)
}
</script>

<template>
  <PanelSection :label="panels.variables" :empty="!hasVariables">
    <template #actions>
      <IconButton :label="variableMessages.importTokens" @click="emit('importTokens')">
        <icon-lucide-file-down class="size-3.5" />
      </IconButton>
      <IconButton :label="panels.openVariables" @click="emit('openDialog')">
        <icon-lucide-settings-2 class="size-3.5" />
      </IconButton>
    </template>

    <div v-if="hasVariables" class="mt-1 text-[11px] text-muted">
      {{ variableCount }} / {{ collectionCount }}
    </div>
    <div v-else class="mt-1 text-[11px] text-muted">{{ panels.noLocalVariables }}</div>

    <div v-if="switchable.length > 0" class="mt-2 flex flex-col gap-1.5">
      <div
        v-for="collection in switchable"
        :key="collection.id"
        class="flex items-center gap-2"
        data-test-id="variables-mode-row"
      >
        <Tip as-child :label="collection.name">
          <span class="min-w-0 flex-1 truncate text-[11px] text-muted">
            {{ collection.name }}
          </span>
        </Tip>
        <AppSelect
          :model-value="collection.activeModeId"
          :options="collection.options"
          :label="collection.name"
          data-test-id="variables-mode-select"
          :ui="{ trigger: 'h-6 min-w-0 flex-1 text-[11px]' }"
          @update:model-value="selectMode(collection.id, String($event))"
        />
      </div>
    </div>
  </PanelSection>
</template>
