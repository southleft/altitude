<script setup lang="ts">
import { useElementSize, useEventListener } from '@vueuse/core'
import { tv } from 'tailwind-variants'
import { computed, ref, watch } from 'vue'

import { useI18n, useStorageMessages } from '@open-pencil/vue'

import { safeAvatarURL } from '@/app/collab/identity'
import { useEditorStore } from '@/app/editor/active-store'
import {
  arrangeComments,
  canvasToScreen,
  screenToCanvas
} from '@/app/integrations/storage/github/comments/pins'
import type { CommentOperationOutcome } from '@/app/integrations/storage/github/comments/session'
import type { GitHubDocumentFailure } from '@/app/integrations/storage/github/document/session'
import { githubFailureMessage } from '@/app/integrations/storage/github/failure-message'
import CommentComposer from '@/components/comments/CommentComposer.vue'
import CommentsPanel from '@/components/comments/CommentsPanel.vue'
import commentsTheme from '@/theme/comments'

/** Issue title when a comment has no text on its first line (repository content). */
const FALLBACK_TITLE = 'Design comment'
const PIN_SIZE = 28
const COMPOSER_WIDTH = 256
const COMPOSER_HEIGHT = 160

const { canvas } = defineProps<{ canvas: HTMLCanvasElement | null }>()

const store = useEditorStore()
const storage = useStorageMessages()
const { locale } = useI18n()
const styles = tv(commentsTheme)()
const layer = ref<HTMLElement | null>(null)
const { width, height } = useElementSize(layer)
const composerText = ref('')
const composerError = ref<string | null>(null)
const threadFailure = ref<GitHubDocumentFailure | null>(null)

const comments = computed(() => store.comments)
const active = computed(() => comments.value.active.value)
const viewport = computed(() => ({
  panX: store.state.panX,
  panY: store.state.panY,
  zoom: store.state.zoom
}))

const arranged = computed(() => {
  void store.state.sceneVersion
  return arrangeComments(store.graph, comments.value.threads.value, store.state.currentPageId)
})

const pins = computed(() =>
  arranged.value.pins.map((pin) => {
    const screen = canvasToScreen(pin.point, viewport.value)
    return {
      ...pin,
      screen,
      avatar: safeAvatarURL(pin.thread.author?.avatarURL, 56)
    }
  })
)

const draftScreen = computed(() => {
  const draft = comments.value.draft.value
  return draft ? canvasToScreen(draft.anchor, viewport.value) : null
})

const composerPosition = computed(() => {
  const point = draftScreen.value
  if (!point) return null
  const left = Math.min(
    Math.max(8, point.x + PIN_SIZE + 4),
    Math.max(8, width.value - COMPOSER_WIDTH - 8)
  )
  const top = Math.min(
    Math.max(8, point.y - PIN_SIZE),
    Math.max(8, height.value - COMPOSER_HEIGHT - 8)
  )
  return { left: `${left}px`, top: `${top}px` }
})

const selectedThread = computed(() => {
  const number = comments.value.selected.value
  return number === null
    ? null
    : (comments.value.threads.value.find((thread) => thread.number === number) ?? null)
})

function describe(failure: GitHubDocumentFailure | null): string | null {
  return failure
    ? githubFailureMessage(failure.kind, failure.resetAt, storage.value, locale.value)
    : null
}

const failureText = computed(() => describe(comments.value.failure.value))
const threadFailureText = computed(() => {
  const number = comments.value.selected.value
  const replies = number === null ? undefined : comments.value.replies.value.get(number)
  return describe(replies?.status === 'failed' ? replies.failure : threadFailure.value)
})

watch(
  () => comments.value.selected.value,
  () => {
    threadFailure.value = null
  }
)
watch(
  () => comments.value.draft.value,
  (draft, previous) => {
    if (draft !== previous) composerError.value = null
    if (!draft) composerText.value = ''
  }
)

