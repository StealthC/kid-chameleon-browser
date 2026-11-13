<template>
  <div v-if="!romFullLoaded" class="flex h-full items-center justify-center p-6">
    <div v-if="romLoading" class="flex flex-col items-center gap-3">
      <UIcon name="i-heroicons-arrow-path" class="text-primary size-8 animate-spin" />
      <p class="text-muted text-sm">{{ loadingMessage }}</p>
    </div>
    <div
      v-else-if="status === 'error'"
      class="border-error/40 bg-error/5 max-w-md rounded-xl border p-6 text-center"
    >
      <UIcon name="i-heroicons-exclamation-triangle" class="text-error mx-auto size-8" />
      <p class="text-highlighted mt-3 text-base font-semibold">Failed to load ROM</p>
      <p class="text-muted mt-1 text-sm">
        {{ errorMessage || 'An unknown error occurred while loading ROM data.' }}
      </p>
      <UButton class="mt-4" color="neutral" variant="soft" @click="openRomDialog">
        Try another file
      </UButton>
    </div>
    <UEmpty
      v-else
      icon="i-heroicons-cpu-chip"
      title="No ROM loaded"
      description="Load your own Kid Chameleon ROM to browse its sprites, levels, palettes and raw data."
      class="max-w-md"
    >
      <template #actions>
        <UButton icon="i-heroicons-arrow-up-tray" @click="openRomDialog">Select ROM file</UButton>
      </template>
    </UEmpty>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import useRomStore from '~/stores/romStore'

const { romFullLoaded, romLoading, status, errorMessage } = storeToRefs(useRomStore())
const { openRomDialog } = useRomDialog()

const loadingMessage = computed(() =>
  status.value === 'restoring' ? 'Restoring ROM from local storage…' : 'Loading and analyzing ROM…',
)
</script>
