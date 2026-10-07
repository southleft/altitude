<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { tv } from 'tailwind-variants'
import { computed, ref, watch } from 'vue'

import { useCommonMessages, useI18n, useStorageMessages } from '@open-pencil/vue'

import { useEditorStore } from '@/app/editor/active-store'
import { suggestedBranchName } from '@/app/integrations/storage/github/branches/name'
import { pullRequestTitle } from '@/app/integrations/storage/github/branches/pulls'
import {
  useGitHubBranches,
  type GitHubBranchOutcome
} from '@/app/integrations/storage/github/branches/use'
import type { GitHubDocumentFailure } from '@/app/integrations/storage/github/document/session'
import { githubFailureMessage } from '@/app/integrations/storage/github/failure-message'
import { useActionToast } from '@/app/shell/toast/action'
import { loadGitHubDocumentAt } from '@/app/tabs/open/github'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import { AppConfirmationDialog } from '@/components/ui/dialog'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import { usePopoverUI } from '@/components/ui/overlay/popover'
import Tip from '@/components/ui/overlay/Tip.vue'
import GitHubBranchList from '@/components/version-control/GitHubBranchList.vue'
import GitHubNewBranchDialog from '@/components/version-control/GitHubNewBranchDialog.vue'
import GitHubPullRequestDialog from '@/components/version-control/GitHubPullRequestDialog.vue'
import GitHubPullRequestStatus from '@/components/version-control/GitHubPullRequestStatus.vue'
import GitHubSwitchBranchDialog from '@/components/version-control/GitHubSwitchBranchDialog.vue'
import versionControlTheme from '@/theme/version-control'

const store = useEditorStore()
const storage = useStorageMessages()
const common = useCommonMessages()
const { locale } = useI18n()
const { showActionToast } = useActionToast()
const styles = tv(versionControlTheme)()
const cls = usePopoverUI({ content: 'z-50 w-72 p-3' })

const session = store.github
const branches = useGitHubBranches(session, {
  load: (location, path) => loadGitHubDocumentAt(store, location, path),
  hasUnsavedChanges: () => store.hasUnsavedChanges(),
  documentName: () => store.state.documentName,
  pageNames: () => store.graph.getPages().map((page) => page.name)
})

const open = ref(false)
const filter = ref('')
const binding = computed(() => session.binding.value)
const branchNames = computed(() => branches.branches.value?.map((branch) => branch.name) ?? null)
const busy = computed(() => branches.working.value || session.status.value.phase === 'working')

const newBranchOpen = ref(false)
const newBranchSuggestion = ref('')
const newBranchError = ref<string | null>(null)

const switchTarget = ref<string | null>(null)
const switchDirtyOpen = ref(false)
const switchError = ref<string | null>(null)

const missing = ref<{ branch: string; head: string } | null>(null)
const missingOpen = ref(false)

const pullOpen = ref(false)
const pullDraft = ref({ title: '', body: '' })
const pullPreparing = ref(false)
const pullError = ref<string | null>(null)

/** A merged branch left behind after switching away from it, offered for deletion. */
const mergedBranch = ref<string | null>(null)
const deleteOpen = ref(false)
/** The branch whose pull request was merged, captured before switching resets it. */
const wasMerged = ref<string | null>(null)
const actionError = ref<string | null>(null)

function describe(failure: GitHubDocumentFailure | null): string | null {
  if (!failure) return null
  return githubFailureMessage(failure.kind, failure.resetAt, storage.value, locale.value)
}

const listFailure = computed(() => describe(branches.failure.value))

watch(open, (isOpen) => {
  if (!isOpen) return
  actionError.value = null
  filter.value = ''
  if (!branches.branches.value && !branches.loading.value) void branches.refresh()
})

function outcomeError(outcome: GitHubBranchOutcome): string | null {
  return outcome.kind === 'failed' ? describe(outcome.failure) : null
}

async function finishSwitch(outcome: GitHubBranchOutcome, target: string, previous: string) {
  if (outcome.kind === 'missing') {
    missing.value = { branch: outcome.branch, head: outcome.head }
    open.value = false
    missingOpen.value = true
    return
  }
  if (outcome.kind !== 'done') {
    actionError.value = outcomeError(outcome)
    return
  }
  open.value = false
  showActionToast(storage.value.githubSwitchedBranch({ branch: target }))
  if (wasMerged.value === previous) mergedBranch.value = previous
}

