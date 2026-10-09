<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed, ref, watch } from 'vue'

import { safeAvatarURL } from '@/app/collab/identity'
import { initials } from '@/app/shell/ui'
import commentsTheme from '@/theme/comments'

const { login, avatar } = defineProps<{ login: string; avatar?: string | null }>()

const styles = tv(commentsTheme)()
const failed = ref(false)
// Only GitHub's avatar host is loaded; anything else falls back to initials.
const source = computed(() => (failed.value ? null : safeAvatarURL(avatar, 40)))
watch(
  () => avatar,
  () => {
    failed.value = false
  }
)
</script>

<template>
  <img
    v-if="source"
    :src="source"
    alt=""
    referrerpolicy="no-referrer"
    loading="lazy"
    :class="styles.avatar()"
    @error="failed = true"
  />
  <span v-else :class="styles.avatarFallback()" aria-hidden="true">{{ initials(login) }}</span>
</template>
