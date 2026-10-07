<script setup lang="ts">
import { useCollabPanelContext } from '@/components/CollabPanel/context'
import CommentAvatar from '@/components/comments/CommentAvatar.vue'

const collab = useCollabPanelContext()
</script>

<template>
  <div data-test-id="collab-github-identity" class="mb-3 flex flex-col gap-1.5">
    <div class="flex items-center gap-2 text-xs text-surface">
      <CommentAvatar :login="collab.localUser.name" :avatar="collab.localUser.avatar" />
      <span class="truncate">{{
        collab.messages.signedInAs({ name: collab.localUser.name })
      }}</span>
    </div>
    <p class="text-[11px] leading-relaxed text-muted">{{ collab.messages.githubIdentityNote }}</p>
  </div>
</template>
