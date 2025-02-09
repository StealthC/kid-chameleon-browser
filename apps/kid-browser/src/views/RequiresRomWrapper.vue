<template>
  <div v-if="!romFullLoaded" class="flex h-full flex-col items-center justify-center">
    <div v-if="isStale" class="text-center">
      <p class="text-2xl font-bold">This page requires a loaded ROM</p>
      <p class="text-gray-400">Please load a ROM to continue.</p>
    </div>
    <div v-if="romLoading">
      <ProgressSpinner />
    </div>
  </div>
  <div v-else>
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import useRomStore from '@/stores/romStore'
import { storeToRefs } from 'pinia'
import ProgressSpinner from 'primevue/progressspinner'
import { computed } from 'vue'
const { romFullLoaded, romLoading } = storeToRefs(useRomStore())

const isStale = computed(() => !romFullLoaded.value && !romLoading.value)
</script>

<style scoped></style>
