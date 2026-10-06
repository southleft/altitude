<script setup lang="ts">
defineProps<{
  name: string
  type?: string
}>()
</script>

<template>
  <div class="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
    <div class="flex flex-wrap items-center gap-2">
      <code class="text-sm font-medium text-white">{{ name }}</code>
      <code v-if="type" class="text-xs text-violet-300">{{ type }}</code>
    </div>
    <div class="mt-2 text-sm text-zinc-300">
      <slot />
    </div>
  </div>
</template>
