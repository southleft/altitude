<script setup lang="ts">
import { useNow } from '@vueuse/core'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { tv } from 'tailwind-variants'
import { computed, ref, useId, watch } from 'vue'

import { useCommonMessages, useI18n, useStorageMessages } from '@open-pencil/vue'

import { useEditorStore } from '@/app/editor/active-store'
import { isDraftBranch } from '@/app/integrations/storage/github/branches/name'
import { githubCommitPromptPending } from '@/app/integrations/storage/github/document/entry'
import {
  githubFailureMessage,
  relativeTime
} from '@/app/integrations/storage/github/failure-message'
import { githubIdentity } from '@/app/integrations/storage/github/identity'
import { githubPreferences } from '@/app/integrations/storage/github/preferences'
import { openSettingsDialog } from '@/app/settings/dialog'
import { useActionToast } from '@/app/shell/toast/action'
import { reloadGitHubDocument } from '@/app/tabs/open/github'
import ExternalLink from '@/components/links/ExternalLink.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import { AppConfirmationDialog } from '@/components/ui/dialog'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppInput from '@/components/ui/input/AppInput.vue'
import AppTextarea from '@/components/ui/input/AppTextarea.vue'
import { usePopoverUI } from '@/components/ui/overlay/popover'
import GitHubPullRequestStatus from '@/components/version-control/GitHubPullRequestStatus.vue'
import GitHubSaveIndicator from '@/components/version-control/GitHubSaveIndicator.vue'
import versionControlTheme from '@/theme/version-control'

const store = useEditorStore()
const { showActionToast } = useActionToast()
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
const autosave = computed(() => store.githubAutosave)
const indicator = computed(() => autosave.value.indicator.value)
const binding = computed(() => session.value.binding.value)
const pullRequest = computed(() => session.value.pullRequest.value)
const pullRequestActivity = computed(() => session.value.pullRequestActivity.value)
const status = computed(() => session.value.status.value)
const notice = computed(() => session.value.notice.value)
const working = computed(() => status.value.phase === 'working')
const dirty = computed(() => {
  void store.state.sceneVersion
  return store.hasUnsavedChanges()
})

const state = computed(() => {
  switch (indicator.value.kind) {
    case 'saving':
      return 'working'
    case 'failed':
      return 'attention'
    case 'committed':
      return 'clean'
    default:
      return 'dirty'
  }
})

/** The draft branch this document autosaves to, when it is bound to one. */
const draftBranch = computed(() => {
  const current = binding.value
  const login = githubIdentity.value?.login
  if (!current || !login || !isDraftBranch(current.branch, current.path, login)) return null
  return current.branch
})

const nextAttempt = computed(() => {
  const autosaveState = autosave.value.state.value
  if (autosaveState.phase !== 'backoff') return null
  return storage.value.githubSaveNextAttempt({
    time: relativeTime(new Date(autosaveState.retryAt), locale.value, now.value.getTime())
  })
})

const pullRequestFailure = computed(() => {
  const activity = pullRequestActivity.value
  if (activity.phase !== 'failed') return null
  return githubFailureMessage(
    activity.failure.kind,
    activity.failure.resetAt,
    storage.value,
    locale.value
  )
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

/** Oversized files, worded per page so the user knows what to split or leave out. */
const oversizeMessages = computed(() => {
  const current = status.value
  if (current.phase !== 'failed') return []
  return (current.failure.oversize ?? []).map((file) => ({
    key: file.path,
    text: file.page
      ? storage.value.githubPageTooLarge({ page: file.page, size: String(file.megabytes) })
      : storage.value.githubFileTooLarge({ path: file.path, size: String(file.megabytes) })
  }))
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

// A failed Commit or Publish needs a decision; show it instead of leaving a quiet dot.
// Background autosave failures only change the chip: they must not take focus.
watch(
  () => status.value,
  (current) => {
    if (current.phase !== 'conflict' && current.phase !== 'failed') return
    if (current.origin === 'user') open.value = true
  }
)
watch(open, (isOpen) => {
  if (!isOpen) return
  documentName.value = store.state.documentName
  if (binding.value && !pullRequest.value) void session.value.refreshPullRequest()
})
// File › Save to GitHub… and the save hint ask for the popover; consume the request.
watch(
  githubCommitPromptPending,
  (pending) => {
    if (!pending) return
    githubCommitPromptPending.value = false
    open.value = true
  },
  { immediate: true }
)

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
function retry() {
  void autosave.value.retry()
}
async function readyForReview() {
  const number = pullRequest.value?.number
  if ((await session.value.readyForReview()) && number !== undefined) {
    showActionToast(storage.value.githubMarkedReady({ number: String(number) }))
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
        :aria-label="binding ? storage.githubVersionControl : storage.githubSaveToRepository"
      >
        <icon-lucide-git-commit-horizontal :class="styles.triggerIcon()" aria-hidden="true" />
        <GitHubSaveIndicator :indicator="indicator" />
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
            <p v-if="draftBranch" :class="styles.hint()" data-test-id="github-draft-branch">
              {{ storage.githubDraftBranch({ branch: draftBranch }) }}
            </p>

            <AppAlert
              v-if="indicator.kind === 'offline'"
              :heading="storage.githubSaveOffline"
              :description="
                nextAttempt
                  ? `${storage.githubSaveOfflineDetail} ${nextAttempt}`
                  : storage.githubSaveOfflineDetail
              "
            >
              <template #actions>
                <AppButton size="xs" variant="outline" @click="retry">{{
                  storage.githubSaveRetry
                }}</AppButton>
              </template>
            </AppAlert>
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
            <AppAlert
              v-if="failureText && indicator.kind !== 'offline'"
              tone="error"
              :heading="failureText"
              :description="nextAttempt ?? undefined"
            >
              <template v-if="oversizeMessages.length" #default>
                <p v-for="item in oversizeMessages" :key="item.key">{{ item.text }}</p>
                <p>{{ storage.githubTooLargeHint }}</p>
              </template>
              <template v-if="status.phase === 'failed'" #actions>
                <AppButton
                  v-if="status.failure.kind === 'unauthorized'"
                  size="xs"
                  variant="outline"
                  @click="openSettings"
                  >{{ storage.githubSetUp }}</AppButton
                >
                <AppButton
                  v-else-if="!oversizeMessages.length"
                  size="xs"
                  variant="outline"
                  data-test-id="github-save-retry"
                  @click="retry"
                  >{{ storage.githubSaveRetry }}</AppButton
                >
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

            <GitHubPullRequestStatus
              v-if="pullRequest"
              :pull-request="pullRequest"
              :branch="binding.branch"
              :default-branch="pullRequest.base"
              :disabled="working"
              ready-action
              :ready-pending="
                pullRequestActivity.phase === 'working' && pullRequestActivity.operation === 'ready'
              "
              @ready-for-review="readyForReview"
            />
            <AppAlert v-if="pullRequestFailure" tone="error" :heading="pullRequestFailure" />

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
            <AppAlert v-if="failureText" tone="error" :heading="failureText">
              <template v-if="oversizeMessages.length" #default>
                <p v-for="item in oversizeMessages" :key="item.key">{{ item.text }}</p>
                <p>{{ storage.githubTooLargeHint }}</p>
              </template>
            </AppAlert>
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
