<script setup lang="ts">
import { useNow } from '@vueuse/core'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { tv } from 'tailwind-variants'
import { computed, ref, useId, watch } from 'vue'

import { useCommonMessages, useI18n, useStorageMessages } from '@open-pencil/vue'

import { useEditorStore } from '@/app/editor/active-store'
import {
  githubFailureMessage,
  relativeTime
} from '@/app/integrations/storage/github/failure-message'
import { githubIdentity } from '@/app/integrations/storage/github/identity'
import { githubPreferences } from '@/app/integrations/storage/github/preferences'
import { openSettingsDialog } from '@/app/settings/dialog'
import { reloadGitHubDocument } from '@/app/tabs/open/github'
import ExternalLink from '@/components/links/ExternalLink.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import { AppConfirmationDialog } from '@/components/ui/dialog'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppInput from '@/components/ui/input/AppInput.vue'
import AppTextarea from '@/components/ui/input/AppTextarea.vue'
import { usePopoverUI } from '@/components/ui/overlay/popover'
import versionControlTheme from '@/theme/version-control'

const store = useEditorStore()
const storage = useStorageMessages()
const common = useCommonMessages()
const { locale } = useI18n()
const styles = tv(versionControlTheme)()
const cls = usePopoverUI({ content: 'z-50 w-80 p-3' })
const now = useNow({ interval: 30_000 })
const messageID = useId()
const nameID = useId()
const open = ref(false)
const message = ref('')
const documentName = ref('')
const reloadOpen = ref(false)
const reloadError = ref<string | null>(null)

const session = computed(() => store.github)
const binding = computed(() => session.value.binding.value)
const status = computed(() => session.value.status.value)
const notice = computed(() => session.value.notice.value)
const working = computed(() => status.value.phase === 'working')
const dirty = computed(() => {
  void store.state.sceneVersion
  return store.hasUnsavedChanges()
})

const state = computed(() => {
  if (working.value) return 'working'
  if (status.value.phase === 'conflict' || status.value.phase === 'failed') return 'attention'
  return dirty.value || !binding.value ? 'dirty' : 'clean'
})

const committedLabel = computed(() => {
  const current = binding.value
  if (!current) return null
  const sha = current.commitSHA.slice(0, 7)
  const time = current.committedAt
    ? relativeTime(new Date(current.committedAt), locale.value, now.value.getTime())
    : ''
  return storage.value.githubCommitted({ sha, time })
})

const commitURL = computed(() => {
  const current = binding.value
  if (!current) return null
  return `https://github.com/${encodeURIComponent(current.owner)}/${encodeURIComponent(current.repo)}/commit/${current.commitSHA}`
})

const failureText = computed(() => {
  const current = status.value
  if (current.phase !== 'failed') return null
  return githubFailureMessage(
    current.failure.kind,
    current.failure.resetAt,
    storage.value,
    locale.value
  )
})

// Conflicts and failures need a decision; show them instead of leaving a quiet dot.
watch(
  () => status.value.phase,
  (phase) => {
    if (phase === 'conflict' || phase === 'failed') open.value = true
  }
)
watch(open, (isOpen) => {
  if (isOpen) documentName.value = store.state.documentName
})

