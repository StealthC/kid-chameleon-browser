<template>
  <div v-if="!romFullLoaded" class="flex h-full flex-col items-center justify-center">
    <div v-if="romLoading" class="flex flex-col items-center gap-4">
      <div
        class="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"
      ></div>
      <p class="text-gray-300">Loading ROM...</p>
    </div>
    <div v-else class="text-center">
      <p class="text-2xl font-bold">This page requires a loaded ROM</p>
      <p class="text-gray-400">Please load a ROM to continue.</p>
    </div>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import useRomStore from '~/stores/romStore'

const { romFullLoaded, romLoading } = storeToRefs(useRomStore())
</script>