async function selectBranch(target: string) {
  const current = binding.value
  if (!current || busy.value) return
  actionError.value = null
  wasMerged.value = branches.pullRequest.value?.state === 'merged' ? current.branch : null
  const outcome = await branches.switchBranch(target)
  if (outcome.kind === 'dirty') {
    switchTarget.value = target
    switchError.value = null
    open.value = false
    switchDirtyOpen.value = true
    return
  }
  await finishSwitch(outcome, target, current.branch)
}

async function switchAfterDirty(commitFirst: boolean) {
  const target = switchTarget.value
  const current = binding.value
  if (!target || !current) return
  switchError.value = null
  if (commitFirst && !(await session.commit())) {
    const status = session.status.value
    if (status.phase === 'failed') switchError.value = describe(status.failure)
    else if (status.phase === 'conflict') switchError.value = storage.value.githubConflict
    return
  }
  const outcome = await branches.switchBranch(target, true)
  switchDirtyOpen.value = false
  await finishSwitch(outcome, target, current.branch)
}

function adoptMissing() {
  if (!missing.value) return
  branches.adoptOnBranch(missing.value.branch, missing.value.head)
  open.value = false
}

function startNewBranch() {
  const current = binding.value
  if (!current) return
  newBranchSuggestion.value = suggestedBranchName(current.path)
  newBranchError.value = null
  open.value = false
  newBranchOpen.value = true
}

async function createBranch(name: string) {
  newBranchError.value = null
  const outcome = await branches.createBranch(name)
  if (outcome.kind === 'done') {
    newBranchOpen.value = false
    open.value = false
    showActionToast(storage.value.githubSwitchedBranch({ branch: name }))
    return
  }
  if (outcome.kind === 'failed' && outcome.failure.kind === 'conflict') {
    newBranchError.value = storage.value.githubBranchExists
    return
  }
  newBranchError.value =
    outcome.kind === 'invalid' ? storage.value.githubInvalidBranch : outcomeError(outcome)
}

async function startPullRequest() {
  pullError.value = null
  pullPreparing.value = true
  pullDraft.value = { title: pullRequestTitle(store.state.documentName), body: '' }
  open.value = false
  pullOpen.value = true
  try {
    pullDraft.value = await branches.pullRequestDraft()
  } finally {
    pullPreparing.value = false
  }
}

async function createPullRequest(input: { title: string; body: string; draft: boolean }) {
  pullError.value = null
  const outcome = await branches.createPullRequest(input)
  if (outcome.kind === 'done') {
    pullOpen.value = false
    const number = branches.pullRequest.value?.number
    if (number !== undefined) {
      showActionToast(storage.value.githubPullRequestCreated({ number: String(number) }))
    }
    return
  }
  pullError.value = outcomeError(outcome) ?? storage.value.githubErrorFailed
}

async function switchToDefault() {
  const target = branches.defaultBranch.value
  if (target) await selectBranch(target)
}

const deleteTarget = computed(() => mergedBranch.value ?? binding.value?.branch ?? '')

function requestDelete() {
  // The bound branch cannot be deleted while it is open: switch to the default first.
  if (!mergedBranch.value) {
    void switchToDefault()
    return
  }
  open.value = false
  deleteOpen.value = true
}

async function confirmDelete() {
  const target = mergedBranch.value
  if (!target) return
  const outcome = await branches.deleteBranch(target)
  if (outcome.kind === 'done') {
    mergedBranch.value = null
    showActionToast(storage.value.githubBranchDeleted({ branch: target }))
  } else {
    actionError.value = outcomeError(outcome)
  }
}
</script>

