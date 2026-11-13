<template>
  <div class="space-y-2">
    <p class="text-dimmed text-[10px] font-semibold tracking-widest uppercase">{{ title }}</p>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string }>()
</script>
