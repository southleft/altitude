<template>
  <div class="sdk-card-group">
    <slot />
  </div>
</template>

<style scoped>
.sdk-card-group {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}
</style>