<template>
  <PopoverRoot v-if="binding" v-model:open="open">
    <Tip :label="`${storage.githubSwitchBranch}: ${binding.branch}`" side="bottom">
      <PopoverTrigger as-child>
        <button
          type="button"
          data-test-id="github-branch-button"
          :data-state="open ? 'open' : 'closed'"
          :class="styles.branchTrigger()"
          :aria-label="storage.githubSwitchBranch"
        >
          <icon-lucide-git-branch class="size-3.5 shrink-0" aria-hidden="true" />
          <span class="truncate">{{ binding.branch }}</span>
        </button>
      </PopoverTrigger>
    </Tip>

    <PopoverPortal>
      <PopoverContent
        data-test-id="github-branch-popover"
        :class="cls.content"
        :side-offset="8"
        side="bottom"
        align="start"
      >
        <div :class="styles.content()">
          <div class="flex items-center justify-between gap-2">
            <p :class="styles.title()">{{ storage.githubBranches }}</p>
            <IconButton
              :label="storage.githubRefresh"
              :disabled="branches.loading.value"
              @click="branches.refresh()"
            >
              <icon-lucide-refresh-cw class="size-3.5" />
            </IconButton>
          </div>

          <AppAlert
            v-if="mergedBranch"
            :heading="storage.githubDeleteBranchConfirm({ branch: mergedBranch })"
            :description="storage.githubDeleteBranchDescription"
          >
            <template #actions>
              <AppButton size="xs" variant="outline" color="error" @click="requestDelete">{{
                storage.githubDeleteBranch({ branch: mergedBranch })
              }}</AppButton>
              <AppButton size="xs" variant="ghost" color="neutral" @click="mergedBranch = null">{{
                common.cancel
              }}</AppButton>
            </template>
          </AppAlert>

          <p v-if="Object.keys(binding.files).length === 0" :class="styles.hint()">
            {{ storage.githubNotOnBranchYet }}
          </p>

          <GitHubPullRequestStatus
            v-if="branches.defaultBranch.value && !branches.onDefaultBranch.value"
            :pull-request="branches.pullRequest.value"
            :branch="binding.branch"
            :default-branch="branches.defaultBranch.value"
            :disabled="busy"
            @open="startPullRequest"
            @switch-to-default="switchToDefault"
            @delete-branch="requestDelete"
          />

          <AppAlert v-if="actionError" tone="error" :heading="actionError" />

          <GitHubBranchList
            v-model:filter="filter"
            :branches="branchNames"
            :current="binding.branch"
            :default-branch="branches.defaultBranch.value"
            :loading="branches.loading.value"
            :failure-text="listFailure"
            :disabled="busy"
            @select="selectBranch"
          />

          <div :class="styles.divider()" />
          <AppButton
            variant="ghost"
            color="neutral"
            size="sm"
            class="justify-start"
            :disabled="busy"
            data-test-id="github-new-branch"
            @click="startNewBranch"
          >
            <template #leading><icon-lucide-plus class="size-3.5" /></template>
            {{ storage.githubNewBranch }}
          </AppButton>
        </div>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>

  <GitHubNewBranchDialog
    v-if="binding"
    v-model:open="newBranchOpen"
    :base="binding.branch"
    :suggestion="newBranchSuggestion"
    :pending="branches.working.value"
    :error-text="newBranchError"
    @create="createBranch"
  />
  <GitHubSwitchBranchDialog
    v-if="binding && switchTarget"
    v-model:open="switchDirtyOpen"
    :current="binding.branch"
    :target="switchTarget"
    :pending="busy"
    :error-text="switchError"
    @commit-first="switchAfterDirty(true)"
    @discard="switchAfterDirty(false)"
  />
  <AppConfirmationDialog
    v-model:open="missingOpen"
    :heading="storage.githubMissingOnBranchTitle({ branch: missing?.branch ?? '' })"
    :description="storage.githubMissingOnBranchDescription"
    :cancel-label="common.cancel"
    :confirm-label="storage.githubAddOnNextCommit"
    @confirm="adoptMissing"
  />
  <GitHubPullRequestDialog
    v-if="binding && branches.defaultBranch.value"
    v-model:open="pullOpen"
    :head="binding.branch"
    :base="branches.defaultBranch.value"
    :initial-title="pullDraft.title"
    :initial-body="pullDraft.body"
    :preparing="pullPreparing"
    :pending="branches.working.value"
    :error-text="pullError"
    @create="createPullRequest"
  />
  <AppConfirmationDialog
    v-model:open="deleteOpen"
    :heading="storage.githubDeleteBranchConfirm({ branch: deleteTarget })"
    :description="storage.githubDeleteBranchDescription"
    :cancel-label="common.cancel"
    :confirm-label="storage.githubDeleteBranch({ branch: deleteTarget })"
    tone="danger"
    @confirm="confirmDelete"
  />
</template>
