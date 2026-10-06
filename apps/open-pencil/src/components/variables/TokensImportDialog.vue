<script setup lang="ts">
import { computed, watch } from 'vue'

import { useCommonMessages, useVariableMessages } from '@open-pencil/vue'

import { useTokensImport } from '@/app/variables/tokens-import/use'
import AppButton from '@/components/ui/button/AppButton.vue'
import { AppDialog } from '@/components/ui/dialog'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppCheckbox from '@/components/ui/toggle/AppCheckbox.vue'

const open = defineModel<boolean>('open', { default: false })

const messages = useVariableMessages()
const common = useCommonMessages()
const tokens = useTokensImport()

const ISSUE_PREVIEW = 40

const imported = computed(() =>
  tokens.outcome.value?.status === 'imported' ? tokens.outcome.value.result : null
)
const failure = computed(() =>
  tokens.outcome.value?.status === 'failed' ? tokens.outcome.value.message : null
)
const issues = computed(() => imported.value?.issues.slice(0, ISSUE_PREVIEW) ?? [])

watch(open, (isOpen) => {
  if (!isOpen) tokens.reset()
})
</script>

<template>
  <AppDialog
    v-model:open="open"
    size="md"
    :heading="messages.importTokensTitle"
    :description="messages.importTokensDescription"
    :close-label="common.close"
    data-test-id="tokens-import-dialog"
  >
    <div class="flex flex-col gap-4 text-xs">
      <section class="flex flex-col gap-2" :aria-label="messages.tokenSource">
        <div class="font-medium">{{ messages.tokenSource }}</div>
        <div class="flex flex-wrap items-center gap-2">
          <AppButton size="md" :disabled="tokens.reading.value" @click="tokens.chooseFolder()">
            <icon-lucide-folder-open class="size-3.5" />
            {{ messages.chooseTokenFolder }}
          </AppButton>
          <AppButton size="md" :disabled="tokens.reading.value" @click="tokens.chooseFiles()">
            <icon-lucide-file-json class="size-3.5" />
            {{ messages.chooseTokenFiles }}
          </AppButton>
        </div>
        <div class="text-muted" data-slot="token-source-summary">
          <template v-if="tokens.reading.value">{{ messages.readingTokens }}</template>
          <template v-else-if="tokens.source.value">
            {{ tokens.source.value.label }} ·
            {{ messages.tokenFileCount({ count: tokens.fileCount.value }) }}
          </template>
          <template v-else>{{ messages.noTokenSource }}</template>
        </div>
        <AppAlert
          v-if="tokens.source.value?.unreadable.length"
          tone="warning"
          :heading="messages.unreadableTokenFiles({ count: tokens.source.value.unreadable.length })"
          :description="tokens.source.value.unreadable.join(', ')"
        />
      </section>

      <section class="flex flex-col gap-2" :aria-label="messages.tokenMapping">
        <div class="font-medium">{{ messages.tokenMapping }}</div>
        <p class="text-muted">{{ messages.tokenMappingHelp }}</p>
        <div class="flex flex-wrap items-center gap-2">
          <AppButton size="md" @click="tokens.choosePreset()">
            <icon-lucide-settings-2 class="size-3.5" />
            {{ messages.chooseTokenMapping }}
          </AppButton>
          <span class="text-muted">{{
            tokens.preset.value?.label ?? messages.noTokenMapping
          }}</span>
          <AppButton v-if="tokens.preset.value" size="md" @click="tokens.clearPreset()">
            {{ messages.removeTokenMapping }}
          </AppButton>
        </div>
      </section>

      <label class="flex items-center gap-2">
        <AppCheckbox
          :model-value="tokens.prune.value"
          :ariaLabel="messages.pruneTokens"
          @update:model-value="tokens.prune.value = $event"
        />
        <span>{{ messages.pruneTokens }}</span>
      </label>

      <AppAlert
        v-if="tokens.readError.value"
        tone="error"
        :heading="messages.tokenImportFailed"
        :description="tokens.readError.value"
      />
      <AppAlert
        v-if="failure"
        tone="error"
        :heading="messages.tokenImportFailed"
        :description="failure"
      />
      <template v-if="imported">
        <AppAlert
          tone="success"
          :heading="messages.tokenImportDone"
          :description="
            messages.tokenImportSummary({
              created: imported.created.length,
              updated: imported.updated.length,
              unchanged: imported.unchanged.length
            })
          "
        />
        <AppAlert
          v-if="imported.removed.length && !imported.pruned"
          tone="warning"
          :heading="messages.tokenImportRemoved({ count: imported.removed.length })"
          :description="imported.removed.join(', ')"
        />
        <AppAlert
          v-if="imported.issues.length"
          tone="info"
          :heading="messages.tokenImportIssues({ count: imported.issues.length })"
        >
          <ul class="mt-1 max-h-40 overflow-y-auto font-mono" data-slot="token-import-issues">
            <li v-for="(issue, index) in issues" :key="index">
              {{ issue.code }} · {{ issue.token ?? issue.file }} — {{ issue.message }}
            </li>
          </ul>
        </AppAlert>
      </template>
    </div>

    <template #footer>
      <AppButton size="md" @click="open = false">{{ common.close }}</AppButton>
      <AppButton
        size="md"
        color="primary"
        variant="solid"
        :disabled="!tokens.canImport.value"
        @click="tokens.importTokens()"
      >
        {{ messages.runTokenImport }}
      </AppButton>
    </template>
  </AppDialog>
</template>
