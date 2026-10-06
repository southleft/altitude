<script setup lang="ts">
defineProps<{
  title: string
  to: string
  description?: string
}>()
</script>

<template>
  <a :href="to" class="sdk-card">
    <div class="sdk-card__title">{{ title }}</div>
    <div v-if="description" class="sdk-card__description">
      {{ description }}
    </div>
  </a>
</template>

<style scoped>
.sdk-card {
  display: block;
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  background: color-mix(in srgb, var(--vp-c-bg-soft) 72%, transparent);
  padding: 16px;
  text-decoration: none;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    transform 0.2s ease;
}

.sdk-card:hover {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft);
  transform: translateY(-1px);
}

.sdk-card__title {
  color: var(--vp-c-text-1);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.sdk-card__description {
  margin-top: 8px;
  color: var(--vp-c-text-2);
  font-size: 14px;
  line-height: 1.6;
}
</style>