// Clicks on the canvas drop a pin instead of selecting while comment mode is on. Pans with
// the middle button, wheel and trackpad keep reaching the canvas.
useEventListener(
  () => (active.value ? canvas?.parentElement : null),
  'pointerdown',
  (event: PointerEvent) => {
    if (!canvas || event.button !== 0 || event.target !== canvas) return
    if (store.state.activeTool === 'HAND') return
    event.stopPropagation()
    event.preventDefault()
    const rect = canvas.getBoundingClientRect()
    const point = screenToCanvas(
      { x: event.clientX - rect.left, y: event.clientY - rect.top },
      viewport.value
    )
    const hit = store.hitTestAtPoint(point.x, point.y, true)
    comments.value.startDraft(point, hit?.id ?? null)
  },
  { capture: true }
)

// Pick up comments made elsewhere when the window regains focus (throttled in the session).
useEventListener(window, 'focus', () => {
  if (active.value) void comments.value.refresh({ auto: true })
})

async function submitDraft(text: string) {
  composerError.value = null
  const outcome = await comments.value.submitDraft(text, FALLBACK_TITLE)
  if (!outcome.ok) composerError.value = describe(outcome.failure)
}

async function reply(
  number: number,
  text: string,
  done: (outcome: CommentOperationOutcome) => void
) {
  threadFailure.value = null
  const outcome = await comments.value.reply(number, text)
  if (!outcome.ok) threadFailure.value = outcome.failure
  done(outcome)
}

async function setResolved(number: number, resolved: boolean) {
  threadFailure.value = null
  const outcome = await comments.value.setResolved(number, resolved)
  if (!outcome.ok) threadFailure.value = outcome.failure
}

function pinLabel(number: number, author: string | undefined) {
  return storage.value.githubCommentPin({ number: String(number), author: author ?? '—' })
}
</script>

<template>
  <div v-if="active" ref="layer" data-test-id="comment-layer" :class="styles.layer()">
    <button
      v-for="pin in pins"
      :key="pin.thread.number"
      type="button"
      data-test-id="comment-pin"
      :data-state="pin.thread.state"
      :data-selected="comments.selected.value === pin.thread.number"
      :data-orphaned="pin.orphaned"
      :aria-label="pinLabel(pin.thread.number, pin.thread.author?.login)"
      :class="styles.pin()"
      :style="{ left: `${pin.screen.x}px`, top: `${pin.screen.y}px` }"
      @pointerdown.stop
      @click="comments.select(pin.thread.number)"
    >
      <img
        v-if="pin.avatar"
        :src="pin.avatar"
        alt=""
        referrerpolicy="no-referrer"
        :class="styles.pinAvatar()"
      />
      <span v-else>{{ pin.thread.number }}</span>
    </button>

    <template v-if="draftScreen && composerPosition">
      <span
        data-draft="true"
        :class="styles.pin()"
        :style="{ left: `${draftScreen.x}px`, top: `${draftScreen.y}px` }"
        :aria-label="storage.githubCommentNewPin"
        role="img"
      >
        <icon-lucide-plus class="size-3.5" />
      </span>
      <div
        data-test-id="comment-composer"
        :class="styles.composer()"
        :style="composerPosition"
        @pointerdown.stop
        @wheel.stop
      >
        <CommentComposer
          v-model="composerText"
          :pending="comments.pending.value.has('draft')"
          :error="composerError"
          @submit="submitDraft"
          @cancel="comments.cancelDraft()"
        />
      </div>
    </template>

    <CommentsPanel
      :sections="arranged.sections"
      :loading="comments.loading.value"
      :loaded="comments.loaded.value"
      :failure-text="failureText"
      :selected="selectedThread"
      :replies="selectedThread ? (comments.replies.value.get(selectedThread.number) ?? null) : null"
      :reply-pending="
        selectedThread ? comments.pending.value.has(`reply:${selectedThread.number}`) : false
      "
      :state-pending="
        selectedThread ? comments.pending.value.has(`state:${selectedThread.number}`) : false
      "
      :thread-failure-text="threadFailureText"
      :include-resolved="comments.includeResolved.value"
      @update:include-resolved="comments.setIncludeResolved"
      @close="comments.setActive(false)"
      @refresh="comments.refresh()"
      @select="comments.select"
      @reply="reply"
      @set-resolved="setResolved"
      @retry-replies="comments.loadReplies"
    />
  </div>
</template>
