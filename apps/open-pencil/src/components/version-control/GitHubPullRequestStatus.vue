<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import { useStorageMessages } from '@open-pencil/vue'

import type { GitHubPullRequestSummary } from '@/app/integrations/storage/github/branches/pulls'
import ExternalLink from '@/components/links/ExternalLink.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import versionControlTheme from '@/theme/version-control'

const {
  pullRequest,
  branch,
  defaultBranch,
  disabled = false,
  readyAction = false,
  readyPending = false
} = defineProps<{
  pullRequest: GitHubPullRequestSummary | null
  branch: string
  defaultBranch: string
  disabled?: boolean
  /** Offer Ready for review on a draft (the document's own draft pull request). */
  readyAction?: boolean
  readyPending?: boolean
}>()

const emit = defineEmits<{
  open: []
  switchToDefault: []
  deleteBranch: []
  readyForReview: []
}>()
const storage = useStorageMessages()
const styles = tv(versionControlTheme)()

const stateLabel = computed(() => {
  switch (pullRequest?.state) {
    case 'merged':
      return storage.value.githubPullRequestMerged
    case 'closed':
      return storage.value.githubPullRequestClosed
    case 'draft':
      return storage.value.githubPullRequestDraft
    default:
      return storage.value.githubPullRequestOpen
  }
})

const reviewLabel = computed(() => {
  if (!pullRequest || pullRequest.state === 'merged' || pullRequest.state === 'closed') return null
  switch (pullRequest.review) {
    case 'approved':
      return storage.value.githubReviewApproved
    case 'changes-requested':
      return storage.value.githubReviewChangesRequested
    case 'commented':
      return storage.value.githubReviewCommented
    default:
      return storage.value.githubReviewPending
  }
})
</script>

<template>
  <div :class="styles.pull()" data-test-id="github-pull-request-status">
    <template v-if="pullRequest">
      <div :class="styles.pullHeader()">
        <span :class="styles.pullState()" :data-state="pullRequest.state">{{ stateLabel }}</span>
        <span v-if="reviewLabel" class="text-muted">{{ reviewLabel }}</span>
      </div>
      <ExternalLink :href="pullRequest.url" class="text-[11px]">{{
        storage.githubViewPullRequest({ number: String(pullRequest.number) })
      }}</ExternalLink>
      <template v-if="pullRequest.state === 'draft' && readyAction">
        <p :class="styles.hint()">{{ storage.githubReadyForReviewHint }}</p>
        <AppButton
          size="xs"
          variant="outline"
          class="self-start"
          :loading="readyPending"
          :disabled="disabled || readyPending"
          data-test-id="github-ready-for-review"
          @click="emit('readyForReview')"
        >
          <template #leading><icon-lucide-eye class="size-3" /></template>
          {{ readyPending ? storage.githubMarkingReady : storage.githubReadyForReview }}
        </AppButton>
      </template>
      <template v-if="pullRequest.state === 'merged'">
        <p :class="styles.hint()">
          {{ storage.githubPullRequestMergedHint({ base: pullRequest.base }) }}
        </p>
        <div class="flex flex-wrap gap-1.5">
          <AppButton
            size="xs"
            variant="outline"
            :disabled="disabled"
            data-test-id="github-switch-to-default"
            @click="emit('switchToDefault')"
            >{{ storage.githubSwitchTo({ branch: defaultBranch }) }}</AppButton
          >
          <AppButton
            size="xs"
            variant="outline"
            color="error"
            :disabled="disabled"
            @click="emit('deleteBranch')"
            >{{ storage.githubDeleteBranch({ branch }) }}</AppButton
          >
        </div>
      </template>
    </template>
    <template v-else>
      <p :class="styles.hint()">
        {{ storage.githubPullRequestMerges({ head: branch, base: defaultBranch }) }}
      </p>
      <AppButton
        size="xs"
        variant="outline"
        class="self-start"
        :disabled="disabled"
        data-test-id="github-open-pull-request"
        @click="emit('open')"
      >
        <template #leading><icon-lucide-git-pull-request class="size-3" /></template>
        {{ storage.githubOpenPullRequest }}
      </AppButton>
    </template>
  </div>
</template>
