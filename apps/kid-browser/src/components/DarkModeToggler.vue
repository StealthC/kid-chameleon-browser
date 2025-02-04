<template>
  <ToggleSwitch v-model="dark">
    <template #handle="{ checked }">
      <i :class="['!text-xs pi', { 'pi-check': checked, 'pi-times': !checked }]" />
    </template>
  </ToggleSwitch>
</template>

<script setup lang="ts">
import { useDark } from '@vueuse/core'
import { ToggleSwitch } from 'primevue'
const dark = useDark()
</script>

<style scoped></style>
