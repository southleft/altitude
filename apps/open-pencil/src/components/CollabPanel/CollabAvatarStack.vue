<script setup lang="ts">
import { tv } from 'tailwind-variants'

import { colorToCSS } from '@open-pencil/core/color'
import { useI18n } from '@open-pencil/vue'

import { initials } from '@/app/shell/ui'
import { useCollabPanelContext } from '@/components/CollabPanel/context'
import Tip from '@/components/ui/overlay/Tip.vue'
import collaborationTheme from '@/theme/collaboration'

const collab = useCollabPanelContext()
const { common, collaboration: collaborationMessages } = useI18n()
const collaboration = tv(collaborationTheme)
const avatar = collaboration({ size: 'sm', bordered: true })

function peerAvatarClass(following: boolean) {
  return collaboration({ size: 'sm', bordered: true, following }).avatar()
}
</script>

<template>
  <div class="flex -space-x-1.5">
    <Tip :label="`${collab.localUser.name || common.you} (${common.youSuffix})`">
      <div
        data-test-id="collab-local-avatar"
        :class="avatar.avatar()"
        :style="{ background: colorToCSS(collab.state.localColor) }"
      >
        <img
          v-if="collab.localUser.avatar"
          :src="collab.localUser.avatar"
          alt=""
          referrerpolicy="no-referrer"
          class="size-full rounded-full object-cover"
        />
        <template v-else>{{ initials(collab.localUser.name || common.you) }}</template>
      </div>
    </Tip>

    <Tip
      v-for="peer in collab.peers"
      :key="peer.clientId"
      :label="
        collab.followingPeer === peer.clientId
          ? collaborationMessages.followingPeerStop({ name: peer.name })
          : collaborationMessages.clickToFollowPeer({ name: peer.name })
      "
    >
      <div
        data-test-id="collab-peer-avatar"
        :data-following="collab.followingPeer === peer.clientId || undefined"
        :class="[peerAvatarClass(collab.followingPeer === peer.clientId), avatar.peerAvatar()]"
        :style="{ background: colorToCSS(peer.color) }"
        @click="collab.toggleFollowPeer(peer.clientId)"
      >
        <img
          v-if="peer.avatarURL"
          :src="peer.avatarURL"
          alt=""
          referrerpolicy="no-referrer"
          class="size-full rounded-full object-cover"
        />
        <template v-else>{{ initials(peer.name) }}</template>
      </div>
    </Tip>
  </div>
</template>
