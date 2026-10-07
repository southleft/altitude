<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { useDocumentWorkspace, useI18n } from '@open-pencil/vue'

import { describeGitHubFailure } from '@/app/integrations/storage/github/document/session'
import { githubFailureMessage } from '@/app/integrations/storage/github/failure-message'
import { githubIdentity } from '@/app/integrations/storage/github/identity'
import { githubPreferences } from '@/app/integrations/storage/github/preferences'
import { listGitHubDocuments } from '@/app/integrations/storage/github/repository'
import { resolveGitHubClient } from '@/app/integrations/storage/github/runtime'
import { openSettingsDialog } from '@/app/settings/dialog'
import { openGitHubDocumentInNewTab } from '@/app/tabs/open/github'
import DocumentEntry from '@/components/home/document/DocumentEntry.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'

const { query, view } = defineProps<{ query: string; view: 'grid' | 'list' }>()
const { storage, common, settings, locale } = useI18n()
const openError = ref<string | null>(null)

const workspace = useDocumentWorkspace({
  source: {
    async refresh() {
      if (!githubIdentity.value) return []
      const preferences = githubPreferences.value
      const documents = await listGitHubDocuments(
        await resolveGitHubClient(),
        { owner: preferences.owner, repo: preferences.repo, branch: preferences.branch },
        preferences.folder
      )
      return documents.map((document) => ({ id: document.path, updatedAt: '', ...document }))
    },
    loadPreview: () => Promise.resolve(null)
  },
  // Listing costs several API requests; refresh on demand instead of on focus or a timer.
  refreshOnFocus: false,
  refreshOnReconnect: false
})
const documents = workspace.documents
watch([githubIdentity, githubPreferences], () => void workspace.refresh(), { deep: true })

const description = computed(() =>
  storage.value.githubWorkspaceDescription({
    repository: `${githubPreferences.value.owner}/${githubPreferences.value.repo}`,
    branch: githubPreferences.value.branch,
    folder: githubPreferences.value.folder || '/'
  })
)
const errorText = computed(() => {
  const error = workspace.error.value
  if (error == null) return null
  const failure = describeGitHubFailure(error)
  return githubFailureMessage(failure.kind, failure.resetAt, storage.value, locale.value)
})
const filtered = computed(() => {
  const normalized = query.trim().toLocaleLowerCase(locale.value)
  if (!normalized) return documents.value
  return documents.value.filter((document) =>
    `${document.name}\n${document.path}`.toLocaleLowerCase(locale.value).includes(normalized)
  )
})

async function open(document: { path: string; name: string }) {
  openError.value = null
  try {
    await openGitHubDocumentInNewTab(document)
  } catch (error) {
    const failure = describeGitHubFailure(error)
    openError.value = githubFailureMessage(
      failure.kind,
      failure.resetAt,
      storage.value,
      locale.value
    )
  }
}
</script>

<template>
  <section class="mt-7" data-test-id="home-github-documents">
    <div class="mb-3 flex items-start gap-3">
      <div class="min-w-0">
        <h2 class="text-base font-semibold">{{ storage.githubDocuments }}</h2>
        <p class="mt-0.5 truncate text-xs text-muted sm:whitespace-normal">{{ description }}</p>
      </div>
      <div class="ml-auto flex shrink-0 items-center gap-1">
        <IconButton :label="common.refresh" class="size-10 sm:size-7" @click="workspace.refresh">
          <icon-lucide-refresh-cw class="size-3.5" />
        </IconButton>
        <IconButton
          :label="settings.title"
          class="size-10 sm:size-7"
          @click="openSettingsDialog('github')"
        >
          <icon-lucide-settings-2 class="size-3.5" />
        </IconButton>
      </div>
    </div>

    <AppAlert v-if="openError" tone="error" :heading="openError" class="mb-3" />

    <p
      v-if="workspace.loading.value && documents.length === 0"
      class="rounded-lg border border-dashed border-border px-4 py-4 text-center text-xs text-muted sm:py-6"
    >
      {{ storage.githubLoading }}
    </p>
    <AppAlert v-else-if="errorText && documents.length === 0" tone="error" :heading="errorText">
      <template #actions>
        <AppButton size="xs" variant="outline" @click="workspace.refresh">{{
          common.refresh
        }}</AppButton>
      </template>
    </AppAlert>
    <div
      v-else-if="filtered.length && view === 'grid'"
      class="grid grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]"
    >
      <DocumentEntry
        v-for="document in filtered"
        :key="document.id"
        :name="document.name"
        :metadata="document.path"
        @open="open(document)"
      />
    </div>
    <div v-else-if="filtered.length" class="overflow-hidden rounded-lg border border-border">
      <DocumentEntry
        v-for="document in filtered"
        :key="document.id"
        view="list"
        :name="document.name"
        :metadata="document.path"
        @open="open(document)"
      />
    </div>
    <div
      v-else-if="!githubIdentity"
      class="rounded-lg border border-dashed border-border px-4 py-4 text-center text-xs text-muted sm:py-6"
    >
      <p>{{ storage.githubWorkspaceNotConfigured }}</p>
      <AppButton variant="outline" class="mt-3" @click="openSettingsDialog('github')">
        {{ settings.title }}
      </AppButton>
    </div>
    <p
      v-else-if="!query.trim()"
      class="rounded-lg border border-dashed border-border px-4 py-4 text-center text-xs text-muted sm:py-6"
    >
      {{ storage.githubEmpty }}
    </p>
  </section>
</template>
