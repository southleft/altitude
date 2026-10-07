<script setup lang="ts">
import { useNow } from '@vueuse/core'
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import { useI18n, useStorageMessages } from '@open-pencil/vue'

import type { CommentPanelSections } from '@/app/integrations/storage/github/comments/pins'
import type { CommentThread } from '@/app/integrations/storage/github/comments/repository'
import type {
  CommentOperationOutcome,
  CommentReplies
} from '@/app/integrations/storage/github/comments/session'
import { relativeTime } from '@/app/integrations/storage/github/failure-message'
import CommentAvatar from '@/components/comments/CommentAvatar.vue'
import CommentThreadView from '@/components/comments/CommentThreadView.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppSwitch from '@/components/ui/toggle/AppSwitch.vue'
import commentsTheme from '@/theme/comments'

const {
  sections,
  loading = false,
  loaded = false,
  failureText = null,
  selected = null,
  replies = null,
  replyPending = false,
  statePending = false,
  threadFailureText = null
} = defineProps<{
  sections: CommentPanelSections<CommentThread>
  loading?: boolean
  loaded?: boolean
  failureText?: string | null
  selected?: CommentThread | null
  replies?: CommentReplies | null
  replyPending?: boolean
  statePending?: boolean
  threadFailureText?: string | null
}>()

const includeResolved = defineModel<boolean>('includeResolved', { default: false })
const emit = defineEmits<{
  close: []
  refresh: []
  select: [number: number | null]
  reply: [number: number, text: string, done: (outcome: CommentOperationOutcome) => void]
  setResolved: [number: number, resolved: boolean]
  retryReplies: [number: number]
}>()

const storage = useStorageMessages()
const { locale } = useI18n()
const now = useNow({ interval: 30_000 })
const styles = tv(commentsTheme)()

const empty = computed(
  () =>
    sections.page.length === 0 && sections.orphaned.length === 0 && sections.otherPages.length === 0
)
const rows = computed(() => [
  ...sections.page.map((thread) => ({ thread, group: 'page' as const, pageName: '' })),
  ...sections.orphaned.map((thread) => ({ thread, group: 'orphaned' as const, pageName: '' })),
  ...sections.otherPages.map((entry) => ({ ...entry, group: 'other' as const }))
])

function when(iso: string) {
  const date = new Date(iso)
  // The clock ticks every 30 s; never show a just-created message as in the future.
  return relativeTime(date, locale.value, Math.max(now.value.getTime(), date.getTime()))
}

function onReply(text: string, done: (outcome: CommentOperationOutcome) => void) {
  if (selected) emit('reply', selected.number, text, done)
}
function onSetResolved(resolved: boolean) {
  if (selected) emit('setResolved', selected.number, resolved)
}
function onRetryReplies() {
  if (selected) emit('retryReplies', selected.number)
}
</script>

<template>
  <aside
    data-test-id="comments-panel"
    :class="styles.panel()"
    :aria-label="storage.githubComments"
    @pointerdown.stop
    @wheel.stop
  >
    <header :class="styles.panelHeader()">
      <IconButton
        v-if="selected"
        :label="storage.githubCommentBack"
        data-test-id="comments-back"
        @click="emit('select', null)"
      >
        <icon-lucide-arrow-left class="size-3.5" />
      </IconButton>
      <h2 :class="styles.panelTitle()">
        {{ selected ? `#${selected.number} ${selected.title}` : storage.githubComments }}
      </h2>
      <IconButton
        :label="storage.githubRefresh"
        :disabled="loading"
        data-test-id="comments-refresh"
        @click="emit('refresh')"
      >
        <icon-lucide-refresh-cw class="size-3.5" />
      </IconButton>
      <IconButton :label="storage.githubCommentsClose" @click="emit('close')">
        <icon-lucide-x class="size-3.5" />
      </IconButton>
    </header>

    <div v-if="!selected" :class="styles.panelToolbar()">
      <label class="flex items-center gap-1.5">
        <AppSwitch v-model="includeResolved" :label="storage.githubCommentsShowResolved" />
        <span>{{ storage.githubCommentsShowResolved }}</span>
      </label>
    </div>

    <div :class="styles.panelBody()">
      <AppAlert v-if="failureText" tone="error" :heading="failureText" />

      <CommentThreadView
        v-if="selected"
        :thread="selected"
        :replies="replies"
        :reply-pending="replyPending"
        :state-pending="statePending"
        :failure-text="threadFailureText"
        @reply="onReply"
        @set-resolved="onSetResolved"
        @retry-replies="onRetryReplies"
      />

      <template v-else>
        <p v-if="loading && !loaded" :class="styles.panelMessage()">
          {{ storage.githubCommentsLoading }}
        </p>
        <p v-else-if="loaded && empty" :class="styles.panelMessage()">
          {{ storage.githubCommentsEmpty }}
        </p>

        <template v-for="(row, index) in rows" :key="row.thread.number">
          <h3
            v-if="row.group === 'orphaned' && rows[index - 1]?.group !== 'orphaned'"
            :class="styles.sectionTitle()"
          >
            {{ storage.githubCommentsOrphaned }}
          </h3>
          <p
            v-if="row.group === 'orphaned' && rows[index - 1]?.group !== 'orphaned'"
            :class="styles.sectionHint()"
          >
            {{ storage.githubCommentsOrphanedHint }}
          </p>
          <h3
            v-if="row.group === 'other' && rows[index - 1]?.group !== 'other'"
            :class="styles.sectionTitle()"
          >
            {{ storage.githubCommentsOtherPages }}
          </h3>
          <button
            type="button"
            :class="styles.row()"
            :data-state="row.thread.state"
            :data-orphaned="row.group === 'orphaned' || undefined"
            data-test-id="comment-row"
            @click="emit('select', row.thread.number)"
          >
            <CommentAvatar
              :login="row.thread.author?.login ?? '?'"
              :avatar="row.thread.author?.avatarURL"
            />
            <span :class="styles.rowBody()">
              <span :class="styles.rowMeta()">
                <span :class="styles.rowAuthor()">{{ row.thread.author?.login ?? '—' }}</span>
                <span v-if="row.group === 'other'">{{
                  storage.githubCommentPage({ page: row.pageName })
                }}</span>
                <span v-else>#{{ row.thread.number }} · {{ when(row.thread.createdAt) }}</span>
              </span>
              <span :class="styles.rowTitle()">{{ row.thread.title }}</span>
              <span v-if="row.thread.replyCount > 0" :class="styles.rowMeta()">{{
                storage.githubCommentReplies({ count: String(row.thread.replyCount) })
              }}</span>
            </span>
          </button>
        </template>
      </template>
    </div>
  </aside>
</template>