async function commit() {
  if (await session.value.commit({ message: message.value })) message.value = ''
}
async function overwrite() {
  if (await session.value.commit({ message: message.value, overwrite: true })) message.value = ''
}
function publish() {
  void session.value.publish(documentName.value || store.state.documentName)
}
function saveAsNew() {
  void session.value.publish(store.state.documentName, message.value || undefined)
}
async function reload() {
  reloadError.value = null
  try {
    await reloadGitHubDocument(store)
    open.value = false
  } catch (error) {
    reloadError.value = error instanceof Error ? error.message : String(error)
  }
}
function openSettings() {
  open.value = false
  openSettingsDialog('github')
}
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger as-child>
      <button
        type="button"
        data-test-id="github-commit-button"
        :data-state="state"
        :class="styles.trigger()"
        :aria-label="storage.githubVersionControl"
      >
        <span :class="styles.dot()" :data-state="state" aria-hidden="true" />
        <icon-lucide-git-commit-horizontal :class="styles.triggerIcon()" aria-hidden="true" />
        <span v-if="binding" :class="styles.triggerLabel()">{{
          binding.commitSHA.slice(0, 7)
        }}</span>
      </button>
    </PopoverTrigger>

    <PopoverPortal>
      <PopoverContent
        data-test-id="github-commit-popover"
        :class="cls.content"
        :side-offset="8"
        side="bottom"
        align="start"
      >
        <div :class="styles.content()">
          <template v-if="binding">
            <div :class="styles.header()">
              <p :class="styles.title()">{{ storage.githubVersionControl }}</p>
              <p :class="styles.description()">
                {{
                  storage.githubLocation({
                    repository: `${binding.owner}/${binding.repo}`,
                    branch: binding.branch
                  })
                }}
                · {{ binding.path }}
              </p>
            </div>
            <div :class="styles.status()">
              <span>{{ committedLabel }}</span>
              <span v-if="dirty">· {{ storage.githubUnsavedChanges }}</span>
              <ExternalLink v-if="commitURL" :href="commitURL" class="text-[11px]">{{
                storage.githubViewCommit
              }}</ExternalLink>
            </div>
            <div :class="styles.field()">
              <label :for="messageID" :class="styles.label()">{{
                storage.githubCommitMessage
              }}</label>
              <AppTextarea
                :id="messageID"
                v-model="message"
                :rows="2"
                :disabled="working"
                :aria-describedby="`${messageID}-hint`"
              />
              <p :id="`${messageID}-hint`" :class="styles.hint()">
                {{ storage.githubCommitMessageHint }}
              </p>
            </div>

            <AppAlert
              v-if="status.phase === 'conflict'"
              tone="error"
              :heading="storage.githubConflict"
              :description="
                storage.githubConflictDescription({ count: String(status.paths.length) })
              "
            >
              <template #actions>
                <AppButton size="xs" variant="outline" @click="reloadOpen = true">{{
                  storage.githubReloadRemote
                }}</AppButton>
                <AppButton size="xs" variant="outline" @click="saveAsNew">{{
                  storage.githubSaveAsNew
                }}</AppButton>
                <AppButton size="xs" variant="outline" color="error" @click="overwrite">{{
                  storage.githubOverwrite
                }}</AppButton>
              </template>
            </AppAlert>
            <AppAlert v-if="failureText" tone="error" :heading="failureText">
              <template
                v-if="status.phase === 'failed' && status.failure.kind === 'unauthorized'"
                #actions
              >
                <AppButton size="xs" variant="outline" @click="openSettings">{{
                  storage.githubSetUp
                }}</AppButton>
              </template>
            </AppAlert>
            <AppAlert v-if="notice?.rebased" :heading="storage.githubRebased">
              <template #actions>
                <AppButton size="xs" variant="outline" @click="reloadOpen = true">{{
                  storage.githubReloadRemote
                }}</AppButton>
              </template>
            </AppAlert>
            <AppAlert
              v-for="warning in notice?.warnings ?? []"
              :key="warning.path"
              tone="warning"
              :heading="
                storage.githubLargeFile({ path: warning.path, size: String(warning.megabytes) })
              "
            />
            <AppAlert v-if="reloadError" tone="error" :heading="reloadError" />

            <div :class="styles.footer()">
              <AppButton
                color="primary"
                variant="solid"
                :loading="working"
                :disabled="working"
                data-test-id="github-commit"
                @click="commit"
                >{{ working ? storage.githubCommitting : storage.githubCommit }}</AppButton
              >
            </div>
          </template>

          <template v-else-if="githubIdentity">
            <div :class="styles.header()">
              <p :class="styles.title()">{{ storage.githubSaveToRepository }}</p>
              <p :class="styles.description()">
                {{
                  storage.githubSaveToRepositoryDescription({
                    repository: `${githubPreferences.owner}/${githubPreferences.repo}`,
                    branch: githubPreferences.branch
                  })
                }}
              </p>
            </div>
            <div :class="styles.field()">
              <label :for="nameID" :class="styles.label()">{{ storage.githubDocumentName }}</label>
              <AppInput :id="nameID" v-model="documentName" tone="panel" :disabled="working" />
            </div>
            <AppAlert v-if="failureText" tone="error" :heading="failureText" />
            <div :class="styles.footer()">
              <AppButton
                color="primary"
                variant="solid"
                :loading="working"
                :disabled="working"
                data-test-id="github-publish"
                @click="publish"
                >{{ working ? storage.githubSaving : storage.githubSaveToRepository }}</AppButton
              >
            </div>
          </template>

          <template v-else>
            <div :class="styles.header()">
              <p :class="styles.title()">{{ storage.githubSetUp }}</p>
              <p :class="styles.description()">{{ storage.githubSetUpDescription }}</p>
            </div>
            <div :class="styles.footer()">
              <AppButton variant="outline" @click="openSettings">{{
                storage.githubSetUp
              }}</AppButton>
            </div>
          </template>
        </div>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>

  <AppConfirmationDialog
    v-model:open="reloadOpen"
    :heading="storage.githubReloadConfirm"
    :description="storage.githubReloadConfirmDescription"
    :cancel-label="common.cancel"
    :confirm-label="storage.githubReloadRemote"
    tone="danger"
    @confirm="reload"
  />
</template>
