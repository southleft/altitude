<script setup lang="ts">
interface LinkItem {
  text: string
  to: string
}

defineProps<{
  items: LinkItem[]
}>()
</script>

<template>
  <ul class="mt-4 space-y-2">
    <li v-for="item in items" :key="item.to">
      <a :href="item.to" class="text-sm text-violet-300 hover:text-violet-200">{{ item.text }}</a>
    </li>
  </ul>
</template>
