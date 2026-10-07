<script setup lang="ts">
import { useNow } from '@vueuse/core'
import { tv } from 'tailwind-variants'
import { ref } from 'vue'

import { useI18n, useStorageMessages } from '@open-pencil/vue'

import type { CommentThread } from '@/app/integrations/storage/github/comments/repository'
import type {
  CommentReplies,
  CommentOperationOutcome
} from '@/app/integrations/storage/github/comments/session'
import { relativeTime } from '@/app/integrations/storage/github/failure-message'
import ChatMarkdown from '@/components/chat/ChatMarkdown.vue'
import CommentAvatar from '@/components/comments/CommentAvatar.vue'
import CommentComposer from '@/components/comments/CommentComposer.vue'
import ExternalLink from '@/components/links/ExternalLink.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppBadge from '@/components/ui/feedback/AppBadge.vue'
import commentsTheme from '@/theme/comments'

const {
  thread,
  replies = null,
  replyPending = false,
  statePending = false,
  failureText = null
} = defineProps<{
  thread: CommentThread
  replies?: CommentReplies | null
  replyPending?: boolean
  statePending?: boolean
  /** Translated failure of the last reply or resolve attempt. */
  failureText?: string | null
}>()

const emit = defineEmits<{
  reply: [text: string, done: (outcome: CommentOperationOutcome) => void]
  setResolved: [resolved: boolean]
  retryReplies: []
}>()

const storage = useStorageMessages()
const { locale } = useI18n()
const now = useNow({ interval: 30_000 })
const styles = tv(commentsTheme)()
const draft = ref('')

function when(iso: string) {
  const date = new Date(iso)
  // The clock ticks every 30 s; never show a just-created message as in the future.
  return relativeTime(date, locale.value, Math.max(now.value.getTime(), date.getTime()))
}

function reply(text: string) {
  emit('reply', text, (outcome) => {
    if (outcome.ok) draft.value = ''
  })
}
</script>

<template>
  <article :class="styles.thread()" data-slot="comment-thread" :data-state="thread.state">
    <div :class="styles.message()">
      <div :class="styles.messageHeader()">
        <CommentAvatar :login="thread.author?.login ?? '?'" :avatar="thread.author?.avatarURL" />
        <span :class="styles.rowAuthor()">{{ thread.author?.login ?? '—' }}</span>
        <span>{{ when(thread.createdAt) }}</span>
        <AppBadge v-if="thread.state === 'closed'">{{ storage.githubCommentResolved }}</AppBadge>
      </div>
      <div :class="styles.messageBody()">
        <ChatMarkdown :content="thread.body || thread.title" />
      </div>
    </div>

    <p
      v-if="replies?.status === 'loading' && replies.items.length === 0"
      :class="styles.sectionHint()"
    >
      {{ storage.githubCommentLoadingReplies }}
    </p>
    <div v-for="item in replies?.items ?? []" :key="item.id" :class="styles.message()">
      <div :class="styles.messageHeader()">
        <CommentAvatar :login="item.author?.login ?? '?'" :avatar="item.author?.avatarURL" />
        <span :class="styles.rowAuthor()">{{ item.author?.login ?? '—' }}</span>
        <span>{{ when(item.createdAt) }}</span>
      </div>
      <div :class="styles.messageBody()">
        <ChatMarkdown :content="item.body" />
      </div>
    </div>
    <AppAlert
      v-if="replies?.status === 'failed'"
      tone="error"
      :heading="storage.githubCommentLoadingReplies"
      :description="failureText ?? undefined"
    >
      <template #actions>
        <AppButton size="xs" variant="outline" @click="emit('retryReplies')">{{
          storage.githubRefresh
        }}</AppButton>
      </template>
    </AppAlert>

    <div :class="styles.actions()">
      <AppButton
        size="xs"
        variant="outline"
        :loading="statePending"
        :disabled="statePending"
        data-test-id="comment-toggle-resolved"
        @click="emit('setResolved', thread.state === 'open')"
      >
        <template #leading>
          <icon-lucide-rotate-ccw v-if="thread.state === 'closed'" class="size-3" />
          <icon-lucide-check v-else class="size-3" />
        </template>
        {{ thread.state === 'open' ? storage.githubCommentResolve : storage.githubCommentReopen }}
      </AppButton>
      <ExternalLink :href="thread.url" class="text-[11px]">{{
        storage.githubCommentOpenInGitHub
      }}</ExternalLink>
    </div>

    <AppAlert
      v-if="failureText && replies?.status !== 'failed'"
      tone="error"
      :heading="failureText"
    />

    <div :class="styles.replyForm()">
      <CommentComposer
        v-model="draft"
        :pending="replyPending"
        :placeholder="storage.githubCommentReplyPlaceholder"
        :submit-label="storage.githubCommentReply"
        :autofocus="false"
        @submit="reply"
        @cancel="draft = ''"
      />
    </div>
  </article>
</template>
