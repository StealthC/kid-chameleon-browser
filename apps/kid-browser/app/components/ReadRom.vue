<template>
  <div class="space-y-4">
    <div class="border-default bg-elevated/40 flex items-start gap-3 rounded-lg border p-3">
      <div
        class="flex size-10 shrink-0 items-center justify-center rounded-md"
        :class="rom ? 'bg-primary/15 text-primary' : 'bg-muted text-muted'"
      >
        <UIcon :name="rom ? 'i-heroicons-check-badge' : 'i-heroicons-cpu-chip'" class="size-5" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-highlighted truncate text-sm font-semibold">
          {{ romTitle }}
        </p>
        <p class="text-muted mt-0.5 truncate font-mono text-[11px]">
          {{ romSubtitle }}
        </p>
        <div class="mt-2 flex flex-wrap items-center gap-1.5">
          <UBadge
            v-if="romLoading"
            color="warning"
            variant="subtle"
            icon="i-heroicons-arrow-path"
            label="Loading ROM"
          />
          <UBadge
            v-else-if="status === 'error'"
            color="error"
            variant="subtle"
            icon="i-heroicons-x-circle"
            label="Load failed"
          />
          <UBadge
            v-else-if="rom"
            color="success"
            variant="subtle"
            icon="i-heroicons-check"
            label="Ready"
          />
          <UBadge v-else color="neutral" variant="subtle" label="No ROM loaded" />
          <span v-if="rom" class="text-muted text-[11px]">
            {{ resourceCount.toLocaleString() }} resources
          </span>
        </div>
      </div>
    </div>

    <div v-if="!rom" class="space-y-1">
      <p class="text-highlighted text-sm font-medium">Select a Kid Chameleon ROM</p>
      <p class="text-muted text-xs leading-relaxed">
        The file is read and analyzed locally in this browser. ROM hacks are partially supported.
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <ReadFile
        :label="rom ? 'Replace ROM file' : 'Select ROM file'"
        :disabled="isBusy"
        @load="onFileRead"
        @error="loadError = $event"
      />
      <UButton
        v-if="rom"
        color="neutral"
        variant="soft"
        icon="i-heroicons-trash"
        :disabled="isBusy"
        @click="unloadRom"
      >
        Unload
      </UButton>
    </div>

    <UAlert
      v-if="romLoading"
      color="warning"
      variant="subtle"
      icon="i-heroicons-arrow-path"
      title="Loading and analyzing ROM…"
      description="Decoding resources and building the resource index."
    />
    <UAlert
      v-else-if="loadError || errorMessage"
      color="error"
      variant="subtle"
      icon="i-heroicons-exclamation-triangle"
      title="Could not load the ROM"
      :description="loadError || errorMessage || undefined"
    />
    <p v-else-if="rom" class="text-muted text-[11px] leading-relaxed">
      Stored only in this browser's local storage. Select Unload to remove it. All game assets
      belong to their respective owners.
    </p>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import useRomStore from '~/stores/romStore'

const emit = defineEmits<{
  loaded: []
}>()

const { rom, romDetails, romLoading, status, errorMessage } = storeToRefs(useRomStore())
const { loadRom, unloadRom } = useRomStore()

const loadError = ref<string | null>(null)
const isBusy = computed(() => status.value === 'loading' || status.value === 'restoring')
const resourceCount = computed(() => rom.value?.resources.resources.size ?? 0)

const romTitle = computed(() => {
  const known = romDetails.value?.known
  if (known) {
    return known.name
  }
  if (romDetails.value) {
    return 'Unknown ROM'
  }
  return 'No cartridge inserted'
})

const romSubtitle = computed(() => {
  if (romDetails.value) {
    return romDetails.value.sha256
  }
  if (status.value === 'restoring') {
    return 'Restoring from local storage…'
  }
  return 'Your ROM never leaves this browser.'
})

watch(
  () => status.value,
  (value) => {
    if (value === 'ready') {
      emit('loaded')
    }
  },
)

const onFileRead = async (bytes: ArrayBuffer) => {
  loadError.value = null
  await loadRom(new Uint8Array(bytes))
}
</script>
