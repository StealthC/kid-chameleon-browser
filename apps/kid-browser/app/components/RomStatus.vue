<template>
  <div v-if="collapsed" class="flex w-full flex-col items-center gap-1">
    <UTooltip :text="rom ? `ROM: ${romTitle}` : 'Load ROM'">
      <UButton
        :icon="rom ? 'i-heroicons-cpu-chip' : 'i-heroicons-arrow-up-tray'"
        :color="rom ? 'primary' : 'neutral'"
        variant="soft"
        square
        :aria-label="rom ? 'Manage ROM' : 'Load ROM'"
        @click="openRomDialog"
      />
    </UTooltip>
    <UTooltip v-if="rom" text="Unload ROM">
      <UButton
        icon="i-heroicons-trash"
        color="neutral"
        variant="ghost"
        square
        aria-label="Unload ROM"
        @click="unloadRom"
      />
    </UTooltip>
  </div>

  <div v-else class="space-y-1.5">
    <button
      type="button"
      class="border-default bg-elevated/30 hover:bg-elevated/70 w-full rounded-md border p-2 text-left transition-colors"
      :aria-label="rom ? 'Manage ROM' : 'Load ROM'"
      @click="openRomDialog"
    >
      <div class="flex items-center gap-2">
        <span class="size-2 shrink-0 rounded-full" :class="statusColor" aria-hidden="true" />
        <span class="text-highlighted min-w-0 flex-1 truncate text-xs font-semibold">
          {{ romTitle }}
        </span>
        <UIcon name="i-heroicons-chevron-right" class="text-dimmed size-3.5 shrink-0" />
      </div>
      <p class="text-muted mt-1 truncate font-mono text-[10px]">
        {{ romSubtitle }}
      </p>
    </button>

    <div class="flex items-center gap-1">
      <UButton
        :label="rom ? 'Change ROM' : 'Load ROM'"
        icon="i-heroicons-arrow-up-tray"
        color="neutral"
        variant="soft"
        size="xs"
        block
        @click="openRomDialog"
      />
      <UTooltip v-if="rom" text="Unload ROM">
        <UButton
          icon="i-heroicons-trash"
          color="neutral"
          variant="ghost"
          size="xs"
          square
          aria-label="Unload ROM"
          @click="unloadRom"
        />
      </UTooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import useRomStore from '~/stores/romStore'

defineProps<{
  collapsed?: boolean
}>()

const { rom, romDetails, status } = storeToRefs(useRomStore())
const { unloadRom } = useRomStore()
const { openRomDialog } = useRomDialog()

const romTitle = computed(() => {
  if (status.value === 'restoring') return 'Restoring ROM…'
  if (status.value === 'loading') return 'Loading ROM…'
  if (status.value === 'error') return 'ROM failed to load'
  if (!romDetails.value) return 'No ROM loaded'
  return romDetails.value.known?.name ?? 'Unknown ROM'
})

const romSubtitle = computed(() => {
  if (romDetails.value) return romDetails.value.sha256
  if (status.value === 'error') return 'Open to try another file'
  return 'Load a cartridge to begin'
})

const statusColor = computed(() => {
  if (status.value === 'ready') return 'bg-success'
  if (status.value === 'loading' || status.value === 'restoring') return 'bg-warning animate-pulse'
  if (status.value === 'error') return 'bg-error'
  return 'bg-muted'
})
</script>
