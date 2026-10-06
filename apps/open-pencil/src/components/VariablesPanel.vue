<script setup lang="ts">
import { ref } from 'vue'

import TokensImportDialog from './variables/TokensImportDialog.vue'
import VariablesDialog from './variables/VariablesDialog.vue'
import VariablesSection from './variables/VariablesSection.vue'

/**
 * Variables as a first-class tab.
 *
 * It used to live inside the Design panel's *empty* branch, so it only appeared when
 * nothing was selected — which reads as "my variables didn't import" on a file that has
 * 641 of them. Modes especially need a home that is always reachable: switching
 * Light/Dark is a document-level action, not a property of whatever happens to be
 * selected.
 */
const variablesOpen = ref(false)
const tokensImportOpen = ref(false)
</script>

<template>
  <div
    data-test-id="variables-panel"
    class="scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto pb-4"
  >
    <VariablesSection
      @open-dialog="variablesOpen = true"
      @import-tokens="tokensImportOpen = true"
    />
    <VariablesDialog v-model:open="variablesOpen" />
    <TokensImportDialog v-model:open="tokensImportOpen" />
  </div>
</template>
