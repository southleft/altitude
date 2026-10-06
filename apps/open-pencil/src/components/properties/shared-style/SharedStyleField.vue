<script setup lang="ts">
import type { SharedStyleKind } from '@open-pencil/scene-graph'
import { useI18n } from '@open-pencil/vue'

import { useSharedStylePicker } from '@/components/properties/shared-style/useSharedStylePicker'
import PanelFieldGroup from '@/components/ui/panel/PanelFieldGroup.vue'
import PanelGrid from '@/components/ui/panel/PanelGrid.vue'
import AppVirtualSelect from '@/components/ui/select/AppVirtualSelect.vue'

const { kind, label } = defineProps<{ kind: SharedStyleKind; label: string }>()
const { common } = useI18n()
const { visible, value, options, update } = useSharedStylePicker(kind)
</script>

<template>
  <PanelGrid v-if="visible" class="mb-1.5">
    <PanelFieldGroup :label="label">
      <AppVirtualSelect
        :model-value="value"
        :options="options"
        :search-placeholder="common.search"
        :empty-label="common.noResults"
        :label="label"
        :data-property="`${kind}-style`"
        @update:model-value="update"
      />
    </PanelFieldGroup>
  </PanelGrid>
</template>
