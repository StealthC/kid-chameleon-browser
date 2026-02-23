<template>
  <div class="space-y-2">
    <p class="text-xs uppercase tracking-wider text-slate-400">{{ title }}</p>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string }>()
</script>
