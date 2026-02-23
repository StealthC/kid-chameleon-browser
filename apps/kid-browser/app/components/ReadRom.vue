<template>
  <MegaDriveCart v-model:inserted="inserted">
    <template #header>
      <div v-if="romDetails" class="items-center justify-center text-center select-none">
        <div class="flex flex-col truncate">
          <p
            v-if="romDetails.known"
            class="text-xl font-bold"
            :class="{
              'text-green-500': !romDetails.known.hack,
              'text-amber-500': romDetails.known.hack,
            }"
          >
            {{ romDetails.known.name }}
          </p>
          <p v-else class="font-bold text-red-500">Unknown</p>
          <p
            class="overflow-hidden pt-1 text-right font-mono text-ellipsis whitespace-nowrap text-gray-400"
          >
            {{ romDetails.sha256 }}
          </p>
        </div>
      </div>
      <div v-else class="flex-col items-center justify-center text-center text-white select-none">
        <p class="font-bold">Load ROM</p>
        <div class="text-xs text-gray-400">Click here</div>
      </div>
    </template>

    <div>
      <div class="flex items-center justify-center pb-1 text-center text-xs text-white md:text-sm">
        <div v-if="!rom">
          <p>First, select a Kid Chameleon ROM to start.</p>
          <p class="text-gray-400">ROM Hacks are partially supported.</p>
        </div>
      </div>
      <div class="flex flex-wrap items-center justify-center gap-2">
        <ReadFile @load="onFileRead" />
        <Button v-if="rom" variant="outline" :disabled="isBusy" @click="unloadRom">
          <Icon name="heroicons:bookmark-slash" class="size-4" />
          Unload
        </Button>
      </div>
    </div>

    <template #footer>
      <div
        class="flex flex-col items-center justify-evenly gap-2 text-center text-xs text-gray-400"
      >
        <div class="flex-1">The ROM is loaded only in your browser.</div>
        <div class="flex-1">All copyrights belong to their respective owners.</div>
      </div>
    </template>
  </MegaDriveCart>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import useRomStore from '~/stores/romStore'

const { rom, romDetails, romFullLoaded, romLoading, status } = storeToRefs(useRomStore())
const { loadRom, unloadRom } = useRomStore()
const inserted = ref<boolean>(!!rom.value)
const isBusy = computed(() => status.value === 'loading' || status.value === 'restoring')

watch(
  romFullLoaded,
  (loaded, previousLoaded) => {
    if (loaded && !previousLoaded) {
      inserted.value = true
    }
  },
  { immediate: true },
)

watch(rom, (value, previousValue) => {
  if (!value && previousValue) {
    inserted.value = false
  }
})

const onFileRead = async (bytes: ArrayBuffer) => {
  try {
    await loadRom(new Uint8Array(bytes))
    inserted.value = true
  } catch (e) {
    console.error(e)
  }
}
</script>
